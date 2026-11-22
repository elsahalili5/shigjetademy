import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { todayDay } from '@shigjetademy/shared/calendar-day'
import type { GradeOverview, Gradebook, GradeGroup, GroupReport, StudentGroupGrades, StudentReport } from '@shigjetademy/shared/grades'
import { app } from '../../app.ts'
import { addDays, toDate } from '@lib/calendar-day.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

type MemberKey = 'owner' | 'admin' | 'clerk' | 'arben' | 'teuta' | 'alba' | 'dren' | 'erza' | 'besa' | 'gent'

const ROLE_OF: Record<MemberKey, 'OWNER' | 'ADMIN' | 'LECTURER' | 'STUDENT' | 'GUARDIAN'> = {
  owner: 'OWNER',
  admin: 'ADMIN',
  clerk: 'ADMIN',
  arben: 'LECTURER',
  teuta: 'LECTURER',
  alba: 'STUDENT',
  dren: 'STUDENT',
  erza: 'STUDENT',
  besa: 'STUDENT',
  gent: 'GUARDIAN',
}

const MEMBER_KEYS = Object.keys(ROLE_OF) as MemberKey[]

const emailOf = (key: MemberKey) => `${key}@oxford.test`

const PAST = new Date('2020-11-20T16:00:00.000Z')
const EARLIER_PAST = new Date('2020-10-20T16:00:00.000Z')
const FUTURE = new Date('2030-11-20T16:00:00.000Z')

let organizationId: string
let groupAId: string
let groupBId: string
let authorId: string
let yearId: string
const studentIds = {} as Record<'alba' | 'dren' | 'erza' | 'besa', string>

const base = () => `/api/organizations/${organizationId}/grades`

const get = async (key: MemberKey, path = '', query: object = {}) => request(app).get(`${base()}${path}`).query(query).set('Authorization', await loginAs(emailOf(key)))

type AddAssignmentParams = {
  groupId: string
  title: string
  dueAt: Date
  maxPoints: number | null
}

const addAssignment = async ({ groupId, title, dueAt, maxPoints }: AddAssignmentParams) =>
  (
    await prisma.assignment.create({
      data: { organization_id: organizationId, group_id: groupId, author_membership_id: authorId, title, instructions: 'Answer the questions.', due_at: dueAt, max_points: maxPoints },
    })
  ).id

type HandInParams = {
  assignmentId: string
  studentId: string
  mark?: { points: number | null; feedback: string | null }
}

const addHandIn = ({ assignmentId, studentId, mark }: HandInParams) =>
  prisma.assignmentSubmission.create({
    data: {
      organization_id: organizationId,
      assignment_id: assignmentId,
      student_id: studentId,
      text: 'My answers.',
      submitted_at: new Date('2020-10-01T10:00:00.000Z'),
      ...(mark ? { points: mark.points, feedback: mark.feedback, marked_at: new Date('2020-10-02T10:00:00.000Z') } : {}),
    },
  })

type AddTestParams = {
  groupId: string
  title: string
  heldAt: Date
  maxPoints: number
}

const addTest = async ({ groupId, title, heldAt, maxPoints }: AddTestParams) =>
  (await prisma.test.create({ data: { organization_id: organizationId, group_id: groupId, author_membership_id: authorId, title, held_at: heldAt, max_points: maxPoints } })).id

type AddResultParams = {
  testId: string
  studentId: string
  points?: number | null
  isAbsent?: boolean
  feedback?: string | null
}

const addResult = ({ testId, studentId, points = null, isAbsent = false, feedback = null }: AddResultParams) =>
  prisma.testResult.create({ data: { organization_id: organizationId, test_id: testId, student_id: studentId, points, is_absent: isAbsent, feedback, recorded_at: new Date('2020-11-01T10:00:00.000Z') } })

const gradebookOf = async (key: MemberKey, groupId: string) => {
  const response = await get(key, '', { group_id: groupId })
  expect(response.status, JSON.stringify(response.body)).toBe(200)
  return response.body.data as Gradebook
}

beforeEach(async () => {
  const users = {} as Record<MemberKey, { id: string }>
  for (const key of MEMBER_KEYS) {
    users[key] = await createUser({ email: emailOf(key) })
  }
  const organization = await createOrganization({
    name: 'Oxford Academy',
    ownerId: users.owner.id,
    members: MEMBER_KEYS.filter((key) => key !== 'owner').map((key) => ({ userId: users[key].id, role: ROLE_OF[key], permissions: key === 'admin' ? ['MANAGE_GRADES'] : [] })),
  })
  organizationId = organization.id
  authorId = (await prisma.membership.findFirstOrThrow({ where: { organization_id: organizationId, user_id: users.owner.id } })).id
  const mathId = (await createCourse({ organizationId, name: 'Mathematics' })).id
  yearId = (await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true } })).id
  const lecturerOf = async (key: MemberKey) =>
    (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: key, last_name: 'Person', employment_type: 'FULL_TIME', user_id: users[key].id } })).id
  const studentOf = async (key: 'alba' | 'dren' | 'erza' | 'besa', number: string) => {
    studentIds[key] = (
      await prisma.student.create({ data: { organization_id: organizationId, first_name: key[0].toUpperCase() + key.slice(1), last_name: 'Person', student_number: number, user_id: users[key].id } })
    ).id
    return studentIds[key]
  }
  const addGroup = async (name: string, lecturerId: string) => {
    const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: mathId, name, academic_year_id: yearId } })
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: lecturerId, start_date: new Date('2020-01-01') } })
    return group.id
  }
  // Mathematics: group A (Arben: Alba and Dren, and Erza who withdrew) and group B (Teuta: Besa)
  groupAId = await addGroup('Group A', await lecturerOf('arben'))
  groupBId = await addGroup('Group B', await lecturerOf('teuta'))
  await prisma.groupEnrolment.create({ data: { group_id: groupAId, student_id: await studentOf('alba', 'STU-1'), enrolled_on: new Date('2020-01-01') } })
  await prisma.groupEnrolment.create({ data: { group_id: groupAId, student_id: await studentOf('dren', 'STU-3'), enrolled_on: new Date('2020-01-01') } })
  await prisma.groupEnrolment.create({ data: { group_id: groupAId, student_id: await studentOf('erza', 'STU-4'), enrolled_on: new Date('2020-01-01'), withdrawn_on: new Date('2020-06-01') } })
  await prisma.groupEnrolment.create({ data: { group_id: groupBId, student_id: await studentOf('besa', 'STU-2'), enrolled_on: new Date('2020-01-01') } })
})

describe('gradebook groups', () => {
  it('lists a lecturer only the groups they teach, and the owner and admins with Grades every group', async () => {
    const groupsOf = async (key: MemberKey) => {
      const response = await get(key, '/groups')
      expect(response.status, JSON.stringify(response.body)).toBe(200)
      return (response.body.data as GradeGroup[]).map((group) => group.name)
    }

    expect(await groupsOf('arben')).toEqual(['Group A'])
    expect(await groupsOf('owner')).toEqual(['Group A', 'Group B'])
    expect(await groupsOf('admin')).toEqual(['Group A', 'Group B'])
  })

  it('refuses admins without Grades, students and guardians', async () => {
    for (const key of ['clerk', 'alba', 'gent'] as const) {
      expect((await get(key, '/groups')).status, key).toBe(403)
      expect((await get(key, '', { group_id: groupAId })).status, key).toBe(403)
    }
  })

  it('answers 404 for a group the lecturer doesn’t teach', async () => {
    expect((await get('arben', '', { group_id: groupBId })).status).toBe(404)
  })
})

describe('a group’s gradebook', () => {
  it('has a column per assignment with points by due date, and a row per actively enrolled student', async () => {
    await addAssignment({ groupId: groupAId, title: 'Derivatives quiz', dueAt: FUTURE, maxPoints: 10 })
    await addAssignment({ groupId: groupAId, title: 'Limits worksheet', dueAt: EARLIER_PAST, maxPoints: 20 })
    await addAssignment({ groupId: groupAId, title: 'Reflection', dueAt: PAST, maxPoints: null })
    await addAssignment({ groupId: groupBId, title: 'Other group’s work', dueAt: PAST, maxPoints: 10 })

    const gradebook = await gradebookOf('arben', groupAId)

    expect(gradebook.group).toEqual({ id: groupAId, name: 'Group A', course_name: 'Mathematics', is_archived: false })
    expect(gradebook.columns.map((column) => [column.kind, column.title, column.max_points])).toEqual([
      ['ASSIGNMENT', 'Limits worksheet', 20],
      ['ASSIGNMENT', 'Derivatives quiz', 10],
    ])
    expect(gradebook.rows.map((row) => row.student.first_name)).toEqual(['Alba', 'Dren'])
  })

  it('marks each cell: points with feedback, handed in, missing past the due date, or not due yet', async () => {
    const limitsId = await addAssignment({ groupId: groupAId, title: 'Limits worksheet', dueAt: EARLIER_PAST, maxPoints: 20 })
    const seriesId = await addAssignment({ groupId: groupAId, title: 'Series worksheet', dueAt: PAST, maxPoints: 10 })
    const quizId = await addAssignment({ groupId: groupAId, title: 'Derivatives quiz', dueAt: FUTURE, maxPoints: 10 })
    await addHandIn({ assignmentId: limitsId, studentId: studentIds.alba, mark: { points: 15, feedback: 'Check question 4.' } })
    await addHandIn({ assignmentId: seriesId, studentId: studentIds.alba })
    await addHandIn({ assignmentId: quizId, studentId: studentIds.dren })

    const { rows } = await gradebookOf('owner', groupAId)

    expect(rows[0].cells).toEqual([
      { column_id: limitsId, status: 'MARKED', points: 15, feedback: 'Check question 4.' },
      { column_id: seriesId, status: 'HANDED_IN', points: null, feedback: null },
      { column_id: quizId, status: 'NOT_DUE', points: null, feedback: null },
    ])
    expect(rows[1].cells.map((cell) => cell.status)).toEqual(['MISSING', 'MISSING', 'HANDED_IN'])
  })

  it('averages points over max points of marked work only, and has no average before anything is marked', async () => {
    const limitsId = await addAssignment({ groupId: groupAId, title: 'Limits worksheet', dueAt: EARLIER_PAST, maxPoints: 20 })
    const seriesId = await addAssignment({ groupId: groupAId, title: 'Series worksheet', dueAt: PAST, maxPoints: 10 })
    await addAssignment({ groupId: groupAId, title: 'Missed quiz', dueAt: PAST, maxPoints: 50 })
    await addHandIn({ assignmentId: limitsId, studentId: studentIds.alba, mark: { points: 15, feedback: null } })
    await addHandIn({ assignmentId: seriesId, studentId: studentIds.alba, mark: { points: 10, feedback: null } })

    const { rows } = await gradebookOf('admin', groupAId)

    // 25 of 30; the missed quiz doesn't count as 0
    expect(rows[0].average).toEqual({ points: 25, max_points: 30, percent: 83 })
    expect(rows[1].average).toBeNull()
  })
})

describe('tests in the gradebook', () => {
  it('puts tests beside assignments as columns, by date', async () => {
    await addAssignment({ groupId: groupAId, title: 'Limits worksheet', dueAt: PAST, maxPoints: 20 })
    await addTest({ groupId: groupAId, title: 'Unit 3 test', heldAt: EARLIER_PAST, maxPoints: 40 })
    await addTest({ groupId: groupAId, title: 'Final', heldAt: FUTURE, maxPoints: 100 })
    await addTest({ groupId: groupBId, title: 'Other group’s test', heldAt: PAST, maxPoints: 10 })

    const gradebook = await gradebookOf('arben', groupAId)

    expect(gradebook.columns.map((column) => [column.kind, column.title, column.max_points])).toEqual([
      ['TEST', 'Unit 3 test', 40],
      ['ASSIGNMENT', 'Limits worksheet', 20],
      ['TEST', 'Final', 100],
    ])
    expect(gradebook.columns[0].date).toBe(EARLIER_PAST.toISOString())
  })

  it('marks each test cell: points with the note, absent, not recorded once held, or not held yet', async () => {
    const unitId = await addTest({ groupId: groupAId, title: 'Unit 3 test', heldAt: PAST, maxPoints: 40 })
    const finalId = await addTest({ groupId: groupAId, title: 'Final', heldAt: FUTURE, maxPoints: 100 })
    await addResult({ testId: unitId, studentId: studentIds.alba, points: 30, feedback: 'Good.' })
    await addResult({ testId: unitId, studentId: studentIds.dren, isAbsent: true, feedback: 'Ill.' })

    const { rows } = await gradebookOf('owner', groupAId)

    expect(rows[0].cells).toEqual([
      { column_id: unitId, status: 'MARKED', points: 30, feedback: 'Good.' },
      { column_id: finalId, status: 'NOT_DUE', points: null, feedback: null },
    ])
    expect(rows[1].cells[0]).toEqual({ column_id: unitId, status: 'ABSENT', points: null, feedback: 'Ill.' })
    await prisma.testResult.deleteMany({ where: { student_id: studentIds.dren } })
    expect((await gradebookOf('owner', groupAId)).rows[1].cells[0].status).toBe('NOT_RECORDED')
  })

  it('counts marked tests in the average beside marked assignments, and leaves absences out', async () => {
    const limitsId = await addAssignment({ groupId: groupAId, title: 'Limits worksheet', dueAt: EARLIER_PAST, maxPoints: 20 })
    const unitId = await addTest({ groupId: groupAId, title: 'Unit 3 test', heldAt: PAST, maxPoints: 40 })
    await addHandIn({ assignmentId: limitsId, studentId: studentIds.alba, mark: { points: 15, feedback: null } })
    await addResult({ testId: unitId, studentId: studentIds.alba, points: 30 })
    await addHandIn({ assignmentId: limitsId, studentId: studentIds.dren, mark: { points: 10, feedback: null } })
    await addResult({ testId: unitId, studentId: studentIds.dren, isAbsent: true })

    const { rows } = await gradebookOf('admin', groupAId)

    // Alba: 45 of 60; Dren: 10 of 20, the test he missed doesn't count
    expect(rows[0].average).toEqual({ points: 45, max_points: 60, percent: 75 })
    expect(rows[1].average).toEqual({ points: 10, max_points: 20, percent: 50 })
  })

  it('shows a student and a guardian the child’s own test results, and nobody else’s', async () => {
    const unitId = await addTest({ groupId: groupAId, title: 'Unit 3 test', heldAt: PAST, maxPoints: 40 })
    await addResult({ testId: unitId, studentId: studentIds.alba, points: 30, feedback: 'Good.' })
    await addResult({ testId: unitId, studentId: studentIds.dren, points: 40, feedback: 'Perfect.' })
    const gentId = (await prisma.user.findUniqueOrThrow({ where: { email: emailOf('gent') } })).id
    const guardian = await prisma.guardian.create({ data: { organization_id: organizationId, first_name: 'Gent', last_name: 'Person', email: emailOf('gent'), user_id: gentId } })
    await prisma.studentGuardian.create({ data: { guardian_id: guardian.id, student_id: studentIds.alba, relationship: 'FATHER' } })

    const own = (await get('alba', '/mine')).body.data as StudentGroupGrades[]
    const child = (await request(app).get(`/api/organizations/${organizationId}/me/children/${studentIds.alba}/grades`).set('Authorization', await loginAs(emailOf('gent')))).body.data as StudentGroupGrades[]

    for (const grades of [own, child]) {
      expect(grades[0].grades).toEqual([
        { column: { kind: 'TEST', id: unitId, title: 'Unit 3 test', date: PAST.toISOString(), max_points: 40 }, cell: { column_id: unitId, status: 'MARKED', points: 30, feedback: 'Good.' } },
      ])
      expect(grades[0].average).toEqual({ points: 30, max_points: 40, percent: 75 })
      expect(JSON.stringify(grades)).not.toContain('Perfect.')
    }
  })
})

describe('a student’s own grades', () => {
  const mine = async (key: MemberKey) => {
    const response = await get(key, '/mine')
    expect(response.status, JSON.stringify(response.body)).toBe(200)
    return response.body.data as StudentGroupGrades[]
  }

  it('shows a student only their own marks, feedback and average, one entry per group they are in', async () => {
    await prisma.groupEnrolment.create({ data: { group_id: groupBId, student_id: studentIds.alba, enrolled_on: new Date('2020-01-01') } })
    const limitsId = await addAssignment({ groupId: groupAId, title: 'Limits worksheet', dueAt: EARLIER_PAST, maxPoints: 20 })
    const quizId = await addAssignment({ groupId: groupAId, title: 'Derivatives quiz', dueAt: FUTURE, maxPoints: 10 })
    await addAssignment({ groupId: groupAId, title: 'Reflection', dueAt: PAST, maxPoints: null })
    const forcesId = await addAssignment({ groupId: groupBId, title: 'Forces lab report', dueAt: PAST, maxPoints: 30 })
    await addHandIn({ assignmentId: limitsId, studentId: studentIds.alba, mark: { points: 15, feedback: 'Check question 4.' } })
    await addHandIn({ assignmentId: limitsId, studentId: studentIds.dren, mark: { points: 20, feedback: 'Perfect.' } })

    const grades = await mine('alba')

    expect(grades.map((entry) => entry.group.name)).toEqual(['Group A', 'Group B'])
    expect(grades[0].grades).toEqual([
      { column: { kind: 'ASSIGNMENT', id: limitsId, title: 'Limits worksheet', date: EARLIER_PAST.toISOString(), max_points: 20 }, cell: { column_id: limitsId, status: 'MARKED', points: 15, feedback: 'Check question 4.' } },
      { column: { kind: 'ASSIGNMENT', id: quizId, title: 'Derivatives quiz', date: FUTURE.toISOString(), max_points: 10 }, cell: { column_id: quizId, status: 'NOT_DUE', points: null, feedback: null } },
    ])
    expect(grades[0].average).toEqual({ points: 15, max_points: 20, percent: 75 })
    expect(grades[1].grades.map((grade) => [grade.column.id, grade.cell.status])).toEqual([[forcesId, 'MISSING']])
    expect(grades[1].average).toBeNull()
    expect(JSON.stringify(grades)).not.toContain('Perfect.')
  })

  it('refuses everyone but students', async () => {
    // Guardians read a child's grades on the child's page instead
    for (const key of ['owner', 'admin', 'arben', 'clerk', 'gent'] as const) {
      expect((await get(key, '/mine')).status, key).toBe(403)
    }
  })
})

describe('a linked child’s grades', () => {
  const childGrades = async (key: MemberKey, studentId: string) =>
    request(app).get(`/api/organizations/${organizationId}/me/children/${studentId}/grades`).set('Authorization', await loginAs(emailOf(key)))

  beforeEach(async () => {
    const gentId = (await prisma.user.findUniqueOrThrow({ where: { email: emailOf('gent') } })).id
    const guardian = await prisma.guardian.create({ data: { organization_id: organizationId, first_name: 'Gent', last_name: 'Person', email: emailOf('gent'), user_id: gentId } })
    await prisma.studentGuardian.create({ data: { guardian_id: guardian.id, student_id: studentIds.alba, relationship: 'FATHER' } })
  })

  it('shows a guardian their linked child’s marks, feedback and average in each group', async () => {
    const limitsId = await addAssignment({ groupId: groupAId, title: 'Limits worksheet', dueAt: EARLIER_PAST, maxPoints: 20 })
    await addHandIn({ assignmentId: limitsId, studentId: studentIds.alba, mark: { points: 15, feedback: 'Check question 4.' } })
    await addHandIn({ assignmentId: limitsId, studentId: studentIds.dren, mark: { points: 20, feedback: 'Perfect.' } })

    const response = await childGrades('gent', studentIds.alba)

    expect(response.status, JSON.stringify(response.body)).toBe(200)
    const grades = response.body.data as StudentGroupGrades[]
    expect(grades.map((entry) => entry.group.name)).toEqual(['Group A'])
    expect(grades[0].grades.map((grade) => grade.cell)).toEqual([{ column_id: limitsId, status: 'MARKED', points: 15, feedback: 'Check question 4.' }])
    expect(grades[0].average).toEqual({ points: 15, max_points: 20, percent: 75 })
    expect(JSON.stringify(grades)).not.toContain('Perfect.')
  })

  it('answers 404 for a child who isn’t linked, and refuses everyone but guardians', async () => {
    expect((await childGrades('gent', studentIds.dren)).status).toBe(404)
    for (const key of ['owner', 'arben', 'alba'] as const) {
      expect((await childGrades(key, studentIds.alba)).status, key).toBe(403)
    }
  })
})

type AddTermParams = {
  name: string
  startDate: string
  endDate: string
}

const addTerm = async ({ name, startDate, endDate }: AddTermParams) =>
  (await prisma.academicTerm.create({ data: { academic_year_id: yearId, name, start_date: toDate(startDate), end_date: toDate(endDate) } })).id

/** Midday UTC on a day some days from today, so no time zone moves it to another day */
const dayFromToday = (days: number) => new Date(`${addDays({ day: todayDay(), days })}T10:00:00.000Z`)

describe('the grades overview', () => {
  const overviewOf = async (key: MemberKey, query: object = {}) => {
    const response = await get(key, '/overview', query)
    expect(response.status, JSON.stringify(response.body)).toBe(200)
    return response.body.data as GradeOverview
  }

  it('sums up each group: students, the average over all their marked work, and marked and missing work', async () => {
    const limitsId = await addAssignment({ groupId: groupAId, title: 'Limits worksheet', dueAt: EARLIER_PAST, maxPoints: 20 })
    const unitId = await addTest({ groupId: groupAId, title: 'Unit 3 test', heldAt: PAST, maxPoints: 40 })
    await addAssignment({ groupId: groupAId, title: 'Derivatives quiz', dueAt: FUTURE, maxPoints: 10 })
    await addHandIn({ assignmentId: limitsId, studentId: studentIds.alba, mark: { points: 15, feedback: null } })
    await addResult({ testId: unitId, studentId: studentIds.alba, points: 30 })
    await addResult({ testId: unitId, studentId: studentIds.dren, isAbsent: true })

    const overview = await overviewOf('owner')

    // No terms are set up, so every date counts. Group A: 45 of 60 over Alba's work; Dren's missing worksheet and absence don't count
    expect(overview.terms).toEqual([])
    expect(overview.term).toBeNull()
    expect(overview.groups.map(({ group, student_count, average, marked_count, missing_count }) => [group.name, student_count, average, marked_count, missing_count])).toEqual([
      ['Group A', 2, { points: 45, max_points: 60, percent: 75 }, 2, 1],
      ['Group B', 1, null, 0, 0],
    ])
  })

  it('counts each student averaging under the pass mark in any group once', async () => {
    await prisma.groupEnrolment.create({ data: { group_id: groupBId, student_id: studentIds.dren, enrolled_on: new Date('2020-01-01') } })
    const limitsId = await addAssignment({ groupId: groupAId, title: 'Limits worksheet', dueAt: PAST, maxPoints: 20 })
    const forcesId = await addAssignment({ groupId: groupBId, title: 'Forces lab report', dueAt: PAST, maxPoints: 10 })
    await addHandIn({ assignmentId: limitsId, studentId: studentIds.alba, mark: { points: 10, feedback: null } })
    await addHandIn({ assignmentId: limitsId, studentId: studentIds.dren, mark: { points: 5, feedback: null } })
    await addHandIn({ assignmentId: forcesId, studentId: studentIds.dren, mark: { points: 2, feedback: null } })
    await addHandIn({ assignmentId: forcesId, studentId: studentIds.besa, mark: { points: 4, feedback: null } })

    // Alba is at 50%, so not under it; Dren is under it in both groups and counts once; Besa is at 40%
    expect((await overviewOf('owner')).below_pass_count).toBe(2)
    expect((await overviewOf('arben')).below_pass_count).toBe(1)
  })

  it('shows a lecturer only the groups they teach, and refuses students, guardians and admins without Grades', async () => {
    expect((await overviewOf('arben')).groups.map(({ group }) => group.name)).toEqual(['Group A'])
    for (const key of ['clerk', 'alba', 'gent'] as const) {
      expect((await get(key, '/overview')).status, key).toBe(403)
    }
  })

  it('counts only work dated inside the term, both days included, and covers the term that holds today by default', async () => {
    const autumnId = await addTerm({ name: 'Autumn', startDate: addDays({ day: todayDay(), days: -30 }), endDate: addDays({ day: todayDay(), days: 30 }) })
    const summerId = await addTerm({ name: 'Summer', startDate: addDays({ day: todayDay(), days: -90 }), endDate: addDays({ day: todayDay(), days: -31 }) })
    const currentId = await addAssignment({ groupId: groupAId, title: 'Current worksheet', dueAt: dayFromToday(-5), maxPoints: 10 })
    const summerWorkId = await addAssignment({ groupId: groupAId, title: 'Summer worksheet', dueAt: dayFromToday(-31), maxPoints: 20 })
    const summerTestId = await addTest({ groupId: groupAId, title: 'Summer test', heldAt: dayFromToday(-90), maxPoints: 10 })
    const oldTestId = await addTest({ groupId: groupAId, title: 'Old test', heldAt: PAST, maxPoints: 100 })
    await addHandIn({ assignmentId: currentId, studentId: studentIds.alba, mark: { points: 8, feedback: null } })
    await addHandIn({ assignmentId: summerWorkId, studentId: studentIds.alba, mark: { points: 10, feedback: null } })
    await addResult({ testId: summerTestId, studentId: studentIds.alba, points: 10 })
    await addResult({ testId: oldTestId, studentId: studentIds.alba, points: 0 })

    const current = await overviewOf('owner')

    expect(current.terms.map((term) => [term.id, term.name, term.year_name])).toEqual([
      [autumnId, 'Autumn', '2026–27'],
      [summerId, 'Summer', '2026–27'],
    ])
    expect(current.term?.id).toBe(autumnId)
    // Only the current worksheet: 8 of 10, and Dren's is missing
    expect(current.groups[0]).toMatchObject({ average: { points: 8, max_points: 10, percent: 80 }, marked_count: 1, missing_count: 1 })

    const summer = await overviewOf('owner', { term_id: summerId })

    // The worksheet due on the last day and the test on the first: 20 of 30; Dren's worksheet is missing and his test not recorded
    expect(summer.term?.id).toBe(summerId)
    expect(summer.groups[0]).toMatchObject({ average: { points: 20, max_points: 30, percent: 67 }, marked_count: 2, missing_count: 1 })
  })

  it('answers 404 for a term of another organization or none', async () => {
    expect((await get('owner', '/overview', { term_id: '00000000-0000-4000-8000-000000000000' })).status).toBe(404)
  })
})

describe('a group’s report', () => {
  const reportOf = async (key: MemberKey, groupId: string, query: object = {}) => {
    const response = await get(key, `/overview/groups/${groupId}`, query)
    expect(response.status, JSON.stringify(response.body)).toBe(200)
    return response.body.data as GroupReport
  }

  it('has a row per actively enrolled student with their average and marked and missing work', async () => {
    const limitsId = await addAssignment({ groupId: groupAId, title: 'Limits worksheet', dueAt: EARLIER_PAST, maxPoints: 20 })
    const unitId = await addTest({ groupId: groupAId, title: 'Unit 3 test', heldAt: PAST, maxPoints: 40 })
    await addHandIn({ assignmentId: limitsId, studentId: studentIds.alba, mark: { points: 15, feedback: null } })
    await addResult({ testId: unitId, studentId: studentIds.alba, points: 30 })
    await addResult({ testId: unitId, studentId: studentIds.dren, points: 10 })

    const report = await reportOf('arben', groupAId)

    expect(report.group.name).toBe('Group A')
    expect(report.students.map(({ student, average, marked_count, missing_count }) => [student.first_name, average, marked_count, missing_count])).toEqual([
      ['Alba', { points: 45, max_points: 60, percent: 75 }, 2, 0],
      ['Dren', { points: 10, max_points: 40, percent: 25 }, 1, 1],
    ])
  })

  it('counts only work dated inside the term asked for', async () => {
    const summerId = await addTerm({ name: 'Summer', startDate: addDays({ day: todayDay(), days: -90 }), endDate: addDays({ day: todayDay(), days: -31 }) })
    const summerWorkId = await addAssignment({ groupId: groupAId, title: 'Summer worksheet', dueAt: dayFromToday(-40), maxPoints: 20 })
    const oldId = await addAssignment({ groupId: groupAId, title: 'Old worksheet', dueAt: PAST, maxPoints: 10 })
    await addHandIn({ assignmentId: summerWorkId, studentId: studentIds.alba, mark: { points: 12, feedback: null } })
    await addHandIn({ assignmentId: oldId, studentId: studentIds.alba, mark: { points: 10, feedback: null } })

    const report = await reportOf('owner', groupAId, { term_id: summerId })

    expect(report.term?.id).toBe(summerId)
    expect(report.students[0]).toMatchObject({ average: { points: 12, max_points: 20, percent: 60 }, marked_count: 1, missing_count: 0 })
  })

  it('answers 404 for a group the viewer doesn’t reach, and refuses students and admins without Grades', async () => {
    expect((await get('arben', `/overview/groups/${groupBId}`)).status).toBe(404)
    for (const key of ['clerk', 'alba'] as const) {
      expect((await get(key, `/overview/groups/${groupAId}`)).status, key).toBe(403)
    }
  })
})

describe('a student’s report', () => {
  const reportOf = async (key: MemberKey, studentId: string, query: object = {}) => {
    const response = await get(key, `/students/${studentId}/report`, query)
    expect(response.status, JSON.stringify(response.body)).toBe(200)
    return response.body.data as StudentReport
  }

  it('has the student’s work and average in each group the viewer reaches and they are in, for the term', async () => {
    await prisma.groupEnrolment.create({ data: { group_id: groupBId, student_id: studentIds.alba, enrolled_on: new Date('2020-01-01') } })
    const summerId = await addTerm({ name: 'Summer', startDate: addDays({ day: todayDay(), days: -90 }), endDate: addDays({ day: todayDay(), days: -31 }) })
    const summerWorkId = await addAssignment({ groupId: groupAId, title: 'Summer worksheet', dueAt: dayFromToday(-40), maxPoints: 20 })
    const oldId = await addAssignment({ groupId: groupAId, title: 'Old worksheet', dueAt: PAST, maxPoints: 10 })
    const forcesId = await addAssignment({ groupId: groupBId, title: 'Forces lab report', dueAt: dayFromToday(-50), maxPoints: 30 })
    await addHandIn({ assignmentId: summerWorkId, studentId: studentIds.alba, mark: { points: 12, feedback: 'Good start.' } })
    await addHandIn({ assignmentId: oldId, studentId: studentIds.alba, mark: { points: 10, feedback: null } })
    await addHandIn({ assignmentId: summerWorkId, studentId: studentIds.dren, mark: { points: 20, feedback: 'Perfect.' } })

    const lecturers = await reportOf('arben', studentIds.alba, { term_id: summerId })

    expect(lecturers.term?.id).toBe(summerId)
    expect(lecturers.student).toEqual({ id: studentIds.alba, first_name: 'Alba', last_name: 'Person' })
    expect(lecturers.groups.map((entry) => entry.group.name)).toEqual(['Group A'])
    expect(lecturers.groups[0].grades.map(({ column, cell }) => [column.title, cell.status, cell.points, cell.feedback])).toEqual([['Summer worksheet', 'MARKED', 12, 'Good start.']])
    expect(lecturers.groups[0].average).toEqual({ points: 12, max_points: 20, percent: 60 })
    expect(JSON.stringify(lecturers)).not.toContain('Perfect.')

    const owners = await reportOf('owner', studentIds.alba, { term_id: summerId })

    expect(owners.groups.map((entry) => [entry.group.name, entry.grades.map(({ column }) => column.id)])).toEqual([
      ['Group A', [summerWorkId]],
      ['Group B', [forcesId]],
    ])
  })

  it('answers 404 for a student outside the lecturer’s groups or none, and refuses students and admins without Grades', async () => {
    expect((await get('arben', `/students/${studentIds.besa}/report`)).status).toBe(404)
    expect((await get('owner', '/students/00000000-0000-4000-8000-000000000000/report')).status).toBe(404)
    for (const key of ['clerk', 'alba'] as const) {
      expect((await get(key, `/students/${studentIds.alba}/report`)).status, key).toBe(403)
    }
  })
})
