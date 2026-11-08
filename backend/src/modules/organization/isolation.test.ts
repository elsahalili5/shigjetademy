import request from 'supertest'
import type { Router } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

/** The ids of organization B's records, filled into each endpoint's path */
type TargetIds = {
  organizationId: string
  membershipId: string
  locationId: string
  departmentId: string
  yearId: string
  termId: string
  holidayId: string
  studentId: string
  lecturerId: string
  courseId: string
  groupId: string
  substitutionId: string
  enrolmentId: string
  rescheduleId: string
  invitationId: string
}

type ScopedEndpoint = {
  method: HttpMethod
  /** The route as registered on its router */
  route: string
  body?: object
}

const PROFILE = { name: 'Taken over', type: 'School', country: 'XK', currency: 'EUR' } as const
const LOCATION = { name: 'Taken over', address: '', city: '', phone: '', is_main: true } as const
const SETTINGS = { time_zone: 'America/New_York', week_start: 'SUNDAY', date_format: 'MONTH_DAY_YEAR' } as const
const YEAR = { name: 'Taken over', start_date: '2030-09-01', end_date: '2031-06-30', is_current: true } as const
const TERM = { name: 'Taken over', start_date: '2026-09-01', end_date: '2026-12-20' } as const
const HOLIDAY = { name: 'Taken over', start_date: '2026-12-24', end_date: '2026-12-24' } as const
const STUDENT = { first_name: 'Taken', last_name: 'Over', date_of_birth: '', enrolled_on: '2026-09-01', student_number: 'STU-0001', notes: '' } as const
const LECTURER = {
  first_name: 'Taken',
  last_name: 'Over',
  email: '',
  phone: '',
  subjects: ['Mathematics'],
  employment_type: 'FULL_TIME',
  started_on: '',
  notes: '',
  department_id: null,
  location_ids: [],
} as const
// A well-formed id, so the sweep passes validation and reaches the organization checks
const COURSE = { name: 'Taken over', code: '', description: '', level: 'B2', department_id: '00000000-0000-4000-8000-000000000004' } as const

const SCHEDULE = [{ weekday: 'MONDAY', start_time: '17:00', end_time: '18:30' }]

/** A group body with the given organization's own ids, which tests swap one at a time */
const groupBody = (ids: TargetIds) => ({ course_id: ids.courseId, name: 'Taken over', academic_year_id: ids.yearId, academic_term_id: null, location_id: null, capacity: null, lecturer_id: null, lecturer_effective_from: null, schedule: SCHEDULE })

// Well-formed ids, so the sweep passes validation and reaches the organization checks
const SUBSTITUTION = { lecturer_id: '00000000-0000-4000-8000-000000000003', start_date: '2027-10-01', end_date: '2027-10-02', note: '' } as const

const ENROLMENT = { student_id: '00000000-0000-4000-8000-000000000005' } as const

const MOVE = { group_id: '00000000-0000-4000-8000-000000000006' } as const

// A Wednesday in the seeded group's school year, when it meets and has a register, and that session's start
const LESSON_DATE = '2027-11-10'
const LESSON_START = '17:00'

const MARK = { status: 'PRESENT' } as const

const TOPIC = { topic: 'Taken over' } as const

const COVERED = { covered: 'Taken over' } as const

// Well-formed, so the sweep reaches the organization checks; the group doesn't need to exist for the cross-member sweep to answer 403 first
const NOTE = { group_id: '00000000-0000-4000-8000-000000000008', body: 'Taken over' } as const

// A Wednesday session of the seeded group, moved to the Friday; well-formed, so the sweep reaches the organization checks
const RESCHEDULE = { original_date: '2027-11-24', original_start_time: '17:00', new_date: '2027-11-26', new_start_time: '17:00', new_end_time: '18:30', reason: '' } as const

const GROUP = { course_id: '00000000-0000-4000-8000-000000000001', name: 'Taken over', academic_year_id: '00000000-0000-4000-8000-000000000002', academic_term_id: null, location_id: null, capacity: null, lecturer_id: null, lecturer_effective_from: null, schedule: SCHEDULE } as const

// One line per organization-scoped endpoint; the coverage test below fails when a route is missing here
const SCOPED_ENDPOINTS: ScopedEndpoint[] = [
  { method: 'get', route: '/:organizationId' },
  { method: 'patch', route: '/:organizationId/status', body: { status: 'SUSPENDED' } },
  { method: 'get', route: '/:organizationId/members' },
  { method: 'patch', route: '/:organizationId/members/:membershipId', body: { permissions: ['MANAGE_STUDENTS'] } },
  { method: 'delete', route: '/:organizationId/members/:membershipId' },
  { method: 'get', route: '/:organizationId/invitations' },
  { method: 'post', route: '/:organizationId/invitations', body: { email: 'intruder@oxford.test', permissions: ['MANAGE_STUDENTS'] } },
  { method: 'post', route: '/:organizationId/invitations/:invitationId/resend' },
  { method: 'post', route: '/:organizationId/invitations/:invitationId/link' },
  { method: 'delete', route: '/:organizationId/invitations/:invitationId' },
  { method: 'get', route: '/:organizationId/overview' },
  { method: 'get', route: '/:organizationId/profile' },
  { method: 'put', route: '/:organizationId/profile', body: PROFILE },
  { method: 'get', route: '/:organizationId/locations' },
  { method: 'post', route: '/:organizationId/locations', body: LOCATION },
  { method: 'put', route: '/:organizationId/locations/:locationId', body: LOCATION },
  { method: 'delete', route: '/:organizationId/locations/:locationId' },
  { method: 'get', route: '/:organizationId/departments' },
  { method: 'post', route: '/:organizationId/departments', body: { name: 'Taken over', description: '', location_id: null } },
  { method: 'put', route: '/:organizationId/departments/:departmentId', body: { name: 'Taken over', description: '', location_id: null } },
  { method: 'delete', route: '/:organizationId/departments/:departmentId' },
  { method: 'get', route: '/:organizationId/academic-periods/years' },
  { method: 'post', route: '/:organizationId/academic-periods/years', body: YEAR },
  { method: 'put', route: '/:organizationId/academic-periods/years/:yearId', body: YEAR },
  { method: 'delete', route: '/:organizationId/academic-periods/years/:yearId' },
  { method: 'post', route: '/:organizationId/academic-periods/years/:yearId/terms', body: TERM },
  { method: 'put', route: '/:organizationId/academic-periods/years/:yearId/terms/:termId', body: TERM },
  { method: 'delete', route: '/:organizationId/academic-periods/years/:yearId/terms/:termId' },
  { method: 'post', route: '/:organizationId/academic-periods/years/:yearId/holidays', body: HOLIDAY },
  { method: 'put', route: '/:organizationId/academic-periods/years/:yearId/holidays/:holidayId', body: HOLIDAY },
  { method: 'delete', route: '/:organizationId/academic-periods/years/:yearId/holidays/:holidayId' },
  { method: 'get', route: '/:organizationId/settings' },
  { method: 'put', route: '/:organizationId/settings', body: SETTINGS },
  { method: 'post', route: '/:organizationId/settings/transfer-ownership', body: { membership_id: '00000000-0000-4000-8000-000000000000', password: 'password123' } },
  { method: 'post', route: '/:organizationId/settings/deactivate', body: { confirm_name: 'Yllka Kindergarten', password: 'password123' } },
  { method: 'post', route: '/:organizationId/settings/reactivate', body: { password: 'password123' } },
  { method: 'get', route: '/:organizationId/students' },
  { method: 'post', route: '/:organizationId/students', body: STUDENT },
  { method: 'get', route: '/:organizationId/students/:studentId' },
  { method: 'put', route: '/:organizationId/students/:studentId', body: STUDENT },
  { method: 'post', route: '/:organizationId/students/:studentId/archive' },
  { method: 'post', route: '/:organizationId/students/:studentId/restore' },
  { method: 'post', route: '/:organizationId/students/:studentId/invitation', body: { email: 'intruder@oxford.test' } },
  { method: 'post', route: '/:organizationId/students/:studentId/invitation/resend' },
  { method: 'delete', route: '/:organizationId/students/:studentId/invitation' },
  { method: 'get', route: '/:organizationId/me/student' },
  { method: 'get', route: '/:organizationId/me/lecturer' },
  { method: 'get', route: '/:organizationId/lecturers' },
  { method: 'post', route: '/:organizationId/lecturers', body: LECTURER },
  { method: 'get', route: '/:organizationId/lecturers/subjects' },
  { method: 'get', route: '/:organizationId/lecturers/:lecturerId' },
  { method: 'put', route: '/:organizationId/lecturers/:lecturerId', body: LECTURER },
  { method: 'post', route: '/:organizationId/lecturers/:lecturerId/archive' },
  { method: 'post', route: '/:organizationId/lecturers/:lecturerId/restore' },
  { method: 'post', route: '/:organizationId/lecturers/:lecturerId/invitation', body: { email: 'intruder@oxford.test' } },
  { method: 'post', route: '/:organizationId/lecturers/:lecturerId/invitation/resend' },
  { method: 'delete', route: '/:organizationId/lecturers/:lecturerId/invitation' },
  { method: 'get', route: '/:organizationId/courses' },
  { method: 'post', route: '/:organizationId/courses', body: COURSE },
  { method: 'get', route: '/:organizationId/courses/options' },
  { method: 'get', route: '/:organizationId/courses/:courseId' },
  { method: 'put', route: '/:organizationId/courses/:courseId', body: COURSE },
  { method: 'post', route: '/:organizationId/courses/:courseId/archive' },
  { method: 'post', route: '/:organizationId/courses/:courseId/restore' },
  { method: 'get', route: '/:organizationId/groups' },
  { method: 'get', route: '/:organizationId/groups/lecturer-options' },
  { method: 'get', route: '/:organizationId/groups/student-options' },
  { method: 'post', route: '/:organizationId/groups', body: GROUP },
  { method: 'get', route: '/:organizationId/groups/:groupId' },
  { method: 'put', route: '/:organizationId/groups/:groupId', body: GROUP },
  { method: 'get', route: '/:organizationId/groups/:groupId/lecturers' },
  { method: 'post', route: '/:organizationId/groups/:groupId/substitutions', body: SUBSTITUTION },
  { method: 'put', route: '/:organizationId/groups/:groupId/substitutions/:substitutionId', body: SUBSTITUTION },
  { method: 'post', route: '/:organizationId/groups/:groupId/substitutions/:substitutionId/cancel' },
  { method: 'get', route: '/:organizationId/groups/:groupId/enrolments' },
  { method: 'post', route: '/:organizationId/groups/:groupId/enrolments', body: ENROLMENT },
  { method: 'post', route: '/:organizationId/groups/:groupId/enrolments/:enrolmentId/withdraw' },
  { method: 'post', route: '/:organizationId/groups/:groupId/enrolments/:enrolmentId/move', body: MOVE },
  { method: 'get', route: '/:organizationId/groups/:groupId/reschedules' },
  { method: 'post', route: '/:organizationId/groups/:groupId/reschedules', body: RESCHEDULE },
  { method: 'post', route: '/:organizationId/groups/:groupId/reschedules/:rescheduleId/cancel' },
  { method: 'post', route: '/:organizationId/groups/:groupId/archive' },
  { method: 'post', route: '/:organizationId/groups/:groupId/restore' },
  { method: 'get', route: '/:organizationId/attendance/groups' },
  { method: 'get', route: '/:organizationId/attendance/groups/:groupId/:date/:startTime' },
  { method: 'put', route: '/:organizationId/attendance/groups/:groupId/:date/:startTime/students/:studentId', body: MARK },
  { method: 'put', route: '/:organizationId/attendance/groups/:groupId/:date/:startTime/mark-all-present' },
  { method: 'get', route: '/:organizationId/lesson-plans/sessions' },
  { method: 'get', route: '/:organizationId/groups/:groupId/lesson-plans' },
  { method: 'get', route: '/:organizationId/groups/:groupId/lesson-plans/:date/:startTime' },
  { method: 'put', route: '/:organizationId/groups/:groupId/lesson-plans/:date/:startTime/topic', body: TOPIC },
  { method: 'put', route: '/:organizationId/groups/:groupId/lesson-plans/:date/:startTime/covered', body: COVERED },
  { method: 'get', route: '/:organizationId/my-students' },
  { method: 'get', route: '/:organizationId/my-students/:studentId' },
  { method: 'get', route: '/:organizationId/my-students/:studentId/notes' },
  { method: 'post', route: '/:organizationId/my-students/:studentId/notes', body: NOTE },
]

type ToPathParams = {
  route: string
  ids: TargetIds
}

const toPath = ({ route, ids }: ToPathParams) =>
  `/api/organizations${route
    .replace(':organizationId', ids.organizationId)
    .replace(':membershipId', ids.membershipId)
    .replace(':locationId', ids.locationId)
    .replace(':departmentId', ids.departmentId)
    .replace(':yearId', ids.yearId)
    .replace(':termId', ids.termId)
    .replace(':holidayId', ids.holidayId)
    .replace(':studentId', ids.studentId)
    .replace(':lecturerId', ids.lecturerId)
    .replace(':courseId', ids.courseId)
    .replace(':groupId', ids.groupId)
    .replace(':substitutionId', ids.substitutionId)
    .replace(':enrolmentId', ids.enrolmentId)
    .replace(':rescheduleId', ids.rescheduleId)
    .replace(':invitationId', ids.invitationId)
    .replace(':date', LESSON_DATE)
    .replace(':startTime', LESSON_START)}`

type SendParams = ScopedEndpoint & {
  ids: TargetIds
  auth: string
}

const send = ({ method, route, body, ids, auth }: SendParams) => {
  const call = request(app)[method](toPath({ route, ids })).set('Authorization', auth)
  return body ? call.send(body) : call
}

const isRouter = (handle: unknown): handle is Router => typeof handle === 'function' && 'stack' in handle && Array.isArray(handle.stack)

/** Every route with an organization in its path, on every router mounted in the app, as "METHOD /path" */
const registeredScopedRoutes = () =>
  app.router.stack.flatMap((mounted) =>
    (isRouter(mounted.handle) ? mounted.handle.stack : []).flatMap((layer) => {
      const route = layer.route
      if (!route?.path.includes(':organizationId')) return []
      return [...new Set(route.stack.map((routeLayer) => routeLayer.method))].map((method) => `${method.toUpperCase()} ${route.path}`)
    }),
  )

type SeedOrganizationParams = {
  name: string
  slug: string
}

/** An organization with an owner, a school admin, a location, a department, a school year with a term and a holiday, a student with an open login invitation, a lecturer with an open login invitation, a course with a group that has a lecturer, a Wednesday meeting, a substitution, the student enrolled and marked present on LESSON_DATE, the next Wednesday's session moved to the Thursday, and an open admin invitation */
const seedOrganization = async ({ name, slug }: SeedOrganizationParams) => {
  const owner = await createUser({ email: `owner@${slug}.test` })
  const admin = await createUser({ email: `admin@${slug}.test` })
  const organization = await createOrganization({ name, ownerId: owner.id, members: [{ userId: admin.id, role: 'ADMIN' }] })
  const adminMembership = await prisma.membership.findFirstOrThrow({ where: { organization_id: organization.id, user_id: admin.id } })
  const location = await prisma.location.create({ data: { organization_id: organization.id, name: `${name} campus`, is_main: true } })
  const department = await prisma.department.create({ data: { organization_id: organization.id, name: `${name} languages`, location_id: location.id } })
  const year = await prisma.academicYear.create({
    data: { organization_id: organization.id, name: `${name} 2026–27`, start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true },
  })
  const term = await prisma.academicTerm.create({ data: { academic_year_id: year.id, name: `${name} autumn term`, start_date: new Date('2026-09-01'), end_date: new Date('2027-01-31') } })
  const holiday = await prisma.academicHoliday.create({ data: { academic_year_id: year.id, name: `${name} winter break`, start_date: new Date('2026-12-24'), end_date: new Date('2027-01-06') } })
  const student = await prisma.student.create({ data: { organization_id: organization.id, first_name: name, last_name: 'Student', student_number: 'STU-0001' } })
  const lecturer = await prisma.lecturer.create({
    data: {
      organization_id: organization.id,
      first_name: name,
      last_name: 'Lecturer',
      subjects: [`${name} subject`],
      employment_type: 'FULL_TIME',
      department_id: department.id,
      locations: { create: [{ location_id: location.id }] },
    },
  })
  const course = await prisma.course.create({ data: { organization_id: organization.id, name: `${name} course`, level: 'B2', department_id: department.id } })
  // In a year of its own, so the current year stays free to delete
  const groupYear = await prisma.academicYear.create({ data: { organization_id: organization.id, name: `${name} 2027–28`, start_date: new Date('2027-09-01'), end_date: new Date('2028-06-30') } })
  const group = await prisma.group.create({ data: { organization_id: organization.id, course_id: course.id, name: `${name} group`, academic_year_id: groupYear.id, location_id: location.id } })
  await prisma.groupMeeting.create({ data: { group_id: group.id, weekday: 'WEDNESDAY', start_time: new Date('1970-01-01T17:00:00.000Z'), end_time: new Date('1970-01-01T18:30:00.000Z') } })
  await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: lecturer.id, start_date: new Date('2027-09-01') } })
  const substitute = await prisma.lecturer.create({ data: { organization_id: organization.id, first_name: name, last_name: 'Substitute', employment_type: 'PART_TIME' } })
  const substitution = await prisma.groupSubstitution.create({ data: { group_id: group.id, lecturer_id: substitute.id, start_date: new Date('2027-11-01'), end_date: new Date('2027-11-03') } })
  const enrolment = await prisma.groupEnrolment.create({ data: { group_id: group.id, student_id: student.id, enrolled_on: new Date('2027-09-01') } })
  const reschedule = await prisma.lessonReschedule.create({
    data: { group_id: group.id, original_date: new Date('2027-11-17'), original_start_time: new Date('1970-01-01T17:00:00.000Z'), new_date: new Date('2027-11-18'), new_start_time: new Date('1970-01-01T17:00:00.000Z'), new_end_time: new Date('1970-01-01T18:30:00.000Z'), created_by_id: owner.id },
  })
  await prisma.attendanceRecord.create({ data: { group_id: group.id, student_id: student.id, date: new Date(LESSON_DATE), start_time: new Date(`1970-01-01T${LESSON_START}:00.000Z`), status: 'PRESENT', marked_by_id: owner.id } })
  const invitation = await prisma.invitation.create({
    data: { organization_id: organization.id, email: `invited@${slug}.test`, role: 'ADMIN', token_hash: slug, invited_by_id: owner.id, expires_at: new Date(Date.now() + 86_400_000) },
  })
  await prisma.invitation.create({
    data: {
      organization_id: organization.id,
      email: `student@${slug}.test`,
      role: 'STUDENT',
      student_id: student.id,
      token_hash: `${slug}-student`,
      invited_by_id: owner.id,
      expires_at: new Date(Date.now() + 86_400_000),
    },
  })
  await prisma.invitation.create({
    data: {
      organization_id: organization.id,
      email: `lecturer@${slug}.test`,
      role: 'LECTURER',
      lecturer_id: lecturer.id,
      token_hash: `${slug}-lecturer`,
      invited_by_id: owner.id,
      expires_at: new Date(Date.now() + 86_400_000),
    },
  })
  return { organizationId: organization.id, membershipId: adminMembership.id, locationId: location.id, departmentId: department.id, yearId: year.id, termId: term.id, holidayId: holiday.id, studentId: student.id, lecturerId: lecturer.id, courseId: course.id, groupId: group.id, substitutionId: substitution.id, enrolmentId: enrolment.id, rescheduleId: reschedule.id, invitationId: invitation.id }
}

let oxford: TargetIds
let yllka: TargetIds
let oxfordOwnerAuth: string

/** What Yllka's owner sees of their organization, to prove nothing changed */
const yllkaAsItsOwnerSeesIt = async () => {
  const auth = await loginAs('owner@yllka.test')
  const read = async (route: string) => (await send({ method: 'get', route, ids: yllka, auth })).body.data
  return {
    profile: await read('/:organizationId/profile'),
    members: await read('/:organizationId/members'),
    invitations: await read('/:organizationId/invitations'),
    overview: await read('/:organizationId/overview'),
    locations: await read('/:organizationId/locations'),
    departments: await read('/:organizationId/departments'),
    academicYears: await read('/:organizationId/academic-periods/years'),
    settings: await read('/:organizationId/settings'),
    students: await read('/:organizationId/students'),
    archivedStudents: (await send({ method: 'get', route: '/:organizationId/students?status=ARCHIVED', ids: yllka, auth })).body.data,
    lecturers: await read('/:organizationId/lecturers'),
    archivedLecturers: (await send({ method: 'get', route: '/:organizationId/lecturers?status=ARCHIVED', ids: yllka, auth })).body.data,
    subjects: await read('/:organizationId/lecturers/subjects'),
    courses: await read('/:organizationId/courses'),
    archivedCourses: (await send({ method: 'get', route: '/:organizationId/courses?status=ARCHIVED', ids: yllka, auth })).body.data,
    courseOptions: await read('/:organizationId/courses/options'),
    course: await read('/:organizationId/courses/:courseId'),
    groups: await read('/:organizationId/groups'),
    groupLecturerOptions: await read('/:organizationId/groups/lecturer-options'),
    group: await read('/:organizationId/groups/:groupId'),
    groupLecturers: await read('/:organizationId/groups/:groupId/lecturers'),
    groupStudentOptions: await read('/:organizationId/groups/student-options'),
    groupEnrolments: await read('/:organizationId/groups/:groupId/enrolments'),
    groupReschedules: await read('/:organizationId/groups/:groupId/reschedules'),
    archivedGroups: (await send({ method: 'get', route: '/:organizationId/groups?status=ARCHIVED', ids: yllka, auth })).body.data,
    attendanceGroups: await read(`/:organizationId/attendance/groups?date=${LESSON_DATE}`),
    attendanceRegister: await read('/:organizationId/attendance/groups/:groupId/:date/:startTime'),
    lessonPlanSessions: await read(`/:organizationId/lesson-plans/sessions?date=${LESSON_DATE}`),
    groupLessonPlans: await read('/:organizationId/groups/:groupId/lesson-plans'),
    lessonPlan: await read('/:organizationId/groups/:groupId/lesson-plans/:date/:startTime'),
    myStudents: await read('/:organizationId/my-students'),
    myStudent: await read('/:organizationId/my-students/:studentId'),
    myStudentNotes: await read('/:organizationId/my-students/:studentId/notes'),
  }
}

beforeEach(async () => {
  oxford = await seedOrganization({ name: 'Oxford Academy', slug: 'oxford' })
  yllka = await seedOrganization({ name: 'Yllka Kindergarten', slug: 'yllka' })
  oxfordOwnerAuth = await loginAs('owner@oxford.test')
})

describe('organization isolation', () => {
  it('sweeps every organization-scoped route', () => {
    const swept = SCOPED_ENDPOINTS.map((endpoint) => `${endpoint.method.toUpperCase()} ${endpoint.route}`)

    expect([...swept].sort()).toEqual(registeredScopedRoutes().sort())
  })

  it('refuses a member of another organization on every endpoint and leaves the data unchanged', async () => {
    const before = await yllkaAsItsOwnerSeesIt()

    for (const endpoint of SCOPED_ENDPOINTS) {
      const response = await send({ ...endpoint, ids: yllka, auth: oxfordOwnerAuth })
      expect([403, 404], `${endpoint.method.toUpperCase()} ${endpoint.route} answered ${response.status}`).toContain(response.status)
    }

    expect(await yllkaAsItsOwnerSeesIt()).toEqual(before)
  })

  it('does not reach another organization’s records through ids in its own paths', async () => {
    const before = await yllkaAsItsOwnerSeesIt()
    // Oxford's own organization id with Yllka's member, location, department, academic period, student, lecturer, course, group, substitution, enrolment, reschedule and invitation ids
    const mixed: TargetIds = { ...yllka, organizationId: oxford.organizationId }

    for (const endpoint of SCOPED_ENDPOINTS.filter((item) => /:(membership|location|department|year|term|holiday|student|lecturer|course|group|substitution|enrolment|reschedule|invitation)Id/.test(item.route))) {
      const response = await send({ ...endpoint, ids: mixed, auth: oxfordOwnerAuth })
      expect(response.status, `${endpoint.method.toUpperCase()} ${endpoint.route} answered ${response.status}`).toBe(404)
    }

    expect(await yllkaAsItsOwnerSeesIt()).toEqual(before)
  })

  it('does not link records to another organization through ids in the request body', async () => {
    const before = await yllkaAsItsOwnerSeesIt()
    const department = { name: 'Sciences', description: '', location_id: yllka.locationId }

    const created = await send({ method: 'post', route: '/:organizationId/departments', body: department, ids: oxford, auth: oxfordOwnerAuth })
    const updated = await send({ method: 'put', route: '/:organizationId/departments/:departmentId', body: department, ids: oxford, auth: oxfordOwnerAuth })
    await send({ method: 'post', route: '/:organizationId/locations', body: { ...LOCATION, name: 'Second campus', is_main: false }, ids: oxford, auth: oxfordOwnerAuth })
    const removedMain = await request(app)
      .delete(toPath({ route: '/:organizationId/locations/:locationId', ids: oxford }))
      .query({ newMainId: yllka.locationId })
      .set('Authorization', oxfordOwnerAuth)
    await send({ method: 'post', route: '/:organizationId/academic-periods/years', body: { ...YEAR, is_current: false }, ids: oxford, auth: oxfordOwnerAuth })
    const removedCurrentYear = await request(app)
      .delete(toPath({ route: '/:organizationId/academic-periods/years/:yearId', ids: oxford }))
      .query({ newCurrentId: yllka.yearId })
      .set('Authorization', oxfordOwnerAuth)
    const lecturerWithYllkaLocation = await send({ method: 'post', route: '/:organizationId/lecturers', body: { ...LECTURER, location_ids: [yllka.locationId] }, ids: oxford, auth: oxfordOwnerAuth })
    const lecturerWithYllkaDepartment = await send({ method: 'put', route: '/:organizationId/lecturers/:lecturerId', body: { ...LECTURER, department_id: yllka.departmentId }, ids: oxford, auth: oxfordOwnerAuth })
    const courseWithYllkaDepartment = await send({ method: 'post', route: '/:organizationId/courses', body: { ...COURSE, department_id: yllka.departmentId }, ids: oxford, auth: oxfordOwnerAuth })
    const editedCourseWithYllkaDepartment = await send({ method: 'put', route: '/:organizationId/courses/:courseId', body: { ...COURSE, department_id: yllka.departmentId }, ids: oxford, auth: oxfordOwnerAuth })
    const ownGroup = groupBody(oxford)
    const groupsWithYllkaIds = [
      { ...ownGroup, course_id: yllka.courseId },
      { ...ownGroup, academic_year_id: yllka.yearId },
      { ...ownGroup, academic_term_id: yllka.termId },
      { ...ownGroup, location_id: yllka.locationId },
      { ...ownGroup, lecturer_id: yllka.lecturerId, lecturer_effective_from: '2027-10-01' },
    ]
    const addedGroups = await Promise.all(groupsWithYllkaIds.map((body) => send({ method: 'post', route: '/:organizationId/groups', body, ids: oxford, auth: oxfordOwnerAuth })))
    const editedGroups = await Promise.all(groupsWithYllkaIds.map((body) => send({ method: 'put', route: '/:organizationId/groups/:groupId', body, ids: oxford, auth: oxfordOwnerAuth })))
    const yllkaSubstitutionInOxfordGroup: TargetIds = { ...oxford, substitutionId: yllka.substitutionId }
    const editedYllkaSubstitution = await send({ method: 'put', route: '/:organizationId/groups/:groupId/substitutions/:substitutionId', body: { ...SUBSTITUTION, lecturer_id: oxford.lecturerId }, ids: yllkaSubstitutionInOxfordGroup, auth: oxfordOwnerAuth })
    const cancelledYllkaSubstitution = await send({ method: 'post', route: '/:organizationId/groups/:groupId/substitutions/:substitutionId/cancel', ids: yllkaSubstitutionInOxfordGroup, auth: oxfordOwnerAuth })
    const enrolmentWithYllkaStudent = await send({ method: 'post', route: '/:organizationId/groups/:groupId/enrolments', body: { student_id: yllka.studentId }, ids: oxford, auth: oxfordOwnerAuth })
    const yllkaEnrolmentInOxfordGroup: TargetIds = { ...oxford, enrolmentId: yllka.enrolmentId }
    const withdrawnYllkaEnrolment = await send({ method: 'post', route: '/:organizationId/groups/:groupId/enrolments/:enrolmentId/withdraw', ids: yllkaEnrolmentInOxfordGroup, auth: oxfordOwnerAuth })
    const movedYllkaEnrolment = await send({ method: 'post', route: '/:organizationId/groups/:groupId/enrolments/:enrolmentId/move', body: { group_id: oxford.groupId }, ids: yllkaEnrolmentInOxfordGroup, auth: oxfordOwnerAuth })
    const movedToYllkaGroup = await send({ method: 'post', route: '/:organizationId/groups/:groupId/enrolments/:enrolmentId/move', body: { group_id: yllka.groupId }, ids: oxford, auth: oxfordOwnerAuth })
    const markedYllkaStudent = await send({ method: 'put', route: '/:organizationId/attendance/groups/:groupId/:date/:startTime/students/:studentId', body: MARK, ids: { ...oxford, studentId: yllka.studentId }, auth: oxfordOwnerAuth })
    const cancelledYllkaReschedule = await send({ method: 'post', route: '/:organizationId/groups/:groupId/reschedules/:rescheduleId/cancel', ids: { ...oxford, rescheduleId: yllka.rescheduleId }, auth: oxfordOwnerAuth })
    const substitutionWithYllkaLecturer = await send({ method: 'post', route: '/:organizationId/groups/:groupId/substitutions', body: { ...SUBSTITUTION, lecturer_id: yllka.lecturerId }, ids: oxford, auth: oxfordOwnerAuth })
    const noteWithYllkaGroup = await send({ method: 'post', route: '/:organizationId/my-students/:studentId/notes', body: { ...NOTE, group_id: yllka.groupId }, ids: oxford, auth: oxfordOwnerAuth })
    const transferred = await send({
      method: 'post',
      route: '/:organizationId/settings/transfer-ownership',
      body: { membership_id: yllka.membershipId, password: 'password123' },
      ids: oxford,
      auth: oxfordOwnerAuth,
    })

    expect(created.status).toBe(400)
    expect(updated.status).toBe(400)
    expect(removedMain.status).toBe(400)
    expect(removedCurrentYear.status).toBe(400)
    expect(lecturerWithYllkaLocation.status).toBe(400)
    expect(lecturerWithYllkaDepartment.status).toBe(400)
    expect(await prisma.lecturerLocation.count({ where: { location_id: yllka.locationId } })).toBe(1)
    expect(await prisma.lecturer.count({ where: { department_id: yllka.departmentId } })).toBe(1)
    expect(courseWithYllkaDepartment.status).toBe(400)
    expect(editedCourseWithYllkaDepartment.status).toBe(400)
    expect(await prisma.course.count({ where: { department_id: yllka.departmentId } })).toBe(1)
    expect(addedGroups.map((response) => response.status)).toEqual([400, 400, 400, 400, 400])
    expect(editedGroups.map((response) => response.status)).toEqual([400, 400, 400, 400, 400])
    expect(await prisma.group.count({ where: { organization_id: oxford.organizationId } })).toBe(1)
    expect(await prisma.groupLecturerAssignment.count({ where: { lecturer_id: yllka.lecturerId, group: { organization_id: oxford.organizationId } } })).toBe(0)
    expect(await prisma.group.count({ where: { OR: [{ academic_year_id: yllka.yearId }, { academic_term_id: yllka.termId }] } })).toBe(0)
    expect(await prisma.group.count({ where: { OR: [{ course_id: yllka.courseId }, { location_id: yllka.locationId }] } })).toBe(1)
    expect(editedYllkaSubstitution.status).toBe(404)
    expect(cancelledYllkaSubstitution.status).toBe(404)
    expect(enrolmentWithYllkaStudent.status).toBe(400)
    expect(await prisma.groupEnrolment.count({ where: { student_id: yllka.studentId } })).toBe(1)
    expect(withdrawnYllkaEnrolment.status).toBe(404)
    expect(movedYllkaEnrolment.status).toBe(404)
    expect(movedToYllkaGroup.status).toBe(400)
    expect(await prisma.groupEnrolment.findUniqueOrThrow({ where: { id: oxford.enrolmentId }, select: { withdrawn_on: true } })).toEqual({ withdrawn_on: null })
    expect(markedYllkaStudent.status).toBe(404)
    expect(await prisma.attendanceRecord.count({ where: { student_id: yllka.studentId } })).toBe(1)
    expect(await prisma.attendanceRecord.count({ where: { group_id: oxford.groupId, student_id: yllka.studentId } })).toBe(0)
    expect(cancelledYllkaReschedule.status).toBe(404)
    expect(await prisma.lessonReschedule.findUniqueOrThrow({ where: { id: yllka.rescheduleId }, select: { cancelled_at: true } })).toEqual({ cancelled_at: null })
    expect(substitutionWithYllkaLecturer.status).toBe(400)
    expect(await prisma.groupSubstitution.count({ where: { lecturer_id: yllka.lecturerId } })).toBe(0)
    expect(noteWithYllkaGroup.status).toBe(400)
    expect(await prisma.studentNote.count({ where: { group_id: yllka.groupId } })).toBe(0)
    expect(transferred.status).toBe(404)
    expect(await prisma.membership.findUniqueOrThrow({ where: { id: yllka.membershipId }, select: { role: true } })).toEqual({ role: 'ADMIN' })
    expect((await request(app).get(toPath({ route: '/:organizationId/settings', ids: oxford })).set('Authorization', oxfordOwnerAuth)).status).toBe(200)
    expect(await yllkaAsItsOwnerSeesIt()).toEqual(before)
  })

  it('lets a timetable admin read only their own organization’s groups and moves', async () => {
    const timetable = await createUser({ email: 'timetable@oxford.test' })
    await prisma.membership.create({ data: { user_id: timetable.id, organization_id: oxford.organizationId, role: 'ADMIN', permissions: ['MANAGE_SCHEDULES'] } })
    const before = await yllkaAsItsOwnerSeesIt()
    const auth = await loginAs('timetable@oxford.test')
    const readable = ['/:organizationId/groups', '/:organizationId/groups/:groupId', '/:organizationId/groups/:groupId/reschedules', '/:organizationId/courses/options']

    for (const route of readable) {
      expect((await send({ method: 'get', route, ids: oxford, auth })).status, route).toBe(200)
      expect((await send({ method: 'get', route, ids: yllka, auth })).status, route).toBe(403)
    }
    for (const route of readable.filter((item) => item.includes(':groupId'))) {
      expect((await send({ method: 'get', route, ids: { ...yllka, organizationId: oxford.organizationId }, auth })).status, route).toBe(404)
    }
    expect((await send({ method: 'post', route: '/:organizationId/groups/:groupId/reschedules/:rescheduleId/cancel', ids: { ...oxford, rescheduleId: yllka.rescheduleId }, auth })).status).toBe(404)
    expect(await yllkaAsItsOwnerSeesIt()).toEqual(before)
  })

  it('refuses lecturers on another organization’s registers, even for a group they teach there', async () => {
    const lecturer = await createUser({ email: 'lecturer@yllka.test' })
    await prisma.membership.createMany({
      data: [
        { user_id: lecturer.id, organization_id: yllka.organizationId, role: 'LECTURER' },
        { user_id: lecturer.id, organization_id: oxford.organizationId, role: 'LECTURER' },
      ],
    })
    await prisma.lecturer.update({ where: { id: yllka.lecturerId }, data: { user_id: lecturer.id } })
    const yllkaOnly = await createUser({ email: 'only@yllka.test' })
    await prisma.membership.create({ data: { user_id: yllkaOnly.id, organization_id: yllka.organizationId, role: 'LECTURER' } })
    const before = await yllkaAsItsOwnerSeesIt()
    const lecturerAuth = await loginAs('lecturer@yllka.test')
    const yllkaOnlyAuth = await loginAs('only@yllka.test')
    const attendanceEndpoints = SCOPED_ENDPOINTS.filter((endpoint) => endpoint.route.includes('/attendance/'))

    expect((await send({ method: 'get', route: '/:organizationId/attendance/groups/:groupId/:date/:startTime', ids: yllka, auth: lecturerAuth })).status).toBe(200)
    for (const endpoint of attendanceEndpoints) {
      const label = `${endpoint.method.toUpperCase()} ${endpoint.route}`
      expect((await send({ ...endpoint, ids: oxford, auth: yllkaOnlyAuth })).status, label).toBe(403)
      // A member of both, whose lecturer record is Yllka's, reaches neither Oxford's groups nor Yllka's through Oxford
      if (endpoint.route.includes(':groupId')) {
        expect((await send({ ...endpoint, ids: oxford, auth: lecturerAuth })).status, label).toBe(403)
        expect((await send({ ...endpoint, ids: { ...yllka, organizationId: oxford.organizationId }, auth: lecturerAuth })).status, label).toBe(404)
      }
    }
    expect((await send({ method: 'get', route: `/:organizationId/attendance/groups?date=${LESSON_DATE}`, ids: oxford, auth: lecturerAuth })).body.data).toEqual([])

    expect(await yllkaAsItsOwnerSeesIt()).toEqual(before)
  })
})
