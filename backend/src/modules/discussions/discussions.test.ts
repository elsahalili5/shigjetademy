import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import type { DiscussionReply, DiscussionSpace, DiscussionTopicDetail, DiscussionTopicSummary } from '@shigjetademy/shared/discussions'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

type MemberKey = 'owner' | 'admin' | 'arben' | 'teuta' | 'lola' | 'alba' | 'besa' | 'cara' | 'gent'

const ROLE_OF: Record<MemberKey, 'OWNER' | 'ADMIN' | 'LECTURER' | 'STUDENT' | 'GUARDIAN'> = {
  owner: 'OWNER',
  admin: 'ADMIN',
  arben: 'LECTURER',
  teuta: 'LECTURER',
  lola: 'LECTURER',
  alba: 'STUDENT',
  besa: 'STUDENT',
  cara: 'STUDENT',
  gent: 'GUARDIAN',
}

const MEMBER_KEYS = Object.keys(ROLE_OF) as MemberKey[]

const emailOf = (key: MemberKey) => `${key}@oxford.test`

let organizationId: string
let yllkaOrganizationId: string
let yearId: string
let mathId: string
let physicsId: string
let groupAId: string
let groupBId: string
let groupCId: string
let arbenId: string
let albaId: string
const membershipIds = {} as Record<MemberKey, string>

const base = () => `/api/organizations/${organizationId}/discussions`

const authed = (key: MemberKey) => loginAs(emailOf(key))

const get = async (key: MemberKey, path = '') => request(app).get(`${base()}${path}`).set('Authorization', await authed(key))

const post = async (key: MemberKey, path: string, body?: object) => request(app).post(`${base()}${path}`).set('Authorization', await authed(key)).send(body)

const put = async (key: MemberKey, path: string, body: object) => request(app).put(`${base()}${path}`).set('Authorization', await authed(key)).send(body)

type Space = { space_kind: 'GROUP' | 'COURSE'; space_id: string }

const inGroup = (space_id: string): Space => ({ space_kind: 'GROUP', space_id })

const inCourse = (space_id: string): Space => ({ space_kind: 'COURSE', space_id })

const topicBody = (space: Space, overrides: object = {}) => ({ title: 'Homework 3', body: 'Is question 4 about limits?', ...space, ...overrides })

/** Starts a topic and returns its id */
const startTopic = async (key: MemberKey, space: Space, overrides: object = {}) => {
  const response = await post(key, '', topicBody(space, overrides))
  expect(response.status, JSON.stringify(response.body)).toBe(201)
  return (response.body.data as DiscussionTopicDetail).id
}

const answer = async (key: MemberKey, topicId: string, body = 'Yes, limits.') => {
  const response = await post(key, `/${topicId}/replies`, { body })
  expect(response.status, JSON.stringify(response.body)).toBe(201)
  return (response.body.data as DiscussionReply).id
}

const unreadOf = async (key: MemberKey) => {
  const response = await get(key, '/unread-count')
  expect(response.status).toBe(200)
  return response.body.data.unread_count as number
}

const topicsOf = async (key: MemberKey) => {
  const response = await get(key)
  expect(response.status).toBe(200)
  return response.body.data as DiscussionTopicSummary[]
}

const titlesOf = async (key: MemberKey) => (await topicsOf(key)).map((topic) => topic.title)

const spacesOf = async (key: MemberKey) => {
  const response = await get(key, '/spaces')
  expect(response.status).toBe(200)
  return response.body.data as DiscussionSpace[]
}

const spaceNamesOf = async (key: MemberKey) => (await spacesOf(key)).map((space) => space.name)

const readAtOf = async ({ topicId, key }: { topicId: string; key: MemberKey }) =>
  (await prisma.discussionRead.findUnique({ where: { topic_id_membership_id: { topic_id: topicId, membership_id: membershipIds[key] } } }))?.last_read_at ?? null

type AddGroupParams = {
  name: string
  courseId: string
  lecturerId?: string
  status?: 'ACTIVE' | 'ARCHIVED'
  assignment?: { start: string; end: string | null }
}

const addGroup = async ({ name, courseId, lecturerId, status = 'ACTIVE', assignment = { start: '2020-01-01', end: null } }: AddGroupParams) => {
  const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: courseId, name, academic_year_id: yearId, status } })
  if (lecturerId) {
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: lecturerId, start_date: new Date(assignment.start), end_date: assignment.end ? new Date(assignment.end) : null } })
  }
  return group
}

const enrol = (groupId: string, studentId: string) => prisma.groupEnrolment.create({ data: { group_id: groupId, student_id: studentId, enrolled_on: new Date('2020-01-01') } })

beforeEach(async () => {
  const users = {} as Record<MemberKey, { id: string }>
  for (const key of MEMBER_KEYS) {
    users[key] = await createUser({ email: emailOf(key) })
    await prisma.user.update({ where: { id: users[key].id }, data: { first_name: key[0].toUpperCase() + key.slice(1), last_name: 'Person' } })
  }
  const outsider = await createUser({ email: 'owner@yllka.test' })
  const organization = await createOrganization({
    name: 'Oxford Academy',
    ownerId: users.owner.id,
    members: MEMBER_KEYS.filter((key) => key !== 'owner').map((key) => ({ userId: users[key].id, role: ROLE_OF[key] })),
  })
  organizationId = organization.id
  yllkaOrganizationId = (await createOrganization({ name: 'Yllka Kindergarten', ownerId: outsider.id })).id
  for (const membership of await prisma.membership.findMany({ where: { organization_id: organizationId } })) {
    const key = MEMBER_KEYS.find((candidate) => users[candidate].id === membership.user_id)
    if (key) membershipIds[key] = membership.id
  }
  mathId = (await createCourse({ organizationId, name: 'Mathematics' })).id
  physicsId = (await createCourse({ organizationId, name: 'Physics' })).id
  yearId = (await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true } })).id
  const lecturerOf = async (key: MemberKey) =>
    (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: key, last_name: 'Person', employment_type: 'FULL_TIME', user_id: users[key].id } })).id
  arbenId = await lecturerOf('arben')
  const teutaId = await lecturerOf('teuta')
  await lecturerOf('lola')
  const studentOf = async (key: MemberKey, number: string) =>
    (await prisma.student.create({ data: { organization_id: organizationId, first_name: key, last_name: 'Person', student_number: number, user_id: users[key].id } })).id
  albaId = await studentOf('alba', 'STU-1')
  const besaId = await studentOf('besa', 'STU-2')
  const caraId = await studentOf('cara', 'STU-3')
  await prisma.guardian.create({ data: { organization_id: organizationId, first_name: 'gent', last_name: 'Person', user_id: users.gent.id, students: { create: [{ student_id: albaId, relationship: 'MOTHER' }] } } })
  // Mathematics: group A (Arben: Alba, Cara withdrawn) and group B (Teuta: Besa); Physics: group C (Teuta, nobody enrolled)
  groupAId = (await addGroup({ name: 'Group A', courseId: mathId, lecturerId: arbenId })).id
  groupBId = (await addGroup({ name: 'Group B', courseId: mathId, lecturerId: teutaId })).id
  groupCId = (await addGroup({ name: 'Group C', courseId: physicsId, lecturerId: teutaId })).id
  await enrol(groupAId, albaId)
  await enrol(groupBId, besaId)
  await enrol(groupAId, caraId)
  await prisma.groupEnrolment.updateMany({ where: { group_id: groupAId, student_id: caraId }, data: { withdrawn_on: new Date('2026-01-01') } })
})

describe('the spaces a person reads', () => {
  it('lists a member the groups they are in and the courses of those groups', async () => {
    expect(await spaceNamesOf('alba')).toEqual(['Mathematics', 'Group A'])
    expect(await spaceNamesOf('besa')).toEqual(['Mathematics', 'Group B'])
    expect(await spaceNamesOf('arben')).toEqual(['Mathematics', 'Group A'])
    expect(await spaceNamesOf('teuta')).toEqual(['Mathematics', 'Physics', 'Group B', 'Group C'])
  })

  it('lists nothing for a student who withdrew and for a lecturer without a group', async () => {
    expect(await spacesOf('cara')).toEqual([])
    expect(await spacesOf('lola')).toEqual([])
  })

  it('lists every group and course for the owner and admins, and lets them post in all', async () => {
    for (const key of ['owner', 'admin'] as const) {
      const spaces = await spacesOf(key)
      expect(spaces.map((space) => space.name)).toEqual(['Mathematics', 'Physics', 'Group A', 'Group B', 'Group C'])
      expect(spaces.every((space) => space.can_post && !space.is_archived)).toBe(true)
    }
  })

  it('names the course of a group', async () => {
    expect((await spacesOf('alba')).find((space) => space.kind === 'GROUP')).toMatchObject({ id: groupAId, name: 'Group A', course_name: 'Mathematics', can_post: true })
  })

  it('refuses guardians everywhere', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))

    for (const response of [
      await get('gent'),
      await get('gent', '/unread-count'),
      await get('gent', '/spaces'),
      await get('gent', `/${topicId}`),
      await post('gent', '', topicBody(inGroup(groupAId))),
      await post('gent', `/${topicId}/replies`, { body: 'Hello' }),
    ]) {
      expect(response.status).toBe(403)
    }
  })

  it('does not count an ended or future assignment as teaching', async () => {
    const ended = await addGroup({ name: 'Ended', courseId: physicsId, lecturerId: arbenId, assignment: { start: '2020-01-01', end: '2020-12-31' } })
    const future = await addGroup({ name: 'Future', courseId: physicsId, lecturerId: arbenId, assignment: { start: '2999-01-01', end: null } })

    expect(await spaceNamesOf('arben')).toEqual(['Mathematics', 'Group A'])
    expect((await post('arben', '', topicBody(inGroup(ended.id)))).status).toBe(403)
    expect((await post('arben', '', topicBody(inGroup(future.id)))).status).toBe(403)
    expect((await post('arben', '', topicBody(inCourse(physicsId)))).status).toBe(403)
  })

  it('lets a lecturer lose access when their assignment ends', async () => {
    const topicId = await startTopic('admin', inGroup(groupAId))
    expect((await get('arben', `/${topicId}`)).status).toBe(200)

    await prisma.groupLecturerAssignment.updateMany({ where: { group_id: groupAId }, data: { end_date: new Date('2026-01-01') } })

    expect((await get('arben', `/${topicId}`)).status).toBe(404)
    expect(await titlesOf('arben')).toEqual([])
  })

  it('lets a student lose access when they leave the group', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))
    expect((await get('alba', `/${topicId}`)).status).toBe(200)

    await prisma.groupEnrolment.updateMany({ where: { group_id: groupAId, student_id: albaId }, data: { withdrawn_on: new Date('2026-01-01') } })

    expect((await get('alba', `/${topicId}`)).status).toBe(404)
    expect(await titlesOf('alba')).toEqual([])
    expect(await unreadOf('alba')).toBe(0)
  })
})

describe('who reads a topic', () => {
  it('shows a group topic to its students and current lecturers and staff, and to nobody else', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))
    const readers = { owner: 200, admin: 200, arben: 200, alba: 200, teuta: 404, lola: 404, besa: 404, cara: 404, gent: 403 } as const

    for (const key of MEMBER_KEYS) {
      expect((await get(key, `/${topicId}`)).status, key).toBe(readers[key])
    }
  })

  it('shows a course topic to the people of its active groups', async () => {
    const topicId = await startTopic('admin', inCourse(mathId))
    const readers = { owner: 200, admin: 200, arben: 200, teuta: 200, alba: 200, besa: 200, lola: 404, cara: 404 } as const

    for (const [key, status] of Object.entries(readers)) {
      expect((await get(key as MemberKey, `/${topicId}`)).status, key).toBe(status)
    }
  })

  it('keeps a course topic from the people of other courses', async () => {
    const topicId = await startTopic('teuta', inCourse(physicsId))

    expect((await get('arben', `/${topicId}`)).status).toBe(404)
    expect((await get('alba', `/${topicId}`)).status).toBe(404)
    expect((await get('teuta', `/${topicId}`)).status).toBe(200)
  })

  it('lists only the topics of the spaces a person reads', async () => {
    await startTopic('arben', inGroup(groupAId), { title: 'In A' })
    await startTopic('teuta', inGroup(groupBId), { title: 'In B' })
    await startTopic('teuta', inGroup(groupCId), { title: 'In C' })
    await startTopic('admin', inCourse(mathId), { title: 'In Math' })

    expect((await titlesOf('alba')).sort()).toEqual(['In A', 'In Math'])
    expect((await titlesOf('besa')).sort()).toEqual(['In B', 'In Math'])
    expect((await titlesOf('arben')).sort()).toEqual(['In A', 'In Math'])
    expect((await titlesOf('teuta')).sort()).toEqual(['In B', 'In C', 'In Math'])
    expect((await titlesOf('admin')).sort()).toEqual(['In A', 'In B', 'In C', 'In Math'])
    expect(await titlesOf('cara')).toEqual([])
    expect(await titlesOf('lola')).toEqual([])
  })

  it('orders pinned topics first, then the latest activity', async () => {
    const first = await startTopic('arben', inGroupFor(), { title: 'First' })
    await startTopic('arben', inGroupFor(), { title: 'Second' })
    const pinned = await startTopic('arben', inGroupFor(), { title: 'Pinned' })
    await put('arben', `/${pinned}/pin`, { is_pinned: true })
    await answer('alba', first)

    expect(await titlesOf('alba')).toEqual(['Pinned', 'First', 'Second'])
  })
})

const inGroupFor = () => inGroup(groupAId)

describe('starting a topic', () => {
  it('lets students, lecturers and staff start one in their spaces', async () => {
    expect((await post('alba', '', topicBody(inGroup(groupAId)))).status).toBe(201)
    expect((await post('alba', '', topicBody(inCourse(mathId)))).status).toBe(201)
    expect((await post('arben', '', topicBody(inGroup(groupAId)))).status).toBe(201)
    expect((await post('arben', '', topicBody(inCourse(mathId)))).status).toBe(201)
    expect((await post('owner', '', topicBody(inGroup(groupCId)))).status).toBe(201)
    expect((await post('admin', '', topicBody(inCourse(physicsId)))).status).toBe(201)
  })

  it('refuses a space the person is not in', async () => {
    expect((await post('alba', '', topicBody(inGroup(groupBId)))).status).toBe(403)
    expect((await post('alba', '', topicBody(inCourse(physicsId)))).status).toBe(403)
    expect((await post('cara', '', topicBody(inGroup(groupAId)))).status).toBe(403)
    expect((await post('arben', '', topicBody(inGroup(groupBId)))).status).toBe(403)
    expect((await post('lola', '', topicBody(inCourse(mathId)))).status).toBe(403)
  })

  it('returns the topic with its author, space and what the author may do', async () => {
    const response = await post('alba', '', topicBody(inGroup(groupAId)))

    expect(response.body.data).toMatchObject({
      title: 'Homework 3',
      body: 'Is question 4 about limits?',
      status: 'ACTIVE',
      space: { kind: 'GROUP', id: groupAId, name: 'Group A', course_name: 'Mathematics' },
      author: { membership_id: membershipIds.alba, first_name: 'Alba', last_name: 'Person' },
      is_pinned: false,
      is_locked: false,
      reply_count: 0,
      replies: [],
      can_moderate: false,
      can_edit: true,
      can_remove: true,
      can_reply: true,
    })
  })

  it('trims the words and refuses empty or too long ones', async () => {
    const trimmed = await post('alba', '', topicBody(inGroup(groupAId), { title: '  Hi  ', body: '  There  ' }))
    expect(trimmed.body.data).toMatchObject({ title: 'Hi', body: 'There' })

    for (const overrides of [{ title: '  ' }, { body: '' }, { title: 'x'.repeat(151) }, { body: 'x'.repeat(5001) }, { space_kind: 'ROOM' }, { space_id: 'nope' }]) {
      expect((await post('alba', '', topicBody(inGroup(groupAId), overrides))).status, JSON.stringify(overrides)).toBe(400)
    }
    expect((await post('alba', '', topicBody(inGroup(groupAId), { title: 'x'.repeat(150), body: 'x'.repeat(5000) }))).status).toBe(201)
  })

  it('answers 404 for a group or course that does not exist', async () => {
    const missing = '00000000-0000-4000-8000-000000000000'

    expect((await post('admin', '', topicBody(inGroup(missing)))).status).toBe(404)
    expect((await post('admin', '', topicBody(inCourse(missing)))).status).toBe(404)
  })
})

describe('archived groups and courses', () => {
  it('keeps the topics of an archived group readable but takes nothing new', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))
    await prisma.group.update({ where: { id: groupAId }, data: { status: 'ARCHIVED' } })

    for (const key of ['alba', 'arben', 'admin', 'owner'] as const) {
      const response = await get(key, `/${topicId}`)
      expect(response.status, key).toBe(200)
      expect(response.body.data).toMatchObject({ is_space_archived: true, can_reply: false })
    }
    expect((await post('alba', `/${topicId}/replies`, { body: 'Hi' })).status).toBe(409)
    expect((await post('admin', `/${topicId}/replies`, { body: 'Hi' })).status).toBe(409)
    expect((await post('arben', '', topicBody(inGroup(groupAId)))).status).toBe(409)
    expect((await post('admin', '', topicBody(inGroup(groupAId)))).status).toBe(409)
    expect((await spacesOf('alba')).find((space) => space.id === groupAId)).toMatchObject({ is_archived: true, can_post: false })
  })

  it('keeps the topics of an archived course readable for the people of its archived groups', async () => {
    const topicId = await startTopic('admin', inCourse(mathId))
    await prisma.course.update({ where: { id: mathId }, data: { status: 'ARCHIVED' } })
    await prisma.group.updateMany({ where: { course_id: mathId }, data: { status: 'ARCHIVED' } })

    for (const key of ['alba', 'besa', 'arben', 'teuta', 'admin'] as const) {
      const response = await get(key, `/${topicId}`)
      expect(response.status, key).toBe(200)
      expect(response.body.data).toMatchObject({ is_space_archived: true, can_reply: false })
    }
    expect((await get('cara', `/${topicId}`)).status).toBe(404)
    expect((await post('alba', `/${topicId}/replies`, { body: 'Hi' })).status).toBe(409)
    expect((await post('alba', '', topicBody(inCourse(mathId)))).status).toBe(409)
    expect((await spacesOf('alba')).find((space) => space.id === mathId)).toMatchObject({ is_archived: true, can_post: false })
  })

  it('does not reach a course through an archived group of an active course', async () => {
    const topicId = await startTopic('admin', inCourse(mathId))
    await prisma.group.update({ where: { id: groupAId }, data: { status: 'ARCHIVED' } })

    expect((await get('alba', `/${topicId}`)).status).toBe(404)
    expect((await get('besa', `/${topicId}`)).status).toBe(200)
  })

  it('still lets moderators pin, lock and remove in an archived space', async () => {
    const topicId = await startTopic('alba', inGroup(groupAId))
    await prisma.group.update({ where: { id: groupAId }, data: { status: 'ARCHIVED' } })

    expect((await put('arben', `/${topicId}/pin`, { is_pinned: true })).status).toBe(200)
    expect((await post('arben', `/${topicId}/remove`)).status).toBe(200)
  })
})

describe('archived spaces take no edits', () => {
  it('refuses an author editing their topic or reply in an archived group, and reports can_edit false', async () => {
    const topicId = await startTopic('alba', inGroup(groupAId))
    const replyId = await answer('alba', topicId)
    await prisma.group.update({ where: { id: groupAId }, data: { status: 'ARCHIVED' } })

    expect((await put('alba', `/${topicId}`, { title: 'New', body: 'New' })).status).toBe(409)
    expect((await put('alba', `/${topicId}/replies/${replyId}`, { body: 'New' })).status).toBe(409)
    const detail = (await get('alba', `/${topicId}`)).body.data as DiscussionTopicDetail
    expect(detail.can_edit).toBe(false)
    expect(detail.replies[0].can_edit).toBe(false)
    expect(detail.can_remove).toBe(true)
  })

  it('does the same in an archived course', async () => {
    const topicId = await startTopic('alba', inCourse(mathId))
    const replyId = await answer('alba', topicId)
    await prisma.course.update({ where: { id: mathId }, data: { status: 'ARCHIVED' } })
    await prisma.group.updateMany({ where: { course_id: mathId }, data: { status: 'ARCHIVED' } })

    expect((await put('alba', `/${topicId}`, { title: 'New', body: 'New' })).status).toBe(409)
    expect((await put('alba', `/${topicId}/replies/${replyId}`, { body: 'New' })).status).toBe(409)
    expect(((await get('alba', `/${topicId}`)).body.data as DiscussionTopicDetail).can_edit).toBe(false)
  })
})

describe('removed topics', () => {
  it('unpins a removed topic and reports no replies in the list and the detail', async () => {
    const topicId = await startTopic('alba', inGroup(groupAId))
    await answer('arben', topicId)
    await put('arben', `/${topicId}/pin`, { is_pinned: true })

    const removed = await post('arben', `/${topicId}/remove`)

    expect(removed.body.data).toMatchObject({ is_pinned: false, reply_count: 0, replies: [] })
    expect(await topicsOf('alba')).toMatchObject([{ id: topicId, is_pinned: false, reply_count: 0 }])
  })

  it('refuses editing or removing the replies of a removed topic', async () => {
    const topicId = await startTopic('alba', inGroup(groupAId))
    const replyId = await answer('alba', topicId)
    await post('arben', `/${topicId}/remove`)

    expect((await put('alba', `/${topicId}/replies/${replyId}`, { body: 'New' })).status).toBe(409)
    expect((await post('arben', `/${topicId}/replies/${replyId}/remove`)).status).toBe(409)
  })
})

describe('replies', () => {
  it('lets anyone who reads a topic reply, in time order, text only', async () => {
    const topicId = await startTopic('alba', inGroup(groupAId))
    await answer('arben', topicId, 'First')
    await answer('admin', topicId, 'Second')
    await answer('alba', topicId, 'Third')

    const response = await get('alba', `/${topicId}`)

    expect((response.body.data as DiscussionTopicDetail).replies.map((reply) => reply.body)).toEqual(['First', 'Second', 'Third'])
    expect(response.body.data.reply_count).toBe(3)
  })

  it('returns the new reply with what its reader may do', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))

    const response = await post('alba', `/${topicId}/replies`, { body: '  Thanks  ' })

    expect(response.body.data).toMatchObject({ body: 'Thanks', status: 'ACTIVE', edited_at: null, author: { membership_id: membershipIds.alba }, can_edit: true, can_remove: true })
  })

  it('refuses a reply from someone who does not read the topic', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))

    for (const key of ['besa', 'cara', 'lola', 'teuta'] as const) {
      expect((await post(key, `/${topicId}/replies`, { body: 'Hi' })).status, key).toBe(404)
    }
  })

  it('refuses empty and too long replies', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))

    for (const body of ['', '   ', 'x'.repeat(2001)]) {
      expect((await post('alba', `/${topicId}/replies`, { body })).status).toBe(400)
    }
    expect((await post('alba', `/${topicId}/replies`, { body: 'x'.repeat(2000) })).status).toBe(201)
  })

  it('refuses replies to a locked topic but keeps it readable', async () => {
    const topicId = await startTopic('alba', inGroup(groupAId))
    await answer('arben', topicId, 'Before')
    await put('arben', `/${topicId}/lock`, { is_locked: true })

    expect((await post('alba', `/${topicId}/replies`, { body: 'After' })).status).toBe(409)
    expect((await post('arben', `/${topicId}/replies`, { body: 'After' })).status).toBe(409)
    expect((await post('admin', `/${topicId}/replies`, { body: 'After' })).status).toBe(409)
    const response = await get('alba', `/${topicId}`)
    expect(response.body.data).toMatchObject({ is_locked: true, can_reply: false })
    expect(response.body.data.replies).toHaveLength(1)

    await put('arben', `/${topicId}/lock`, { is_locked: false })
    expect((await post('alba', `/${topicId}/replies`, { body: 'Again' })).status).toBe(201)
  })

  it('refuses replies to a removed topic', async () => {
    const topicId = await startTopic('alba', inGroup(groupAId))
    await post('alba', `/${topicId}/remove`)

    expect((await post('arben', `/${topicId}/replies`, { body: 'Hi' })).status).toBe(409)
  })

  it('moves the topic to the latest activity', async () => {
    const first = await startTopic('arben', inGroup(groupAId), { title: 'First' })
    await startTopic('arben', inGroup(groupAId), { title: 'Second' })
    expect(await titlesOf('alba')).toEqual(['Second', 'First'])

    await answer('alba', first)

    expect(await titlesOf('alba')).toEqual(['First', 'Second'])
  })
})

describe('editing', () => {
  it('lets an author edit their topic and marks it edited', async () => {
    const topicId = await startTopic('alba', inGroup(groupAId))

    const response = await put('alba', `/${topicId}`, { title: 'Homework 3 (fixed)', body: 'New text' })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ title: 'Homework 3 (fixed)', body: 'New text' })
    expect(response.body.data.edited_at).not.toBeNull()
  })

  it('leaves a topic that did not change unedited', async () => {
    const topicId = await startTopic('alba', inGroup(groupAId))

    const response = await put('alba', `/${topicId}`, { title: 'Homework 3', body: 'Is question 4 about limits?' })

    expect(response.body.data.edited_at).toBeNull()
  })

  it('refuses anyone else editing a topic, moderators included', async () => {
    const topicId = await startTopic('alba', inGroup(groupAId))

    for (const key of ['arben', 'admin', 'owner'] as const) {
      expect((await put(key, `/${topicId}`, { title: 'Mine now', body: 'Edited' })).status, key).toBe(403)
    }
    for (const key of ['besa', 'teuta', 'cara'] as const) {
      expect((await put(key, `/${topicId}`, { title: 'Mine now', body: 'Edited' })).status, key).toBe(404)
    }
  })

  it('lets an author edit their reply, only theirs', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))
    const replyId = await answer('alba', topicId, 'Typo')

    const response = await put('alba', `/${topicId}/replies/${replyId}`, { body: 'Fixed' })

    expect(response.body.data).toMatchObject({ body: 'Fixed' })
    expect(response.body.data.edited_at).not.toBeNull()
    expect((await put('arben', `/${topicId}/replies/${replyId}`, { body: 'Mine' })).status).toBe(403)
    expect((await put('admin', `/${topicId}/replies/${replyId}`, { body: 'Mine' })).status).toBe(403)
    expect((await put('besa', `/${topicId}/replies/${replyId}`, { body: 'Mine' })).status).toBe(404)
  })

  it('does not edit a removed topic or reply', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))
    const replyId = await answer('alba', topicId)
    await post('alba', `/${topicId}/replies/${replyId}/remove`)

    expect((await put('alba', `/${topicId}/replies/${replyId}`, { body: 'Back' })).status).toBe(409)
    await post('arben', `/${topicId}/remove`)
    expect((await put('arben', `/${topicId}`, { title: 'Back', body: 'Back' })).status).toBe(409)
  })

  it('answers 404 for a reply of another topic', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))
    const otherId = await startTopic('arben', inGroup(groupAId))
    const replyId = await answer('alba', topicId)

    expect((await put('alba', `/${otherId}/replies/${replyId}`, { body: 'Hi' })).status).toBe(404)
  })
})

describe('removing', () => {
  it('lets an author remove their own topic, and hides its words', async () => {
    const topicId = await startTopic('alba', inGroup(groupAId))
    await answer('arben', topicId)

    const response = await post('alba', `/${topicId}/remove`)

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ status: 'REMOVED', removed_by: 'AUTHOR', title: '', body: '', replies: [], can_reply: false, can_edit: false, can_remove: false })
    expect(await prisma.discussionTopic.count({ where: { id: topicId } })).toBe(1)
    expect(await prisma.discussionTopic.findUniqueOrThrow({ where: { id: topicId } })).toMatchObject({ title: 'Homework 3', status: 'REMOVED' })
  })

  it('lets a moderator remove anyone’s topic, and says so', async () => {
    for (const key of ['arben', 'admin', 'owner'] as const) {
      const topicId = await startTopic('alba', inGroup(groupAId))

      const response = await post(key, `/${topicId}/remove`)

      expect(response.body.data, key).toMatchObject({ status: 'REMOVED', removed_by: 'MODERATOR' })
    }
  })

  it('says removed by the author when a moderator removes their own topic', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))

    expect((await post('arben', `/${topicId}/remove`)).body.data).toMatchObject({ removed_by: 'AUTHOR' })
  })

  it('refuses a student removing someone else’s topic or reply', async () => {
    const topicId = await startTopic('arben', inCourse(mathId))
    const replyId = await answer('besa', topicId)

    expect((await post('alba', `/${topicId}/remove`)).status).toBe(403)
    expect((await post('alba', `/${topicId}/replies/${replyId}/remove`)).status).toBe(403)
    expect((await post('teuta', `/${topicId}/replies/${replyId}/remove`)).status).toBe(200)
  })

  it('keeps a removed topic in the list as removed, without its words', async () => {
    const topicId = await startTopic('alba', inGroup(groupAId))
    await post('arben', `/${topicId}/remove`)

    expect((await topicsOf('besa')).length).toBe(0)
    expect(await topicsOf('alba')).toMatchObject([{ id: topicId, title: '', status: 'REMOVED', removed_by: 'MODERATOR' }])
  })

  it('lets an author remove their reply and a moderator anyone’s', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))
    const own = await answer('alba', topicId, 'Mine')
    const other = await answer('alba', topicId, 'Also mine')

    expect((await post('alba', `/${topicId}/replies/${own}/remove`)).body.data).toMatchObject({ status: 'REMOVED', removed_by: 'AUTHOR', body: '' })
    expect((await post('arben', `/${topicId}/replies/${other}/remove`)).body.data).toMatchObject({ status: 'REMOVED', removed_by: 'MODERATOR', body: '' })
    expect(await prisma.discussionReply.count({ where: { topic_id: topicId } })).toBe(2)

    const detail = (await get('alba', `/${topicId}`)).body.data as DiscussionTopicDetail
    expect(detail.replies.map((reply) => [reply.status, reply.body, reply.can_edit, reply.can_remove])).toEqual([
      ['REMOVED', '', false, false],
      ['REMOVED', '', false, false],
    ])
    expect(detail.reply_count).toBe(0)
  })

  it('keeps the first remover when a removed reply is removed again', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))
    const replyId = await answer('alba', topicId)
    await post('arben', `/${topicId}/replies/${replyId}/remove`)

    expect((await post('alba', `/${topicId}/replies/${replyId}/remove`)).body.data).toMatchObject({ removed_by: 'MODERATOR' })
  })

  it('does not let a lecturer of another group moderate', async () => {
    const topicId = await startTopic('alba', inGroup(groupAId))

    expect((await post('teuta', `/${topicId}/remove`)).status).toBe(404)
    expect((await put('teuta', `/${topicId}/pin`, { is_pinned: true })).status).toBe(404)
  })
})

describe('pinning and locking', () => {
  it('lets moderators pin, unpin, lock and unlock', async () => {
    for (const key of ['arben', 'admin', 'owner'] as const) {
      const topicId = await startTopic('alba', inGroup(groupAId))

      expect((await put(key, `/${topicId}/pin`, { is_pinned: true })).body.data, key).toMatchObject({ is_pinned: true, can_moderate: true })
      expect((await put(key, `/${topicId}/pin`, { is_pinned: false })).body.data, key).toMatchObject({ is_pinned: false })
      expect((await put(key, `/${topicId}/lock`, { is_locked: true })).body.data, key).toMatchObject({ is_locked: true, can_reply: false })
      expect((await put(key, `/${topicId}/lock`, { is_locked: false })).body.data, key).toMatchObject({ is_locked: false, can_reply: true })
    }
  })

  it('refuses students, even the author', async () => {
    const topicId = await startTopic('alba', inGroup(groupAId))

    expect((await put('alba', `/${topicId}/pin`, { is_pinned: true })).status).toBe(403)
    expect((await put('alba', `/${topicId}/lock`, { is_locked: true })).status).toBe(403)
    expect((await put('alba', `/${topicId}/pin`, { is_pinned: 'yes' })).status).toBe(400)
  })

  it('lets a lecturer of a course moderate its course topics', async () => {
    const topicId = await startTopic('besa', inCourse(mathId))

    expect((await put('arben', `/${topicId}/pin`, { is_pinned: true })).status).toBe(200)
    expect((await put('teuta', `/${topicId}/lock`, { is_locked: true })).status).toBe(200)
  })

  it('refuses pinning or locking a removed topic', async () => {
    const topicId = await startTopic('alba', inGroup(groupAId))
    await post('alba', `/${topicId}/remove`)

    expect((await put('arben', `/${topicId}/pin`, { is_pinned: true })).status).toBe(409)
    expect((await put('arben', `/${topicId}/lock`, { is_locked: true })).status).toBe(409)
  })
})

describe('what the viewer may do', () => {
  it('marks moderation for moderators only', async () => {
    const topicId = await startTopic('alba', inGroup(groupAId))

    expect((await get('alba', `/${topicId}`)).body.data).toMatchObject({ can_moderate: false, can_edit: true, can_remove: true })
    expect((await get('arben', `/${topicId}`)).body.data).toMatchObject({ can_moderate: true, can_edit: false, can_remove: true })
    expect((await get('admin', `/${topicId}`)).body.data).toMatchObject({ can_moderate: true, can_edit: false, can_remove: true })
  })

  it('lets a student only change their own replies', async () => {
    const topicId = await startTopic('arben', inCourse(mathId))
    await answer('alba', topicId, 'Mine')
    await answer('besa', topicId, 'Theirs')

    const replies = ((await get('alba', `/${topicId}`)).body.data as DiscussionTopicDetail).replies

    expect(replies.map((reply) => [reply.body, reply.can_edit, reply.can_remove])).toEqual([
      ['Mine', true, true],
      ['Theirs', false, false],
    ])
  })
})

describe('read state', () => {
  it('counts a topic someone else started as unread until it is opened', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))

    expect(await unreadOf('alba')).toBe(1)
    expect(await unreadOf('arben')).toBe(0)
    expect((await topicsOf('alba'))[0]).toMatchObject({ is_unread: true })

    await get('alba', `/${topicId}`)

    expect(await unreadOf('alba')).toBe(0)
    expect((await topicsOf('alba'))[0]).toMatchObject({ is_unread: false })
  })

  it('does not count your own topic, nor topics of spaces you are not in', async () => {
    await startTopic('alba', inGroup(groupAId))
    await startTopic('teuta', inGroup(groupBId))

    expect(await unreadOf('alba')).toBe(0)
    expect(await unreadOf('lola')).toBe(0)
    expect(await unreadOf('cara')).toBe(0)
  })

  it('counts a topic again when someone else replies after you read it', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))
    await get('alba', `/${topicId}`)
    expect(await unreadOf('alba')).toBe(0)

    await answer('arben', topicId)

    expect(await unreadOf('alba')).toBe(1)
    expect(await unreadOf('arben')).toBe(0)
    await get('alba', `/${topicId}`)
    expect(await unreadOf('alba')).toBe(0)
  })

  it('does not count your own reply as unread', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))
    await get('alba', `/${topicId}`)

    await answer('alba', topicId)

    expect(await unreadOf('alba')).toBe(0)
  })

  it('counts every unread topic once, whatever the number of replies', async () => {
    const first = await startTopic('arben', inGroup(groupAId))
    await startTopic('arben', inCourse(mathId))
    await answer('arben', first)
    await answer('admin', first)

    expect(await unreadOf('alba')).toBe(2)
    expect(await unreadOf('besa')).toBe(1)
  })

  it('does not count a removed topic or a removed reply', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))
    await get('alba', `/${topicId}`)
    const replyId = await answer('arben', topicId)
    await post('arben', `/${topicId}/replies/${replyId}/remove`)
    expect(await unreadOf('alba')).toBe(0)

    const removed = await startTopic('arben', inGroup(groupAId))
    await post('arben', `/${removed}/remove`)
    expect(await unreadOf('alba')).toBe(0)
  })

  it('keeps one read state per person', async () => {
    const topicId = await startTopic('admin', inCourse(mathId))

    await get('alba', `/${topicId}`)

    expect(await unreadOf('alba')).toBe(0)
    expect(await unreadOf('besa')).toBe(1)
    expect(await unreadOf('arben')).toBe(1)
  })

  it('stores the time of the newest activity it showed, not the time of opening', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))
    await answer('alba', topicId)
    const newest = (await prisma.discussionReply.findFirstOrThrow({ where: { topic_id: topicId } })).created_at

    await get('alba', `/${topicId}`)

    expect(await readAtOf({ topicId, key: 'alba' })).toEqual(newest)
  })

  it('only moves forward, and opening twice changes nothing', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))
    await get('alba', `/${topicId}`)
    const first = await readAtOf({ topicId, key: 'alba' })
    expect(first).not.toBeNull()

    await get('alba', `/${topicId}`)
    expect(await readAtOf({ topicId, key: 'alba' })).toEqual(first)

    const later = new Date(Date.now() + 3_600_000)
    await prisma.discussionRead.update({ where: { topic_id_membership_id: { topic_id: topicId, membership_id: membershipIds.alba } }, data: { last_read_at: later } })
    await get('alba', `/${topicId}`)
    expect(await readAtOf({ topicId, key: 'alba' })).toEqual(later)

    await answer('arben', topicId)
    await get('alba', `/${topicId}`)
    expect(await readAtOf({ topicId, key: 'alba' })).toEqual(later)
    expect(await prisma.discussionRead.count({ where: { topic_id: topicId, membership_id: membershipIds.alba } })).toBe(1)
  })

  it('moves the read time to a newer reply', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))
    await get('alba', `/${topicId}`)
    const before = await readAtOf({ topicId, key: 'alba' })

    await answer('arben', topicId)
    await get('alba', `/${topicId}`)

    expect((await readAtOf({ topicId, key: 'alba' }))!.getTime()).toBeGreaterThan(before!.getTime())
  })

  it('does not mark a topic read for someone who cannot open it', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))

    expect((await get('besa', `/${topicId}`)).status).toBe(404)

    expect(await prisma.discussionRead.count({ where: { topic_id: topicId } })).toBe(0)
  })
})

describe('organizations', () => {
  it('refuses a person of another organization', async () => {
    const topicId = await startTopic('arben', inGroup(groupAId))
    const outsider = await loginAs('owner@yllka.test')
    const yllka = `/api/organizations/${yllkaOrganizationId}/discussions`

    expect((await request(app).get(`/api/organizations/${organizationId}/discussions/${topicId}`).set('Authorization', outsider)).status).toBe(403)
    expect((await request(app).get(`${yllka}/${topicId}`).set('Authorization', outsider)).status).toBe(404)
    expect((await request(app).get(yllka).set('Authorization', outsider)).body.data).toEqual([])
  })

  it('answers 404 for a group or course of another organization', async () => {
    const yllkaCourse = await createCourse({ organizationId: yllkaOrganizationId, name: 'Art' })

    expect((await post('admin', '', topicBody(inCourse(yllkaCourse.id)))).status).toBe(404)
  })
})
