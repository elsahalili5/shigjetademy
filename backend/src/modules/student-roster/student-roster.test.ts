import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let organizationId: string
let courseId: string
let yearId: string
let arbenId: string
let teutaId: string

type AddGroupParams = {
  name: string
  lecturerId?: string
  lecturerEndDate?: string
  status?: 'ACTIVE' | 'ARCHIVED'
}

const addGroup = async ({ name, lecturerId, lecturerEndDate, status = 'ACTIVE' }: AddGroupParams) => {
  const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: courseId, name, academic_year_id: yearId, status } })
  if (lecturerId) {
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: lecturerId, start_date: new Date('2026-09-01'), end_date: lecturerEndDate ? new Date(lecturerEndDate) : null } })
  }
  return group
}

const addStudent = async (firstName: string, userId?: string) => prisma.student.create({ data: { organization_id: organizationId, first_name: firstName, last_name: 'Student', student_number: `STU-${firstName}`, user_id: userId } })

const enrol = (groupId: string, studentId: string) => prisma.groupEnrolment.create({ data: { group_id: groupId, student_id: studentId, enrolled_on: new Date('2026-09-01') } })

const mark = (groupId: string, studentId: string, date: string, status: 'PRESENT' | 'TARDY' | 'ABSENT') =>
  prisma.attendanceRecord.create({ data: { group_id: groupId, student_id: studentId, date: new Date(date), start_time: new Date('1970-01-01T17:00:00.000Z'), status } })

const rosterPath = () => `/api/organizations/${organizationId}/my-students`

const listRoster = async (email: string) => request(app).get(rosterPath()).set('Authorization', await loginAs(email))

const studentPath = (studentId: string) => `${rosterPath()}/${studentId}`

const getStudent = async (email: string, studentId: string) => request(app).get(studentPath(studentId)).set('Authorization', await loginAs(email))

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
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
        { userId: coursesAdmin.id, role: 'ADMIN', permissions: ['MANAGE_COURSES'] },
        { userId: arben.id, role: 'LECTURER' },
        { userId: teuta.id, role: 'LECTURER' },
        { userId: unlinked.id, role: 'LECTURER' },
        { userId: student.id, role: 'STUDENT' },
      ],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id })
  courseId = (await createCourse({ organizationId, name: 'Mathematics' })).id
  yearId = (await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true } })).id
  arbenId = (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Arben', last_name: 'Hoxha', employment_type: 'FULL_TIME', user_id: arben.id } })).id
  teutaId = (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Teuta', last_name: 'Krasniqi', employment_type: 'PART_TIME', user_id: teuta.id } })).id
})

describe('the roster of a lecturer’s own students', () => {
  it('lists the students actively enrolled in groups the lecturer currently, permanently teaches', async () => {
    const own = await addGroup({ name: 'Group A', lecturerId: arbenId })
    const notOwn = await addGroup({ name: 'Teuta’s group', lecturerId: teutaId })
    const albaLogin = await createUser({ email: 'alba@student.test' })
    const alba = await addStudent('Alba', albaLogin.id)
    await enrol(own.id, alba.id)
    const besa = await addStudent('Besa')
    await enrol(notOwn.id, besa.id)

    const response = await listRoster('arben@lecturer.test')

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([{ student_id: alba.id, first_name: 'Alba', last_name: 'Student', email: 'alba@student.test', group: { id: own.id, name: 'Group A' } }])
  })

  it('shows "No login" for a student with no linked login', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    const besa = await addStudent('Besa')
    await enrol(group.id, besa.id)

    const response = await listRoster('arben@lecturer.test')

    expect(response.body.data[0]).toMatchObject({ email: null })
  })

  it('shows a student once per group when they’re in two of the lecturer’s groups', async () => {
    const groupA = await addGroup({ name: 'Group A', lecturerId: arbenId })
    const groupB = await addGroup({ name: 'Group B', lecturerId: arbenId })
    const besa = await addStudent('Besa')
    await enrol(groupA.id, besa.id)
    await enrol(groupB.id, besa.id)

    const response = await listRoster('arben@lecturer.test')

    expect(response.body.data).toHaveLength(2)
    expect(response.body.data.map((row: { group: { name: string } }) => row.group.name).toSorted()).toEqual(['Group A', 'Group B'])
  })

  it('leaves out a withdrawn enrolment, an archived group and a lecturer whose assignment has ended', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    const archived = await addGroup({ name: 'Archived', lecturerId: arbenId, status: 'ARCHIVED' })
    const ended = await addGroup({ name: 'Past group', lecturerId: arbenId, lecturerEndDate: '2026-10-01' })
    const withdrawn = await addStudent('Withdrawn')
    await prisma.groupEnrolment.create({ data: { group_id: group.id, student_id: withdrawn.id, enrolled_on: new Date('2026-09-01'), withdrawn_on: new Date('2026-10-01') } })
    const archivedStudent = await addStudent('InArchived')
    await enrol(archived.id, archivedStudent.id)
    const pastStudent = await addStudent('InPast')
    await enrol(ended.id, pastStudent.id)

    const response = await listRoster('arben@lecturer.test')

    expect(response.body.data).toEqual([])
  })

  it('keeps the outgoing lecturer’s access and withholds the incoming one’s, while a scheduled change hasn’t started yet', async () => {
    const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: courseId, name: 'Group A', academic_year_id: yearId, status: 'ACTIVE' } })
    // Arben's assignment was given a future end date by a scheduled handover, and Teuta's new row hasn't started yet
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: arbenId, start_date: new Date('2026-09-01'), end_date: new Date('2027-05-31') } })
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: teutaId, start_date: new Date('2027-06-01'), end_date: null } })
    const besa = await addStudent('Besa')
    await enrol(group.id, besa.id)

    expect((await listRoster('arben@lecturer.test')).body.data).toHaveLength(1)
    expect((await listRoster('teuta@lecturer.test')).body.data).toEqual([])
  })

  it('shows the owner and admins with MANAGE_COURSES every active group’s students', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    const besa = await addStudent('Besa')
    await enrol(group.id, besa.id)

    expect((await listRoster('owner@oxford.test')).body.data).toHaveLength(1)
    expect((await listRoster('courses@oxford.test')).body.data).toHaveLength(1)
  })

  it('shows an empty list for a lecturer with no current groups, or none with students', async () => {
    expect((await listRoster('unlinked@lecturer.test')).body.data).toEqual([])
    await addGroup({ name: 'Empty group', lecturerId: arbenId })
    expect((await listRoster('arben@lecturer.test')).body.data).toEqual([])
  })

  it('refuses students and other organizations', async () => {
    for (const email of ['student@oxford.test', 'owner@yllka.test']) {
      expect((await listRoster(email)).status, email).toBe(403)
    }
  })
})

describe('a student’s profile with a lecturer', () => {
  it('shows the student’s groups shared with the lecturer and their attendance, newest first', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    const besa = await addStudent('Besa')
    await enrol(group.id, besa.id)
    await mark(group.id, besa.id, '2026-09-07', 'PRESENT')
    await mark(group.id, besa.id, '2026-09-14', 'TARDY')
    await mark(group.id, besa.id, '2026-09-21', 'ABSENT')

    const response = await getStudent('arben@lecturer.test', besa.id)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      student: { id: besa.id, first_name: 'Besa', last_name: 'Student' },
      groups: [{ id: group.id, name: 'Group A' }],
      attendance: [
        { date: '2026-09-21', group: { id: group.id, name: 'Group A' }, start_time: '17:00', status: 'ABSENT' },
        { date: '2026-09-14', group: { id: group.id, name: 'Group A' }, start_time: '17:00', status: 'TARDY' },
        { date: '2026-09-07', group: { id: group.id, name: 'Group A' }, start_time: '17:00', status: 'PRESENT' },
      ],
      summary: { present: 1, tardy: 1, absent: 1, rate: 67 },
    })
  })

  it('shows no attendance recorded yet as null, not a 0% rate', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    const besa = await addStudent('Besa')
    await enrol(group.id, besa.id)

    const response = await getStudent('arben@lecturer.test', besa.id)

    expect(response.body.data.summary).toEqual({ present: 0, tardy: 0, absent: 0, rate: null })
    expect(response.body.data.attendance).toEqual([])
  })

  it('counts only attendance from groups the lecturer currently teaches, not a past assignment or a cover', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    const other = await addGroup({ name: 'Teuta’s group', lecturerId: teutaId })
    const besa = await addStudent('Besa')
    await enrol(group.id, besa.id)
    await enrol(other.id, besa.id)
    await mark(group.id, besa.id, '2026-09-07', 'PRESENT')
    await mark(other.id, besa.id, '2026-09-07', 'ABSENT')

    const response = await getStudent('arben@lecturer.test', besa.id)

    expect(response.body.data.groups).toEqual([{ id: group.id, name: 'Group A' }])
    expect(response.body.data.summary).toEqual({ present: 1, tardy: 0, absent: 0, rate: 100 })
  })

  it('keeps the outgoing lecturer’s access and refuses the incoming one’s, while a scheduled change hasn’t started yet', async () => {
    const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: courseId, name: 'Group A', academic_year_id: yearId, status: 'ACTIVE' } })
    // Arben's assignment was given a future end date by a scheduled handover, and Teuta's new row hasn't started yet
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: arbenId, start_date: new Date('2026-09-01'), end_date: new Date('2027-05-31') } })
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: teutaId, start_date: new Date('2027-06-01'), end_date: null } })
    const besa = await addStudent('Besa')
    await enrol(group.id, besa.id)

    expect((await getStudent('arben@lecturer.test', besa.id)).status).toBe(200)
    expect((await getStudent('teuta@lecturer.test', besa.id)).status).toBe(403)
  })

  it('refuses a lecturer reading a student not in any of their current groups, with a 403', async () => {
    const group = await addGroup({ name: 'Teuta’s group', lecturerId: teutaId })
    const besa = await addStudent('Besa')
    await enrol(group.id, besa.id)

    expect((await getStudent('arben@lecturer.test', besa.id)).status).toBe(403)
  })

  it('answers 404 for a student outside the organization', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    const besa = await addStudent('Besa')
    await enrol(group.id, besa.id)

    expect((await getStudent('arben@lecturer.test', '00000000-0000-4000-8000-000000000099')).status).toBe(404)
  })

  it('lets the owner and admins with MANAGE_COURSES read any student’s attendance in any active group', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    const besa = await addStudent('Besa')
    await enrol(group.id, besa.id)
    await mark(group.id, besa.id, '2026-09-07', 'PRESENT')

    const asOwner = await getStudent('owner@oxford.test', besa.id)
    const asAdmin = await getStudent('courses@oxford.test', besa.id)

    expect(asOwner.status).toBe(200)
    expect(asOwner.body.data.summary.rate).toBe(100)
    expect(asAdmin.status).toBe(200)
  })

  it('refuses students and other organizations', async () => {
    const group = await addGroup({ name: 'Group A', lecturerId: arbenId })
    const besa = await addStudent('Besa')
    await enrol(group.id, besa.id)

    for (const email of ['student@oxford.test', 'owner@yllka.test']) {
      expect((await getStudent(email, besa.id)).status, email).toBe(403)
    }
  })
})
