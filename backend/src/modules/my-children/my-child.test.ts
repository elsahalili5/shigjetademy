import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let organizationId: string
let yllkaId: string
let artaId: string
let besaId: string
let strangerChildId: string
let yllkaChildId: string
let groupId: string

const childPath = (studentId: string, id = organizationId) => `/api/organizations/${id}/me/children/${studentId}`

const readChild = async (email: string, studentId: string, id = organizationId) => request(app).get(childPath(studentId, id)).set('Authorization', await loginAs(email))

const clock = (time: string) => new Date(`1970-01-01T${time}:00.000Z`)

const mark = (status: 'PRESENT' | 'TARDY' | 'ABSENT', date: string) =>
  prisma.attendanceRecord.create({ data: { group_id: groupId, student_id: artaId, date: new Date(date), start_time: clock('17:00'), status } })

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-31T10:00:00.000Z'))
  const owner = await createUser({ email: 'owner@oxford.test' })
  const drita = await createUser({ email: 'drita@family.test' })
  const other = await createUser({ email: 'other@family.test' })
  const student = await createUser({ email: 'student@oxford.test' })
  const yllkaOwner = await createUser({ email: 'owner@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: drita.id, role: 'GUARDIAN' },
        { userId: other.id, role: 'GUARDIAN' },
        { userId: student.id, role: 'STUDENT' },
      ],
    })
  ).id
  yllkaId = (await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id, members: [{ userId: drita.id, role: 'GUARDIAN' }] })).id
  const addStudent = (firstName: string, studentNumber: string, orgId = organizationId) =>
    prisma.student.create({ data: { organization_id: orgId, first_name: firstName, last_name: 'Gashi', student_number: studentNumber, notes: 'Private staff note' } })
  artaId = (await addStudent('Arta', 'STU-0001')).id
  besaId = (await addStudent('Besa', 'STU-0002')).id
  strangerChildId = (await addStudent('Stranger', 'STU-0003')).id
  yllkaChildId = (await addStudent('Yllka', 'STU-0001', yllkaId)).id
  const guardian = await prisma.guardian.create({ data: { organization_id: organizationId, first_name: 'Drita', last_name: 'Gashi', email: 'drita@family.test', user_id: drita.id } })
  const otherGuardian = await prisma.guardian.create({ data: { organization_id: organizationId, first_name: 'Other', last_name: 'Parent', email: 'other@family.test', user_id: other.id } })
  await prisma.studentGuardian.createMany({
    data: [
      { guardian_id: guardian.id, student_id: artaId, relationship: 'MOTHER' },
      { guardian_id: guardian.id, student_id: besaId, relationship: 'MOTHER' },
      { guardian_id: otherGuardian.id, student_id: strangerChildId, relationship: 'FATHER' },
    ],
  })
  const year = await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true } })
  const term = await prisma.academicTerm.create({ data: { academic_year_id: year.id, name: 'Autumn term', start_date: new Date('2026-09-01'), end_date: new Date('2026-12-20') } })
  const location = await prisma.location.create({ data: { organization_id: organizationId, name: 'Main campus', is_main: true } })
  const room = await prisma.room.create({ data: { location_id: location.id, name: 'Room 101' } })
  const course = await createCourse({ organizationId, name: 'Mathematics' })
  const lecturer = await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Arben', last_name: 'Hoxha', employment_type: 'FULL_TIME', notes: 'Staff-only lecturer note' } })
  const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: course.id, name: 'Group A', academic_year_id: year.id, academic_term_id: term.id, room_id: room.id } })
  groupId = group.id
  await prisma.groupLecturerAssignment.create({ data: { group_id: groupId, lecturer_id: lecturer.id, start_date: new Date('2026-09-01') } })
  await prisma.groupMeeting.create({ data: { group_id: groupId, weekday: 'WEDNESDAY', start_time: clock('17:00'), end_time: clock('18:30') } })
  await prisma.groupEnrolment.create({ data: { group_id: groupId, student_id: artaId, enrolled_on: new Date('2026-09-01') } })
  await prisma.lessonReschedule.create({
    data: { group_id: groupId, original_date: new Date('2026-11-04'), original_start_time: clock('17:00'), new_date: new Date('2026-11-06'), new_start_time: clock('16:00'), new_end_time: clock('17:30'), reason: 'Staff-only reason' },
  })
  await mark('PRESENT', '2026-09-30')
  await mark('TARDY', '2026-10-07')
  await mark('ABSENT', '2026-10-14')
  await mark('PRESENT', '2026-10-21')
  // A mark of the sibling in the same group never reaches Arta's page
  await prisma.attendanceRecord.create({ data: { group_id: groupId, student_id: besaId, date: new Date('2026-10-21'), start_time: clock('17:00'), status: 'ABSENT' } })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GET /me/children/:studentId', () => {
  it('shows a linked child’s groups, weekly schedule, moved lessons and attendance', async () => {
    const response = await readChild('drita@family.test', artaId)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      student: { id: artaId, first_name: 'Arta', last_name: 'Gashi' },
      groups: [
        {
          id: groupId,
          name: 'Group A',
          course: 'Mathematics',
          academic_year: '2026–27',
          academic_term: 'Autumn term',
          location: 'Room 101',
          schedule: [{ weekday: 'WEDNESDAY', start_time: '17:00', end_time: '18:30' }],
        },
      ],
      rescheduled_lessons: [
        { id: expect.any(String), group: { id: groupId, name: 'Group A', course: 'Mathematics' }, original_date: '2026-11-04', original_start_time: '17:00', new_date: '2026-11-06', new_start_time: '16:00', new_end_time: '17:30' },
      ],
      attendance: [
        { date: '2026-10-21', start_time: '17:00', status: 'PRESENT', group: { id: groupId, name: 'Group A' } },
        { date: '2026-10-14', start_time: '17:00', status: 'ABSENT', group: { id: groupId, name: 'Group A' } },
        { date: '2026-10-07', start_time: '17:00', status: 'TARDY', group: { id: groupId, name: 'Group A' } },
        { date: '2026-09-30', start_time: '17:00', status: 'PRESENT', group: { id: groupId, name: 'Group A' } },
      ],
      summary: { present: 2, tardy: 1, absent: 1, rate: 75 },
    })
  })

  it('answers an empty child page for a linked child with no groups', async () => {
    const response = await readChild('drita@family.test', besaId)

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ student: { id: besaId }, groups: [], rescheduled_lessons: [], attendance: [], summary: { rate: null } })
  })

  it('returns only whitelisted fields: no notes, student number, lecturer, reason, invitations or user ids', async () => {
    const { data } = (await readChild('drita@family.test', artaId)).body

    expect(Object.keys(data).sort()).toEqual(['attendance', 'groups', 'rescheduled_lessons', 'student', 'summary'])
    expect(Object.keys(data.student).sort()).toEqual(['first_name', 'id', 'last_name'])
    expect(Object.keys(data.groups[0]).sort()).toEqual(['academic_term', 'academic_year', 'course', 'id', 'location', 'name', 'schedule'])
    expect(Object.keys(data.attendance[0]).sort()).toEqual(['date', 'group', 'start_time', 'status'])
    expect(Object.keys(data.rescheduled_lessons[0]).sort()).toEqual(['group', 'id', 'new_date', 'new_end_time', 'new_start_time', 'original_date', 'original_start_time'])
    const text = JSON.stringify(data)
    for (const secret of ['Private staff note', 'STU-0001', 'Staff-only', 'Hoxha', 'user_id', 'notes', 'student_number', 'invitation']) {
      expect(text, secret).not.toContain(secret)
    }
  })

  it('answers 404 for a child who isn’t linked, one linked to another guardian, and one of another organization', async () => {
    const unlinked = await prisma.student.create({ data: { organization_id: organizationId, first_name: 'Nobody', last_name: 'Gashi', student_number: 'STU-0009' } })

    expect((await readChild('drita@family.test', unlinked.id)).status).toBe(404)
    expect((await readChild('drita@family.test', strangerChildId)).status).toBe(404)
    expect((await readChild('drita@family.test', yllkaChildId)).status).toBe(404)
    expect((await readChild('drita@family.test', yllkaChildId, yllkaId)).status).toBe(404)
  })

  it('answers 404 once the guardian is unlinked, and for an archived child', async () => {
    await prisma.student.update({ where: { id: besaId }, data: { status: 'ARCHIVED' } })
    await prisma.studentGuardian.deleteMany({ where: { student_id: artaId } })

    expect((await readChild('drita@family.test', besaId)).status).toBe(404)
    expect((await readChild('drita@family.test', artaId)).status).toBe(404)
  })

  it('refuses everyone who isn’t a guardian here with 403, and a malformed id with 400', async () => {
    for (const email of ['owner@oxford.test', 'student@oxford.test', 'owner@yllka.test']) {
      expect((await readChild(email, artaId)).status, email).toBe(403)
    }
    expect((await readChild('drita@family.test', 'not-an-id')).status).toBe(400)
  })
})
