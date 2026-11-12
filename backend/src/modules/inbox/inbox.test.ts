import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

type MemberKey = 'owner' | 'admin' | 'arben' | 'teuta' | 'lola' | 'alba' | 'besa' | 'gent' | 'gina' | 'gigi'

const ROLE_OF: Record<MemberKey, 'OWNER' | 'ADMIN' | 'LECTURER' | 'STUDENT' | 'GUARDIAN'> = {
  owner: 'OWNER',
  admin: 'ADMIN',
  arben: 'LECTURER',
  teuta: 'LECTURER',
  lola: 'LECTURER',
  alba: 'STUDENT',
  besa: 'STUDENT',
  gent: 'GUARDIAN',
  gina: 'GUARDIAN',
  gigi: 'GUARDIAN',
}

const emailOf = (key: MemberKey) => `${key}@oxford.test`

let organizationId: string
let yllkaOrganizationId: string
let yearId: string
let courseId: string
let groupAId: string
let albaStudentId: string
let arbenLecturerId: string
const membershipIds = {} as Record<MemberKey, string>

const base = () => `/api/organizations/${organizationId}/inbox`

const authed = async (key: MemberKey) => loginAs(emailOf(key))

const get = async (key: MemberKey, path: string) => request(app).get(`${base()}${path}`).set('Authorization', await authed(key))

const post = async (key: MemberKey, path: string, body: object) => request(app).post(`${base()}${path}`).set('Authorization', await authed(key)).send(body)

const startConversation = (from: MemberKey, to: MemberKey, body = 'Hello there') => post(from, '/conversations', { recipient_membership_id: membershipIds[to], body })

const setStudentMessaging = (isEnabled: boolean) =>
  prisma.organizationSettings.upsert({
    where: { organization_id: organizationId },
    update: { student_messaging_enabled: isEnabled },
    create: { organization_id: organizationId, time_zone: 'Europe/Belgrade', student_messaging_enabled: isEnabled },
  })

type AddGroupParams = {
  name: string
  lecturerId?: string
  status?: 'ACTIVE' | 'ARCHIVED'
  assignment?: { start: string; end: string | null }
}

const addGroup = async ({ name, lecturerId, status = 'ACTIVE', assignment = { start: '2020-01-01', end: null } }: AddGroupParams) => {
  const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: courseId, name, academic_year_id: yearId, status } })
  if (lecturerId) {
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: lecturerId, start_date: new Date(assignment.start), end_date: assignment.end ? new Date(assignment.end) : null } })
  }
  return group
}

const enrol = (groupId: string, studentId: string) => prisma.groupEnrolment.create({ data: { group_id: groupId, student_id: studentId, enrolled_on: new Date('2020-01-01') } })

const contactNames = async (key: MemberKey) => {
  const response = await get(key, '/contacts')
  expect(response.status).toBe(200)
  return (response.body.data as { first_name: string }[]).map((contact) => contact.first_name).sort()
}

beforeEach(async () => {
  const users = {} as Record<MemberKey, { id: string }>
  for (const key of Object.keys(ROLE_OF) as MemberKey[]) {
    users[key] = await createUser({ email: emailOf(key) })
    await prisma.user.update({ where: { id: users[key].id }, data: { first_name: key[0].toUpperCase() + key.slice(1), last_name: 'Person' } })
  }
  const outsider = await createUser({ email: 'owner@yllka.test' })
  const organization = await createOrganization({
    name: 'Oxford Academy',
    ownerId: users.owner.id,
    members: (Object.keys(ROLE_OF) as MemberKey[]).filter((key) => key !== 'owner').map((key) => ({ userId: users[key].id, role: ROLE_OF[key] })),
  })
  organizationId = organization.id
  yllkaOrganizationId = (await createOrganization({ name: 'Yllka Kindergarten', ownerId: outsider.id })).id
  for (const membership of await prisma.membership.findMany({ where: { organization_id: organizationId } })) {
    const key = (Object.keys(ROLE_OF) as MemberKey[]).find((candidate) => users[candidate].id === membership.user_id)
    if (key) membershipIds[key] = membership.id
  }
  courseId = (await createCourse({ organizationId, name: 'Mathematics' })).id
  yearId = (await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true } })).id
  arbenLecturerId = (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Arben', last_name: 'Person', employment_type: 'FULL_TIME', user_id: users.arben.id } })).id
  const teutaLecturerId = (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Teuta', last_name: 'Person', employment_type: 'FULL_TIME', user_id: users.teuta.id } })).id
  await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Lola', last_name: 'Person', employment_type: 'FULL_TIME', user_id: users.lola.id } })
  albaStudentId = (await prisma.student.create({ data: { organization_id: organizationId, first_name: 'Alba', last_name: 'Person', student_number: 'STU-1', user_id: users.alba.id } })).id
  const besaStudentId = (await prisma.student.create({ data: { organization_id: organizationId, first_name: 'Besa', last_name: 'Person', student_number: 'STU-2', user_id: users.besa.id } })).id
  // Gent is Alba's guardian, Gina is Besa's; Gigi has no child
  for (const [guardianKey, studentId] of [['gent', albaStudentId], ['gina', besaStudentId]] as const) {
    await prisma.guardian.create({
      data: { organization_id: organizationId, first_name: guardianKey, last_name: 'Person', user_id: users[guardianKey].id, students: { create: [{ student_id: studentId, relationship: 'MOTHER' }] } },
    })
  }
  await prisma.guardian.create({ data: { organization_id: organizationId, first_name: 'Gigi', last_name: 'Person', user_id: users.gigi.id } })
  groupAId = (await addGroup({ name: 'Group A', lecturerId: arbenLecturerId })).id
  await enrol(groupAId, albaStudentId)
  const groupB = await addGroup({ name: 'Group B', lecturerId: teutaLecturerId })
  await enrol(groupB.id, besaStudentId)
})

describe('who a member can contact', () => {
  it('shows the owner every lecturer, guardian and admin but no student and not themselves', async () => {
    expect(await contactNames('owner')).toEqual(['Admin', 'Arben', 'Gent', 'Gigi', 'Gina', 'Lola', 'Teuta'])
  })

  it('shows an admin the same, with the owner instead of themselves', async () => {
    expect(await contactNames('admin')).toEqual(['Arben', 'Gent', 'Gigi', 'Gina', 'Lola', 'Owner', 'Teuta'])
  })

  it('shows a lecturer the staff and the guardians of the students they teach, and their students only when student messaging is on', async () => {
    expect(await contactNames('arben')).toEqual(['Admin', 'Gent', 'Owner'])
    await setStudentMessaging(true)
    expect(await contactNames('arben')).toEqual(['Admin', 'Alba', 'Gent', 'Owner'])
  })

  it('shows a lecturer without a group only the staff', async () => {
    await setStudentMessaging(true)
    expect(await contactNames('lola')).toEqual(['Admin', 'Owner'])
  })

  it('shows a guardian the staff and the lecturers of their child’s groups', async () => {
    expect(await contactNames('gent')).toEqual(['Admin', 'Arben', 'Owner'])
    expect(await contactNames('gigi')).toEqual(['Admin', 'Owner'])
  })

  it('shows a student nobody until student messaging is on, then only the lecturers of their groups', async () => {
    expect(await contactNames('alba')).toEqual([])
    await setStudentMessaging(true)
    expect(await contactNames('alba')).toEqual(['Arben'])
  })

  it('returns the role and membership id of each contact', async () => {
    const response = await get('gent', '/contacts')

    expect(response.body.data).toContainEqual({ membership_id: membershipIds.arben, first_name: 'Arben', last_name: 'Person', role: 'LECTURER' })
  })

  it('counts only the groups a lecturer teaches today: not an ended or future assignment, an archived group or a withdrawn student', async () => {
    await setStudentMessaging(true)
    const ended = await addGroup({ name: 'Ended', lecturerId: arbenLecturerId, assignment: { start: '2020-01-01', end: '2020-12-31' } })
    const future = await addGroup({ name: 'Future', lecturerId: arbenLecturerId, assignment: { start: '2999-01-01', end: null } })
    const archived = await addGroup({ name: 'Archived', lecturerId: arbenLecturerId, status: 'ARCHIVED' })
    const besaId = (await prisma.student.findFirstOrThrow({ where: { organization_id: organizationId, first_name: 'Besa' } })).id
    await enrol(ended.id, besaId)
    await enrol(future.id, besaId)
    await enrol(archived.id, besaId)

    expect(await contactNames('arben')).toEqual(['Admin', 'Alba', 'Gent', 'Owner'])

    await prisma.groupEnrolment.updateMany({ where: { group_id: groupAId, student_id: albaStudentId }, data: { withdrawn_on: new Date('2026-01-01') } })

    expect(await contactNames('arben')).toEqual(['Admin', 'Owner'])
  })

  it('leaves out a removed member and anyone of another organization', async () => {
    await prisma.membership.update({ where: { id: membershipIds.lola }, data: { status: 'REMOVED' } })

    expect(await contactNames('owner')).not.toContain('Lola')
  })

  it('refuses a request without a token and a user outside the organization', async () => {
    expect((await request(app).get(`${base()}/contacts`)).status).toBe(401)
    const outsider = await loginAs('owner@yllka.test')
    expect((await request(app).get(`${base()}/contacts`).set('Authorization', outsider)).status).toBe(403)
  })
})

describe('starting a conversation', () => {
  it('creates it with the first message, trimmed, and lists it for both sides with the right unread counts', async () => {
    const response = await startConversation('gent', 'arben', '  Is Alba keeping up?  ')

    expect(response.status).toBe(201)
    expect(response.body.data.message).toMatchObject({ body: 'Is Alba keeping up?', sender_membership_id: membershipIds.gent })
    const mine = await get('gent', '/conversations')
    const theirs = await get('arben', '/conversations')
    expect(mine.body.data).toHaveLength(1)
    expect(mine.body.data[0]).toMatchObject({ id: response.body.data.conversation_id, unread_count: 0, other: { first_name: 'Arben', role: 'LECTURER' }, last_message: { body: 'Is Alba keeping up?' } })
    expect(theirs.body.data[0]).toMatchObject({ unread_count: 1, other: { first_name: 'Gent', role: 'GUARDIAN' } })
  })

  it.each([
    ['a guardian to a guardian', 'gent', 'gina'],
    ['a guardian to a lecturer who does not teach their child', 'gent', 'teuta'],
    ['a lecturer to another lecturer', 'arben', 'teuta'],
    ['an admin to a student', 'admin', 'alba'],
    ['a student to an admin', 'alba', 'admin'],
    ['a student to a guardian', 'alba', 'gent'],
    ['a student to another student', 'alba', 'besa'],
    ['a lecturer to a student they do not teach', 'teuta', 'alba'],
    ['someone to themselves', 'owner', 'owner'],
  ] as const)('refuses %s', async (_name, from, to) => {
    await setStudentMessaging(true)

    const response = await startConversation(from, to)

    expect(response.status).toBe(403)
    expect(await prisma.conversation.count()).toBe(0)
  })

  it('refuses a student and their lecturer with a clear message while student messaging is off, and allows it once it is on', async () => {
    const refused = await startConversation('alba', 'arben')
    const refusedFromLecturer = await startConversation('arben', 'alba')

    expect(refused.status).toBe(403)
    expect(refused.body.error).toBe('Messaging students is turned off for this organization.')
    expect(refusedFromLecturer.status).toBe(403)
    await setStudentMessaging(true)
    expect((await startConversation('alba', 'arben')).status).toBe(201)
  })

  it('answers 404 for a member who is not in the organization, removed or unknown', async () => {
    const yllkaOwner = await prisma.membership.findFirstOrThrow({ where: { organization_id: yllkaOrganizationId } })
    await prisma.membership.update({ where: { id: membershipIds.lola }, data: { status: 'REMOVED' } })

    for (const recipient of [yllkaOwner.id, membershipIds.lola, '00000000-0000-4000-8000-000000000099']) {
      const response = await post('owner', '/conversations', { recipient_membership_id: recipient, body: 'Hi' })
      expect(response.status).toBe(404)
    }
  })

  it('refuses an empty, blank, over-long or malformed message', async () => {
    for (const body of ['', '   ', 'x'.repeat(2001)]) {
      expect((await startConversation('owner', 'admin', body)).status).toBe(400)
    }
    expect((await post('owner', '/conversations', { recipient_membership_id: 'nope', body: 'Hi' })).status).toBe(400)
    expect((await startConversation('owner', 'admin', 'x'.repeat(2000))).status).toBe(201)
  })

  it('reuses the one conversation of a pair, whichever of them starts it again', async () => {
    const first = await startConversation('owner', 'admin', 'One')
    const second = await startConversation('owner', 'admin', 'Two')
    const reverse = await startConversation('admin', 'owner', 'Three')

    expect(second.body.data.conversation_id).toBe(first.body.data.conversation_id)
    expect(reverse.body.data.conversation_id).toBe(first.body.data.conversation_id)
    const thread = await get('owner', `/conversations/${first.body.data.conversation_id}`)
    expect(thread.body.data.messages.map((message: { body: string }) => message.body)).toEqual(['One', 'Two', 'Three'])
  })

  it('keeps one conversation and every message when both sides start it at the same moment', async () => {
    const [ownerAuth, adminAuth] = [await authed('owner'), await authed('admin')]
    const send = (auth: string, to: MemberKey, body: string) => request(app).post(`${base()}/conversations`).set('Authorization', auth).send({ recipient_membership_id: membershipIds[to], body })

    const responses = await Promise.all([
      send(ownerAuth, 'admin', 'a1'),
      send(adminAuth, 'owner', 'b1'),
      send(ownerAuth, 'admin', 'a2'),
      send(adminAuth, 'owner', 'b2'),
      send(ownerAuth, 'admin', 'a3'),
      send(adminAuth, 'owner', 'b3'),
    ])

    expect(responses.map((response) => response.status)).toEqual([201, 201, 201, 201, 201, 201])
    expect(await prisma.conversation.count()).toBe(1)
    expect(await prisma.conversationParticipant.count()).toBe(2)
    expect(await prisma.message.count()).toBe(6)
    expect(new Set(responses.map((response) => response.body.data.conversation_id)).size).toBe(1)
  })
})

describe('sending into a conversation', () => {
  it('adds the message for either participant and moves the conversation up the list', async () => {
    const older = await startConversation('owner', 'admin', 'First conversation')
    const newer = await startConversation('owner', 'arben', 'Second conversation')
    const conversationId = older.body.data.conversation_id

    const reply = await post('admin', `/conversations/${conversationId}/messages`, { body: ' Thanks ' })

    expect(reply.status).toBe(201)
    expect(reply.body.data).toMatchObject({ body: 'Thanks', sender_membership_id: membershipIds.admin })
    const list = await get('owner', '/conversations')
    expect(list.body.data.map((item: { id: string }) => item.id)).toEqual([conversationId, newer.body.data.conversation_id])
    expect(list.body.data[0]).toMatchObject({ last_message: { body: 'Thanks' }, unread_count: 1 })
  })

  it('answers 404 to someone who is not in the conversation, even the owner, and sends nothing', async () => {
    const started = await startConversation('arben', 'gent')
    const conversationId = started.body.data.conversation_id

    for (const outsider of ['owner', 'admin', 'teuta', 'gina'] as const) {
      expect((await post(outsider, `/conversations/${conversationId}/messages`, { body: 'Hi' })).status).toBe(404)
    }
    expect(await prisma.message.count()).toBe(1)
  })

  it('answers 404 for a conversation of another organization, through this organization’s path', async () => {
    const yllkaOwner = await prisma.membership.findFirstOrThrow({ where: { organization_id: yllkaOrganizationId } })
    const yllkaAdminUser = await createUser({ email: 'admin@yllka.test' })
    const yllkaAdmin = await prisma.membership.create({ data: { user_id: yllkaAdminUser.id, organization_id: yllkaOrganizationId, role: 'ADMIN' } })
    const foreign = await prisma.conversation.create({
      data: { organization_id: yllkaOrganizationId, pair_key: [yllkaOwner.id, yllkaAdmin.id].sort().join(':'), participants: { create: [{ membership_id: yllkaOwner.id }, { membership_id: yllkaAdmin.id }] } },
    })

    expect((await get('owner', `/conversations/${foreign.id}`)).status).toBe(404)
    expect((await post('owner', `/conversations/${foreign.id}/messages`, { body: 'Hi' })).status).toBe(404)
  })

  it('refuses a message once the rule no longer allows the pair', async () => {
    const started = await startConversation('gent', 'arben')
    const conversationId = started.body.data.conversation_id
    await prisma.groupEnrolment.updateMany({ where: { student_id: albaStudentId }, data: { withdrawn_on: new Date('2026-01-01') } })

    const fromGuardian = await post('gent', `/conversations/${conversationId}/messages`, { body: 'Still there?' })
    const fromLecturer = await post('arben', `/conversations/${conversationId}/messages`, { body: 'Hello' })

    expect(fromGuardian.status).toBe(403)
    expect(fromLecturer.status).toBe(403)
    expect(await prisma.message.count()).toBe(1)
  })

  it('refuses a message to a member who has since been removed', async () => {
    const started = await startConversation('owner', 'lola')
    await prisma.membership.update({ where: { id: membershipIds.lola }, data: { status: 'REMOVED' } })

    const response = await post('owner', `/conversations/${started.body.data.conversation_id}/messages`, { body: 'Hi' })

    expect(response.status).toBe(403)
  })

  it('refuses an empty or over-long message', async () => {
    const started = await startConversation('owner', 'admin')
    const path = `/conversations/${started.body.data.conversation_id}/messages`

    expect((await post('owner', path, { body: '   ' })).status).toBe(400)
    expect((await post('owner', path, { body: 'x'.repeat(2001) })).status).toBe(400)
  })
})

describe('reading a conversation', () => {
  it('returns the messages oldest first, with who the other side is and whether the viewer can reply', async () => {
    const started = await startConversation('owner', 'admin', 'One')
    const conversationId = started.body.data.conversation_id
    await post('admin', `/conversations/${conversationId}/messages`, { body: 'Two' })
    await post('owner', `/conversations/${conversationId}/messages`, { body: 'Three' })

    const response = await get('owner', `/conversations/${conversationId}`)

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ id: conversationId, my_membership_id: membershipIds.owner, other: { first_name: 'Admin', role: 'ADMIN' }, can_send: true, send_blocked_reason: null })
    expect(response.body.data.messages.map((message: { body: string }) => message.body)).toEqual(['One', 'Two', 'Three'])
  })

  it('marks it read for the viewer only, which clears their unread count and shows the sender "seen"', async () => {
    const started = await startConversation('owner', 'admin', 'Read me')
    const conversationId = started.body.data.conversation_id
    const sentAt = started.body.data.message.created_at

    const beforeOpen = await get('owner', `/conversations/${conversationId}`)
    expect(beforeOpen.body.data.other_last_read_at).toBeNull()
    expect((await get('admin', '/unread-count')).body.data).toEqual({ unread_count: 1 })

    const opened = await get('admin', `/conversations/${conversationId}`)

    expect(opened.body.data.messages).toHaveLength(1)
    expect((await get('admin', '/unread-count')).body.data).toEqual({ unread_count: 0 })
    const afterOpen = await get('owner', `/conversations/${conversationId}`)
    expect(new Date(afterOpen.body.data.other_last_read_at).getTime()).toBeGreaterThanOrEqual(new Date(sentAt).getTime())
  })

  it('reads only up to the newest message returned, so a later one stays unread, and does not move the mark when nothing is new', async () => {
    const started = await startConversation('owner', 'admin', 'First')
    const conversationId = started.body.data.conversation_id
    const readMark = async () => (await prisma.conversationParticipant.findUniqueOrThrow({ where: { conversation_id_membership_id: { conversation_id: conversationId, membership_id: membershipIds.admin } } })).last_read_at

    await get('admin', `/conversations/${conversationId}`)
    const firstMark = await readMark()
    await get('admin', `/conversations/${conversationId}`)

    expect(firstMark?.toISOString()).toBe(started.body.data.message.created_at)
    expect(await readMark()).toEqual(firstMark)
    await prisma.message.create({ data: { conversation_id: conversationId, sender_membership_id: membershipIds.owner, body: 'Arrived meanwhile', created_at: new Date(Date.now() + 1000) } })
    expect((await get('admin', '/unread-count')).body.data).toEqual({ unread_count: 1 })
  })

  it('shows a message sent after the other side last read as not yet seen', async () => {
    const started = await startConversation('owner', 'admin', 'First')
    const conversationId = started.body.data.conversation_id
    await get('admin', `/conversations/${conversationId}`)
    const later = await post('owner', `/conversations/${conversationId}/messages`, { body: 'Second' })

    const thread = await get('owner', `/conversations/${conversationId}`)

    expect(new Date(thread.body.data.other_last_read_at).getTime()).toBeLessThan(new Date(later.body.data.created_at).getTime())
  })

  it('answers 404 to a non-participant and to an unknown conversation', async () => {
    const started = await startConversation('owner', 'admin')

    expect((await get('arben', `/conversations/${started.body.data.conversation_id}`)).status).toBe(404)
    expect((await get('owner', '/conversations/00000000-0000-4000-8000-000000000099')).status).toBe(404)
    expect((await get('owner', '/conversations/not-an-id')).status).toBe(400)
  })

  it('does not mark a conversation read for a non-participant', async () => {
    const started = await startConversation('owner', 'admin')

    await get('arben', `/conversations/${started.body.data.conversation_id}`)

    expect((await get('admin', '/unread-count')).body.data).toEqual({ unread_count: 1 })
  })

  it('counts unread messages across every conversation and lists each one’s own count', async () => {
    const first = await startConversation('owner', 'admin', 'a')
    await post('owner', `/conversations/${first.body.data.conversation_id}/messages`, { body: 'b' })
    await startConversation('arben', 'admin', 'c')

    expect((await get('admin', '/unread-count')).body.data).toEqual({ unread_count: 3 })
    expect((await get('owner', '/unread-count')).body.data).toEqual({ unread_count: 0 })
    const list = await get('admin', '/conversations')
    expect(list.body.data.map((item: { unread_count: number }) => item.unread_count).sort()).toEqual([1, 2])
  })
})

describe('when student messaging is turned off', () => {
  it('keeps an existing conversation readable but refuses new messages, for the student and the lecturer', async () => {
    await setStudentMessaging(true)
    const started = await startConversation('alba', 'arben', 'Can we meet?')
    const conversationId = started.body.data.conversation_id
    await setStudentMessaging(false)

    const asStudent = await get('alba', `/conversations/${conversationId}`)
    const asLecturer = await get('arben', `/conversations/${conversationId}`)
    const sentByStudent = await post('alba', `/conversations/${conversationId}/messages`, { body: 'Hello?' })
    const sentByLecturer = await post('arben', `/conversations/${conversationId}/messages`, { body: 'Yes' })

    expect(asStudent.status).toBe(200)
    expect(asStudent.body.data).toMatchObject({ can_send: false, send_blocked_reason: 'studentMessagingDisabled' })
    expect(asStudent.body.data.messages).toHaveLength(1)
    expect(asLecturer.body.data).toMatchObject({ can_send: false, send_blocked_reason: 'studentMessagingDisabled' })
    expect(sentByStudent.status).toBe(403)
    expect(sentByStudent.body.error).toBe('Messaging students is turned off for this organization.')
    expect(sentByLecturer.status).toBe(403)
    expect((await get('alba', '/conversations')).body.data).toHaveLength(1)
    expect((await get('arben', '/conversations')).body.data).toHaveLength(1)
  })

  it('still lets the lecturer message guardians and staff', async () => {
    expect((await startConversation('arben', 'gent')).status).toBe(201)
    expect((await startConversation('arben', 'admin')).status).toBe(201)
  })
})
