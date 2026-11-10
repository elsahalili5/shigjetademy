import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { lastInviteToken, sentEmails } from '../../../test/fake-mailer.ts'
import { createOrganization, createUser, loginAs, TEST_PASSWORD } from '../../../test/factories.ts'

let organizationId: string
let ownerAuth: string
let artaId: string
let besaId: string
let guardianId: string

const DRITA = { first_name: 'Drita', last_name: 'Gashi', email: 'drita@family.test', phone: '', relationship: 'MOTHER' } as const

const guardiansPath = (studentId: string) => `/api/organizations/${organizationId}/students/${studentId}/guardians`

const invitationPath = (id = guardianId) => `/api/organizations/${organizationId}/guardians/${id}/invitation`

const addGuardian = (studentId: string, body: object = DRITA) => request(app).post(guardiansPath(studentId)).set('Authorization', ownerAuth).send(body)

const inviteGuardian = (auth = ownerAuth, id = guardianId) => request(app).post(invitationPath(id)).set('Authorization', auth)

const accept = (token: string, auth: string) => request(app).post(`/api/invitations/${token}/accept`).set('Authorization', auth)

const register = async (email: string) => {
  const response = await request(app).post('/api/auth/register').send({ first_name: 'Drita', last_name: 'Gashi', email, password: TEST_PASSWORD })
  return `Bearer ${response.body.data.accessToken}`
}

const addStudent = (firstName: string, studentNumber: string) =>
  prisma.student.create({ data: { organization_id: organizationId, first_name: firstName, last_name: 'Gashi', student_number: studentNumber } })

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const families = await createUser({ email: 'families@oxford.test' })
  const studentsOnly = await createUser({ email: 'students@oxford.test' })
  const lecturer = await createUser({ email: 'lecturer@oxford.test' })
  const student = await createUser({ email: 'student@oxford.test' })
  const yllkaOwner = await createUser({ email: 'owner@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: families.id, role: 'ADMIN', permissions: ['MANAGE_GUARDIANS'] },
        { userId: studentsOnly.id, role: 'ADMIN', permissions: ['MANAGE_STUDENTS'] },
        { userId: lecturer.id, role: 'LECTURER' },
        { userId: student.id, role: 'STUDENT' },
      ],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id })
  artaId = (await addStudent('Arta', 'STU-0001')).id
  besaId = (await addStudent('Besa', 'STU-0002')).id
  ownerAuth = await loginAs('owner@oxford.test')
  guardianId = (await addGuardian(artaId)).body.data.id
})

describe('inviting a guardian to log in', () => {
  it('emails the guardian’s own email a link and shows them as invited, with no user id', async () => {
    const response = await inviteGuardian()

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ id: guardianId, login_status: 'INVITED', invitation: { email: 'drita@family.test' } })
    expect(response.body.data).not.toHaveProperty('user_id')
    expect(sentEmails()).toHaveLength(1)
    expect(sentEmails()[0]).toMatchObject({ to: 'drita@family.test', subject: 'You’re invited to join Oxford Academy' })
    expect(sentEmails()[0]?.text).toContain('as a parent or guardian')
    const listed = await request(app).get(guardiansPath(artaId)).set('Authorization', ownerAuth)
    expect(listed.body.data[0]).toMatchObject({ login_status: 'INVITED' })
  })

  it('links a brand-new signup to the guardian and gives them a GUARDIAN membership', async () => {
    await inviteGuardian()
    const auth = await register('drita@family.test')

    const accepted = await accept(lastInviteToken(), auth)
    const me = await request(app).get('/api/auth/me').set('Authorization', auth)

    expect(accepted.status).toBe(200)
    expect((await prisma.guardian.findUniqueOrThrow({ where: { id: guardianId } })).user_id).toBe(me.body.data.id)
    expect(me.body.data.memberships).toEqual([expect.objectContaining({ role: 'GUARDIAN', permissions: [], organization: expect.objectContaining({ id: organizationId }) })])
    const listed = await request(app).get(guardiansPath(artaId)).set('Authorization', ownerAuth)
    expect(listed.body.data[0]).toMatchObject({ login_status: 'LINKED', invitation: null })
  })

  it('links an existing account that logs in, without a second account', async () => {
    const existing = await createUser({ email: 'drita@family.test' })
    const yllka = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })
    await prisma.membership.create({ data: { user_id: existing.id, organization_id: yllka.id, role: 'GUARDIAN' } })
    await inviteGuardian()

    const accepted = await accept(lastInviteToken(), await loginAs('drita@family.test'))

    expect(accepted.status).toBe(200)
    expect(await prisma.user.count({ where: { email: 'drita@family.test' } })).toBe(1)
    expect((await prisma.guardian.findUniqueOrThrow({ where: { id: guardianId } })).user_id).toBe(existing.id)
    expect(await prisma.membership.count({ where: { user_id: existing.id, status: 'ACTIVE' } })).toBe(2)
  })

  it('refuses accepting while logged in with another email', async () => {
    await inviteGuardian()

    const response = await accept(lastInviteToken(), await loginAs('families@oxford.test'))

    expect(response.status).toBe(403)
    expect((await prisma.guardian.findUniqueOrThrow({ where: { id: guardianId } })).user_id).toBeNull()
  })

  it('sends no new invitation when a linked guardian is added to another child, who is then theirs too', async () => {
    await inviteGuardian()
    const auth = await register('drita@family.test')
    await accept(lastInviteToken(), auth)
    expect(sentEmails()).toHaveLength(1)

    const added = await addGuardian(besaId, { ...DRITA, relationship: 'LEGAL_GUARDIAN' })

    expect(added.status).toBe(201)
    expect(added.body.data).toMatchObject({ id: guardianId, login_status: 'LINKED' })
    expect(sentEmails()).toHaveLength(1)
    expect(await prisma.invitation.count()).toBe(1)
    expect(await prisma.studentGuardian.count({ where: { guardian: { user_id: { not: null } } } })).toBe(2)
  })

  it('refuses inviting a guardian with no email', async () => {
    const noEmail = (await addGuardian(besaId, { ...DRITA, first_name: 'Agim', email: '' })).body.data.id

    const response = await inviteGuardian(ownerAuth, noEmail)

    expect(response.status).toBe(400)
    expect(response.body.error).toBe('Add an email for this guardian before inviting them.')
    expect(sentEmails()).toHaveLength(0)
  })

  it.each([
    ['a staff member', 'lecturer@oxford.test'],
    ['a student', 'student@oxford.test'],
  ])('refuses an email that belongs to %s here', async (_who, email) => {
    await prisma.guardian.update({ where: { id: guardianId }, data: { email } })

    const response = await inviteGuardian()

    expect(response.status).toBe(409)
    expect(response.body.details.fieldErrors.email).toEqual(['This email belongs to a staff member or student here.'])
    expect(sentEmails()).toHaveLength(0)
  })

  it('refuses a guardian who already has a login, and a second pending invitation', async () => {
    await inviteGuardian()
    const second = await inviteGuardian()
    await accept(lastInviteToken(), await register('drita@family.test'))
    const third = await inviteGuardian()

    expect(second.status).toBe(409)
    expect(third.status).toBe(409)
    expect(third.body.error).toBe('This guardian already has a login.')
  })

  it('resends and revokes through the guardian', async () => {
    await inviteGuardian()
    const oldToken = lastInviteToken()

    const resent = await request(app).post(`${invitationPath()}/resend`).set('Authorization', ownerAuth)
    const revoked = await request(app).delete(invitationPath()).set('Authorization', ownerAuth)

    expect(resent.status).toBe(200)
    expect(resent.body.data).toMatchObject({ id: guardianId, login_status: 'INVITED' })
    expect(resent.body.data).not.toHaveProperty('link')
    expect(lastInviteToken()).not.toBe(oldToken)
    expect(revoked.status).toBe(200)
    expect(revoked.body.data).toMatchObject({ id: guardianId, login_status: 'NONE', invitation: null })
  })

  it('withdraws the pending invitation when the guardian’s email changes', async () => {
    await inviteGuardian()
    const token = lastInviteToken()

    await request(app)
      .put(`${guardiansPath(artaId)}/${guardianId}`)
      .set('Authorization', ownerAuth)
      .send({ ...DRITA, email: 'new@family.test' })

    expect((await request(app).get(`/api/invitations/${token}`)).status).toBe(410)
    expect((await prisma.guardian.findUniqueOrThrow({ where: { id: guardianId } })).user_id).toBeNull()
  })

  it('lets the owner and admins with MANAGE_GUARDIANS invite, and refuses everyone else with 403', async () => {
    const permitted = await inviteGuardian(await loginAs('families@oxford.test'))
    const calls = [
      (auth: string) => inviteGuardian(auth),
      (auth: string) => request(app).post(`${invitationPath()}/resend`).set('Authorization', auth),
      (auth: string) => request(app).delete(invitationPath()).set('Authorization', auth),
    ]

    for (const email of ['students@oxford.test', 'lecturer@oxford.test', 'owner@yllka.test']) {
      const auth = await loginAs(email)
      for (const call of calls) {
        expect((await call(auth)).status, email).toBe(403)
      }
    }
    expect(permitted.status).toBe(201)
    expect(sentEmails()).toHaveLength(1)
  })

  it('keeps guardian invitations off the Members page list', async () => {
    await inviteGuardian()

    const response = await request(app).get(`/api/organizations/${organizationId}/invitations`).set('Authorization', ownerAuth)

    expect(response.body.data).toEqual([])
  })
})
