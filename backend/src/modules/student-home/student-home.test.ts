import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let organizationId: string
let mySchoolPath: string

const readMySchool = async (email: string, path = mySchoolPath) => request(app).get(path).set('Authorization', await loginAs(email))

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-31T10:00:00.000Z'))
  const owner = await createUser({ email: 'owner@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  const arta = await createUser({ email: 'arta@student.test' })
  const besa = await createUser({ email: 'besa@student.test' })
  const unlinked = await createUser({ email: 'unlinked@student.test' })
  const yllkaOwner = await createUser({ email: 'owner@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: admin.id, role: 'ADMIN', permissions: ['MANAGE_STUDENTS'] },
        { userId: arta.id, role: 'STUDENT' },
        { userId: besa.id, role: 'STUDENT' },
        { userId: unlinked.id, role: 'STUDENT' },
      ],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id, members: [{ userId: besa.id, role: 'STUDENT' }] })
  await prisma.student.createMany({
    data: [
      { organization_id: organizationId, first_name: 'Arta', last_name: 'Gashi', student_number: 'STU-0007', user_id: arta.id },
      { organization_id: organizationId, first_name: 'Besa', last_name: 'Berisha', student_number: 'STU-0008', user_id: besa.id },
    ],
  })
  const year = await prisma.academicYear.create({
    data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true },
  })
  await prisma.academicTerm.createMany({
    data: [
      { academic_year_id: year.id, name: 'Autumn term', start_date: new Date('2026-09-01'), end_date: new Date('2026-12-20') },
      { academic_year_id: year.id, name: 'Spring term', start_date: new Date('2027-01-10'), end_date: new Date('2027-06-30') },
    ],
  })
  mySchoolPath = `/api/organizations/${organizationId}/me/student`
})

afterEach(() => {
  vi.useRealTimers()
})

describe('My school', () => {
  it('shows a student their organization, their own name and number, and the current year and term', async () => {
    const response = await readMySchool('arta@student.test')

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      organization: { id: organizationId, name: 'Oxford Academy' },
      student: { first_name: 'Arta', last_name: 'Gashi', student_number: 'STU-0007' },
      academic_year: { name: '2026–27', start_date: '2026-09-01', end_date: '2027-06-30' },
      term: { name: 'Autumn term', start_date: '2026-09-01', end_date: '2026-12-20' },
      groups: [],
      rescheduled_lessons: [],
      notes: [],
    })
  })

  it('says when there is no term today or no current year', async () => {
    vi.setSystemTime(new Date('2027-01-05T10:00:00.000Z'))
    const betweenTerms = await readMySchool('arta@student.test')
    await prisma.academicYear.deleteMany()
    const noYear = await readMySchool('arta@student.test')

    expect(betweenTerms.body.data.term).toBeNull()
    expect(noYear.body.data).toMatchObject({ academic_year: null, term: null })
  })

  it('shows a student without a linked record no record, not someone else’s', async () => {
    const response = await readMySchool('unlinked@student.test')

    expect(response.status).toBe(200)
    expect(response.body.data.student).toBeNull()
  })

  it('refuses the owner, staff, and a student of another organization', async () => {
    const yllka = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })

    expect((await readMySchool('owner@oxford.test')).status).toBe(403)
    expect((await readMySchool('admin@oxford.test')).status).toBe(403)
    expect((await readMySchool('owner@yllka.test')).status).toBe(403)
    expect((await readMySchool('besa@student.test', `/api/organizations/${yllka.id}/me/student`)).body.data.student).toBeNull()
  })

  it('keeps students out of the staff endpoints', async () => {
    const auth = await loginAs('arta@student.test')

    expect((await request(app).get(`/api/organizations/${organizationId}/students`).set('Authorization', auth)).status).toBe(403)
    expect((await request(app).get(`/api/organizations/${organizationId}/members`).set('Authorization', auth)).status).toBe(403)
  })
})

describe('My school: groups', () => {
  let yearId: string
  let courseId: string
  let artaId: string
  let besaId: string

  type AddGroupParams = {
    name: string
    status?: 'ACTIVE' | 'ARCHIVED'
  }

  const addGroup = async ({ name, status = 'ACTIVE' }: AddGroupParams) => {
    const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: courseId, name, academic_year_id: yearId, status } })
    await prisma.groupMeeting.createMany({
      data: [
        { group_id: group.id, weekday: 'MONDAY', start_time: new Date('1970-01-01T17:00:00.000Z'), end_time: new Date('1970-01-01T18:30:00.000Z') },
        { group_id: group.id, weekday: 'SUNDAY', start_time: new Date('1970-01-01T09:00:00.000Z'), end_time: new Date('1970-01-01T10:00:00.000Z') },
      ],
    })
    return group
  }

  type EnrolParams = {
    groupId: string
    studentId: string
    withdrawnOn?: string
  }

  const enrol = ({ groupId, studentId, withdrawnOn }: EnrolParams) =>
    prisma.groupEnrolment.create({ data: { group_id: groupId, student_id: studentId, enrolled_on: new Date('2026-09-01'), withdrawn_on: withdrawnOn ? new Date(withdrawnOn) : null } })

  beforeEach(async () => {
    yearId = (await prisma.academicYear.findFirstOrThrow({ where: { organization_id: organizationId } })).id
    courseId = (await createCourse({ organizationId, name: 'Mathematics' })).id
    artaId = (await prisma.student.findFirstOrThrow({ where: { first_name: 'Arta' } })).id
    besaId = (await prisma.student.findFirstOrThrow({ where: { first_name: 'Besa' } })).id
  })

  it('lists the student’s active groups by name with their course, year, term, location and schedule, and nothing about other students', async () => {
    const term = await prisma.academicTerm.findFirstOrThrow({ where: { name: 'Autumn term' } })
    const location = await prisma.location.create({ data: { organization_id: organizationId, name: 'Main campus', is_main: true } })
    const groupB = await addGroup({ name: 'Group B' })
    await prisma.group.update({ where: { id: groupB.id }, data: { academic_term_id: term.id, location_id: location.id } })
    const groupA = await addGroup({ name: 'Group A' })
    await enrol({ groupId: groupB.id, studentId: artaId })
    await enrol({ groupId: groupA.id, studentId: artaId })
    await enrol({ groupId: groupA.id, studentId: besaId })

    const { groups } = (await readMySchool('arta@student.test')).body.data

    const schedule = [
      { weekday: 'MONDAY', start_time: '17:00', end_time: '18:30' },
      { weekday: 'SUNDAY', start_time: '09:00', end_time: '10:00' },
    ]
    expect(groups).toEqual([
      { id: groupA.id, name: 'Group A', course: 'Mathematics', academic_year: '2026–27', academic_term: null, location: null, schedule },
      { id: groupB.id, name: 'Group B', course: 'Mathematics', academic_year: '2026–27', academic_term: 'Autumn term', location: 'Main campus', schedule },
    ])
  })

  it('orders each schedule in the organization’s week', async () => {
    await prisma.organizationSettings.create({ data: { organization_id: organizationId, time_zone: 'Europe/Belgrade', week_start: 'SUNDAY' } })
    const group = await addGroup({ name: 'Group A' })
    await enrol({ groupId: group.id, studentId: artaId })

    const { groups } = (await readMySchool('arta@student.test')).body.data

    expect(groups[0].schedule.map((entry: { weekday: string }) => entry.weekday)).toEqual(['SUNDAY', 'MONDAY'])
  })

  it('lists only groups whose school year includes today, going by the organization’s day', async () => {
    await prisma.organizationSettings.create({ data: { organization_id: organizationId, time_zone: 'Europe/Belgrade' } })
    const lastYear = await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2025–26', start_date: new Date('2025-09-01'), end_date: new Date('2026-06-30') } })
    const nextYear = await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2027–28', start_date: new Date('2027-09-01'), end_date: new Date('2028-06-30') } })
    const startsTomorrow = await prisma.academicYear.create({ data: { organization_id: organizationId, name: 'From 1 November', start_date: new Date('2026-11-01'), end_date: new Date('2027-06-30') } })
    const current = await addGroup({ name: 'This year' })
    for (const [name, year] of [['Last year', lastYear], ['Next year', nextYear], ['Starts 1 November', startsTomorrow]] as const) {
      const group = await addGroup({ name })
      await prisma.group.update({ where: { id: group.id }, data: { academic_year_id: year.id } })
      await enrol({ groupId: group.id, studentId: artaId })
    }
    await enrol({ groupId: current.id, studentId: artaId })

    const before = (await readMySchool('arta@student.test')).body.data.groups
    // 23:30 UTC on 31 October is already 1 November in Belgrade
    vi.setSystemTime(new Date('2026-10-31T23:30:00.000Z'))
    const after = (await readMySchool('arta@student.test')).body.data.groups

    expect(before.map((group: { name: string }) => group.name)).toEqual(['This year'])
    expect(after.map((group: { name: string }) => group.name)).toEqual(['Starts 1 November', 'This year'])
  })

  it('leaves out groups the student has left, archived groups and other students’ groups', async () => {
    const left = await addGroup({ name: 'Left' })
    const archived = await addGroup({ name: 'Archived', status: 'ARCHIVED' })
    const others = await addGroup({ name: 'Others' })
    await enrol({ groupId: left.id, studentId: artaId, withdrawnOn: '2026-10-01' })
    await enrol({ groupId: archived.id, studentId: artaId })
    await enrol({ groupId: others.id, studentId: besaId })

    expect((await readMySchool('arta@student.test')).body.data.groups).toEqual([])
    expect((await readMySchool('unlinked@student.test')).body.data.groups).toEqual([])
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

  it('lists the student’s upcoming rescheduled lessons with both dates and times, and no reason', async () => {
    const groupA = await addGroup({ name: 'Group A' })
    const groupB = await addGroup({ name: 'Group B' })
    const besasGroup = await addGroup({ name: 'Group C' })
    await enrol({ groupId: groupA.id, studentId: artaId })
    await enrol({ groupId: groupB.id, studentId: artaId })
    await enrol({ groupId: besasGroup.id, studentId: besaId })
    const later = await addReschedule({ groupId: groupB.id, originalDate: '2026-11-09', newDate: '2026-11-11' })
    const soon = await addReschedule({ groupId: groupA.id, originalDate: '2026-11-02', newDate: '2026-11-04' })
    await addReschedule({ groupId: groupA.id, originalDate: '2026-10-26', newDate: '2026-10-28' })
    await addReschedule({ groupId: groupA.id, originalDate: '2026-11-16', newDate: '2026-11-18', cancelledAt: new Date('2026-10-30T10:00:00.000Z') })
    await addReschedule({ groupId: besasGroup.id, originalDate: '2026-11-02', newDate: '2026-11-03' })

    const response = await readMySchool('arta@student.test')

    expect(response.body.data.rescheduled_lessons).toEqual([
      { id: soon.id, group: { id: groupA.id, name: 'Group A', course: 'Mathematics' }, original_date: '2026-11-02', original_start_time: '17:00', new_date: '2026-11-04', new_start_time: '16:00', new_end_time: '17:30' },
      { id: later.id, group: { id: groupB.id, name: 'Group B', course: 'Mathematics' }, original_date: '2026-11-09', original_start_time: '17:00', new_date: '2026-11-11', new_start_time: '16:00', new_end_time: '17:30' },
    ])
  })

  it('leaves out rescheduled lessons of groups the student has left and of archived groups', async () => {
    const left = await addGroup({ name: 'Left' })
    const archived = await addGroup({ name: 'Archived', status: 'ARCHIVED' })
    await enrol({ groupId: left.id, studentId: artaId, withdrawnOn: '2026-10-15' })
    await enrol({ groupId: archived.id, studentId: artaId })
    await addReschedule({ groupId: left.id, originalDate: '2026-11-02', newDate: '2026-11-04' })
    await addReschedule({ groupId: archived.id, originalDate: '2026-11-02', newDate: '2026-11-04' })

    expect((await readMySchool('arta@student.test')).body.data.rescheduled_lessons).toEqual([])
  })
})

describe('My school: notes', () => {
  let groupId: string

  beforeEach(async () => {
    const yearId = (await prisma.academicYear.findFirstOrThrow({ where: { organization_id: organizationId } })).id
    const courseId = (await createCourse({ organizationId, name: 'Mathematics' })).id
    const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: courseId, name: 'Group A', academic_year_id: yearId } })
    groupId = group.id
  })

  const addNote = async (studentId: string, body: string, lecturerId?: string, createdAt?: Date) =>
    prisma.studentNote.create({ data: { student_id: studentId, group_id: groupId, body, lecturer_id: lecturerId, ...(createdAt ? { created_at: createdAt } : {}) } })

  it('lists their own notes newest first, with the body, group and author’s name, and no staff-only data', async () => {
    const arta = await prisma.student.findFirstOrThrow({ where: { first_name: 'Arta' } })
    const lecturer = await createUser({ email: 'arben@lecturer.test' })
    await addNote(arta.id, 'First note.', lecturer.id, new Date('2026-10-01T09:00:00.000Z'))
    const second = await addNote(arta.id, 'Second note.', lecturer.id, new Date('2026-10-02T09:00:00.000Z'))

    const response = await readMySchool('arta@student.test')

    expect(response.body.data.notes).toEqual([
      { id: second.id, body: 'Second note.', group: { id: groupId, name: 'Group A' }, lecturer: { first_name: 'Test', last_name: 'User' }, created_at: expect.any(String) },
      expect.objectContaining({ body: 'First note.' }),
    ])
    expect(JSON.stringify(response.body.data.notes)).not.toContain('@')
  })

  it('shows "No notes yet" worthy response: an empty list when none are written', async () => {
    const response = await readMySchool('arta@student.test')

    expect(response.body.data.notes).toEqual([])
  })

  it('shows a deleted lecturer’s note as having no author, not failing', async () => {
    const arta = await prisma.student.findFirstOrThrow({ where: { first_name: 'Arta' } })
    const lecturer = await createUser({ email: 'gone@lecturer.test' })
    await addNote(arta.id, 'From a deleted lecturer.', lecturer.id)
    await prisma.user.delete({ where: { id: lecturer.id } })

    const response = await readMySchool('arta@student.test')

    expect(response.body.data.notes).toEqual([{ id: expect.any(String), body: 'From a deleted lecturer.', group: { id: groupId, name: 'Group A' }, lecturer: null, created_at: expect.any(String) }])
  })

  it('leaves out another student’s notes', async () => {
    const besa = await prisma.student.findFirstOrThrow({ where: { first_name: 'Besa' } })
    await addNote(besa.id, 'About Besa.')

    const response = await readMySchool('arta@student.test')

    expect(response.body.data.notes).toEqual([])
  })
})
