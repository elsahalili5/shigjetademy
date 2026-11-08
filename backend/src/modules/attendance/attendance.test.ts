import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

// Monday 9 November 2026, 11:00 in Belgrade
const MONDAY_MORNING = '2026-11-09T10:00:00.000Z'
const MONDAY = '2026-11-09'
const SUNDAY = '2026-11-08'
const TUESDAY = '2026-11-10'
// A one-day holiday
const WEDNESDAY_HOLIDAY = '2026-11-11'
const NEXT_MONDAY = '2026-11-16'
// After the autumn term, still inside the school year
const MONDAY_AFTER_TERM = '2027-01-04'

type Meeting = {
  weekday: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
  start_time: string
  end_time: string
}

const MONDAY_EVENING: Meeting = { weekday: 'MONDAY', start_time: '17:00', end_time: '18:30' }

let organizationId: string
let courseId: string
let yearId: string
let termId: string
let arbenId: string
let teutaId: string

type AddGroupParams = {
  name: string
  lecturerId?: string
  schedule?: Meeting[]
  /** The autumn term when left out; null for the whole school year */
  termId?: string | null
  status?: 'ACTIVE' | 'ARCHIVED'
}

const addGroup = async ({ name, lecturerId, schedule = [MONDAY_EVENING], termId: groupTermId = termId, status = 'ACTIVE' }: AddGroupParams) => {
  const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: courseId, name, academic_year_id: yearId, academic_term_id: groupTermId, status } })
  await prisma.groupMeeting.createMany({ data: schedule.map((meeting) => ({ group_id: group.id, weekday: meeting.weekday, start_time: new Date(`1970-01-01T${meeting.start_time}:00.000Z`), end_time: new Date(`1970-01-01T${meeting.end_time}:00.000Z`) })) })
  if (lecturerId) {
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: lecturerId, start_date: new Date('2026-09-01') } })
  }
  return group
}

type AddCoverParams = {
  groupId: string
  lecturerId: string
  startDate: string
  endDate: string
  cancelledAt?: Date
}

const addCover = ({ groupId, lecturerId, startDate, endDate, cancelledAt }: AddCoverParams) =>
  prisma.groupSubstitution.create({ data: { group_id: groupId, lecturer_id: lecturerId, start_date: new Date(startDate), end_date: new Date(endDate), cancelled_at: cancelledAt } })

const groupsPath = () => `/api/organizations/${organizationId}/attendance/groups`

const listGroups = async (email: string, date: string) => request(app).get(groupsPath()).query({ date }).set('Authorization', await loginAs(email))

const groupNames = (response: { body: { data: { name: string }[] } }) => response.body.data.map((group) => group.name)

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(MONDAY_MORNING))
  const owner = await createUser({ email: 'owner@oxford.test' })
  const attendanceAdmin = await createUser({ email: 'attendance@oxford.test' })
  const coursesAdmin = await createUser({ email: 'courses@oxford.test' })
  const arben = await createUser({ email: 'arben@lecturer.test' })
  const teuta = await createUser({ email: 'teuta@lecturer.test' })
  const unlinked = await createUser({ email: 'unlinked@lecturer.test' })
  const student = await createUser({ email: 'student@oxford.test' })
  const yllkaOwner = await createUser({ email: 'owner@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: attendanceAdmin.id, role: 'ADMIN', permissions: ['MANAGE_ATTENDANCE'] },
        { userId: coursesAdmin.id, role: 'ADMIN', permissions: ['MANAGE_COURSES'] },
        { userId: arben.id, role: 'LECTURER' },
        { userId: teuta.id, role: 'LECTURER' },
        { userId: unlinked.id, role: 'LECTURER' },
        { userId: student.id, role: 'STUDENT' },
      ],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id })
  await prisma.organizationSettings.create({ data: { organization_id: organizationId, time_zone: 'Europe/Belgrade' } })
  courseId = (await createCourse({ organizationId, name: 'Mathematics' })).id
  yearId = (await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true } })).id
  termId = (await prisma.academicTerm.create({ data: { academic_year_id: yearId, name: 'Autumn', start_date: new Date('2026-09-01'), end_date: new Date('2026-12-20') } })).id
  await prisma.academicHoliday.create({ data: { academic_year_id: yearId, name: 'Day off', start_date: new Date(WEDNESDAY_HOLIDAY), end_date: new Date(WEDNESDAY_HOLIDAY) } })
  arbenId = (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Arben', last_name: 'Hoxha', employment_type: 'FULL_TIME', user_id: arben.id } })).id
  teutaId = (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Teuta', last_name: 'Krasniqi', employment_type: 'PART_TIME', user_id: teuta.id } })).id
})

afterEach(() => {
  vi.useRealTimers()
})

describe('groups with a lesson on a day', () => {
  it('shows a lecturer the groups they teach that day, with the first start and last end, earliest first', async () => {
    const north = await prisma.location.create({ data: { organization_id: organizationId, name: 'North campus' } })
    const late = await addGroup({ name: 'Group B', lecturerId: arbenId, schedule: [{ weekday: 'MONDAY', start_time: '19:00', end_time: '20:00' }] })
    const twice = await addGroup({ name: 'Group A', lecturerId: arbenId, schedule: [{ weekday: 'MONDAY', start_time: '17:00', end_time: '18:00' }, { weekday: 'MONDAY', start_time: '18:15', end_time: '18:45' }, { weekday: 'TUESDAY', start_time: '09:00', end_time: '10:00' }] })
    await prisma.group.update({ where: { id: late.id }, data: { location_id: north.id } })
    await addGroup({ name: 'Tuesdays', lecturerId: arbenId, schedule: [{ weekday: 'TUESDAY', start_time: '17:00', end_time: '18:30' }] })
    await addGroup({ name: 'Teuta’s group', lecturerId: teutaId })

    const response = await listGroups('arben@lecturer.test', MONDAY)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      { id: twice.id, name: 'Group A', course: 'Mathematics', location: null, opens_at: '17:00', locks_at: '18:45' },
      { id: late.id, name: 'Group B', course: 'Mathematics', location: 'North campus', opens_at: '19:00', locks_at: '20:00' },
    ])
    expect(groupNames(await listGroups('arben@lecturer.test', TUESDAY))).toEqual(['Group A', 'Tuesdays'])
  })

  it('has no lessons on a holiday, outside the group’s term, or for a group without a schedule', async () => {
    await addGroup({ name: 'Wednesdays', lecturerId: arbenId, schedule: [{ weekday: 'WEDNESDAY', start_time: '17:00', end_time: '18:30' }] })
    await addGroup({ name: 'Autumn only', lecturerId: arbenId })
    await addGroup({ name: 'All year', lecturerId: arbenId, termId: null })
    await addGroup({ name: 'No schedule', lecturerId: arbenId, schedule: [] })

    expect(groupNames(await listGroups('arben@lecturer.test', WEDNESDAY_HOLIDAY))).toEqual([])
    expect(groupNames(await listGroups('arben@lecturer.test', MONDAY_AFTER_TERM))).toEqual(['All year'])
    expect(groupNames(await listGroups('arben@lecturer.test', '2027-07-05'))).toEqual([])
  })

  it('gives a covered day to the substitute, not the permanent lecturer, and ignores cancelled cover', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    await addCover({ groupId: group.id, lecturerId: teutaId, startDate: MONDAY, endDate: MONDAY })
    await addCover({ groupId: group.id, lecturerId: teutaId, startDate: NEXT_MONDAY, endDate: NEXT_MONDAY, cancelledAt: new Date(MONDAY_MORNING) })

    expect(groupNames(await listGroups('teuta@lecturer.test', MONDAY))).toEqual(['Group A'])
    expect(groupNames(await listGroups('arben@lecturer.test', MONDAY))).toEqual([])
    expect(groupNames(await listGroups('arben@lecturer.test', NEXT_MONDAY))).toEqual(['Group A'])
    expect(groupNames(await listGroups('teuta@lecturer.test', NEXT_MONDAY))).toEqual([])
  })

  it('follows a change of permanent lecturer by date', async () => {
    const group = await addGroup({ name: 'Group A' })
    await prisma.groupLecturerAssignment.createMany({
      data: [
        { group_id: group.id, lecturer_id: arbenId, start_date: new Date('2026-09-01'), end_date: new Date('2026-11-12') },
        { group_id: group.id, lecturer_id: teutaId, start_date: new Date('2026-11-13') },
      ],
    })

    expect(groupNames(await listGroups('arben@lecturer.test', MONDAY))).toEqual(['Group A'])
    expect(groupNames(await listGroups('teuta@lecturer.test', MONDAY))).toEqual([])
    expect(groupNames(await listGroups('teuta@lecturer.test', NEXT_MONDAY))).toEqual(['Group A'])
  })

  it('shows the owner and admins with attendance every active group with a lesson that day', async () => {
    await addGroup({ name: 'Arben’s group', lecturerId: arbenId })
    await addGroup({ name: 'Teuta’s group', lecturerId: teutaId })
    await addGroup({ name: 'Nobody’s group' })
    await addGroup({ name: 'Archived', lecturerId: arbenId, status: 'ARCHIVED' })

    expect(groupNames(await listGroups('owner@oxford.test', MONDAY))).toEqual(['Arben’s group', 'Nobody’s group', 'Teuta’s group'])
    expect(groupNames(await listGroups('attendance@oxford.test', MONDAY))).toEqual(['Arben’s group', 'Nobody’s group', 'Teuta’s group'])
  })

  it('shows a lecturer without a linked record no groups', async () => {
    await addGroup({ name: 'Group A', lecturerId: arbenId })

    const response = await listGroups('unlinked@lecturer.test', MONDAY)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([])
  })

  it('refuses admins without attendance, students and other organizations', async () => {
    for (const email of ['courses@oxford.test', 'student@oxford.test', 'owner@yllka.test']) {
      expect((await listGroups(email, MONDAY)).status, email).toBe(403)
    }
  })

  it('asks for a date', async () => {
    const auth = await loginAs('owner@oxford.test')

    expect((await request(app).get(groupsPath()).set('Authorization', auth)).status).toBe(400)
    expect((await request(app).get(groupsPath()).query({ date: '2026-13-40' }).set('Authorization', auth)).status).toBe(400)
  })
})

type AddStudentParams = {
  firstName: string
  lastName: string
  enrolledOn?: string
  withdrawnOn?: string
  status?: 'ACTIVE' | 'ARCHIVED'
}

let studentCount = 0

/** A student of Oxford with a seat in the group from enrolledOn, and up to withdrawnOn when given */
const addStudent = async (groupId: string, { firstName, lastName, enrolledOn = '2026-09-01', withdrawnOn, status = 'ACTIVE' }: AddStudentParams) => {
  studentCount += 1
  const student = await prisma.student.create({
    data: { organization_id: organizationId, first_name: firstName, last_name: lastName, student_number: `STU-${studentCount}`, status, notes: 'Private note', date_of_birth: new Date('2015-04-01') },
  })
  await prisma.groupEnrolment.create({ data: { group_id: groupId, student_id: student.id, enrolled_on: new Date(enrolledOn), withdrawn_on: withdrawnOn ? new Date(withdrawnOn) : null } })
  return student
}

const registerPath = (groupId: string, date: string) => `${groupsPath()}/${groupId}/${date}`

const readRegister = async (email: string, groupId: string, date: string) => request(app).get(registerPath(groupId, date)).set('Authorization', await loginAs(email))

describe('a group’s register', () => {
  it('lists the students in the group on that day by name, with their status or none, and no staff notes or dates of birth', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    const besa = await addStudent(group.id, { firstName: 'Besa', lastName: 'Berisha' })
    const arta = await addStudent(group.id, { firstName: 'Arta', lastName: 'Gashi' })
    const leftLater = await addStudent(group.id, { firstName: 'Fatos', lastName: 'Morina', withdrawnOn: TUESDAY })
    const archived = await addStudent(group.id, { firstName: 'Genta', lastName: 'Rama', status: 'ARCHIVED' })
    await addStudent(group.id, { firstName: 'Dren', lastName: 'Krasniqi', enrolledOn: TUESDAY })
    await addStudent(group.id, { firstName: 'Erza', lastName: 'Shala', enrolledOn: '2026-09-01', withdrawnOn: SUNDAY })
    await prisma.attendanceRecord.create({ data: { group_id: group.id, student_id: arta.id, date: new Date(MONDAY), status: 'TARDY' } })
    await prisma.attendanceRecord.create({ data: { group_id: group.id, student_id: besa.id, date: new Date('2026-11-02'), status: 'ABSENT' } })

    const response = await readRegister('arben@lecturer.test', group.id, MONDAY)

    expect(response.status).toBe(200)
    expect(response.body.data.students).toEqual([
      { id: arta.id, first_name: 'Arta', last_name: 'Gashi', is_archived: false, status: 'TARDY' },
      { id: besa.id, first_name: 'Besa', last_name: 'Berisha', is_archived: false, status: null },
      { id: leftLater.id, first_name: 'Fatos', last_name: 'Morina', is_archived: false, status: null },
      { id: archived.id, first_name: 'Genta', last_name: 'Rama', is_archived: true, status: null },
    ])
  })

  it('says when the lesson opens and locks, and that a lecturer can’t mark it before it starts', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId, schedule: [MONDAY_EVENING, { weekday: 'MONDAY', start_time: '19:00', end_time: '19:45' }] })

    const response = await readRegister('arben@lecturer.test', group.id, MONDAY)

    expect(response.body.data).toEqual({
      group: { id: group.id, name: 'Group A', course: 'Mathematics', status: 'ACTIVE' },
      date: MONDAY,
      opens_at: '17:00',
      locks_at: '19:45',
      window: 'UPCOMING',
      can_edit: false,
      substitute: null,
      students: [],
    })
  })

  it('lets the owner and admins with attendance read any group’s register', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: teutaId })

    expect((await readRegister('owner@oxford.test', group.id, MONDAY)).status).toBe(200)
    expect((await readRegister('attendance@oxford.test', group.id, MONDAY)).status).toBe(200)
  })

  it('lets the substitute and the permanent lecturer read a covered day, and nobody else', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    await addCover({ groupId: group.id, lecturerId: teutaId, startDate: MONDAY, endDate: MONDAY })

    expect((await readRegister('teuta@lecturer.test', group.id, MONDAY)).status).toBe(200)
    expect((await readRegister('arben@lecturer.test', group.id, MONDAY)).status).toBe(200)
    expect((await readRegister('teuta@lecturer.test', group.id, NEXT_MONDAY)).status).toBe(403)
    expect((await readRegister('unlinked@lecturer.test', group.id, MONDAY)).status).toBe(403)
  })

  it('refuses a lecturer the register of a group they don’t teach on that day', async () => {
    const group = await addGroup({ name: 'Group A' })
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: arbenId, start_date: new Date('2026-09-01'), end_date: new Date('2026-11-01') } })

    const response = await readRegister('arben@lecturer.test', group.id, MONDAY)

    expect(response.status).toBe(403)
  })

  it('refuses a day that isn’t a lesson for the group: off its schedule, a holiday, or outside its term', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId, schedule: [MONDAY_EVENING, { weekday: 'WEDNESDAY', start_time: '17:00', end_time: '18:30' }] })

    for (const date of [TUESDAY, WEDNESDAY_HOLIDAY, MONDAY_AFTER_TERM]) {
      const response = await readRegister('owner@oxford.test', group.id, date)
      expect(response.status, date).toBe(409)
      expect(response.body.error, date).toBe('This group has no lesson on this day.')
    }
  })

  it('answers 404 for an unknown group, and refuses admins without attendance and students', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })

    expect((await readRegister('owner@oxford.test', '00000000-0000-4000-8000-000000000000', MONDAY)).status).toBe(404)
    expect((await readRegister('arben@lecturer.test', '00000000-0000-4000-8000-000000000000', MONDAY)).status).toBe(404)
    expect((await readRegister('courses@oxford.test', group.id, MONDAY)).status).toBe(403)
    expect((await readRegister('student@oxford.test', group.id, MONDAY)).status).toBe(403)
    expect((await readRegister('owner@oxford.test', group.id, 'monday')).status).toBe(400)
  })

  it('keeps an archived group’s past registers readable by staff and the lecturer who taught it', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId, status: 'ARCHIVED' })

    const asLecturer = await readRegister('arben@lecturer.test', group.id, '2026-11-02')
    const asOwner = await readRegister('owner@oxford.test', group.id, '2026-11-02')

    expect(asLecturer.status).toBe(200)
    expect(asLecturer.body.data).toMatchObject({ group: { status: 'ARCHIVED' }, window: 'LOCKED', can_edit: false })
    expect(asOwner.body.data).toMatchObject({ window: 'LOCKED', can_edit: false })
  })
})

type MarkParams = {
  email: string
  groupId: string
  studentId: string
  status: string
  date?: string
}

const mark = async ({ email, groupId, studentId, status, date = MONDAY }: MarkParams) =>
  request(app).put(`${registerPath(groupId, date)}/students/${studentId}`).set('Authorization', await loginAs(email)).send({ status })

const markAllPresent = async (email: string, groupId: string, date = MONDAY) => request(app).put(`${registerPath(groupId, date)}/mark-all-present`).set('Authorization', await loginAs(email))

/** The organization's wall clock on Monday; Belgrade is an hour ahead of UTC in November */
const atBelgrade = (clock: string) => vi.setSystemTime(new Date(`${MONDAY}T${clock}:00.000+01:00`))

describe('marking students', () => {
  let groupId: string
  let artaId: string
  let besaId: string

  beforeEach(async () => {
    groupId = (await addGroup({ name: 'Group A', lecturerId: arbenId })).id
    artaId = (await addStudent(groupId, { firstName: 'Arta', lastName: 'Gashi' })).id
    besaId = (await addStudent(groupId, { firstName: 'Besa', lastName: 'Berisha' })).id
  })

  it('lets the lecturer mark from the lesson’s first start until its last end, in the organization’s time zone', async () => {
    atBelgrade('16:59')
    const before = await mark({ email: 'arben@lecturer.test', groupId, studentId: artaId, status: 'PRESENT' })
    atBelgrade('17:00')
    const atStart = await mark({ email: 'arben@lecturer.test', groupId, studentId: artaId, status: 'PRESENT' })
    atBelgrade('18:29')
    const beforeEnd = await mark({ email: 'arben@lecturer.test', groupId, studentId: besaId, status: 'ABSENT' })
    atBelgrade('18:30')
    const atEnd = await mark({ email: 'arben@lecturer.test', groupId, studentId: besaId, status: 'PRESENT' })

    expect(before.status).toBe(409)
    expect(before.body.error).toBe('This register opens at 17:00.')
    expect(atStart.status).toBe(200)
    expect(atStart.body.data).toEqual({ id: artaId, first_name: 'Arta', last_name: 'Gashi', is_archived: false, status: 'PRESENT' })
    expect(beforeEnd.status).toBe(200)
    expect(atEnd.status).toBe(409)
    expect(atEnd.body.error).toBe('This register locked at 18:30.')
    expect((await readRegister('arben@lecturer.test', groupId, MONDAY)).body.data).toMatchObject({ window: 'LOCKED', can_edit: false, students: [{ status: 'PRESENT' }, { status: 'ABSENT' }] })
  })

  it('tells the lecturer the register is open while the lesson runs', async () => {
    atBelgrade('17:45')

    expect((await readRegister('arben@lecturer.test', groupId, MONDAY)).body.data).toMatchObject({ window: 'OPEN', can_edit: true })
  })

  it('changes a student’s status in place, and records who marked it', async () => {
    atBelgrade('17:10')
    await mark({ email: 'arben@lecturer.test', groupId, studentId: artaId, status: 'PRESENT' })
    const changed = await mark({ email: 'arben@lecturer.test', groupId, studentId: artaId, status: 'TARDY' })

    expect(changed.body.data.status).toBe('TARDY')
    const records = await prisma.attendanceRecord.findMany({ where: { student_id: artaId }, select: { status: true, date: true, marked_by: { select: { email: true } } } })
    expect(records).toEqual([{ status: 'TARDY', date: new Date(MONDAY), marked_by: { email: 'arben@lecturer.test' } }])
  })

  it('refuses a student who isn’t in the group that day, and one that doesn’t exist', async () => {
    atBelgrade('17:10')
    const joinsLater = await addStudent(groupId, { firstName: 'Dren', lastName: 'Krasniqi', enrolledOn: TUESDAY })
    const left = await addStudent(groupId, { firstName: 'Erza', lastName: 'Shala', withdrawnOn: SUNDAY })
    const elsewhere = await prisma.student.create({ data: { organization_id: organizationId, first_name: 'Fatos', last_name: 'Morina', student_number: 'STU-OUT' } })

    for (const studentId of [joinsLater.id, left.id, elsewhere.id]) {
      const response = await mark({ email: 'arben@lecturer.test', groupId, studentId, status: 'PRESENT' })
      expect(response.status).toBe(409)
      expect(response.body.error).toBe('This student isn’t in this group on this day.')
    }
    expect((await mark({ email: 'arben@lecturer.test', groupId, studentId: '00000000-0000-4000-8000-000000000000', status: 'PRESENT' })).status).toBe(404)
    expect(await prisma.attendanceRecord.count()).toBe(0)
  })

  it('accepts only present, tardy or absent', async () => {
    atBelgrade('17:10')

    const response = await mark({ email: 'arben@lecturer.test', groupId, studentId: artaId, status: 'EXCUSED' })

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.status).toEqual(['Choose present, tardy or absent.'])
  })

  it('marks only unmarked students present', async () => {
    atBelgrade('17:10')
    await mark({ email: 'arben@lecturer.test', groupId, studentId: artaId, status: 'ABSENT' })

    const response = await markAllPresent('arben@lecturer.test', groupId)

    expect(response.status).toBe(200)
    expect(response.body.data.students.map((student: { first_name: string; status: string }) => [student.first_name, student.status])).toEqual([
      ['Arta', 'ABSENT'],
      ['Besa', 'PRESENT'],
    ])
    expect(await prisma.attendanceRecord.count()).toBe(2)
  })

  it('gives a covered day to the substitute; the permanent lecturer and other lecturers can’t mark it', async () => {
    atBelgrade('17:10')
    await addCover({ groupId, lecturerId: teutaId, startDate: MONDAY, endDate: MONDAY })

    const bySubstitute = await mark({ email: 'teuta@lecturer.test', groupId, studentId: artaId, status: 'PRESENT' })
    const byPermanent = await mark({ email: 'arben@lecturer.test', groupId, studentId: artaId, status: 'ABSENT' })
    const allByPermanent = await markAllPresent('arben@lecturer.test', groupId)
    const byUnlinked = await mark({ email: 'unlinked@lecturer.test', groupId, studentId: artaId, status: 'ABSENT' })

    expect(bySubstitute.status).toBe(200)
    expect(byPermanent.status).toBe(403)
    expect(byPermanent.body.error).toBe('Your substitute takes this register on this day.')
    expect(allByPermanent.status).toBe(403)
    expect(byUnlinked.status).toBe(403)
    expect((await readRegister('arben@lecturer.test', groupId, MONDAY)).body.data).toMatchObject({ window: 'OPEN', can_edit: false, substitute: { first_name: 'Teuta', last_name: 'Krasniqi' }, students: [{ status: 'PRESENT' }, { status: null }] })
  })

  it('refuses the permanent lecturer of a covered day with 403 before any student or window check', async () => {
    await addCover({ groupId, lecturerId: teutaId, startDate: MONDAY, endDate: NEXT_MONDAY })
    const outsider = await prisma.student.create({ data: { organization_id: organizationId, first_name: 'Fatos', last_name: 'Morina', student_number: 'STU-OUT' } })

    atBelgrade('17:10')
    const unknownStudent = await mark({ email: 'arben@lecturer.test', groupId, studentId: '00000000-0000-4000-8000-000000000000', status: 'PRESENT' })
    const notEnrolled = await mark({ email: 'arben@lecturer.test', groupId, studentId: outsider.id, status: 'PRESENT' })
    const future = await mark({ email: 'arben@lecturer.test', groupId, studentId: artaId, status: 'PRESENT', date: NEXT_MONDAY })
    atBelgrade('19:00')
    const locked = await mark({ email: 'arben@lecturer.test', groupId, studentId: artaId, status: 'PRESENT' })
    const lockedAll = await markAllPresent('arben@lecturer.test', groupId)

    expect([unknownStudent.status, notEnrolled.status, future.status, locked.status, lockedAll.status]).toEqual([403, 403, 403, 403, 403])
    expect(await prisma.attendanceRecord.count()).toBe(0)
  })

  it('names no substitute on a day nobody covers', async () => {
    atBelgrade('17:10')

    expect((await readRegister('owner@oxford.test', groupId, MONDAY)).body.data.substitute).toBeNull()
  })

  it('refuses a day that isn’t a lesson, and a future lesson for everyone', async () => {
    atBelgrade('17:10')

    expect((await mark({ email: 'owner@oxford.test', groupId, studentId: artaId, status: 'PRESENT', date: TUESDAY })).status).toBe(409)
    const future = await mark({ email: 'owner@oxford.test', groupId, studentId: artaId, status: 'PRESENT', date: NEXT_MONDAY })
    expect(future.status).toBe(409)
    expect(future.body.error).toBe('This register opens at 17:00.')
    expect((await markAllPresent('owner@oxford.test', groupId, NEXT_MONDAY)).status).toBe(409)
    expect(await prisma.attendanceRecord.count()).toBe(0)
  })

  it('refuses admins without attendance and students', async () => {
    atBelgrade('17:10')

    expect((await mark({ email: 'courses@oxford.test', groupId, studentId: artaId, status: 'PRESENT' })).status).toBe(403)
    expect((await markAllPresent('student@oxford.test', groupId)).status).toBe(403)
  })
})

const corrections = () =>
  prisma.activityLog.findMany({ where: { action: 'ATTENDANCE_CORRECTED' }, orderBy: { subject_name: 'asc' }, select: { subject_name: true, organization_id: true, actor: { select: { email: true } } } })

describe('corrections after the lock', () => {
  let groupId: string
  let artaId: string

  beforeEach(async () => {
    groupId = (await addGroup({ name: 'Group A', lecturerId: arbenId })).id
    artaId = (await addStudent(groupId, { firstName: 'Arta', lastName: 'Gashi' })).id
    await addStudent(groupId, { firstName: 'Besa', lastName: 'Berisha' })
  })

  it('lets the owner and admins with attendance correct a locked register at any time', async () => {
    atBelgrade('18:31')
    const byOwner = await mark({ email: 'owner@oxford.test', groupId, studentId: artaId, status: 'ABSENT' })
    vi.setSystemTime(new Date('2026-12-01T10:00:00.000Z'))
    const byAdmin = await mark({ email: 'attendance@oxford.test', groupId, studentId: artaId, status: 'TARDY' })
    const register = await readRegister('attendance@oxford.test', groupId, MONDAY)

    expect(byOwner.status).toBe(200)
    expect(byAdmin.status).toBe(200)
    expect(register.body.data).toMatchObject({ window: 'LOCKED', can_edit: true, students: [{ first_name: 'Arta', status: 'TARDY' }, { first_name: 'Besa', status: null }] })
  })

  it('logs a change after the lock, naming the student, group and day', async () => {
    atBelgrade('18:31')
    await mark({ email: 'owner@oxford.test', groupId, studentId: artaId, status: 'ABSENT' })

    expect(await corrections()).toEqual([{ subject_name: 'Arta Gashi in Group A on 2026-11-09', organization_id: organizationId, actor: { email: 'owner@oxford.test' } }])
  })

  it('logs nothing for marks inside the lesson window, by a lecturer or the owner, or for a correction that changes nothing', async () => {
    atBelgrade('17:10')
    await mark({ email: 'arben@lecturer.test', groupId, studentId: artaId, status: 'PRESENT' })
    await mark({ email: 'owner@oxford.test', groupId, studentId: artaId, status: 'TARDY' })
    await markAllPresent('owner@oxford.test', groupId)
    atBelgrade('18:31')
    await mark({ email: 'owner@oxford.test', groupId, studentId: artaId, status: 'TARDY' })

    expect(await corrections()).toEqual([])
  })

  it('logs one correction per student that marking everyone present after the lock changes', async () => {
    atBelgrade('17:10')
    await mark({ email: 'arben@lecturer.test', groupId, studentId: artaId, status: 'ABSENT' })
    atBelgrade('19:00')

    const response = await markAllPresent('attendance@oxford.test', groupId)

    expect(response.status).toBe(200)
    expect((await corrections()).map((entry) => entry.subject_name)).toEqual(['Besa Berisha in Group A on 2026-11-09'])
  })

  it('keeps an archived group’s registers read-only for everyone', async () => {
    atBelgrade('17:10')
    await prisma.group.update({ where: { id: groupId }, data: { status: 'ARCHIVED' } })

    for (const email of ['owner@oxford.test', 'attendance@oxford.test', 'arben@lecturer.test']) {
      const response = await mark({ email, groupId, studentId: artaId, status: 'PRESENT' })
      expect(response.status, email).toBe(409)
      expect(response.body.error, email).toBe('This group is archived, so its register is read-only.')
      expect((await markAllPresent(email, groupId)).status, email).toBe(409)
    }
    expect(await prisma.attendanceRecord.count()).toBe(0)
  })
})

describe('students who leave or move', () => {
  let groupId: string

  const enrolmentOf = (studentId: string, inGroupId: string) => prisma.groupEnrolment.findFirstOrThrow({ where: { student_id: studentId, group_id: inGroupId }, select: { id: true } })

  const studentNames = async (email: string, inGroupId: string, date: string) =>
    (await readRegister(email, inGroupId, date)).body.data.students.map((student: { first_name: string }) => student.first_name)

  beforeEach(async () => {
    groupId = (await addGroup({ name: 'Group A', lecturerId: arbenId })).id
    atBelgrade('17:10')
  })

  it('keeps a student withdrawn today on today’s register with their mark, and lets them be marked', async () => {
    const arta = await addStudent(groupId, { firstName: 'Arta', lastName: 'Gashi', withdrawnOn: MONDAY })
    await prisma.attendanceRecord.create({ data: { group_id: groupId, student_id: arta.id, date: new Date(MONDAY), status: 'TARDY' } })

    expect((await readRegister('arben@lecturer.test', groupId, MONDAY)).body.data.students).toMatchObject([{ id: arta.id, status: 'TARDY' }])
    const marked = await mark({ email: 'arben@lecturer.test', groupId, studentId: arta.id, status: 'PRESENT' })
    expect(marked.status).toBe(200)
    expect(marked.body.data.status).toBe('PRESENT')
  })

  it('leaves out a student withdrawn yesterday', async () => {
    const arta = await addStudent(groupId, { firstName: 'Arta', lastName: 'Gashi', withdrawnOn: SUNDAY })

    expect(await studentNames('arben@lecturer.test', groupId, MONDAY)).toEqual([])
    expect((await mark({ email: 'arben@lecturer.test', groupId, studentId: arta.id, status: 'PRESENT' })).status).toBe(409)
  })

  it('keeps a student moved today on the old group’s register today, and puts them on the new group’s from tomorrow', async () => {
    const newGroupId = (await addGroup({ name: 'Group B', lecturerId: arbenId, schedule: [MONDAY_EVENING, { weekday: 'TUESDAY', start_time: '17:00', end_time: '18:30' }] })).id
    const arta = await addStudent(groupId, { firstName: 'Arta', lastName: 'Gashi' })
    const { id: enrolmentId } = await enrolmentOf(arta.id, groupId)

    const moved = await request(app)
      .post(`/api/organizations/${organizationId}/groups/${groupId}/enrolments/${enrolmentId}/move`)
      .set('Authorization', await loginAs('owner@oxford.test'))
      .send({ group_id: newGroupId })

    expect(moved.status).toBe(201)
    expect(await studentNames('arben@lecturer.test', groupId, MONDAY)).toEqual(['Arta'])
    expect(await studentNames('arben@lecturer.test', newGroupId, MONDAY)).toEqual([])
    expect((await mark({ email: 'arben@lecturer.test', groupId, studentId: arta.id, status: 'PRESENT' })).status).toBe(200)
    expect((await mark({ email: 'arben@lecturer.test', groupId: newGroupId, studentId: arta.id, status: 'PRESENT' })).status).toBe(409)
    expect(await studentNames('owner@oxford.test', newGroupId, TUESDAY)).toEqual(['Arta'])
    expect(await studentNames('owner@oxford.test', groupId, NEXT_MONDAY)).toEqual([])
  })

  it('lists a student who left and enrolled again on the same day once, and marks them present once', async () => {
    const arta = await addStudent(groupId, { firstName: 'Arta', lastName: 'Gashi', withdrawnOn: MONDAY })
    await prisma.groupEnrolment.create({ data: { group_id: groupId, student_id: arta.id, enrolled_on: new Date(MONDAY) } })

    expect(await studentNames('arben@lecturer.test', groupId, MONDAY)).toEqual(['Arta'])
    const response = await markAllPresent('arben@lecturer.test', groupId)
    expect(response.status).toBe(200)
    expect(response.body.data.students).toMatchObject([{ id: arta.id, status: 'PRESENT' }])
  })
})
