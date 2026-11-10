import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

// Monday 9 November 2026, 11:00 in Belgrade
const MONDAY_MORNING = '2026-11-09T10:00:00.000Z'
const TODAY = '2026-11-09'
const NEXT_MONDAY = '2026-11-16'
const NEXT_TUESDAY = '2026-11-17'
// A one-day holiday
const NEXT_WEDNESDAY_HOLIDAY = '2026-11-18'
const NEXT_FRIDAY = '2026-11-20'
// After the autumn term, still inside the school year
const MONDAY_AFTER_TERM = '2027-01-04'

type Meeting = {
  weekday: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY'
  start_time: string
  end_time: string
}

const MORNING: Meeting = { weekday: 'MONDAY', start_time: '09:00', end_time: '10:30' }
const AFTERNOON: Meeting = { weekday: 'MONDAY', start_time: '14:00', end_time: '15:30' }
const FRIDAY_LATE: Meeting = { weekday: 'FRIDAY', start_time: '18:00', end_time: '19:00' }

let organizationId: string
let courseId: string
let yearId: string
let termId: string
let arbenId: string
let groupId: string

type AddGroupParams = {
  name: string
  schedule?: Meeting[]
  status?: 'ACTIVE' | 'ARCHIVED'
}

const addGroup = async ({ name, schedule = [MORNING, AFTERNOON, FRIDAY_LATE], status = 'ACTIVE' }: AddGroupParams) => {
  const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: courseId, name, academic_year_id: yearId, academic_term_id: termId, status } })
  await prisma.groupMeeting.createMany({ data: schedule.map((meeting) => ({ group_id: group.id, weekday: meeting.weekday, start_time: new Date(`1970-01-01T${meeting.start_time}:00.000Z`), end_time: new Date(`1970-01-01T${meeting.end_time}:00.000Z`) })) })
  await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: arbenId, start_date: new Date('2026-09-01') } })
  return group
}

type RescheduleBody = {
  original_date: string
  original_start_time: string
  new_date: string
  new_start_time: string
  new_end_time: string
  reason: string
}

const MOVE_TO_FRIDAY: RescheduleBody = { original_date: NEXT_MONDAY, original_start_time: '09:00', new_date: NEXT_FRIDAY, new_start_time: '16:00', new_end_time: '17:30', reason: 'Lecturer at a conference' }

const reschedulesPath = (forGroupId = groupId) => `/api/organizations/${organizationId}/groups/${forGroupId}/reschedules`

type RescheduleParams = {
  email?: string
  body?: Partial<RescheduleBody>
  forGroupId?: string
}

const reschedule = async ({ email = 'owner@oxford.test', body = {}, forGroupId }: RescheduleParams = {}) =>
  request(app)
    .post(reschedulesPath(forGroupId))
    .set('Authorization', await loginAs(email))
    .send({ ...MOVE_TO_FRIDAY, ...body })

type CancelParams = {
  rescheduleId: string
  email?: string
  forGroupId?: string
}

const cancel = async ({ rescheduleId, email = 'owner@oxford.test', forGroupId }: CancelParams) =>
  request(app).post(`${reschedulesPath(forGroupId)}/${rescheduleId}/cancel`).set('Authorization', await loginAs(email))

const listReschedules = async (email = 'owner@oxford.test') => request(app).get(reschedulesPath()).set('Authorization', await loginAs(email))

/** The group's session starts on the day, as Attendance lists them to the owner */
const sessionStarts = async (date: string) =>
  (await request(app).get(`/api/organizations/${organizationId}/attendance/groups`).query({ date }).set('Authorization', await loginAs('owner@oxford.test'))).body.data
    .filter((session: { group_id: string }) => session.group_id === groupId)
    .map((session: { start_time: string }) => session.start_time)

type AddMarkParams = {
  date: string
  startTime: string
}

/** A mark on a session's register, for a student of the group */
const addMark = async ({ date, startTime }: AddMarkParams) => {
  const student = await prisma.student.create({ data: { organization_id: organizationId, first_name: 'Arta', last_name: 'Gashi', student_number: `STU-${date}-${startTime}` } })
  await prisma.attendanceRecord.create({ data: { group_id: groupId, student_id: student.id, date: new Date(date), start_time: new Date(`1970-01-01T${startTime}:00.000Z`), status: 'PRESENT' } })
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(MONDAY_MORNING))
  const owner = await createUser({ email: 'owner@oxford.test' })
  const schedulesAdmin = await createUser({ email: 'schedules@oxford.test' })
  const coursesAdmin = await createUser({ email: 'courses@oxford.test' })
  const arben = await createUser({ email: 'arben@lecturer.test' })
  const student = await createUser({ email: 'student@oxford.test' })
  const yllkaOwner = await createUser({ email: 'owner@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: schedulesAdmin.id, role: 'ADMIN', permissions: ['MANAGE_SCHEDULES'] },
        { userId: coursesAdmin.id, role: 'ADMIN', permissions: ['MANAGE_COURSES'] },
        { userId: arben.id, role: 'LECTURER' },
        { userId: student.id, role: 'STUDENT' },
      ],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id })
  await prisma.organizationSettings.create({ data: { organization_id: organizationId, time_zone: 'Europe/Belgrade' } })
  courseId = (await createCourse({ organizationId, name: 'Mathematics' })).id
  yearId = (await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true } })).id
  termId = (await prisma.academicTerm.create({ data: { academic_year_id: yearId, name: 'Autumn', start_date: new Date('2026-09-01'), end_date: new Date('2026-12-20') } })).id
  await prisma.academicHoliday.create({ data: { academic_year_id: yearId, name: 'Day off', start_date: new Date(NEXT_WEDNESDAY_HOLIDAY), end_date: new Date(NEXT_WEDNESDAY_HOLIDAY) } })
  arbenId = (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Arben', last_name: 'Hoxha', employment_type: 'FULL_TIME', user_id: arben.id } })).id
  groupId = (await addGroup({ name: 'Group A' })).id
})

afterEach(() => {
  vi.useRealTimers()
})

describe('rescheduling a lesson', () => {
  it('moves one session to a new date and time, keeping the original on record', async () => {
    const response = await reschedule()

    expect(response.status).toBe(201)
    expect(response.body.data).toEqual({
      id: expect.any(String),
      original_date: NEXT_MONDAY,
      original_start_time: '09:00',
      original_end_time: '10:30',
      new_date: NEXT_FRIDAY,
      new_start_time: '16:00',
      new_end_time: '17:30',
      reason: 'Lecturer at a conference',
      status: 'ACTIVE',
      created_at: expect.any(String),
      cancelled_at: null,
    })
    expect((await listReschedules()).body.data).toEqual([response.body.data])
  })

  it('leaves the group’s other sessions that day where they are', async () => {
    await reschedule()

    expect(await sessionStarts(NEXT_MONDAY)).toEqual(['14:00'])
    expect(await sessionStarts(NEXT_FRIDAY)).toEqual(['16:00', '18:00'])
  })

  it('keeps no reason when none is given', async () => {
    const response = await reschedule({ body: { reason: '' } })

    expect(response.body.data.reason).toBeNull()
  })

  it('lets the owner and admins with schedules reschedule, and refuses everyone else', async () => {
    expect((await reschedule({ email: 'schedules@oxford.test' })).status).toBe(201)
    for (const email of ['courses@oxford.test', 'arben@lecturer.test', 'student@oxford.test', 'owner@yllka.test']) {
      expect((await reschedule({ email, body: { original_start_time: '14:00' } })).status, email).toBe(403)
    }
  })

  it('lets admins with schedules or courses read the reschedules, and nobody else', async () => {
    await reschedule()

    expect((await listReschedules('schedules@oxford.test')).status).toBe(200)
    expect((await listReschedules('courses@oxford.test')).status).toBe(200)
    expect((await listReschedules('arben@lecturer.test')).status).toBe(403)
    expect((await listReschedules('student@oxford.test')).status).toBe(403)
  })

  it('answers 404 for a group of no organization of theirs', async () => {
    expect((await reschedule({ forGroupId: '00000000-0000-4000-8000-000000000000' })).status).toBe(404)
  })

  it('moves only a regular session of the group: one on its schedule, inside its term and not on a holiday', async () => {
    await prisma.groupMeeting.create({ data: { group_id: groupId, weekday: 'WEDNESDAY', start_time: new Date('1970-01-01T09:00:00.000Z'), end_time: new Date('1970-01-01T10:00:00.000Z') } })

    for (const original of [
      { original_date: NEXT_MONDAY, original_start_time: '09:30' },
      { original_date: NEXT_TUESDAY, original_start_time: '09:00' },
      { original_date: NEXT_WEDNESDAY_HOLIDAY, original_start_time: '09:00' },
      { original_date: MONDAY_AFTER_TERM, original_start_time: '09:00' },
    ]) {
      const response = await reschedule({ body: original })
      expect(response.status, original.original_date).toBe(409)
      expect(response.body.error, original.original_date).toBe(`This group has no regular lesson on ${original.original_date} at ${original.original_start_time}.`)
    }
    expect(await prisma.lessonReschedule.count()).toBe(0)
  })

  it('moves only a session that hasn’t started', async () => {
    const started = await reschedule({ body: { original_date: TODAY, original_start_time: '09:00' } })
    const later = await reschedule({ body: { original_date: TODAY, original_start_time: '14:00' } })

    expect(started.status).toBe(409)
    expect(started.body.error).toBe('This lesson has already started, so it can’t be moved.')
    expect(later.status).toBe(201)
  })

  it('refuses a session with attendance marks', async () => {
    await addMark({ date: NEXT_MONDAY, startTime: '09:00' })

    const response = await reschedule()

    expect(response.status).toBe(409)
    expect(response.body.error).toBe('This lesson already has attendance marks, so it can’t be moved.')
  })

  it('refuses a session already moved, until that move is cancelled', async () => {
    const first = await reschedule()

    const again = await reschedule({ body: { new_date: NEXT_TUESDAY } })
    expect(again.status).toBe(409)
    expect(again.body.error).toBe('This lesson is already moved. Cancel that first to move it again.')

    expect((await cancel({ rescheduleId: first.body.data.id })).status).toBe(200)
    expect((await reschedule({ body: { new_date: NEXT_TUESDAY } })).status).toBe(201)
  })

  it('refuses a new slot in the past, outside the term, on a holiday or the same as the original', async () => {
    const cases = [
      { body: { new_date: TODAY, new_start_time: '10:00', new_end_time: '11:30' }, message: 'Choose a time that hasn’t passed.' },
      { body: { new_date: MONDAY_AFTER_TERM }, message: 'Choose a day inside the group’s term.' },
      { body: { new_date: NEXT_WEDNESDAY_HOLIDAY }, message: 'This day is a holiday.' },
      { body: { new_date: NEXT_MONDAY, new_start_time: '09:00', new_end_time: '10:30' }, message: 'Choose another date or time than the lesson’s own.' },
    ]

    for (const { body, message } of cases) {
      const response = await reschedule({ body })
      expect(response.status, message).toBe(400)
      expect(response.body.error, message).toBe(message)
    }
    expect(await prisma.lessonReschedule.count()).toBe(0)
  })

  it('refuses a new slot overlapping another session of the group that day, regular or moved in', async () => {
    const overRegular = await reschedule({ body: { new_date: NEXT_MONDAY, new_start_time: '13:00', new_end_time: '14:30' } })
    expect((await reschedule({ body: { original_start_time: '14:00', new_start_time: '16:00', new_end_time: '17:00' } })).status).toBe(201)
    const overMovedIn = await reschedule({ body: { new_start_time: '16:30', new_end_time: '17:30' } })

    expect(overRegular.status).toBe(400)
    expect(overRegular.body.details.fieldErrors.new_start_time).toEqual(['This overlaps the group’s lesson at 14:00–15:30.'])
    expect(overMovedIn.status).toBe(400)
    expect(overMovedIn.body.error).toBe('This overlaps the group’s lesson at 16:00–17:00.')
  })

  it('lets a session move later on its own day, into a free slot', async () => {
    const response = await reschedule({ body: { new_date: NEXT_MONDAY, new_start_time: '10:00', new_end_time: '11:30' } })

    expect(response.status).toBe(201)
    expect(await sessionStarts(NEXT_MONDAY)).toEqual(['10:00', '14:00'])
  })

  it('asks for an end after the start', async () => {
    const response = await reschedule({ body: { new_start_time: '17:00', new_end_time: '16:00' } })

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.new_end_time).toEqual(['The end time must be after the start time.'])
  })

  it('refuses an archived group', async () => {
    const archived = await addGroup({ name: 'Archived', status: 'ARCHIVED' })

    const response = await reschedule({ forGroupId: archived.id })

    expect(response.status).toBe(409)
    expect(response.body.error).toBe('This group is archived, so its lessons can’t be moved.')
  })

  it('logs the move with the group and both sessions', async () => {
    const moved = await reschedule()
    await cancel({ rescheduleId: moved.body.data.id })

    const entries = await prisma.activityLog.findMany({ where: { action: { in: ['LESSON_RESCHEDULED', 'LESSON_RESCHEDULE_CANCELLED'] } }, orderBy: { created_at: 'asc' }, select: { action: true, subject_name: true, organization_id: true } })
    expect(entries).toEqual([
      { action: 'LESSON_RESCHEDULED', subject_name: 'Group A from 2026-11-16 09:00 to 2026-11-20 16:00', organization_id: organizationId },
      { action: 'LESSON_RESCHEDULE_CANCELLED', subject_name: 'Group A from 2026-11-16 09:00 to 2026-11-20 16:00', organization_id: organizationId },
    ])
  })
})

describe('cancelling a reschedule', () => {
  let rescheduleId: string

  beforeEach(async () => {
    rescheduleId = (await reschedule()).body.data.id
  })

  it('brings the original session back and keeps the reschedule on record as cancelled', async () => {
    const response = await cancel({ rescheduleId })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ id: rescheduleId, status: 'CANCELLED', cancelled_at: expect.any(String) })
    expect(await sessionStarts(NEXT_MONDAY)).toEqual(['09:00', '14:00'])
    expect(await sessionStarts(NEXT_FRIDAY)).toEqual(['18:00'])
    expect((await listReschedules()).body.data).toMatchObject([{ id: rescheduleId, status: 'CANCELLED' }])
  })

  it('refuses one already cancelled', async () => {
    await cancel({ rescheduleId })

    const again = await cancel({ rescheduleId })

    expect(again.status).toBe(409)
    expect(again.body.error).toBe('This reschedule is already cancelled.')
  })

  it('refuses once the moved session has attendance marks', async () => {
    await addMark({ date: NEXT_FRIDAY, startTime: '16:00' })

    const response = await cancel({ rescheduleId })

    expect(response.status).toBe(409)
    expect(response.body.error).toBe('The moved lesson already has attendance marks, so it can’t be cancelled.')
  })

  it('refuses once the new slot has started, by the organization’s clock', async () => {
    vi.setSystemTime(new Date(`${NEXT_FRIDAY}T16:00:00.000+01:00`))

    const response = await cancel({ rescheduleId })

    expect(response.status).toBe(409)
    expect(response.body.error).toBe('The moved lesson has already started, so the move can’t be cancelled.')
  })

  it('refuses once the original slot has started, even when the new one is later', async () => {
    const later = await reschedule({ body: { original_start_time: '14:00', new_date: '2026-11-27' } })
    vi.setSystemTime(new Date(`${NEXT_MONDAY}T14:00:00.000+01:00`))

    const response = await cancel({ rescheduleId: later.body.data.id })

    expect(response.status).toBe(409)
    expect(response.body.error).toBe('The original lesson time has passed, so the move can’t be cancelled.')
  })

  it('still cancels a minute before the earlier slot starts', async () => {
    vi.setSystemTime(new Date(`${NEXT_MONDAY}T08:59:00.000+01:00`))

    expect((await cancel({ rescheduleId })).status).toBe(200)
  })

  it('refuses when another session has since moved into the original slot', async () => {
    expect((await reschedule({ body: { original_start_time: '14:00', new_date: NEXT_MONDAY, new_start_time: '09:30', new_end_time: '11:00' } })).status).toBe(201)

    const response = await cancel({ rescheduleId })

    expect(response.status).toBe(409)
    expect(response.body.error).toBe('The original slot now overlaps the group’s lesson at 09:30–11:00.')
  })

  it('lets only the owner and admins with schedules cancel', async () => {
    for (const email of ['courses@oxford.test', 'arben@lecturer.test', 'student@oxford.test']) {
      expect((await cancel({ rescheduleId, email })).status, email).toBe(403)
    }
    expect((await cancel({ rescheduleId, email: 'schedules@oxford.test' })).status).toBe(200)
  })

  it('answers 404 for a reschedule reached through another group', async () => {
    const other = await addGroup({ name: 'Group B' })

    expect((await cancel({ rescheduleId, forGroupId: other.id })).status).toBe(404)
    expect((await cancel({ rescheduleId: '00000000-0000-4000-8000-000000000000' })).status).toBe(404)
  })

  it('refuses on an archived group', async () => {
    await prisma.group.update({ where: { id: groupId }, data: { status: 'ARCHIVED' } })

    expect((await cancel({ rescheduleId })).status).toBe(409)
  })

  it('goes with its organization when that is deleted', async () => {
    await prisma.organization.delete({ where: { id: organizationId } })

    expect(await prisma.lessonReschedule.count()).toBe(0)
  })
})

describe('edits that would clash with a moved lesson', () => {
  const groupPath = () => `/api/organizations/${organizationId}/groups/${groupId}`
  const yearPath = () => `/api/organizations/${organizationId}/academic-periods/years/${yearId}`

  /** Saves the group with this weekly schedule, nothing else changed */
  const saveSchedule = async (schedule: Meeting[]) =>
    request(app)
      .put(groupPath())
      .set('Authorization', await loginAs('owner@oxford.test'))
      .send({ course_id: courseId, name: 'Group A', academic_year_id: yearId, academic_term_id: termId, room_id: null, capacity: null, lecturer_id: arbenId, lecturer_effective_from: null, schedule })

  it('refuses a schedule edit overlapping a lesson moved to today or later, naming it', async () => {
    await reschedule()

    const response = await saveSchedule([MORNING, AFTERNOON, FRIDAY_LATE, { weekday: 'FRIDAY', start_time: '16:30', end_time: '17:30' }])

    expect(response.status).toBe(409)
    expect(response.body.details.fieldErrors.schedule).toEqual(['This overlaps the lesson moved to 2026-11-20 at 16:00–17:30. Cancel or change that move first.'])
    expect((await saveSchedule([MORNING, AFTERNOON, FRIDAY_LATE, { weekday: 'FRIDAY', start_time: '14:00', end_time: '16:00' }])).status).toBe(200)
  })

  it('keeps earlier moves as history, and ignores cancelled ones', async () => {
    const cancelled = await reschedule()
    await cancel({ rescheduleId: cancelled.body.data.id })
    await prisma.lessonReschedule.create({
      data: { group_id: groupId, original_date: new Date('2026-11-02'), original_start_time: new Date('1970-01-01T09:00:00.000Z'), new_date: new Date('2026-11-06'), new_start_time: new Date('1970-01-01T16:00:00.000Z'), new_end_time: new Date('1970-01-01T17:30:00.000Z') },
    })

    expect((await saveSchedule([MORNING, AFTERNOON, FRIDAY_LATE, { weekday: 'FRIDAY', start_time: '16:00', end_time: '17:00' }])).status).toBe(200)
  })

  it('refuses a term change that leaves a moved lesson outside it', async () => {
    await reschedule()
    const otherTerm = await prisma.academicTerm.create({ data: { academic_year_id: yearId, name: 'Spring', start_date: new Date('2027-01-10'), end_date: new Date('2027-06-30') } })

    const moved = await request(app)
      .put(groupPath())
      .set('Authorization', await loginAs('owner@oxford.test'))
      .send({ course_id: courseId, name: 'Group A', academic_year_id: yearId, academic_term_id: otherTerm.id, room_id: null, capacity: null, lecturer_id: arbenId, lecturer_effective_from: null, schedule: [MORNING, AFTERNOON, FRIDAY_LATE] })
    const shortened = await request(app)
      .put(`${yearPath()}/terms/${termId}`)
      .set('Authorization', await loginAs('owner@oxford.test'))
      .send({ name: 'Autumn', start_date: '2026-09-01', end_date: '2026-11-19' })

    expect(moved.status).toBe(409)
    expect(moved.body.details.fieldErrors.academic_term_id).toEqual(['The lesson moved to 2026-11-20 at 16:00–17:30 falls outside this term. Cancel or change that move first.'])
    expect(shortened.status).toBe(409)
    expect(shortened.body.error).toBe('Some rescheduled lessons fall outside these dates. Cancel or change them first.')
  })

  it('refuses a holiday on the day a lesson moved to', async () => {
    await reschedule()
    const holidays = `${yearPath()}/holidays`
    const auth = await loginAs('owner@oxford.test')

    const onMove = await request(app).post(holidays).set('Authorization', auth).send({ name: 'Bridge day', start_date: NEXT_FRIDAY, end_date: NEXT_FRIDAY })
    const elsewhere = await request(app).post(holidays).set('Authorization', auth).send({ name: 'Bridge day', start_date: '2026-11-23', end_date: '2026-11-23' })

    expect(onMove.status).toBe(409)
    expect(onMove.body.error).toBe('Some rescheduled lessons fall on these dates. Cancel or change them first.')
    expect(elsewhere.status).toBe(201)
  })

  it('refuses shortening the school year past a lesson moved there', async () => {
    const yearLong = await prisma.group.create({ data: { organization_id: organizationId, course_id: courseId, name: 'All year', academic_year_id: yearId } })
    await prisma.groupMeeting.create({ data: { group_id: yearLong.id, weekday: 'MONDAY', start_time: new Date('1970-01-01T09:00:00.000Z'), end_time: new Date('1970-01-01T10:00:00.000Z') } })
    expect((await reschedule({ forGroupId: yearLong.id, body: { new_date: '2027-03-05' } })).status).toBe(201)

    const response = await request(app).put(yearPath()).set('Authorization', await loginAs('owner@oxford.test')).send({ name: '2026–27', start_date: '2026-09-01', end_date: '2027-02-28', is_current: true })

    expect(response.status).toBe(409)
    expect(response.body.error).toBe('Some rescheduled lessons fall outside these dates. Cancel or change them first.')
  })

  it('never lists two sessions at one start: the moved-in one wins', async () => {
    await reschedule()
    // Written straight to the table, past the checks, as older data could be
    await prisma.groupMeeting.create({ data: { group_id: groupId, weekday: 'FRIDAY', start_time: new Date('1970-01-01T16:00:00.000Z'), end_time: new Date('1970-01-01T17:00:00.000Z') } })

    const sessions = (await request(app).get(`/api/organizations/${organizationId}/attendance/groups`).query({ date: NEXT_FRIDAY }).set('Authorization', await loginAs('owner@oxford.test'))).body.data

    expect(sessions.map((session: { start_time: string; end_time: string; rescheduled_from: unknown }) => [session.start_time, session.end_time, session.rescheduled_from])).toEqual([
      ['16:00', '17:30', { date: NEXT_MONDAY, start_time: '09:00' }],
      ['18:00', '19:00', null],
    ])
  })
})
