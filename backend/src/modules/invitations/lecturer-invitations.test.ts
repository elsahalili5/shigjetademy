import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { lastInviteToken, sentEmails } from '../../../test/fake-mailer.ts'
import { createOrganization, createUser, loginAs, TEST_PASSWORD } from '../../../test/factories.ts'

let organizationId: string
let ownerAuth: string
let lecturerId: string

const invitationPath = (id = lecturerId) => `/api/organizations/${organizationId}/lecturers/${id}/invitation`

const inviteLecturer = (email = 'arben@lecturer.test', auth = ownerAuth, id = lecturerId) => request(app).post(invitationPath(id)).set('Authorization', auth).send({ email })

const accept = (token: string, auth: string) => request(app).post(`/api/invitations/${token}/accept`).set('Authorization', auth)

const register = async (email: string) => {
  const response = await request(app).post('/api/auth/register').send({ first_name: 'Arben', last_name: 'Hoxha', email, password: TEST_PASSWORD })
  return `Bearer ${response.body.data.accessToken}`
}

type ListedLecturer = { id: string; login_status: string; invitation: unknown }

const listedLecturer = async (id = lecturerId): Promise<ListedLecturer | undefined> => {
  const response = await request(app).get(`/api/organizations/${organizationId}/lecturers`).set('Authorization', ownerAuth)
  return response.body.data.lecturers.find((lecturer: ListedLecturer) => lecturer.id === id)
}

const addLecturer = (firstName: string) =>
  prisma.lecturer.create({ data: { organization_id: organizationId, first_name: firstName, last_name: 'Hoxha', email: `${firstName.toLowerCase()}@lecturer.test`, subjects: ['Mathematics'], employment_type: 'FULL_TIME' } })

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const permitted = await createUser({ email: 'permitted@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  const student = await createUser({ email: 'student@oxford.test' })
  const guardian = await createUser({ email: 'guardian@oxford.test' })
  const yllkaOwner = await createUser({ email: 'owner@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: permitted.id, role: 'ADMIN', permissions: ['MANAGE_LECTURERS'] },
        { userId: admin.id, role: 'ADMIN', permissions: ['MANAGE_STUDENTS'] },
        { userId: student.id, role: 'STUDENT' },
        { userId: guardian.id, role: 'GUARDIAN' },
      ],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id })
  lecturerId = (await addLecturer('Arben')).id
  ownerAuth = await loginAs('owner@oxford.test')
})

describe('inviting a lecturer to log in', () => {
  it('emails the lecturer a link as a lecturer and shows the row as invited, without a user id', async () => {
    const response = await inviteLecturer()

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ id: lecturerId, login_status: 'INVITED', invitation: { email: 'arben@lecturer.test' } })
    expect(sentEmails()[0]).toMatchObject({ to: 'arben@lecturer.test', subject: 'You’re invited to join Oxford Academy' })
    expect(sentEmails()[0]?.text).toContain('as a lecturer')
    const lecturer = await listedLecturer()
    expect(lecturer).toMatchObject({ login_status: 'INVITED', invitation: { email: 'arben@lecturer.test', expires_at: expect.any(String) } })
    expect(lecturer).not.toHaveProperty('user_id')
  })

  it('links the new login to the existing record and adds a LECTURER membership, with no second lecturer', async () => {
    await inviteLecturer()
    const before = await prisma.lecturer.findUniqueOrThrow({ where: { id: lecturerId } })
    const auth = await register('arben@lecturer.test')

    const accepted = await accept(lastInviteToken(), auth)
    const me = await request(app).get('/api/auth/me').set('Authorization', auth)
    const after = await prisma.lecturer.findUniqueOrThrow({ where: { id: lecturerId } })

    expect(accepted.status).toBe(200)
    expect(await prisma.lecturer.count()).toBe(1)
    expect(after).toMatchObject({ id: before.id, created_at: before.created_at, subjects: ['Mathematics'], user_id: me.body.data.id })
    expect(me.body.data.memberships).toEqual([expect.objectContaining({ role: 'LECTURER', permissions: [], organization: expect.objectContaining({ id: organizationId }) })])
    expect(await listedLecturer()).toMatchObject({ login_status: 'LINKED', invitation: null })
  })

  it('refuses inviting a lecturer who already has a login', async () => {
    await inviteLecturer()
    await accept(lastInviteToken(), await register('arben@lecturer.test'))

    const again = await inviteLecturer('other@lecturer.test')

    expect(again.status).toBe(409)
    expect(again.body.error).toBe('This lecturer already has a login.')
  })

  it('refuses accepting when the record got a login meanwhile', async () => {
    await inviteLecturer()
    const token = lastInviteToken()
    const someone = await createUser({ email: 'someone@lecturer.test' })
    await prisma.lecturer.update({ where: { id: lecturerId }, data: { user_id: someone.id } })

    const response = await accept(token, await register('arben@lecturer.test'))

    expect(response.status).toBe(409)
    expect(response.body.error).toBe('This lecturer already has a login.')
  })

  it('refuses an account already linked to another lecturer in the same organization, at invite and at accept', async () => {
    const colleague = await addLecturer('Teuta')
    await inviteLecturer('shared-pending@lecturer.test')
    await inviteLecturer('shared@lecturer.test', ownerAuth, colleague.id)
    const auth = await register('shared@lecturer.test')
    await accept(lastInviteToken(), auth)
    await request(app).delete(invitationPath()).set('Authorization', ownerAuth)

    const atInvite = await inviteLecturer('shared@lecturer.test')
    // Linked meanwhile: the invitation went out before the colleague accepted
    await prisma.invitation.updateMany({ where: { email: 'shared-pending@lecturer.test' }, data: { email: 'shared@lecturer.test', status: 'PENDING' } })
    await request(app).post(`${invitationPath()}/resend`).set('Authorization', ownerAuth)
    const atAccept = await accept(lastInviteToken(), auth)

    expect(atInvite.status).toBe(409)
    expect(atInvite.body.details.fieldErrors.email).toEqual(['This email’s account is already linked to another lecturer in your organization.'])
    expect(atAccept.status).toBe(409)
    expect(atAccept.body.error).toBe('Your account is already linked to another lecturer at Oxford Academy.')
    expect((await prisma.lecturer.findUniqueOrThrow({ where: { id: lecturerId } })).user_id).toBeNull()
  })

  it('refuses an email that belongs to a member with another role in the organization', async () => {
    for (const email of ['owner@oxford.test', 'permitted@oxford.test', 'student@oxford.test', 'guardian@oxford.test']) {
      const response = await inviteLecturer(email)
      expect(response.status, email).toBe(409)
      expect(response.body.details.fieldErrors.email, email).toEqual(['This email belongs to someone with another role in your organization.'])
    }
    expect(sentEmails()).toHaveLength(0)
  })

  it('resends and revokes through the lecturer', async () => {
    await inviteLecturer()
    const oldToken = lastInviteToken()

    const resent = await request(app).post(`${invitationPath()}/resend`).set('Authorization', ownerAuth)
    const revoked = await request(app).delete(invitationPath()).set('Authorization', ownerAuth)

    expect(resent.status).toBe(200)
    expect(resent.body.data).toMatchObject({ id: lecturerId, login_status: 'INVITED' })
    expect(resent.body.data).not.toHaveProperty('link')
    expect(lastInviteToken()).not.toBe(oldToken)
    expect(revoked.status).toBe(200)
    expect(revoked.body.data).toMatchObject({ id: lecturerId, login_status: 'NONE', invitation: null })
  })

  it('lets the owner and admins with Lecturers invite, and refuses everyone else with 403', async () => {
    const permitted = await inviteLecturer('arben@lecturer.test', await loginAs('permitted@oxford.test'))
    const calls = [
      (auth: string) => inviteLecturer('other@lecturer.test', auth),
      (auth: string) => request(app).post(`${invitationPath()}/resend`).set('Authorization', auth),
      (auth: string) => request(app).delete(invitationPath()).set('Authorization', auth),
    ]

    for (const email of ['admin@oxford.test', 'student@oxford.test', 'guardian@oxford.test', 'owner@yllka.test']) {
      const auth = await loginAs(email)
      for (const call of calls) {
        expect((await call(auth)).status, email).toBe(403)
      }
    }
    expect(permitted.status).toBe(201)
    expect(sentEmails()).toHaveLength(1)
  })

  it('refuses an archived lecturer, and a second pending invitation', async () => {
    await inviteLecturer()
    const second = await inviteLecturer('other@lecturer.test')
    await request(app).delete(invitationPath()).set('Authorization', ownerAuth)
    await prisma.lecturer.update({ where: { id: lecturerId }, data: { status: 'ARCHIVED' } })

    expect(second.status).toBe(409)
    expect((await inviteLecturer()).status).toBe(409)
  })

  it('withdraws the pending invitation when the lecturer is archived, and logs it', async () => {
    await inviteLecturer()
    const token = lastInviteToken()

    const archived = await request(app).post(`/api/organizations/${organizationId}/lecturers/${lecturerId}/archive`).set('Authorization', ownerAuth)
    const read = await request(app).get(`/api/invitations/${token}`)
    const logged = await prisma.activityLog.findMany({ where: { organization_id: organizationId }, orderBy: { created_at: 'asc' }, select: { action: true, subject_name: true } })

    expect(archived.body.data).toMatchObject({ status: 'ARCHIVED', login_status: 'NONE', invitation: null })
    expect(read.status).toBe(410)
    expect(logged.map((entry) => entry.action)).toEqual(['INVITATION_SENT', 'LECTURER_ARCHIVED', 'INVITATION_REVOKED'])
  })

  it('refuses accepting for an archived record', async () => {
    await inviteLecturer()
    await prisma.lecturer.update({ where: { id: lecturerId }, data: { status: 'ARCHIVED' } })

    const response = await accept(lastInviteToken(), await register('arben@lecturer.test'))

    expect(response.status).toBe(409)
    expect((await prisma.lecturer.findUniqueOrThrow({ where: { id: lecturerId } })).user_id).toBeNull()
  })

  it('keeps lecturer invitations off the Members page list', async () => {
    await inviteLecturer()

    const response = await request(app).get(`/api/organizations/${organizationId}/invitations`).set('Authorization', ownerAuth)

    expect(response.body.data).toEqual([])
  })
})
