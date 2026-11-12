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
let groupId: string
let otherGroupId: string
let altinId: string
let blertaId: string
let ceciliaId: string
let dionId: string

type AddGroupParams = {
  name: string
  lecturerId: string
  lecturerEndDate?: string
  status?: 'ACTIVE' | 'ARCHIVED'
}

const addGroup = async ({ name, lecturerId, lecturerEndDate, status = 'ACTIVE' }: AddGroupParams) => {
  const group = await prisma.group.create({ data: { organization_id: organizationId, course_id: courseId, name, academic_year_id: yearId, status } })
  await prisma.groupLecturerAssignment.create({ data: { group_id: group.id, lecturer_id: lecturerId, start_date: new Date('2026-09-01'), end_date: lecturerEndDate ? new Date(lecturerEndDate) : null } })
  return group
}

const addStudent = (firstName: string, status: 'ACTIVE' | 'ARCHIVED' = 'ACTIVE') =>
  prisma.student.create({ data: { organization_id: organizationId, first_name: firstName, last_name: 'Student', student_number: `STU-${firstName}`, status } })

const enrol = (enrolledGroupId: string, studentId: string) => prisma.groupEnrolment.create({ data: { group_id: enrolledGroupId, student_id: studentId, enrolled_on: new Date('2026-09-01') } })

const addGuardian = async (studentId: string, firstName: string) => {
  const guardian = await prisma.guardian.create({ data: { organization_id: organizationId, first_name: firstName, last_name: 'Parent', email: `${firstName.toLowerCase()}@family.test`, phone: '+383 44 111 222' } })
  await prisma.studentGuardian.create({ data: { student_id: studentId, guardian_id: guardian.id, relationship: 'MOTHER' } })
}

const base = () => `/api/organizations/${organizationId}/parent-notes`

const asUser = async (email: string) => ({ Authorization: await loginAs(email) })

const send = async (email: string, studentId: string, body: unknown) => request(app).post(`${base()}/students/${studentId}`).set(await asUser(email)).send({ body })

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const arben = await createUser({ email: 'arben@lecturer.test' })
  const teuta = await createUser({ email: 'teuta@lecturer.test' })
  const unlinked = await createUser({ email: 'unlinked@lecturer.test' })
  const parent = await createUser({ email: 'parent@family.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: arben.id, role: 'LECTURER' },
        { userId: teuta.id, role: 'LECTURER' },
        { userId: unlinked.id, role: 'LECTURER' },
        { userId: parent.id, role: 'GUARDIAN' },
      ],
    })
  ).id
  courseId = (await createCourse({ organizationId, name: 'Mathematics' })).id
  yearId = (await prisma.academicYear.create({ data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true } })).id
  arbenId = (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Arben', last_name: 'Hoxha', employment_type: 'FULL_TIME', user_id: arben.id } })).id
  teutaId = (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Teuta', last_name: 'Krasniqi', employment_type: 'PART_TIME', user_id: teuta.id } })).id
  groupId = (await addGroup({ name: 'Group A', lecturerId: arbenId })).id
  otherGroupId = (await addGroup({ name: 'Teuta’s group', lecturerId: teutaId })).id
  altinId = (await addStudent('Altin')).id
  blertaId = (await addStudent('Blerta')).id
  ceciliaId = (await addStudent('Cecilia')).id
  dionId = (await addStudent('Dion')).id
  await enrol(groupId, altinId)
  await enrol(groupId, blertaId)
  await enrol(otherGroupId, ceciliaId)
  await addGuardian(altinId, 'Drita')
  await addGuardian(ceciliaId, 'Fatime')
})

describe('the groups a lecturer can write from', () => {
  it('lists the groups they currently teach with their active students, by name', async () => {
    await enrol(groupId, dionId)
    await prisma.student.update({ where: { id: dionId }, data: { status: 'ARCHIVED' } })
    const ended = await addGroup({ name: 'Ended group', lecturerId: arbenId, lecturerEndDate: '2026-09-30' })
    await enrol(ended.id, ceciliaId)
    await addGroup({ name: 'Archived group', lecturerId: arbenId, status: 'ARCHIVED' })

    const response = await request(app).get(`${base()}/groups`).set(await asUser('arben@lecturer.test'))

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([{ id: groupId, name: 'Group A', students: [expect.objectContaining({ id: altinId, first_name: 'Altin' }), expect.objectContaining({ id: blertaId, first_name: 'Blerta' })] }])
  })

  it('lists nothing for a lecturer who is not linked to a record', async () => {
    const response = await request(app).get(`${base()}/groups`).set(await asUser('unlinked@lecturer.test'))

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([])
  })

  it('refuses everyone but lecturers', async () => {
    expect((await request(app).get(`${base()}/groups`).set(await asUser('owner@oxford.test'))).status).toBe(403)
    expect((await request(app).get(`${base()}/groups`).set(await asUser('parent@family.test'))).status).toBe(403)
    expect((await request(app).get(`${base()}/groups`)).status).toBe(401)
  })
})

describe('sending a note to a student’s guardians', () => {
  it('stores the trimmed note and answers with it', async () => {
    const response = await send('arben@lecturer.test', altinId, '  Altin did great today.  ')

    expect(response.status).toBe(201)
    expect(response.body.data).toEqual({ id: expect.any(String), body: 'Altin did great today.', created_at: expect.any(String) })
    const stored = await prisma.studentParentNote.findMany()
    expect(stored).toHaveLength(1)
    expect(stored[0]).toMatchObject({ organization_id: organizationId, student_id: altinId, lecturer_id: arbenId, body: 'Altin did great today.' })
  })

  it('refuses an empty or too long note', async () => {
    expect((await send('arben@lecturer.test', altinId, '   ')).status).toBe(400)
    expect((await send('arben@lecturer.test', altinId, 'x'.repeat(2001))).status).toBe(400)
    expect(await prisma.studentParentNote.count()).toBe(0)
  })

  it('refuses a student the lecturer does not currently teach', async () => {
    const response = await send('arben@lecturer.test', ceciliaId, 'Hello')

    expect(response.status).toBe(403)
    expect(await prisma.studentParentNote.count()).toBe(0)
  })

  it('refuses a student who has no guardian yet, saying why', async () => {
    const response = await send('arben@lecturer.test', blertaId, 'Hello')

    expect(response.status).toBe(422)
    expect(response.body.error).toBe('Blerta has no parent or guardian on file yet. Ask the school to add one first.')
    expect(await prisma.studentParentNote.count()).toBe(0)
  })

  it('refuses a student from another organization and a lecturer without a record', async () => {
    const stranger = await createUser({ email: 'owner@yllka.test' })
    const yllkaId = (await createOrganization({ name: 'Yllka Kindergarten', ownerId: stranger.id })).id
    const foreign = await prisma.student.create({ data: { organization_id: yllkaId, first_name: 'Yllka', last_name: 'Student', student_number: 'STU-1' } })

    expect((await send('arben@lecturer.test', foreign.id, 'Hello')).status).toBe(404)
    expect((await send('unlinked@lecturer.test', altinId, 'Hello')).status).toBe(403)
  })
})

describe('the conversations of a lecturer', () => {
  it('lists a student once they were written to, newest last note first, only the lecturer’s own', async () => {
    await enrol(groupId, ceciliaId)
    await send('arben@lecturer.test', altinId, 'First to Altin')
    await send('arben@lecturer.test', ceciliaId, 'To Cecilia')
    await send('arben@lecturer.test', altinId, 'Second to Altin')
    await send('teuta@lecturer.test', ceciliaId, 'Teuta writing to Cecilia')

    const arben = await request(app).get(`${base()}/conversations`).set(await asUser('arben@lecturer.test'))
    const teuta = await request(app).get(`${base()}/conversations`).set(await asUser('teuta@lecturer.test'))

    expect(arben.status).toBe(200)
    expect(arben.body.data.map((item: { student: { first_name: string }; last_note: { body: string } }) => [item.student.first_name, item.last_note.body])).toEqual([
      ['Altin', 'Second to Altin'],
      ['Cecilia', 'To Cecilia'],
    ])
    expect(teuta.body.data.map((item: { last_note: { body: string } }) => item.last_note.body)).toEqual(['Teuta writing to Cecilia'])
  })

  it('opens one with the student, every guardian and the notes oldest first', async () => {
    await addGuardian(altinId, 'Gent')
    await send('arben@lecturer.test', altinId, 'One')
    await send('arben@lecturer.test', altinId, 'Two')

    const response = await request(app).get(`${base()}/students/${altinId}`).set(await asUser('arben@lecturer.test'))

    expect(response.status).toBe(200)
    expect(response.body.data.student).toEqual({ id: altinId, first_name: 'Altin', last_name: 'Student' })
    expect(response.body.data.guardians).toEqual([
      expect.objectContaining({ first_name: 'Drita', last_name: 'Parent', relationship: 'MOTHER', email: 'drita@family.test', phone: '+383 44 111 222' }),
      expect.objectContaining({ first_name: 'Gent' }),
    ])
    expect(response.body.data.notes.map((note: { body: string }) => note.body)).toEqual(['One', 'Two'])
  })

  it('does not open a student another lecturer teaches', async () => {
    expect((await request(app).get(`${base()}/students/${ceciliaId}`).set(await asUser('arben@lecturer.test'))).status).toBe(403)
  })
})

describe('what a guardian reads of those notes', () => {
  const notesPath = (studentId: string) => `/api/organizations/${organizationId}/me/children/${studentId}/notes`

  beforeEach(async () => {
    const parent = await prisma.user.findUniqueOrThrow({ where: { email: 'parent@family.test' } })
    const guardian = await prisma.guardian.findFirstOrThrow({ where: { first_name: 'Drita' } })
    await prisma.guardian.update({ where: { id: guardian.id }, data: { user_id: parent.id } })
  })

  it('lists every note about their child, newest first, with the lecturer’s name', async () => {
    await send('arben@lecturer.test', altinId, 'First')
    await prisma.groupLecturerAssignment.create({ data: { group_id: otherGroupId, lecturer_id: teutaId, start_date: new Date('2026-09-01') } })
    await enrol(otherGroupId, altinId)
    await send('teuta@lecturer.test', altinId, 'Second')

    const response = await request(app).get(notesPath(altinId)).set(await asUser('parent@family.test'))

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      { id: expect.any(String), body: 'Second', created_at: expect.any(String), author: { first_name: 'Teuta', last_name: 'Krasniqi' } },
      { id: expect.any(String), body: 'First', created_at: expect.any(String), author: { first_name: 'Arben', last_name: 'Hoxha' } },
    ])
  })

  it('refuses a child who is not theirs and anyone but guardians', async () => {
    expect((await request(app).get(notesPath(ceciliaId)).set(await asUser('parent@family.test'))).status).toBe(404)
    expect((await request(app).get(notesPath(altinId)).set(await asUser('arben@lecturer.test'))).status).toBe(403)
  })

  it('lists the notes about all their children on one page, with the child, and none about other children', async () => {
    await send('arben@lecturer.test', altinId, 'About Altin')
    await send('teuta@lecturer.test', ceciliaId, 'About Cecilia')

    const response = await request(app).get(`/api/organizations/${organizationId}/me/notes`).set(await asUser('parent@family.test'))

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      { id: expect.any(String), body: 'About Altin', created_at: expect.any(String), author: { first_name: 'Arben', last_name: 'Hoxha' }, student: { id: altinId, first_name: 'Altin', last_name: expect.any(String) } },
    ])
    expect((await request(app).get(`/api/organizations/${organizationId}/me/notes`).set(await asUser('arben@lecturer.test'))).status).toBe(403)
  })
})
