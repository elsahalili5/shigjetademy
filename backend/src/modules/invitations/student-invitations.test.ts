import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { lastInviteToken, sentEmails } from '../../../test/fake-mailer.ts'
import { createOrganization, createUser, loginAs, TEST_PASSWORD } from '../../../test/factories.ts'

let organizationId: string
let ownerAuth: string
let studentId: string

const invitationPath = (id = studentId) => `/api/organizations/${organizationId}/students/${id}/invitation`

const inviteStudent = (email = 'arta@student.test', auth = ownerAuth, id = studentId) => request(app).post(invitationPath(id)).set('Authorization', auth).send({ email })

const accept = (token: string, auth: string) => request(app).post(`/api/invitations/${token}/accept`).set('Authorization', auth)

const register = async (email: string) => {
  const response = await request(app).post('/api/auth/register').send({ first_name: 'Arta', last_name: 'Gashi', email, password: TEST_PASSWORD })
  return `Bearer ${response.body.data.accessToken}`
}

type ListedStudent = { id: string; login_status: string; invitation: unknown }

const listedStudent = async (id = studentId): Promise<ListedStudent | undefined> => {
  const response = await request(app).get(`/api/organizations/${organizationId}/students`).set('Authorization', ownerAuth)
  return response.body.data.students.find((student: ListedStudent) => student.id === id)
}

const addStudent = (firstName: string, studentNumber: string) =>
  prisma.student.create({ data: { organization_id: organizationId, first_name: firstName, last_name: 'Gashi', student_number: studentNumber } })

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const permitted = await createUser({ email: 'permitted@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  const lecturer = await createUser({ email: 'lecturer@oxford.test' })
  const yllkaOwner = await createUser({ email: 'owner@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: permitted.id, role: 'ADMIN', permissions: ['MANAGE_STUDENTS'] },
        { userId: admin.id, role: 'ADMIN', permissions: ['MANAGE_LECTURERS', 'MANAGE_ACADEMIC_PERIODS'] },
        { userId: lecturer.id, role: 'LECTURER' },
      ],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id })
  studentId = (await addStudent('Arta', 'STU-0007')).id
  ownerAuth = await loginAs('owner@oxford.test')
})

describe('inviting a student to log in', () => {
  it('emails the student a link and shows the row as invited, with the email and expiry but no user id', async () => {
    const response = await inviteStudent()

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ id: studentId, student_number: 'STU-0007', login_status: 'INVITED', invitation: { email: 'arta@student.test' } })
    expect(sentEmails()[0]).toMatchObject({ to: 'arta@student.test', subject: 'You’re invited to join Oxford Academy' })
    const student = await listedStudent()
    expect(student).toMatchObject({ login_status: 'INVITED', invitation: { email: 'arta@student.test', expires_at: expect.any(String) } })
    expect(student).not.toHaveProperty('user_id')
  })

  it('links a brand-new login to the existing record: same id, number and history, no second student', async () => {
    await inviteStudent()
    const before = await prisma.student.findUniqueOrThrow({ where: { id: studentId } })
    const auth = await register('arta@student.test')

    const accepted = await accept(lastInviteToken(), auth)
    const me = await request(app).get('/api/auth/me').set('Authorization', auth)
    const after = await prisma.student.findUniqueOrThrow({ where: { id: studentId } })

    expect(accepted.status).toBe(200)
    expect(await prisma.student.count()).toBe(1)
    expect(after).toMatchObject({ id: before.id, student_number: 'STU-0007', enrolled_on: before.enrolled_on, created_at: before.created_at, user_id: me.body.data.id })
    expect(me.body.data.memberships).toEqual([expect.objectContaining({ role: 'STUDENT', permissions: [], organization: expect.objectContaining({ id: organizationId }) })])
    expect(await listedStudent()).toMatchObject({ login_status: 'LINKED', invitation: null })
  })

  it('links an account the student already has in another organization, without a second account', async () => {
    const yllkaStudent = await createUser({ email: 'arta@student.test' })
    const yllka = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })
    await prisma.membership.create({ data: { user_id: yllkaStudent.id, organization_id: yllka.id, role: 'STUDENT' } })
    await inviteStudent()

    const accepted = await accept(lastInviteToken(), await loginAs('arta@student.test'))

    expect(accepted.status).toBe(200)
    expect(await prisma.user.count({ where: { email: 'arta@student.test' } })).toBe(1)
    expect((await prisma.student.findUniqueOrThrow({ where: { id: studentId } })).user_id).toBe(yllkaStudent.id)
    expect(await prisma.membership.count({ where: { user_id: yllkaStudent.id, status: 'ACTIVE' } })).toBe(2)
  })

  it('refuses inviting a student who already has a login', async () => {
    await inviteStudent()
    await accept(lastInviteToken(), await register('arta@student.test'))

    const again = await inviteStudent('other@student.test')

    expect(again.status).toBe(409)
    expect(again.body.error).toBe('This student already has a login.')
  })

  it('refuses accepting when the record got a login meanwhile', async () => {
    await inviteStudent()
    const token = lastInviteToken()
    const someone = await createUser({ email: 'someone@student.test' })
    await prisma.student.update({ where: { id: studentId }, data: { user_id: someone.id } })

    const response = await accept(token, await register('arta@student.test'))

    expect(response.status).toBe(409)
    expect(response.body.error).toBe('This student already has a login.')
  })

  it('refuses an account already linked to another student in the same organization', async () => {
    const sibling = await addStudent('Besa', 'STU-0008')
    await inviteStudent('shared@student.test', ownerAuth, sibling.id)
    const auth = await register('shared@student.test')
    await accept(lastInviteToken(), auth)
    await inviteStudent('shared@student.test')

    const response = await accept(lastInviteToken(), auth)

    expect(response.status).toBe(409)
    expect(response.body.error).toBe('Your account is already linked to another student at Oxford Academy.')
    expect((await prisma.student.findUniqueOrThrow({ where: { id: studentId } })).user_id).toBeNull()
  })

  it('resends and revokes through the student', async () => {
    await inviteStudent()
    const oldToken = lastInviteToken()

    const resent = await request(app).post(`${invitationPath()}/resend`).set('Authorization', ownerAuth)
    const revoked = await request(app).delete(invitationPath()).set('Authorization', ownerAuth)

    expect(resent.status).toBe(200)
    expect(resent.body.data).toMatchObject({ id: studentId, login_status: 'INVITED' })
    expect(resent.body.data).not.toHaveProperty('link')
    expect(lastInviteToken()).not.toBe(oldToken)
    expect(revoked.status).toBe(200)
    expect(revoked.body.data).toMatchObject({ id: studentId, login_status: 'NONE', invitation: null })
    expect(await listedStudent()).toMatchObject({ login_status: 'NONE', invitation: null })
  })

  it('lets the owner and admins with Students invite, and refuses everyone else with 403', async () => {
    const permitted = await inviteStudent('arta@student.test', await loginAs('permitted@oxford.test'))
    const calls = [
      (auth: string) => inviteStudent('other@student.test', auth),
      (auth: string) => request(app).post(`${invitationPath()}/resend`).set('Authorization', auth),
      (auth: string) => request(app).delete(invitationPath()).set('Authorization', auth),
    ]

    for (const email of ['admin@oxford.test', 'lecturer@oxford.test', 'owner@yllka.test']) {
      const auth = await loginAs(email)
      for (const call of calls) {
        expect((await call(auth)).status, email).toBe(403)
      }
    }
    expect(permitted.status).toBe(201)
    expect(sentEmails()).toHaveLength(1)
  })

  it('refuses an archived student', async () => {
    await prisma.student.update({ where: { id: studentId }, data: { status: 'ARCHIVED' } })

    expect((await inviteStudent()).status).toBe(409)
  })

  it('refuses an email that belongs to staff of the organization', async () => {
    const response = await inviteStudent('lecturer@oxford.test')

    expect(response.status).toBe(409)
    expect(response.body.details.fieldErrors.email).toEqual(['This email belongs to someone who already works in your organization.'])
    expect(sentEmails()).toHaveLength(0)
  })

  it('withdraws the pending invitation when the student is archived, and logs it', async () => {
    await inviteStudent()
    const token = lastInviteToken()

    const archived = await request(app).post(`/api/organizations/${organizationId}/students/${studentId}/archive`).set('Authorization', ownerAuth)
    const read = await request(app).get(`/api/invitations/${token}`)
    const logged = await prisma.activityLog.findMany({ where: { organization_id: organizationId }, orderBy: { created_at: 'asc' }, select: { action: true, subject_name: true } })

    expect(archived.status).toBe(200)
    expect(archived.body.data).toMatchObject({ status: 'ARCHIVED', login_status: 'NONE', invitation: null })
    expect(read.status).toBe(410)
    expect(logged.at(-1)).toEqual({ action: 'INVITATION_REVOKED', subject_name: 'arta@student.test' })
  })

  it('refuses accepting for an archived record', async () => {
    await inviteStudent()
    await prisma.student.update({ where: { id: studentId }, data: { status: 'ARCHIVED' } })

    const response = await accept(lastInviteToken(), await register('arta@student.test'))

    expect(response.status).toBe(409)
    expect((await prisma.student.findUniqueOrThrow({ where: { id: studentId } })).user_id).toBeNull()
  })

  it('keeps student invitations off the Members page list', async () => {
    await inviteStudent()

    const response = await request(app).get(`/api/organizations/${organizationId}/invitations`).set('Authorization', ownerAuth)

    expect(response.body.data).toEqual([])
  })
})
