import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import type { StudentTest, Test, TestGroup, TestSheet } from '@shigjetademy/shared/tests'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

type MemberKey = 'owner' | 'admin' | 'clerk' | 'arben' | 'teuta' | 'alba' | 'dren' | 'besa' | 'gent'

const ROLE_OF: Record<MemberKey, 'OWNER' | 'ADMIN' | 'LECTURER' | 'STUDENT' | 'GUARDIAN'> = {
  owner: 'OWNER',
  admin: 'ADMIN',
  clerk: 'ADMIN',
  arben: 'LECTURER',
  teuta: 'LECTURER',
  alba: 'STUDENT',
  dren: 'STUDENT',
  besa: 'STUDENT',
  gent: 'GUARDIAN',
}

const MEMBER_KEYS = Object.keys(ROLE_OF) as MemberKey[]

const emailOf = (key: MemberKey) => `${key}@oxford.test`

let organizationId: string
let groupAId: string
let groupBId: string
const studentIds = {} as Record<'alba' | 'dren' | 'besa', string>

const base = () => `/api/organizations/${organizationId}/tests`

const authed = (key: MemberKey) => loginAs(emailOf(key))

const get = async (key: MemberKey, path = '', query: object = {}) => request(app).get(`${base()}${path}`).query(query).set('Authorization', await authed(key))

const HELD_AT = '2030-11-20T09:00:00.000Z'

const testBody = (groupId: string, overrides: object = {}) => ({ group_id: groupId, title: 'Unit 3 test', description: 'Chapters 4 to 6.', held_at: HELD_AT, max_points: 40, ...overrides })

const setTest = async (key: MemberKey, body: object) => request(app).post(base()).set('Authorization', await authed(key)).send(body)

const setOk = async (key: MemberKey, groupId: string, overrides: object = {}) => {
  const response = await setTest(key, testBody(groupId, overrides))
  expect(response.status, JSON.stringify(response.body)).toBe(201)
  return response.body.data as Test
}

const edit = async (key: MemberKey, testId: string, body: object) => request(app).put(`${base()}/${testId}`).set('Authorization', await authed(key)).send(body)

const remove = async (key: MemberKey, testId: string) => request(app).delete(`${base()}/${testId}`).set('Authorization', await authed(key))

const sheetOf = async (key: MemberKey, testId: string) => {
  const response = await get(key, `/${testId}`)
  expect(response.status, JSON.stringify(response.body)).toBe(200)
  return response.body.data as TestSheet
}

const record = async (key: MemberKey, testId: string, results: object[]) => request(app).put(`${base()}/${testId}/results`).set('Authorization', await authed(key)).send({ results })

type EntryParams = {
  studentId: string
  points?: number | null
  isAbsent?: boolean
  feedback?: string
}

const entry = ({ studentId, points = null, isAbsent = false, feedback = '' }: EntryParams) => ({ student_id: studentId, points, is_absent: isAbsent, feedback })

/** Each row's student first name and their result, in sheet order */
const resultsOf = (sheet: TestSheet) => sheet.rows.map((row) => ({ name: row.student.first_name, points: row.result?.points ?? null, is_absent: row.result?.is_absent ?? null, feedback: row.result?.feedback ?? null }))

const testsIn = async (key: MemberKey, groupId: string) => {
  const response = await get(key, '', { group_id: groupId })
  expect(response.status, JSON.stringify(response.body)).toBe(200)
  return response.body.data as Test[]
}

beforeEach(async () => {
  const users = {} as Record<MemberKey, { id: string }>
  for (const key of MEMBER_KEYS) {
    users[key] = await createUser({ email: emailOf(key) })
    await prisma.user.update({ where: { id: users[key].id }, data: { first_name: key[0].toUpperCase() + key.slice(1), last_name: 'Person' } })
  }
  const organization = await createOrganization({
    name: 'Oxford Academy',
    ownerId: users.owner.id,
    members: MEMBER_KEYS.filter((key) => key !== 'owner').map((key) => ({ userId: users[key].id, role: ROLE_OF[key], permissions: key === 'admin' ? ['MANAGE_TESTS'] : [] })),
  })
  organizationId = organization.id
  const mathId = (await createCourse({ organizationId, name: 'Mathematics' })).id
  const yearId = (await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true } })).id
  const lecturerOf = async (key: MemberKey) =>
    (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: key, last_name: 'Person', employment_type: 'FULL_TIME', user_id: users[key].id } })).id
  const studentOf = async (key: MemberKey, number: string) =>
    (await prisma.student.create({ data: { organization_id: organizationId, first_name: key[0].toUpperCase() + key.slice(1), last_name: 'Person', student_number: number, user_id: users[key].id } })).id
  const addGroup = async (name: string, lecturerId: string) => {
    const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: mathId, name, academic_year_id: yearId } })
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: lecturerId, start_date: new Date('2020-01-01') } })
    return group.id
  }
  // Mathematics: group A (Arben: Alba and Dren) and group B (Teuta: Besa)
  groupAId = await addGroup('Group A', await lecturerOf('arben'))
  groupBId = await addGroup('Group B', await lecturerOf('teuta'))
  studentIds.alba = await studentOf('alba', 'STU-1')
  studentIds.dren = await studentOf('dren', 'STU-3')
  studentIds.besa = await studentOf('besa', 'STU-2')
  await prisma.groupEnrolment.create({ data: { group_id: groupAId, student_id: studentIds.alba, enrolled_on: new Date('2020-01-01') } })
  await prisma.groupEnrolment.create({ data: { group_id: groupAId, student_id: studentIds.dren, enrolled_on: new Date('2020-01-01') } })
  await prisma.groupEnrolment.create({ data: { group_id: groupBId, student_id: studentIds.besa, enrolled_on: new Date('2020-01-01') } })
})

describe('setting tests', () => {
  it('lets a lecturer set a test for a group they teach, and lists the group’s tests by date', async () => {
    await setOk('arben', groupAId)
    await setOk('arben', groupAId, { title: 'Quiz 1', description: '', held_at: '2030-10-01T09:00:00.000Z' })

    const tests = await testsIn('arben', groupAId)

    expect(tests.map((test) => test.title)).toEqual(['Quiz 1', 'Unit 3 test'])
    expect(tests[0].description).toBeNull()
    expect(tests[1]).toMatchObject({
      title: 'Unit 3 test',
      description: 'Chapters 4 to 6.',
      held_at: HELD_AT,
      max_points: 40,
      group: { id: groupAId, name: 'Group A', course_name: 'Mathematics' },
      author: { first_name: 'Arben', last_name: 'Person' },
      can_edit: true,
      can_remove: true,
    })
  })

  it('refuses a missing title, a bad date and points out of range', async () => {
    const response = await setTest('arben', testBody(groupAId, { title: ' ', held_at: 'tomorrow', max_points: 0 }))

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors).toMatchObject({ title: ['Write a title.'], held_at: ['Choose the day and time of the test.'], max_points: ['Points must be at least 1.'] })
    expect(await prisma.test.count()).toBe(0)
  })

  it('lists the groups a lecturer teaches, and every group for staff with Tests', async () => {
    const forArben = (await get('arben', '/groups')).body.data as TestGroup[]
    const forAdmin = (await get('admin', '/groups')).body.data as TestGroup[]

    expect(forArben).toEqual([{ id: groupAId, name: 'Group A', course_name: 'Mathematics', is_archived: false, can_set: true }])
    expect(forAdmin.map((group) => group.name)).toEqual(['Group A', 'Group B'])
  })

  it('lets the owner and an admin with Tests set tests for any group', async () => {
    await setOk('owner', groupBId)
    await setOk('admin', groupAId)

    expect((await testsIn('teuta', groupBId)).map((test) => test.author.first_name)).toEqual(['Owner'])
  })

  it('refuses a lecturer on a group they don’t teach, and admins without Tests, guardians and students', async () => {
    expect((await setTest('teuta', testBody(groupAId))).status).toBe(403)
    expect((await setTest('clerk', testBody(groupAId))).status).toBe(403)
    expect((await setTest('gent', testBody(groupAId))).status).toBe(403)
    expect((await setTest('alba', testBody(groupAId))).status).toBe(403)
    expect((await get('teuta', '', { group_id: groupAId })).status).toBe(404)
    expect((await get('alba', '', { group_id: groupAId })).status).toBe(403)
    expect((await get('clerk', '/groups')).status).toBe(403)
    expect(await prisma.test.count()).toBe(0)
  })

  it('answers 404 for a group of another organization or one that doesn’t exist', async () => {
    expect((await setTest('owner', testBody('00000000-0000-4000-8000-000000000006'))).status).toBe(404)
  })
})

describe('changing and removing tests', () => {
  it('lets the group’s lecturer edit a test, keeping its group', async () => {
    const test = await setOk('arben', groupAId)

    const response = await edit('arben', test.id, { title: 'Unit 3 test (retake)', description: '', held_at: '2030-11-21T09:00:00.000Z', max_points: 50 })

    expect(response.status, JSON.stringify(response.body)).toBe(200)
    expect(response.body.data).toMatchObject({ title: 'Unit 3 test (retake)', description: null, held_at: '2030-11-21T09:00:00.000Z', max_points: 50, group: { id: groupAId } })
  })

  it('lets the group’s lecturer remove a test', async () => {
    const test = await setOk('arben', groupAId)

    const response = await remove('arben', test.id)

    expect(response.status).toBe(200)
    expect(await testsIn('arben', groupAId)).toEqual([])
  })

  it('answers 404 to a lecturer of another group and 403 to a student of the group', async () => {
    const test = await setOk('arben', groupAId)
    const details = { title: 'Taken over', description: '', held_at: HELD_AT, max_points: 10 }

    expect((await edit('teuta', test.id, details)).status).toBe(404)
    expect((await remove('teuta', test.id)).status).toBe(404)
    expect((await edit('alba', test.id, details)).status).toBe(403)
    expect((await remove('alba', test.id)).status).toBe(403)
    expect((await testsIn('arben', groupAId)).map((item) => item.title)).toEqual(['Unit 3 test'])
  })

  it('keeps an archived group’s tests readable and takes no new tests or changes', async () => {
    const test = await setOk('arben', groupAId)
    await prisma.group.update({ where: { id: groupAId }, data: { status: 'ARCHIVED' } })

    expect((await setTest('arben', testBody(groupAId))).status).toBe(403)
    expect((await edit('arben', test.id, { title: 'Changed', description: '', held_at: HELD_AT, max_points: 10 })).status).toBe(403)
    expect((await remove('arben', test.id)).status).toBe(403)
    expect(await testsIn('arben', groupAId)).toEqual([expect.objectContaining({ id: test.id, can_edit: false, can_remove: false })])
  })
})

describe('recording results', () => {
  it('shows the group’s setters every actively enrolled student by name, with no result yet', async () => {
    const test = await setOk('arben', groupAId)

    const sheet = await sheetOf('arben', test.id)

    expect(sheet).toMatchObject({ id: test.id, title: 'Unit 3 test', max_points: 40 })
    expect(sheet.rows.map((row) => row.student)).toEqual([
      { id: studentIds.alba, first_name: 'Alba', last_name: 'Person', student_number: 'STU-1' },
      { id: studentIds.dren, first_name: 'Dren', last_name: 'Person', student_number: 'STU-3' },
    ])
    expect(sheet.rows.map((row) => row.result)).toEqual([null, null])
  })

  it('saves the whole sheet at once: points, absent and a note per student', async () => {
    const test = await setOk('arben', groupAId)

    const response = await record('arben', test.id, [entry({ studentId: studentIds.alba, points: 36, feedback: 'Strong on limits.' }), entry({ studentId: studentIds.dren, isAbsent: true })])

    expect(response.status, JSON.stringify(response.body)).toBe(200)
    expect(resultsOf(response.body.data as TestSheet)).toEqual([
      { name: 'Alba', points: 36, is_absent: false, feedback: 'Strong on limits.' },
      { name: 'Dren', points: null, is_absent: true, feedback: null },
    ])
    expect(resultsOf(await sheetOf('arben', test.id))).toEqual(resultsOf(response.body.data as TestSheet))
  })

  it('changes saved results later, and clears one left with neither points nor absent', async () => {
    const test = await setOk('arben', groupAId)
    await record('arben', test.id, [entry({ studentId: studentIds.alba, points: 36 }), entry({ studentId: studentIds.dren, isAbsent: true })])

    const response = await record('admin', test.id, [entry({ studentId: studentIds.alba }), entry({ studentId: studentIds.dren, points: 20, feedback: 'Sat it late.' })])

    expect(response.status, JSON.stringify(response.body)).toBe(200)
    expect(resultsOf(response.body.data as TestSheet)).toEqual([
      { name: 'Alba', points: null, is_absent: null, feedback: null },
      { name: 'Dren', points: 20, is_absent: false, feedback: 'Sat it late.' },
    ])
  })

  it('refuses points over the max, points for an absent student and a note without a result', async () => {
    const test = await setOk('arben', groupAId)

    const overMax = await record('arben', test.id, [entry({ studentId: studentIds.alba, points: 41 })])
    const absentWithPoints = await record('arben', test.id, [entry({ studentId: studentIds.alba, points: 10, isAbsent: true })])
    const noteOnly = await record('arben', test.id, [entry({ studentId: studentIds.alba, feedback: 'Hm.' })])

    expect(overMax.status).toBe(400)
    expect(overMax.body.error).toBe('Points can be at most 40.')
    expect(absentWithPoints.status).toBe(400)
    expect(noteOnly.status).toBe(400)
    expect(await prisma.testResult.count()).toBe(0)
  })

  it('refuses a student who is not actively enrolled in the group, and saves nothing', async () => {
    const test = await setOk('arben', groupAId)
    await prisma.groupEnrolment.updateMany({ where: { student_id: studentIds.dren }, data: { withdrawn_on: new Date('2026-01-01') } })

    const otherGroup = await record('arben', test.id, [entry({ studentId: studentIds.alba, points: 30 }), entry({ studentId: studentIds.besa, points: 30 })])
    const withdrawn = await record('arben', test.id, [entry({ studentId: studentIds.dren, points: 30 })])

    expect(otherGroup.status).toBe(400)
    expect(otherGroup.body.error).toBe('Only the group’s enrolled students get results.')
    expect(withdrawn.status).toBe(400)
    expect(await prisma.testResult.count()).toBe(0)
  })

  it('keeps the max at or above points already given', async () => {
    const test = await setOk('arben', groupAId)
    await record('arben', test.id, [entry({ studentId: studentIds.alba, points: 36 })])

    const response = await edit('arben', test.id, { title: 'Unit 3 test', description: '', held_at: HELD_AT, max_points: 30 })

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors).toEqual({ max_points: ['A student already has 36 points; the max can’t go below that.'] })
  })

  it('removes a test with its results', async () => {
    const test = await setOk('arben', groupAId)
    await record('arben', test.id, [entry({ studentId: studentIds.alba, points: 36 })])

    await remove('arben', test.id)

    expect(await prisma.testResult.count()).toBe(0)
  })

  it('answers 404 to a lecturer of another group, 403 to students, and takes no results in an archived group', async () => {
    const test = await setOk('arben', groupAId)
    const results = [entry({ studentId: studentIds.alba, points: 36 })]

    expect((await get('teuta', `/${test.id}`)).status).toBe(404)
    expect((await record('teuta', test.id, results)).status).toBe(404)
    expect((await get('alba', `/${test.id}`)).status).toBe(403)
    expect((await record('alba', test.id, results)).status).toBe(403)
    await prisma.group.update({ where: { id: groupAId }, data: { status: 'ARCHIVED' } })
    expect((await record('arben', test.id, results)).status).toBe(403)
    expect((await sheetOf('arben', test.id)).can_edit).toBe(false)
    expect(await prisma.testResult.count()).toBe(0)
  })
})

describe('a student’s own tests', () => {
  const mine = async (key: MemberKey) => {
    const response = await get(key, '/mine')
    expect(response.status, JSON.stringify(response.body)).toBe(200)
    return response.body.data as StudentTest[]
  }

  it('lists the tests of the student’s groups, soonest first, each with only their own result', async () => {
    const later = await setOk('arben', groupAId, { title: 'Unit 3 test' })
    const earlier = await setOk('arben', groupAId, { title: 'Quiz 1', held_at: '2026-10-01T09:00:00.000Z' })
    await setOk('teuta', groupBId, { title: 'Group B test' })
    await record('arben', earlier.id, [entry({ studentId: studentIds.alba, points: 18, feedback: 'Well done.' }), entry({ studentId: studentIds.dren, isAbsent: true })])

    const albaTests = await mine('alba')
    const drenTests = await mine('dren')

    expect(albaTests.map((test) => test.title)).toEqual(['Quiz 1', 'Unit 3 test'])
    expect(albaTests[0]).toMatchObject({ id: earlier.id, can_edit: false, can_remove: false, result: { points: 18, is_absent: false, feedback: 'Well done.' } })
    expect(albaTests[1]).toMatchObject({ id: later.id, result: null })
    expect(drenTests[0].result).toMatchObject({ points: null, is_absent: true })
  })

  it('is only for students with a student record', async () => {
    expect((await get('arben', '/mine')).status).toBe(403)
    await prisma.student.updateMany({ where: { id: studentIds.alba }, data: { user_id: null } })
    expect((await get('alba', '/mine')).status).toBe(403)
  })
})
