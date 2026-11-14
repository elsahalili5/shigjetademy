import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import type { AnnouncementDetail, AnnouncementSummary } from '@shigjetademy/shared/announcements'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

type MemberKey = 'owner' | 'admin' | 'arben' | 'teuta' | 'lola' | 'alba' | 'besa' | 'cara' | 'gent' | 'gina' | 'gita' | 'gigi'

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
  gina: 'GUARDIAN',
  gita: 'GUARDIAN',
  gigi: 'GUARDIAN',
}

const MEMBER_KEYS = Object.keys(ROLE_OF) as MemberKey[]

const emailOf = (key: MemberKey) => `${key}@oxford.test`

const ONE_HOUR_MS = 3_600_000

let organizationId: string
let yllkaOrganizationId: string
let yearId: string
let mathId: string
let physicsId: string
let groupAId: string
let groupBId: string
let groupCId: string
const membershipIds = {} as Record<MemberKey, string>

const base = () => `/api/organizations/${organizationId}/announcements`

const authed = (key: MemberKey) => loginAs(emailOf(key))

const get = async (key: MemberKey, path = '') => request(app).get(`${base()}${path}`).set('Authorization', await authed(key))

const post = async (key: MemberKey, path: string, body?: object) => request(app).post(`${base()}${path}`).set('Authorization', await authed(key)).send(body)

const put = async (key: MemberKey, path: string, body: object) => request(app).put(`${base()}${path}`).set('Authorization', await authed(key)).send(body)

type AudienceBody = { audience_kind: 'SCHOOL' } | { audience_kind: 'ROLE'; audience_role: 'STUDENT' | 'GUARDIAN' | 'LECTURER' } | { audience_kind: 'COURSE'; course_id: string } | { audience_kind: 'GROUP'; group_id: string }

const announcementBody = (audience: AudienceBody, overrides: object = {}) => ({ title: 'Parents evening', body: 'Join us on Friday at 18:00.', ...audience, publish_mode: 'NOW', ...overrides })

const WHOLE_SCHOOL = { audience_kind: 'SCHOOL' } as const

const toGroup = (group_id: string) => ({ audience_kind: 'GROUP', group_id }) as const

const toCourse = (course_id: string) => ({ audience_kind: 'COURSE', course_id }) as const

/** Publishes an announcement and returns its id */
const publish = async (key: MemberKey, audience: AudienceBody, overrides: object = {}) => {
  const response = await post(key, '', announcementBody(audience, overrides))
  expect(response.status).toBe(201)
  return (response.body.data as AnnouncementDetail).id
}

const unreadOf = async (key: MemberKey) => {
  const response = await get(key, '/unread-count')
  expect(response.status).toBe(200)
  return response.body.data.unread_count as number
}

/** The members who have this announcement unread, which are exactly the people addressed by an announcement nobody opened yet */
const recipientsOf = async () => {
  const keys: MemberKey[] = []
  for (const key of MEMBER_KEYS) {
    if ((await unreadOf(key)) > 0) keys.push(key)
  }
  return keys.sort()
}

const titlesOf = async (key: MemberKey) => ((await get(key)).body.data as AnnouncementSummary[]).map((item) => item.title)

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
  const arbenId = await lecturerOf('arben')
  const teutaId = await lecturerOf('teuta')
  await lecturerOf('lola')
  const studentOf = async (key: MemberKey, number: string) =>
    (await prisma.student.create({ data: { organization_id: organizationId, first_name: key, last_name: 'Person', student_number: number, user_id: users[key].id } })).id
  const albaId = await studentOf('alba', 'STU-1')
  const besaId = await studentOf('besa', 'STU-2')
  const caraId = await studentOf('cara', 'STU-3')
  // Gent is Alba's guardian, Gina Besa's, Gita Cara's; Gigi has no child
  for (const [guardianKey, studentId] of [['gent', albaId], ['gina', besaId], ['gita', caraId]] as const) {
    await prisma.guardian.create({ data: { organization_id: organizationId, first_name: guardianKey, last_name: 'Person', user_id: users[guardianKey].id, students: { create: [{ student_id: studentId, relationship: 'MOTHER' }] } } })
  }
  await prisma.guardian.create({ data: { organization_id: organizationId, first_name: 'Gigi', last_name: 'Person', user_id: users.gigi.id } })
  // Mathematics: group A (Arben: Alba, Cara withdrawn) and group B (Teuta: Besa); Physics: group C (Teuta, nobody enrolled)
  groupAId = (await addGroup({ name: 'Group A', courseId: mathId, lecturerId: arbenId })).id
  groupBId = (await addGroup({ name: 'Group B', courseId: mathId, lecturerId: teutaId })).id
  groupCId = (await addGroup({ name: 'Group C', courseId: physicsId, lecturerId: teutaId })).id
  await enrol(groupAId, albaId)
  await enrol(groupBId, besaId)
  await enrol(groupAId, caraId)
  await prisma.groupEnrolment.updateMany({ where: { group_id: groupAId, student_id: caraId }, data: { withdrawn_on: new Date('2026-01-01') } })
})

describe('who may write to whom', () => {
  const STAFF = ['owner', 'admin'] as const

  it.each(STAFF)('lets %s address the whole school, a role, a course and a group', async (key) => {
    const audiences: AudienceBody[] = [WHOLE_SCHOOL, { audience_kind: 'ROLE', audience_role: 'GUARDIAN' }, toCourse(physicsId), toGroup(groupBId)]

    for (const audience of audiences) {
      const response = await post(key, '', announcementBody(audience))
      expect(response.status, JSON.stringify(audience)).toBe(201)
      expect(response.body.data).toMatchObject({ title: 'Parents evening', status: 'PUBLISHED', audience_kind: audience.audience_kind, can_manage: true })
    }
  })

  it('stores only the target of the audience kind and the author', async () => {
    const response = await post('admin', '', announcementBody(toGroup(groupAId), { audience_role: 'STUDENT', course_id: mathId }))

    expect(response.body.data).toMatchObject({ audience_kind: 'GROUP', audience_role: null, course: null, group: { id: groupAId, name: 'Group A' }, author: { membership_id: membershipIds.admin, first_name: 'Admin' } })
  })

  it.each([
    ['the whole school', WHOLE_SCHOOL],
    ['a role', { audience_kind: 'ROLE', audience_role: 'STUDENT' }],
  ] as const)('refuses a lecturer addressing %s', async (_name, audience) => {
    const response = await post('arben', '', announcementBody(audience))

    expect(response.status).toBe(403)
  })

  it('lets a lecturer address the groups and courses they teach today, and nothing else', async () => {
    expect((await post('teuta', '', announcementBody(toGroup(groupBId)))).status).toBe(201)
    expect((await post('teuta', '', announcementBody(toGroup(groupCId)))).status).toBe(201)
    expect((await post('teuta', '', announcementBody(toCourse(mathId)))).status).toBe(201)
    expect((await post('teuta', '', announcementBody(toCourse(physicsId)))).status).toBe(201)
    expect((await post('arben', '', announcementBody(toGroup(groupAId)))).status).toBe(201)
    expect((await post('arben', '', announcementBody(toCourse(mathId)))).status).toBe(201)
    expect((await post('arben', '', announcementBody(toGroup(groupBId)))).status).toBe(403)
    expect((await post('arben', '', announcementBody(toGroup(groupCId)))).status).toBe(403)
    expect((await post('arben', '', announcementBody(toCourse(physicsId)))).status).toBe(403)
  })

  it('refuses a lecturer without a group every audience', async () => {
    for (const audience of [WHOLE_SCHOOL, toCourse(mathId), toGroup(groupAId)] satisfies AudienceBody[]) {
      expect((await post('lola', '', announcementBody(audience))).status).toBe(403)
    }
  })

  it('does not count an ended or future assignment, or an archived group, as teaching', async () => {
    const arbenId = (await prisma.lecturer.findFirstOrThrow({ where: { organization_id: organizationId, first_name: 'arben' } })).id
    const ended = await addGroup({ name: 'Ended', courseId: physicsId, lecturerId: arbenId, assignment: { start: '2020-01-01', end: '2020-12-31' } })
    const future = await addGroup({ name: 'Future', courseId: physicsId, lecturerId: arbenId, assignment: { start: '2999-01-01', end: null } })
    const archived = await addGroup({ name: 'Archived', courseId: physicsId, lecturerId: arbenId, status: 'ARCHIVED' })

    for (const group of [ended, future, archived]) {
      expect((await post('arben', '', announcementBody(toGroup(group.id)))).status, group.id).toBe(403)
    }
    expect((await post('arben', '', announcementBody(toCourse(physicsId)))).status).toBe(403)
  })

  it.each(['alba', 'gent'] as const)('refuses %s every audience', async (key) => {
    for (const audience of [WHOLE_SCHOOL, toCourse(mathId), toGroup(groupAId)] satisfies AudienceBody[]) {
      expect((await post(key, '', announcementBody(audience))).status).toBe(403)
    }
    expect((await get(key)).body.data).toEqual([])
  })

  it('answers 404 to staff for a course or group of another organization, and 401 without a login', async () => {
    const yllkaCourse = await createCourse({ organizationId: yllkaOrganizationId, name: 'Kindergarten' })

    expect((await post('owner', '', announcementBody(toCourse(yllkaCourse.id)))).status).toBe(404)
    expect((await post('owner', '', announcementBody(toGroup('00000000-0000-4000-8000-000000000001')))).status).toBe(404)
    expect((await request(app).post(base()).send(announcementBody(WHOLE_SCHOOL))).status).toBe(401)
  })

  it('refuses staff an archived course, and an archived course reaches nobody', async () => {
    const id = await publish('owner', toCourse(mathId))
    expect(await recipientsOf()).toEqual(['alba', 'arben', 'besa', 'gent', 'gina', 'teuta'])

    await prisma.course.update({ where: { id: mathId }, data: { status: 'ARCHIVED' } })

    expect(await recipientsOf()).toEqual([])
    expect((await get('alba', `/${id}`)).status).toBe(404)
    expect((await get('owner', `/${id}`)).body.data.read_counts).toEqual({ read_count: 0, audience_size: 0 })
    expect((await post('owner', '', announcementBody(toCourse(mathId)))).status).toBe(400)
    expect((await post('arben', '', announcementBody(toCourse(mathId)))).status).toBe(400)
  })

  it('refuses staff a group that is archived', async () => {
    const archived = await addGroup({ name: 'Archived', courseId: physicsId, status: 'ARCHIVED' })

    expect((await post('owner', '', announcementBody(toGroup(archived.id)))).status).toBe(400)
  })

  it('refuses a user of another organization', async () => {
    const outsider = await loginAs('owner@yllka.test')

    expect((await request(app).get(base()).set('Authorization', outsider)).status).toBe(403)
    expect((await request(app).post(base()).set('Authorization', outsider).send(announcementBody(WHOLE_SCHOOL))).status).toBe(403)
  })

  it('checks the title, the message, the audience target and the time', async () => {
    const attempts = [
      { ...announcementBody(WHOLE_SCHOOL), title: 'x'.repeat(151) },
      { ...announcementBody(WHOLE_SCHOOL), title: '   ' },
      { ...announcementBody(WHOLE_SCHOOL), body: 'x'.repeat(5001) },
      { ...announcementBody(WHOLE_SCHOOL), audience_kind: 'ROLE' },
      { ...announcementBody(WHOLE_SCHOOL), audience_kind: 'GROUP' },
      { ...announcementBody(WHOLE_SCHOOL), publish_mode: 'SCHEDULED' },
      { ...announcementBody(WHOLE_SCHOOL), publish_mode: 'SCHEDULED', publish_at: new Date(Date.now() - ONE_HOUR_MS).toISOString() },
      { ...announcementBody(WHOLE_SCHOOL), audience_kind: 'STUDENT' },
    ]

    for (const attempt of attempts) {
      expect((await post('owner', '', attempt)).status, JSON.stringify(attempt)).toBe(400)
    }
    expect((await post('owner', '', announcementBody(WHOLE_SCHOOL, { title: 'x'.repeat(150), body: 'x'.repeat(5000) }))).status).toBe(201)
  })

  it('tells what each role can pick', async () => {
    const owner = await get('owner', '/audiences')
    const lecturer = await get('arben', '/audiences')

    expect(owner.body.data).toMatchObject({ can_create: true, can_address_school: true, roles: ['STUDENT', 'GUARDIAN', 'LECTURER'] })
    expect(owner.body.data.courses.map((course: { name: string }) => course.name)).toEqual(['Mathematics', 'Physics'])
    expect(owner.body.data.groups.map((group: { name: string; course_name: string }) => `${group.course_name}/${group.name}`)).toEqual(['Mathematics/Group A', 'Mathematics/Group B', 'Physics/Group C'])
    expect(lecturer.body.data).toEqual({ can_create: true, can_address_school: false, roles: [], courses: [{ id: mathId, name: 'Mathematics' }], groups: [{ id: groupAId, name: 'Group A', course_name: 'Mathematics' }] })
    expect((await get('alba', '/audiences')).status).toBe(403)
    expect((await get('gent', '/audiences')).status).toBe(403)
  })
})

describe('who an announcement reaches', () => {
  it('reaches everyone but the author when it is for the whole school', async () => {
    await publish('owner', WHOLE_SCHOOL)

    expect(await recipientsOf()).toEqual(MEMBER_KEYS.filter((key) => key !== 'owner').sort())
  })

  it('reaches the members with the role when it is for a role', async () => {
    await publish('admin', { audience_kind: 'ROLE', audience_role: 'GUARDIAN' })
    expect(await recipientsOf()).toEqual(['gent', 'gigi', 'gina', 'gita'])
  })

  it('reaches a group’s active students, their guardians and its lecturer', async () => {
    await publish('owner', toGroup(groupAId))

    // Cara left the group, so neither she nor her guardian Gita are reached; Teuta doesn't teach it
    expect(await recipientsOf()).toEqual(['alba', 'arben', 'gent'])
  })

  it('reaches a course through the people of all its groups', async () => {
    await publish('owner', toCourse(mathId))

    expect(await recipientsOf()).toEqual(['alba', 'arben', 'besa', 'gent', 'gina', 'teuta'])
  })

  it('reaches the lecturer of a group of the course who is not in the course’s other groups', async () => {
    await publish('owner', toCourse(physicsId))

    expect(await recipientsOf()).toEqual(['teuta'])
  })

  it('stops reaching a student who withdraws, a guardian who is unlinked and a lecturer who is replaced', async () => {
    const id = await publish('owner', toGroup(groupAId))
    expect(await recipientsOf()).toEqual(['alba', 'arben', 'gent'])
    await prisma.groupEnrolment.updateMany({ where: { group_id: groupAId, student: { first_name: 'alba' } }, data: { withdrawn_on: new Date('2026-01-01') } })

    expect(await recipientsOf()).toEqual(['arben'])
    await prisma.groupLecturerAssignment.updateMany({ where: { group_id: groupAId }, data: { end_date: new Date('2026-01-01') } })

    expect(await recipientsOf()).toEqual([])
    expect((await get('arben', `/${id}`)).status).toBe(404)
  })

  it('leaves out a removed member and a member without a login record in the group', async () => {
    await publish('owner', toCourse(mathId))
    await prisma.membership.update({ where: { id: membershipIds.besa }, data: { status: 'REMOVED' } })

    const detail = await get('owner', `/${(await get('owner')).body.data[0].id}`)

    expect(detail.body.data.read_counts).toEqual({ read_count: 0, audience_size: 5 })
  })

  it('shows an announcement only to people of its own organization', async () => {
    const yllkaOwner = await prisma.membership.findFirstOrThrow({ where: { organization_id: yllkaOrganizationId } })
    const id = await publish('owner', WHOLE_SCHOOL)
    const yllka = await loginAs('owner@yllka.test')

    expect((await request(app).get(`/api/organizations/${yllkaOrganizationId}/announcements`).set('Authorization', yllka)).body.data).toEqual([])
    expect((await request(app).get(`/api/organizations/${yllkaOrganizationId}/announcements/${id}`).set('Authorization', yllka)).status).toBe(404)
    expect((await request(app).get(`/api/organizations/${organizationId}/announcements/${id}`).set('Authorization', yllka)).status).toBe(403)
    expect(yllkaOwner.organization_id).toBe(yllkaOrganizationId)
  })

  it('answers 404 on the detail to someone it is not addressed to, like for one that does not exist', async () => {
    const id = await publish('owner', toGroup(groupAId))

    for (const key of ['lola', 'teuta', 'besa', 'gina', 'cara'] as const) {
      expect((await get(key, `/${id}`)).status, key).toBe(404)
      expect(await titlesOf(key)).toEqual([])
    }
    expect((await get('alba', '/00000000-0000-4000-8000-000000000009')).status).toBe(404)
    expect((await get('alba', '/not-an-id')).status).toBe(400)
  })
})

describe('draft, scheduled and published', () => {
  it('keeps a draft from its recipients and shows it to the people who manage it', async () => {
    const id = await publish('arben', toGroup(groupAId), { publish_mode: 'DRAFT' })

    expect(await recipientsOf()).toEqual([])
    expect(await titlesOf('alba')).toEqual([])
    expect((await get('alba', `/${id}`)).status).toBe(404)
    expect((await get('teuta', `/${id}`)).status).toBe(404)
    expect((await get('arben')).body.data).toMatchObject([{ id, status: 'DRAFT', publish_at: null, can_manage: true }])
    expect((await get('admin', `/${id}`)).body.data).toMatchObject({ status: 'DRAFT', read_counts: null })
  })

  it('keeps a scheduled announcement back until its time has passed, then shows it without any job', async () => {
    const publishAt = new Date(Date.now() + ONE_HOUR_MS).toISOString()
    const created = await post('owner', '', announcementBody(toGroup(groupAId), { publish_mode: 'SCHEDULED', publish_at: publishAt }))
    const id = created.body.data.id as string

    expect(created.body.data).toMatchObject({ status: 'SCHEDULED', publish_at: publishAt })
    expect(await unreadOf('alba')).toBe(0)
    expect(await titlesOf('alba')).toEqual([])
    expect((await get('alba', `/${id}`)).status).toBe(404)
    expect((await get('owner')).body.data).toMatchObject([{ id, status: 'SCHEDULED' }])

    await prisma.announcement.update({ where: { id }, data: { publish_at: new Date(Date.now() - 1000) } })

    expect(await unreadOf('alba')).toBe(1)
    expect(await titlesOf('alba')).toEqual(['Parents evening'])
    expect((await get('alba', `/${id}`)).body.data).toMatchObject({ status: 'PUBLISHED' })
    expect((await get('owner')).body.data).toMatchObject([{ id, status: 'PUBLISHED' }])
  })

  it('publishes a draft now or on a schedule, and a schedule can go back to a draft', async () => {
    const id = await publish('owner', toGroup(groupAId), { publish_mode: 'DRAFT' })
    const publishAt = new Date(Date.now() + ONE_HOUR_MS).toISOString()

    const scheduled = await put('owner', `/${id}`, announcementBody(toGroup(groupAId), { publish_mode: 'SCHEDULED', publish_at: publishAt }))
    expect(scheduled.body.data).toMatchObject({ status: 'SCHEDULED', publish_at: publishAt, edited_at: null })
    const back = await put('owner', `/${id}`, announcementBody(toGroup(groupAId), { publish_mode: 'DRAFT' }))
    expect(back.body.data).toMatchObject({ status: 'DRAFT', publish_at: null })
    const now = await put('owner', `/${id}`, announcementBody(toGroup(groupAId), { publish_mode: 'NOW' }))

    expect(now.body.data).toMatchObject({ status: 'PUBLISHED', edited_at: null })
    expect(await recipientsOf()).toEqual(['alba', 'arben', 'gent'])
  })

  it('lists newest publish first', async () => {
    const at = (offset: number) => new Date(Date.now() - offset * ONE_HOUR_MS)
    for (const [title, offset] of [['Middle', 2], ['Newest', 1], ['Oldest', 3]] as const) {
      const id = await publish('owner', WHOLE_SCHOOL, { title })
      await prisma.announcement.update({ where: { id }, data: { publish_at: at(offset) } })
    }

    expect(await titlesOf('alba')).toEqual(['Newest', 'Middle', 'Oldest'])
  })
})

describe('editing and archiving', () => {
  it('marks a change after publishing as edited, and not a change before', async () => {
    const draftId = await publish('owner', WHOLE_SCHOOL, { publish_mode: 'DRAFT' })
    const draftEdit = await put('owner', `/${draftId}`, announcementBody(WHOLE_SCHOOL, { title: 'Draft v2', publish_mode: 'DRAFT' }))
    expect(draftEdit.body.data).toMatchObject({ title: 'Draft v2', edited_at: null })
    const id = await publish('owner', WHOLE_SCHOOL)

    const edited = await put('owner', `/${id}`, announcementBody(WHOLE_SCHOOL, { title: 'Parents evening moved', body: 'Now on Saturday.', publish_mode: undefined }))

    expect(edited.status).toBe(200)
    expect(edited.body.data).toMatchObject({ title: 'Parents evening moved', body: 'Now on Saturday.', status: 'PUBLISHED' })
    expect(typeof edited.body.data.edited_at).toBe('string')
    expect((await get('alba', `/${id}`)).body.data).toMatchObject({ title: 'Parents evening moved', edited_at: edited.body.data.edited_at })
    expect((await get('alba')).body.data.find((item: AnnouncementSummary) => item.id === id).edited_at).toBe(edited.body.data.edited_at)
  })

  it('writes nothing and does not mark an edit when the title, message and audience are unchanged', async () => {
    const id = await publish('owner', WHOLE_SCHOOL)
    const before = await prisma.announcement.findUniqueOrThrow({ where: { id } })

    const response = await put('owner', `/${id}`, announcementBody(WHOLE_SCHOOL, { publish_mode: undefined }))

    expect(response.status).toBe(200)
    expect(response.body.data.edited_at).toBeNull()
    expect(await prisma.announcement.findUniqueOrThrow({ where: { id } })).toEqual(before)
  })

  it('does not reschedule one that is out', async () => {
    const id = await publish('owner', WHOLE_SCHOOL)

    const response = await put('owner', `/${id}`, announcementBody(WHOLE_SCHOOL, { publish_mode: 'DRAFT' }))

    expect(response.status).toBe(400)
  })

  it('lets a lecturer change the text of their own announcement after it is out, but not who it is for', async () => {
    const id = await publish('arben', toGroup(groupAId))

    const text = await put('arben', `/${id}`, announcementBody(toGroup(groupAId), { title: 'Homework moved', publish_mode: undefined }))
    const audience = await put('arben', `/${id}`, announcementBody(toCourse(mathId), { publish_mode: undefined }))

    expect(text.status).toBe(200)
    expect(text.body.data).toMatchObject({ title: 'Homework moved', can_change_audience: false })
    expect(audience.status).toBe(403)
    expect((await get('arben', `/${id}`)).body.data.audience_kind).toBe('GROUP')
  })

  it('lets a lecturer change the audience of their own draft to another group they teach, not one they do not', async () => {
    const id = await publish('teuta', toGroup(groupBId), { publish_mode: 'DRAFT' })

    const own = await put('teuta', `/${id}`, announcementBody(toGroup(groupCId), { publish_mode: 'DRAFT' }))
    const school = await put('teuta', `/${id}`, announcementBody(WHOLE_SCHOOL, { publish_mode: 'DRAFT' }))

    expect(own.body.data).toMatchObject({ audience_kind: 'GROUP', group: { id: groupCId }, can_change_audience: true })
    expect(school.status).toBe(403)
  })

  it('lets admins change who an announcement is for after it is out', async () => {
    const id = await publish('arben', toGroup(groupAId))
    expect(await recipientsOf()).toEqual(['alba', 'gent'])

    const response = await put('admin', `/${id}`, announcementBody(toCourse(mathId), { publish_mode: undefined }))

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ audience_kind: 'COURSE', can_change_audience: true })
    expect(await recipientsOf()).toEqual(['alba', 'besa', 'gent', 'gina', 'teuta'])
  })

  it('lets an author manage only their own, while the owner and admins manage all', async () => {
    const mine = await publish('arben', toCourse(mathId))
    const theirs = await publish('teuta', toGroup(groupBId))

    // Teuta is addressed by Arben's course announcement and so can read it, but not change it
    expect((await get('teuta', `/${mine}`)).body.data).toMatchObject({ can_manage: false, read_counts: null })
    expect((await put('teuta', `/${mine}`, announcementBody(toCourse(mathId), { publish_mode: undefined }))).status).toBe(403)
    expect((await post('teuta', `/${mine}/archive`)).status).toBe(403)
    // Arben isn't addressed by Teuta's group announcement and can't see it
    expect((await put('arben', `/${theirs}`, announcementBody(toGroup(groupBId), { publish_mode: undefined }))).status).toBe(404)
    expect((await post('arben', `/${theirs}/archive`)).status).toBe(404)
    expect((await put('admin', `/${mine}`, announcementBody(toCourse(mathId), { title: 'Admin edit', publish_mode: undefined }))).status).toBe(200)
    expect((await post('owner', `/${theirs}/archive`)).status).toBe(200)
  })

  it('refuses students and guardians editing and archiving', async () => {
    const id = await publish('owner', WHOLE_SCHOOL)

    for (const key of ['alba', 'gent'] as const) {
      expect((await put(key, `/${id}`, announcementBody(WHOLE_SCHOOL, { publish_mode: undefined }))).status).toBe(403)
      expect((await post(key, `/${id}/archive`)).status).toBe(403)
    }
  })

  it('archives instead of deleting: recipients lose it, its managers keep it, and it can no longer be edited', async () => {
    const id = await publish('arben', toGroup(groupAId))
    expect(await unreadOf('alba')).toBe(1)

    const archived = await post('arben', `/${id}/archive`)

    expect(archived.status).toBe(200)
    expect(archived.body.data).toMatchObject({ status: 'ARCHIVED' })
    expect(await unreadOf('alba')).toBe(0)
    expect(await titlesOf('alba')).toEqual([])
    expect((await get('alba', `/${id}`)).status).toBe(404)
    expect((await get('arben')).body.data).toMatchObject([{ id, status: 'ARCHIVED' }])
    expect((await get('admin', `/${id}`)).body.data).toMatchObject({ status: 'ARCHIVED' })
    expect((await put('arben', `/${id}`, announcementBody(toGroup(groupAId), { publish_mode: undefined }))).status).toBe(409)
    expect(await prisma.announcement.count({ where: { id } })).toBe(1)
    expect((await post('arben', `/${id}/archive`)).status).toBe(200)
  })
})

describe('reading', () => {
  it('marks an announcement read when it is opened, once, however often it is opened', async () => {
    const id = await publish('owner', toGroup(groupAId))
    const listed = async () => (await get('alba')).body.data.find((item: AnnouncementSummary) => item.id === id) as AnnouncementSummary
    expect(await listed()).toMatchObject({ is_unread: true })
    expect(await unreadOf('alba')).toBe(1)

    const first = await get('alba', `/${id}`)
    const readAt = (await prisma.announcementRead.findFirstOrThrow({ where: { announcement_id: id, membership_id: membershipIds.alba } })).read_at
    const second = await get('alba', `/${id}`)

    expect(first.status).toBe(200)
    expect(first.body.data).toMatchObject({ body: 'Join us on Friday at 18:00.', is_unread: false, read_counts: null, can_manage: false })
    expect(second.status).toBe(200)
    expect(await prisma.announcementRead.count({ where: { announcement_id: id } })).toBe(1)
    expect((await prisma.announcementRead.findFirstOrThrow({ where: { announcement_id: id } })).read_at).toEqual(readAt)
    expect(await listed()).toMatchObject({ is_unread: false })
    expect(await unreadOf('alba')).toBe(0)
    expect(await unreadOf('gent')).toBe(1)
  })

  it('does not count the author, or a manager who is not addressed, as having read it', async () => {
    const id = await publish('arben', toGroup(groupAId))

    await get('arben', `/${id}`)
    await get('owner', `/${id}`)

    expect(await prisma.announcementRead.count({ where: { announcement_id: id } })).toBe(0)
    expect(await unreadOf('arben')).toBe(0)
    expect((await get('arben')).body.data[0].is_unread).toBe(false)
  })

  it('counts unread announcements per member and leaves out the ones they wrote', async () => {
    await publish('owner', WHOLE_SCHOOL, { title: 'One' })
    const two = await publish('arben', toGroup(groupAId), { title: 'Two' })
    await publish('owner', toGroup(groupBId), { title: 'Three' })

    expect(await unreadOf('alba')).toBe(2)
    expect(await unreadOf('arben')).toBe(1)
    expect(await unreadOf('owner')).toBe(0)
    expect(await unreadOf('lola')).toBe(1)

    await get('alba', `/${two}`)

    expect(await unreadOf('alba')).toBe(1)
  })

  it('shows its managers how many of the people it reached opened it, without the author', async () => {
    const id = await publish('arben', toCourse(mathId))
    // Alba, Besa, Gent, Gina and Teuta are reached; Arben, the author, is not counted
    const counts = async (key: MemberKey) => (await get(key, `/${id}`)).body.data.read_counts

    expect(await counts('arben')).toEqual({ read_count: 0, audience_size: 5 })

    await get('alba', `/${id}`)
    await get('gina', `/${id}`)
    await get('arben', `/${id}`)
    await get('lola', `/${id}`)

    expect(await counts('arben')).toEqual({ read_count: 2, audience_size: 5 })
    expect(await counts('owner')).toEqual({ read_count: 2, audience_size: 5 })
    expect(await counts('admin')).toEqual({ read_count: 2, audience_size: 5 })
    expect((await get('alba', `/${id}`)).body.data.read_counts).toBeNull()
  })

  it('counts a whole school announcement against every active member but its author', async () => {
    const id = await publish('owner', WHOLE_SCHOOL)
    await get('admin', `/${id}`)

    expect((await get('owner', `/${id}`)).body.data.read_counts).toEqual({ read_count: 1, audience_size: MEMBER_KEYS.length - 1 })
  })

  it('does not count a read by someone who left the audience since', async () => {
    const id = await publish('owner', toGroup(groupAId))
    await get('alba', `/${id}`)
    await get('gent', `/${id}`)
    await get('arben', `/${id}`)
    expect((await get('owner', `/${id}`)).body.data.read_counts).toEqual({ read_count: 3, audience_size: 3 })
    await prisma.groupEnrolment.updateMany({ where: { group_id: groupAId, student: { first_name: 'alba' } }, data: { withdrawn_on: new Date('2026-01-01') } })

    // Alba and her guardian Gent left the audience, and their reads with it
    expect((await get('owner', `/${id}`)).body.data.read_counts).toEqual({ read_count: 1, audience_size: 1 })
  })

  it('counts a guardian of two enrolled students once, for the audience and for the reads', async () => {
    const dina = await prisma.student.create({ data: { organization_id: organizationId, first_name: 'Dina', last_name: 'Person', student_number: 'STU-9' } })
    await prisma.studentGuardian.create({ data: { student_id: dina.id, guardian_id: (await prisma.guardian.findFirstOrThrow({ where: { organization_id: organizationId, first_name: 'gent' } })).id, relationship: 'MOTHER' } })
    await enrol(groupAId, dina.id)
    const id = await publish('owner', toGroup(groupAId))
    await get('gent', `/${id}`)

    // Alba, Arben and Gent, who is linked to both Alba and Dina
    expect((await get('owner', `/${id}`)).body.data.read_counts).toEqual({ read_count: 1, audience_size: 3 })
  })

  it('refuses an unauthenticated request', async () => {
    expect((await request(app).get(base())).status).toBe(401)
    expect((await request(app).get(`${base()}/unread-count`)).status).toBe(401)
  })
})
