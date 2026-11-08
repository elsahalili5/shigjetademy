import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

// Monday 9 November 2026, 11:00 in Belgrade
const MONDAY_MORNING = '2026-11-09T10:00:00.000Z'
const MONDAY = '2026-11-09'
const TUESDAY = '2026-11-10'
const NEXT_MONDAY = '2026-11-16'
const NEXT_TUESDAY = '2026-11-17'

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
  status?: 'ACTIVE' | 'ARCHIVED'
}

const addGroup = async ({ name, lecturerId, schedule = [MONDAY_EVENING], status = 'ACTIVE' }: AddGroupParams) => {
  const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: courseId, name, academic_year_id: yearId, academic_term_id: termId, status } })
  await prisma.groupMeeting.createMany({ data: schedule.map((meeting) => ({ group_id: group.id, weekday: meeting.weekday, start_time: new Date(`1970-01-01T${meeting.start_time}:00.000Z`), end_time: new Date(`1970-01-01T${meeting.end_time}:00.000Z`) })) })
  if (lecturerId) {
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: lecturerId, start_date: new Date('2026-09-01') } })
  }
  return group
}

const addCover = (groupId: string, lecturerId: string, startDate: string, endDate: string) => prisma.groupSubstitution.create({ data: { group_id: groupId, lecturer_id: lecturerId, start_date: new Date(startDate), end_date: new Date(endDate) } })

const sessionsPath = () => `/api/organizations/${organizationId}/lesson-plans/sessions`

const listSessions = async (email: string, date: string) => request(app).get(sessionsPath()).query({ date }).set('Authorization', await loginAs(email))

const groupPlansPath = (groupId: string) => `/api/organizations/${organizationId}/groups/${groupId}/lesson-plans`

const listGroupPlans = async (email: string, groupId: string) => request(app).get(groupPlansPath(groupId)).set('Authorization', await loginAs(email))

const planPath = (groupId: string, date: string, startTime = MONDAY_EVENING.start_time) => `${groupPlansPath(groupId)}/${date}/${startTime}`

const getPlan = async (email: string, groupId: string, date: string, startTime?: string) => request(app).get(planPath(groupId, date, startTime)).set('Authorization', await loginAs(email))

const putTopic = async (email: string, groupId: string, date: string, topic: string | null, startTime?: string) =>
  request(app).put(`${planPath(groupId, date, startTime)}/topic`).set('Authorization', await loginAs(email)).send({ topic })

const putCovered = async (email: string, groupId: string, date: string, covered: string | null, startTime?: string) =>
  request(app).put(`${planPath(groupId, date, startTime)}/covered`).set('Authorization', await loginAs(email)).send({ covered })

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(MONDAY_MORNING))
  const owner = await createUser({ email: 'owner@oxford.test' })
  const coursesAdmin = await createUser({ email: 'courses@oxford.test' })
  const attendanceAdmin = await createUser({ email: 'attendance@oxford.test' })
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
        { userId: coursesAdmin.id, role: 'ADMIN', permissions: ['MANAGE_COURSES'] },
        { userId: attendanceAdmin.id, role: 'ADMIN', permissions: ['MANAGE_ATTENDANCE'] },
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
  arbenId = (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Arben', last_name: 'Hoxha', employment_type: 'FULL_TIME', user_id: arben.id } })).id
  teutaId = (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Teuta', last_name: 'Krasniqi', employment_type: 'PART_TIME', user_id: teuta.id } })).id
})

afterEach(() => {
  vi.useRealTimers()
})

describe('lesson sessions on a day', () => {
  it('shows a lecturer only the sessions they teach that day', async () => {
    const own = await addGroup({ name: 'Group A', lecturerId: arbenId })
    await addGroup({ name: 'Teuta’s group', lecturerId: teutaId })

    const response = await listSessions('arben@lecturer.test', MONDAY)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([{ group_id: own.id, name: 'Group A', course: 'Mathematics', location: null, start_time: '17:00', end_time: '18:30', rescheduled_from: null }])
  })

  it('gives a covered day to the substitute, not the permanent lecturer', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    await addCover(group.id, teutaId, MONDAY, MONDAY)

    expect((await listSessions('teuta@lecturer.test', MONDAY)).body.data).toHaveLength(1)
    expect((await listSessions('arben@lecturer.test', MONDAY)).body.data).toEqual([])
  })

  it('shows the owner and admins with MANAGE_COURSES every active group’s session that day', async () => {
    await addGroup({ name: 'Arben’s group', lecturerId: arbenId })
    await addGroup({ name: 'Archived', lecturerId: arbenId, status: 'ARCHIVED' })

    expect((await listSessions('owner@oxford.test', MONDAY)).body.data).toHaveLength(1)
    expect((await listSessions('courses@oxford.test', MONDAY)).body.data).toHaveLength(1)
  })

  it('refuses admins without MANAGE_COURSES, students and other organizations', async () => {
    for (const email of ['attendance@oxford.test', 'student@oxford.test', 'owner@yllka.test']) {
      expect((await listSessions(email, MONDAY)).status, email).toBe(403)
    }
  })

  it('says an empty day has no sessions', async () => {
    await addGroup({ name: 'Group A', lecturerId: arbenId })

    expect((await listSessions('arben@lecturer.test', TUESDAY)).body.data).toEqual([])
  })
})

describe('one session’s plan', () => {
  it('starts with no topic and no covered note', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })

    const response = await getPlan('arben@lecturer.test', group.id, MONDAY)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({ group_id: group.id, date: MONDAY, start_time: '17:00', end_time: '18:30', rescheduled_from: null, topic: null, covered: null, can_edit_covered: false })
  })

  it('refuses a day the group has no lesson on, same as attendance', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })

    const response = await getPlan('owner@oxford.test', group.id, TUESDAY)

    expect(response.status).toBe(409)
    expect(response.body.error).toBe('This group has no lesson on this day at 17:00.')
  })

  it('refuses a start time with no session, and a 404 for an unknown group', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })

    expect((await getPlan('owner@oxford.test', group.id, MONDAY, '20:00')).status).toBe(409)
    expect((await getPlan('owner@oxford.test', '00000000-0000-4000-8000-000000000000', MONDAY)).status).toBe(404)
  })

  it('lets the owner and admins with MANAGE_COURSES read any group’s plan', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: teutaId })

    expect((await getPlan('owner@oxford.test', group.id, MONDAY)).status).toBe(200)
    expect((await getPlan('courses@oxford.test', group.id, MONDAY)).status).toBe(200)
  })

  it('refuses a lecturer who doesn’t teach the group that day, the permanent lecturer of a covered day, and admins without MANAGE_COURSES', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    await addCover(group.id, teutaId, MONDAY, MONDAY)

    expect((await getPlan('unlinked@lecturer.test', group.id, MONDAY)).status).toBe(403)
    expect((await getPlan('arben@lecturer.test', group.id, MONDAY)).status).toBe(403)
    expect((await getPlan('attendance@oxford.test', group.id, MONDAY)).status).toBe(403)
  })
})

describe('writing the topic', () => {
  it('sets the topic at any time, including for a future session, and overwrites it on a second edit', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })

    const first = await putTopic('arben@lecturer.test', group.id, NEXT_MONDAY, 'Fractions')
    const second = await putTopic('arben@lecturer.test', group.id, NEXT_MONDAY, 'Fractions and decimals')

    expect(first.status).toBe(200)
    expect(first.body.data.topic).toBe('Fractions')
    expect(second.status).toBe(200)
    expect(second.body.data.topic).toBe('Fractions and decimals')
    expect(await prisma.lessonPlan.count({ where: { group_id: group.id } })).toBe(1)
  })

  it('clears the topic with an empty string', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    await putTopic('arben@lecturer.test', group.id, MONDAY, 'Fractions')

    const cleared = await putTopic('arben@lecturer.test', group.id, MONDAY, '')

    expect(cleared.body.data.topic).toBeNull()
  })

  it('refuses a lecturer who doesn’t teach the group that day, and admins without MANAGE_COURSES', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })

    expect((await putTopic('teuta@lecturer.test', group.id, MONDAY, 'Fractions')).status).toBe(403)
    expect((await putTopic('attendance@oxford.test', group.id, MONDAY, 'Fractions')).status).toBe(403)
    expect(await prisma.lessonPlan.count()).toBe(0)
  })

  it('refuses a day that isn’t a lesson for the group', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })

    const response = await putTopic('owner@oxford.test', group.id, TUESDAY, 'Fractions')

    expect(response.status).toBe(409)
  })
})

describe('writing what was covered', () => {
  const atBelgrade = (clock: string) => vi.setSystemTime(new Date(`${MONDAY}T${clock}:00.000+01:00`))

  it('refuses before the session starts, and allows it from the start time on with no upper bound', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    atBelgrade('16:59')

    const before = await putCovered('arben@lecturer.test', group.id, MONDAY, 'Covered fractions')

    expect(before.status).toBe(409)
    expect(before.body.error).toBe('You can record what was covered from 17:00 on.')
    expect(await prisma.lessonPlan.count()).toBe(0)

    atBelgrade('17:00')
    const atStart = await putCovered('arben@lecturer.test', group.id, MONDAY, 'Covered fractions')
    expect(atStart.status).toBe(200)
    expect(atStart.body.data.covered).toBe('Covered fractions')

    vi.setSystemTime(new Date('2026-12-01T10:00:00.000Z'))
    const longAfter = await putCovered('owner@oxford.test', group.id, MONDAY, 'Covered fractions and decimals')
    expect(longAfter.status).toBe(200)
    expect(longAfter.body.data.covered).toBe('Covered fractions and decimals')
    expect(await prisma.lessonPlan.count({ where: { group_id: group.id } })).toBe(1)
  })

  it('refuses a lecturer who doesn’t teach the group that day', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    atBelgrade('17:10')

    const response = await putCovered('teuta@lecturer.test', group.id, MONDAY, 'Covered fractions')

    expect(response.status).toBe(403)
  })
})

describe('a group’s lesson plans', () => {
  it('lists upcoming and past sessions that have a topic or covered note on record', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    await putTopic('arben@lecturer.test', group.id, NEXT_MONDAY, 'Fractions')
    vi.setSystemTime(new Date(`${MONDAY}T17:10:00.000+01:00`))
    await putCovered('arben@lecturer.test', group.id, MONDAY, 'Covered addition')

    const response = await listGroupPlans('owner@oxford.test', group.id)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      { group_id: group.id, date: MONDAY, start_time: '17:00', end_time: '18:30', rescheduled_from: null, topic: null, covered: 'Covered addition', can_edit_covered: true },
      { group_id: group.id, date: NEXT_MONDAY, start_time: '17:00', end_time: '18:30', rescheduled_from: null, topic: 'Fractions', covered: null, can_edit_covered: false },
    ])
  })

  it('shows a lecturer only the plans of sessions they teach, and lets a 404 happen for an unknown group', async () => {
    const own = await addGroup({ name: 'Group A', lecturerId: arbenId })
    const other = await addGroup({ name: 'Group B', lecturerId: teutaId })
    await putTopic('arben@lecturer.test', own.id, MONDAY, 'Fractions')
    await putTopic('teuta@lecturer.test', other.id, MONDAY, 'Verbs')

    expect((await listGroupPlans('arben@lecturer.test', own.id)).body.data).toHaveLength(1)
    expect((await listGroupPlans('arben@lecturer.test', other.id)).status).toBe(403)
    expect((await listGroupPlans('owner@oxford.test', '00000000-0000-4000-8000-000000000000')).status).toBe(404)
  })

  it('shows a moved session’s plan under its new date, not its original slot', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    await putTopic('arben@lecturer.test', group.id, NEXT_MONDAY, 'Fractions')
    await request(app)
      .post(`/api/organizations/${organizationId}/groups/${group.id}/reschedules`)
      .set('Authorization', await loginAs('owner@oxford.test'))
      .send({ original_date: NEXT_MONDAY, original_start_time: '17:00', new_date: NEXT_TUESDAY, new_start_time: '15:00', new_end_time: '16:00', reason: 'Room taken' })

    const response = await listGroupPlans('owner@oxford.test', group.id)

    expect(response.body.data).toEqual([
      { group_id: group.id, date: NEXT_TUESDAY, start_time: '15:00', end_time: '16:00', rescheduled_from: { date: NEXT_MONDAY, start_time: '17:00' }, topic: 'Fractions', covered: null, can_edit_covered: false },
    ])
  })
})
