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
let besaId: string
let groupAId: string

const addGroup = async (name: string, lecturerId?: string) => {
  const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: courseId, name, academic_year_id: yearId, status: 'ACTIVE' } })
  if (lecturerId) {
    await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: lecturerId, start_date: new Date('2026-09-01') } })
  }
  return group
}

const enrol = (groupId: string, studentId: string) => prisma.groupEnrolment.create({ data: { group_id: groupId, student_id: studentId, enrolled_on: new Date('2026-09-01') } })

const notesPath = (studentId: string) => `/api/organizations/${organizationId}/my-students/${studentId}/notes`

const listNotes = async (email: string, studentId: string) => request(app).get(notesPath(studentId)).set('Authorization', await loginAs(email))

const writeNote = async (email: string, studentId: string, body: { group_id: string; body: string }) =>
  request(app).post(notesPath(studentId)).set('Authorization', await loginAs(email)).send(body)

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const coursesAdmin = await createUser({ email: 'courses@oxford.test' })
  const arben = await createUser({ email: 'arben@lecturer.test' })
  const teuta = await createUser({ email: 'teuta@lecturer.test' })
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
        { userId: student.id, role: 'STUDENT' },
      ],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id })
  courseId = (await createCourse({ organizationId, name: 'Mathematics' })).id
  yearId = (await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true } })).id
  arbenId = (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Arben', last_name: 'Hoxha', employment_type: 'FULL_TIME', user_id: arben.id } })).id
  teutaId = (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Teuta', last_name: 'Krasniqi', employment_type: 'PART_TIME', user_id: teuta.id } })).id
  const besa = await prisma.student.create({ data: { organization_id: organizationId, first_name: 'Besa', last_name: 'Student', student_number: 'STU-0001' } })
  besaId = besa.id
  const groupA = await addGroup('Group A', arbenId)
  groupAId = groupA.id
  await enrol(groupAId, besaId)
})

describe('writing a note about a student', () => {
  it('adds a note, naming the group and the lecturer who wrote it', async () => {
    const response = await writeNote('arben@lecturer.test', besaId, { group_id: groupAId, body: 'Struggling with fractions.' })

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ body: 'Struggling with fractions.', group: { id: groupAId, name: 'Group A' }, lecturer: { first_name: 'Test', last_name: 'User' } })
    expect(response.body.data.created_at).toBeTruthy()
  })

  it('refuses a lecturer who doesn’t currently share a group with the student, with a 403', async () => {
    const response = await writeNote('teuta@lecturer.test', besaId, { group_id: groupAId, body: 'Not my student.' })

    expect(response.status).toBe(403)
  })

  it('refuses an empty body', async () => {
    const response = await writeNote('arben@lecturer.test', besaId, { group_id: groupAId, body: '' })

    expect(response.status).toBe(400)
  })

  it('refuses a group the lecturer doesn’t currently share with the student', async () => {
    const groupB = await addGroup('Group B', teutaId)
    await enrol(groupB.id, besaId)

    const response = await writeNote('arben@lecturer.test', besaId, { group_id: groupB.id, body: 'Wrong group.' })

    expect(response.status).toBe(400)
  })

  it('lets the owner and admins with MANAGE_COURSES write a note too', async () => {
    const asOwner = await writeNote('owner@oxford.test', besaId, { group_id: groupAId, body: 'From the owner.' })
    const asAdmin = await writeNote('courses@oxford.test', besaId, { group_id: groupAId, body: 'From the admin.' })

    expect(asOwner.status).toBe(201)
    expect(asAdmin.status).toBe(201)
  })

  it('logs STUDENT_NOTE_ADDED, naming the student and the group', async () => {
    await writeNote('arben@lecturer.test', besaId, { group_id: groupAId, body: 'Logged note.' })

    const arben = await prisma.user.findFirstOrThrow({ where: { email: 'arben@lecturer.test' } })
    const entry = await prisma.activityLog.findFirstOrThrow({ where: { action: 'STUDENT_NOTE_ADDED' } })
    expect(entry.actor_id).toBe(arben.id)
    expect(entry.subject_name).toBe('Besa Student in Group A')
  })
})

describe('listing a student’s notes', () => {
  it('lists newest first, with the body, group and author', async () => {
    const first = await writeNote('arben@lecturer.test', besaId, { group_id: groupAId, body: 'First note.' })
    const second = await writeNote('arben@lecturer.test', besaId, { group_id: groupAId, body: 'Second note.' })
    expect(first.status).toBe(201)
    expect(second.status).toBe(201)

    const response = await listNotes('arben@lecturer.test', besaId)

    expect(response.status).toBe(200)
    expect(response.body.data.map((note: { body: string }) => note.body)).toEqual(['Second note.', 'First note.'])
  })

  it('says "No notes yet" worthy response: an empty list when none are written', async () => {
    const response = await listNotes('arben@lecturer.test', besaId)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([])
  })

  it('refuses a lecturer who doesn’t currently share a group with the student, with a 403', async () => {
    const response = await listNotes('teuta@lecturer.test', besaId)

    expect(response.status).toBe(403)
  })

  it('refuses a student outside the organization, and a student role, and a cross-org student id, with 403 or 404', async () => {
    expect((await listNotes('student@oxford.test', besaId)).status).toBe(403)
    expect((await listNotes('owner@yllka.test', besaId)).status).toBe(403)
    expect((await listNotes('owner@oxford.test', '00000000-0000-4000-8000-000000000099')).status).toBe(404)
  })
})
