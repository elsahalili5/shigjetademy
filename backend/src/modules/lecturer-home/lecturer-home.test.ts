import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let organizationId: string
let myTeachingPath: string

const readMyTeaching = async (email: string, path = myTeachingPath) => request(app).get(path).set('Authorization', await loginAs(email))

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-31T10:00:00.000Z'))
  const owner = await createUser({ email: 'owner@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
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
        { userId: admin.id, role: 'ADMIN', permissions: ['MANAGE_LECTURERS'] },
        { userId: arben.id, role: 'LECTURER' },
        { userId: teuta.id, role: 'LECTURER' },
        { userId: unlinked.id, role: 'LECTURER' },
        { userId: student.id, role: 'STUDENT' },
      ],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id, members: [{ userId: teuta.id, role: 'LECTURER' }] })
  const main = await prisma.location.create({ data: { organization_id: organizationId, name: 'Main campus', is_main: true } })
  const north = await prisma.location.create({ data: { organization_id: organizationId, name: 'North campus' } })
  const sciences = await prisma.department.create({ data: { organization_id: organizationId, name: 'Sciences' } })
  await prisma.lecturer.create({
    data: {
      organization_id: organizationId,
      first_name: 'Arben',
      last_name: 'Hoxha',
      email: 'arben@lecturer.test',
      phone: '+383 44 123 456',
      notes: 'Private note',
      subjects: ['Mathematics', 'Physics'],
      employment_type: 'FULL_TIME',
      department_id: sciences.id,
      user_id: arben.id,
      locations: { create: [{ location_id: north.id }, { location_id: main.id }] },
    },
  })
  await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Teuta', last_name: 'Krasniqi', subjects: ['English'], employment_type: 'PART_TIME', user_id: teuta.id } })
  const year = await prisma.academicYear.create({
    data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true },
  })
  await prisma.academicTerm.create({ data: { academic_year_id: year.id, name: 'Autumn term', start_date: new Date('2026-09-01'), end_date: new Date('2026-12-20') } })
  myTeachingPath = `/api/organizations/${organizationId}/me/lecturer`
})

afterEach(() => {
  vi.useRealTimers()
})

describe('My teaching', () => {
  it('shows a lecturer their organization, only their own details with subjects and places, and the current year and term', async () => {
    const response = await readMyTeaching('arben@lecturer.test')

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      organization: { id: organizationId, name: 'Oxford Academy' },
      lecturer: { first_name: 'Arben', last_name: 'Hoxha', subjects: ['Mathematics', 'Physics'], employment_type: 'FULL_TIME', department: 'Sciences', locations: ['Main campus', 'North campus'] },
      academic_year: { name: '2026–27', start_date: '2026-09-01', end_date: '2027-06-30' },
      term: { name: 'Autumn term', start_date: '2026-09-01', end_date: '2026-12-20' },
      holiday: null,
      next_term: null,
      groups: [],
      cover: [],
      rescheduled_lessons: [],
    })
  })

  it('names a holiday covering today, and the next term of the year between terms, in the organization’s time zone', async () => {
    const year = await prisma.academicYear.findFirstOrThrow({ where: { organization_id: organizationId } })
    await prisma.academicTerm.create({ data: { academic_year_id: year.id, name: 'Spring term', start_date: new Date('2027-01-10'), end_date: new Date('2027-06-30') } })
    await prisma.academicHoliday.create({ data: { academic_year_id: year.id, name: 'Winter break', start_date: new Date('2026-12-24'), end_date: new Date('2027-01-06') } })
    await prisma.organizationSettings.create({ data: { organization_id: organizationId, time_zone: 'Europe/Belgrade' } })

    // 23:30 UTC on 23 December is already 24 December in Belgrade
    vi.setSystemTime(new Date('2026-12-23T23:30:00.000Z'))
    const onHoliday = await readMyTeaching('arben@lecturer.test')
    vi.setSystemTime(new Date('2027-01-07T10:00:00.000Z'))
    const betweenTerms = await readMyTeaching('arben@lecturer.test')

    expect(onHoliday.body.data).toMatchObject({ holiday: { name: 'Winter break' }, term: null, next_term: { name: 'Spring term', start_date: '2027-01-10', end_date: '2027-06-30' } })
    expect(betweenTerms.body.data).toMatchObject({ holiday: null, term: null, next_term: { name: 'Spring term', start_date: '2027-01-10' } })
  })

  it('shows a lecturer without a linked record no record, and none from another organization', async () => {
    const yllka = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })

    expect((await readMyTeaching('unlinked@lecturer.test')).body.data.lecturer).toBeNull()
    expect((await readMyTeaching('teuta@lecturer.test', `/api/organizations/${yllka.id}/me/lecturer`)).body.data).toMatchObject({ lecturer: null, academic_year: null })
  })

  it('refuses the owner, admins, students and other organizations', async () => {
    for (const email of ['owner@oxford.test', 'admin@oxford.test', 'student@oxford.test', 'owner@yllka.test']) {
      expect((await readMyTeaching(email)).status, email).toBe(403)
    }
  })

  it('keeps lecturers out of the staff endpoints', async () => {
    const auth = await loginAs('arben@lecturer.test')

    expect((await request(app).get(`/api/organizations/${organizationId}/lecturers`).set('Authorization', auth)).status).toBe(403)
    expect((await request(app).get(`/api/organizations/${organizationId}/students`).set('Authorization', auth)).status).toBe(403)
  })
})

describe('My teaching: groups and cover', () => {
  let arbenId: string
  let teutaId: string
  let courseId: string
  let yearId: string

  type AddGroupParams = {
    name: string
    lecturerId: string
    startDate?: string
    endDate?: string
    status?: 'ACTIVE' | 'ARCHIVED'
  }

  const addGroup = async ({ name, lecturerId, startDate = '2026-09-01', endDate, status = 'ACTIVE' }: AddGroupParams) => {
    const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: courseId, name, academic_year_id: yearId, status } })
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: lecturerId, start_date: new Date(startDate), end_date: endDate ? new Date(endDate) : null } })
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
    prisma.groupSubstitution.create({ data: { group_id: groupId, lecturer_id: lecturerId, start_date: new Date(startDate), end_date: new Date(endDate), note: 'Private note', cancelled_at: cancelledAt } })

  beforeEach(async () => {
    arbenId = (await prisma.lecturer.findFirstOrThrow({ where: { first_name: 'Arben' } })).id
    teutaId = (await prisma.lecturer.findFirstOrThrow({ where: { first_name: 'Teuta' } })).id
    courseId = (await createCourse({ organizationId, name: 'Mathematics' })).id
    yearId = (await prisma.academicYear.findFirstOrThrow({ where: { organization_id: organizationId } })).id
  })

  it('lists the groups the lecturer permanently teaches today, by name, with their course, year and location', async () => {
    const north = await prisma.location.findFirstOrThrow({ where: { name: 'North campus' } })
    const northRoom = await prisma.room.create({ data: { location_id: north.id, name: 'North campus' } })
    const groupB = await addGroup({ name: 'Group B', lecturerId: arbenId })
    await prisma.group.update({ where: { id: groupB.id }, data: { room_id: northRoom.id } })
    const groupA = await addGroup({ name: 'Group A', lecturerId: arbenId })

    const { groups } = (await readMyTeaching('arben@lecturer.test')).body.data

    expect(groups).toEqual([
      { id: groupA.id, name: 'Group A', course: 'Mathematics', academic_year: '2026–27', location: null, schedule: [], students: [] },
      { id: groupB.id, name: 'Group B', course: 'Mathematics', academic_year: '2026–27', location: 'North campus', schedule: [], students: [] },
    ])
  })

  it('leaves out past and future assignments and archived groups', async () => {
    await addGroup({ name: 'Ended', lecturerId: arbenId, endDate: '2026-10-30' })
    await addGroup({ name: 'Upcoming', lecturerId: arbenId, startDate: '2026-11-01' })
    await addGroup({ name: 'Archived', lecturerId: arbenId, status: 'ARCHIVED' })
    await addGroup({ name: 'Last day', lecturerId: arbenId, endDate: '2026-10-31' })

    const { groups } = (await readMyTeaching('arben@lecturer.test')).body.data

    expect(groups.map((group: { name: string }) => group.name)).toEqual(['Last day'])
  })

  it('lists only groups whose school year includes today', async () => {
    await addGroup({ name: 'This year', lecturerId: arbenId })
    const lastYear = await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2025–26', start_date: new Date('2025-09-01'), end_date: new Date('2026-06-30') } })
    const nextYear = await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2027–28', start_date: new Date('2027-09-01'), end_date: new Date('2028-06-30') } })
    const ended = await addGroup({ name: 'Last year', lecturerId: arbenId })
    const upcoming = await addGroup({ name: 'Next year', lecturerId: arbenId })
    await prisma.group.update({ where: { id: ended.id }, data: { academic_year_id: lastYear.id } })
    await prisma.group.update({ where: { id: upcoming.id }, data: { academic_year_id: nextYear.id } })

    const { groups } = (await readMyTeaching('arben@lecturer.test')).body.data

    expect(groups.map((group: { name: string }) => group.name)).toEqual(['This year'])
  })

  it('shows current and upcoming cover separately, soonest first, with its dates and without the staff note', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: teutaId })
    const upcoming = await addCover({ groupId: group.id, lecturerId: arbenId, startDate: '2026-11-10', endDate: '2026-11-12' })
    const current = await addCover({ groupId: group.id, lecturerId: arbenId, startDate: '2026-10-31', endDate: '2026-10-31' })

    const { groups, cover } = (await readMyTeaching('arben@lecturer.test')).body.data

    expect(groups).toEqual([])
    expect(cover).toEqual([
      { id: current.id, status: 'CURRENT', start_date: '2026-10-31', end_date: '2026-10-31', group: { id: group.id, name: 'Group A', course: 'Mathematics', academic_year: '2026–27', location: null, schedule: [] } },
      { id: upcoming.id, status: 'UPCOMING', start_date: '2026-11-10', end_date: '2026-11-12', group: { id: group.id, name: 'Group A', course: 'Mathematics', academic_year: '2026–27', location: null, schedule: [] } },
    ])
  })

  it('leaves out past and cancelled cover, and cover of an archived group', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: teutaId })
    const archived = await addGroup({ name: 'Group B', lecturerId: teutaId, status: 'ARCHIVED' })
    await addCover({ groupId: group.id, lecturerId: arbenId, startDate: '2026-10-29', endDate: '2026-10-30' })
    await addCover({ groupId: group.id, lecturerId: arbenId, startDate: '2026-11-10', endDate: '2026-11-12', cancelledAt: new Date('2026-10-30') })
    await addCover({ groupId: archived.id, lecturerId: arbenId, startDate: '2026-11-20', endDate: '2026-11-20' })

    expect((await readMyTeaching('arben@lecturer.test')).body.data.cover).toEqual([])
  })

  it('shows a lecturer only their own groups and cover, and an unlinked one none', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    await addCover({ groupId: group.id, lecturerId: teutaId, startDate: '2026-11-10', endDate: '2026-11-12' })
    const yllka = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })

    const teuta = (await readMyTeaching('teuta@lecturer.test')).body.data
    const unlinked = (await readMyTeaching('unlinked@lecturer.test')).body.data
    const elsewhere = (await readMyTeaching('teuta@lecturer.test', `/api/organizations/${yllka.id}/me/lecturer`)).body.data

    expect(teuta.groups).toEqual([])
    expect(teuta.cover).toHaveLength(1)
    expect(unlinked).toMatchObject({ groups: [], cover: [] })
    expect(elsewhere).toMatchObject({ groups: [], cover: [] })
  })

  it('adds each group’s schedule in the organization’s week and its active students by name, with nothing else about them', async () => {
    await prisma.organizationSettings.create({ data: { organization_id: organizationId, time_zone: 'Europe/Belgrade', week_start: 'SUNDAY' } })
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    const other = await addGroup({ name: 'Group B', lecturerId: teutaId })
    await prisma.groupMeeting.createMany({
      data: [
        { group_id: group.id, weekday: 'MONDAY', start_time: new Date('1970-01-01T17:00:00.000Z'), end_time: new Date('1970-01-01T18:30:00.000Z') },
        { group_id: group.id, weekday: 'SUNDAY', start_time: new Date('1970-01-01T09:00:00.000Z'), end_time: new Date('1970-01-01T10:00:00.000Z') },
      ],
    })
    const student = (firstName: string, number: string) =>
      prisma.student.create({ data: { organization_id: organizationId, first_name: firstName, last_name: 'Gashi', student_number: number, notes: 'Staff note', date_of_birth: new Date('2012-03-04') } })
    const besa = await student('Besa', 'STU-0002')
    const arta = await student('Arta', 'STU-0001')
    const left = await student('Left', 'STU-0003')
    const elsewhere = await student('Elsewhere', 'STU-0004')
    const enrolledOn = new Date('2026-09-01')
    await prisma.groupEnrolment.createMany({
      data: [
        { group_id: group.id, student_id: besa.id, enrolled_on: enrolledOn },
        { group_id: group.id, student_id: arta.id, enrolled_on: enrolledOn },
        { group_id: group.id, student_id: left.id, enrolled_on: enrolledOn, withdrawn_on: new Date('2026-10-01') },
        { group_id: other.id, student_id: elsewhere.id, enrolled_on: enrolledOn },
      ],
    })

    const { groups } = (await readMyTeaching('arben@lecturer.test')).body.data

    expect(groups).toEqual([
      {
        id: group.id,
        name: 'Group A',
        course: 'Mathematics',
        academic_year: '2026–27',
        location: null,
        schedule: [
          { weekday: 'SUNDAY', start_time: '09:00', end_time: '10:00' },
          { weekday: 'MONDAY', start_time: '17:00', end_time: '18:30' },
        ],
        students: [
          { id: arta.id, first_name: 'Arta', last_name: 'Gashi' },
          { id: besa.id, first_name: 'Besa', last_name: 'Gashi' },
        ],
      },
    ])
  })

  it('goes by the organization’s day', async () => {
    await prisma.organizationSettings.create({ data: { organization_id: organizationId, time_zone: 'Europe/Belgrade' } })
    await addGroup({ name: 'Group A', lecturerId: arbenId, startDate: '2026-11-01' })

    // 23:30 UTC on 31 October is already 1 November in Belgrade
    vi.setSystemTime(new Date('2026-10-31T23:30:00.000Z'))

    expect((await readMyTeaching('arben@lecturer.test')).body.data.groups).toHaveLength(1)
  })

  type AddRescheduleParams = {
    groupId: string
    originalDate: string
    newDate: string
    cancelledAt?: Date
  }

  /** The group's 17:00 lesson on originalDate moved to 16:00–17:30 on newDate */
  const addReschedule = ({ groupId, originalDate, newDate, cancelledAt }: AddRescheduleParams) =>
    prisma.lessonReschedule.create({
      data: {
        group_id: groupId,
        original_date: new Date(originalDate),
        original_start_time: new Date('1970-01-01T17:00:00.000Z'),
        new_date: new Date(newDate),
        new_start_time: new Date('1970-01-01T16:00:00.000Z'),
        new_end_time: new Date('1970-01-01T17:30:00.000Z'),
        reason: 'Private reason',
        cancelled_at: cancelledAt,
      },
    })

  it('lists upcoming moves to the lecturer teaching the new date as theirs to take, and to the original date’s permanent lecturer as moved away, without the reason', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    await addCover({ groupId: group.id, lecturerId: teutaId, startDate: '2026-11-04', endDate: '2026-11-04' })
    const covered = await addReschedule({ groupId: group.id, originalDate: '2026-11-02', newDate: '2026-11-04' })
    const own = await addReschedule({ groupId: group.id, originalDate: '2026-11-09', newDate: '2026-11-10' })
    await addReschedule({ groupId: group.id, originalDate: '2026-10-26', newDate: '2026-10-28' })
    await addReschedule({ groupId: group.id, originalDate: '2026-11-16', newDate: '2026-11-17', cancelledAt: new Date('2026-10-30T10:00:00.000Z') })
    const lesson = ({ id, originalDate, newDate, isTeaching }: { id: string; originalDate: string; newDate: string; isTeaching: boolean }) => ({
      id,
      group: { id: group.id, name: 'Group A', course: 'Mathematics' },
      original_date: originalDate,
      original_start_time: '17:00',
      new_date: newDate,
      new_start_time: '16:00',
      new_end_time: '17:30',
      is_teaching: isTeaching,
    })

    const arben = await readMyTeaching('arben@lecturer.test')
    const teuta = await readMyTeaching('teuta@lecturer.test')

    expect(arben.body.data.rescheduled_lessons).toEqual([
      lesson({ id: covered.id, originalDate: '2026-11-02', newDate: '2026-11-04', isTeaching: false }),
      lesson({ id: own.id, originalDate: '2026-11-09', newDate: '2026-11-10', isTeaching: true }),
    ])
    expect(teuta.body.data.rescheduled_lessons).toEqual([lesson({ id: covered.id, originalDate: '2026-11-02', newDate: '2026-11-04', isTeaching: true })])
  })

  it('follows a change of permanent lecturer between the two dates, and leaves out archived groups', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId, endDate: '2026-11-05' })
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: teutaId, start_date: new Date('2026-11-06') } })
    const archived = await addGroup({ name: 'Archived', lecturerId: arbenId, status: 'ARCHIVED' })
    await addReschedule({ groupId: group.id, originalDate: '2026-11-02', newDate: '2026-11-09' })
    await addReschedule({ groupId: archived.id, originalDate: '2026-11-02', newDate: '2026-11-04' })

    expect((await readMyTeaching('arben@lecturer.test')).body.data.rescheduled_lessons).toMatchObject([{ new_date: '2026-11-09', is_teaching: false }])
    expect((await readMyTeaching('teuta@lecturer.test')).body.data.rescheduled_lessons).toMatchObject([{ new_date: '2026-11-09', is_teaching: true }])
    expect((await readMyTeaching('unlinked@lecturer.test')).body.data.rescheduled_lessons).toEqual([])
  })
})
