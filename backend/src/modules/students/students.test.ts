import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let organizationId: string
let studentsPath: string
let ownerAuth: string

type StudentBody = {
  first_name: string
  last_name: string
  date_of_birth: string
  enrolled_on: string
  student_number: string
  notes: string
}

const student = (overrides: Partial<StudentBody> = {}): StudentBody => ({
  first_name: 'Arta',
  last_name: 'Gashi',
  date_of_birth: '2019-03-14',
  enrolled_on: '2025-09-01',
  student_number: '',
  notes: '',
  ...overrides,
})

const addStudent = async (body: StudentBody, auth = ownerAuth, path = studentsPath) => request(app).post(path).set('Authorization', auth).send(body)

type ListParams = {
  query?: Record<string, string>
  auth?: string
}

const listStudents = async ({ query = {}, auth = ownerAuth }: ListParams = {}) => request(app).get(studentsPath).query(query).set('Authorization', auth)

const namesIn = async (params: ListParams = {}) => (await listStudents(params)).body.data.students.map((item: { first_name: string; last_name: string }) => `${item.first_name} ${item.last_name}`)

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const permitted = await createUser({ email: 'permitted@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  const lecturer = await createUser({ email: 'lecturer@oxford.test' })
  const studentUser = await createUser({ email: 'student@oxford.test' })
  const guardian = await createUser({ email: 'guardian@oxford.test' })
  const yllkaOwner = await createUser({ email: 'owner@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: permitted.id, role: 'ADMIN', permissions: ['MANAGE_STUDENTS'] },
        { userId: admin.id, role: 'ADMIN', permissions: ['MANAGE_ACADEMIC_PERIODS'] },
        { userId: lecturer.id, role: 'LECTURER' },
        { userId: studentUser.id, role: 'STUDENT' },
        { userId: guardian.id, role: 'GUARDIAN' },
      ],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id })
  studentsPath = `/api/organizations/${organizationId}/students`
  ownerAuth = await loginAs('owner@oxford.test')
})

describe('student records', () => {
  it('adds a student with no email and lists her', async () => {
    const added = await addStudent(student())
    const list = await request(app).get(studentsPath).set('Authorization', ownerAuth)

    expect(added.status).toBe(201)
    expect(added.body.data).toMatchObject({ first_name: 'Arta', last_name: 'Gashi', date_of_birth: '2019-03-14', enrolled_on: '2025-09-01', student_number: 'STU-0001', status: 'ACTIVE' })
    expect(list.status).toBe(200)
    expect(list.body.data.students.map((item: { first_name: string }) => item.first_name)).toEqual(['Arta'])
  })
  it('lets an admin with Students add, edit, archive and restore', async () => {
    const auth = await loginAs('permitted@oxford.test')

    const added = await addStudent(student(), auth)
    const path = `${studentsPath}/${added.body.data.id}`
    const updated = await request(app).put(path).set('Authorization', auth).send(student({ student_number: 'STU-0001', notes: 'Allergic to nuts' }))
    const archived = await request(app).post(`${path}/archive`).set('Authorization', auth)
    const restored = await request(app).post(`${path}/restore`).set('Authorization', auth)
    const read = await request(app).get(path).set('Authorization', auth)

    expect([added.status, updated.status, archived.status, restored.status, read.status]).toEqual([201, 200, 200, 200, 200])
    expect(read.body.data).toMatchObject({ notes: 'Allergic to nuts', status: 'ACTIVE' })
  })

  it('refuses every other role, and other organizations, on every student endpoint', async () => {
    const existing = (await addStudent(student())).body.data
    const path = `${studentsPath}/${existing.id}`
    const calls = [
      (auth: string) => request(app).get(studentsPath).set('Authorization', auth),
      (auth: string) => request(app).post(studentsPath).set('Authorization', auth).send(student({ first_name: 'Intruder' })),
      (auth: string) => request(app).get(path).set('Authorization', auth),
      (auth: string) => request(app).put(path).set('Authorization', auth).send(student({ first_name: 'Intruder', student_number: 'STU-0001' })),
      (auth: string) => request(app).post(`${path}/archive`).set('Authorization', auth),
      (auth: string) => request(app).post(`${path}/restore`).set('Authorization', auth),
    ]

    for (const email of ['admin@oxford.test', 'lecturer@oxford.test', 'student@oxford.test', 'guardian@oxford.test', 'owner@yllka.test']) {
      const auth = await loginAs(email)
      for (const call of calls) {
        expect((await call(auth)).status, email).toBe(403)
      }
    }
    expect(await namesIn()).toEqual(['Arta Gashi'])
  })

  it('refuses a suspended organization', async () => {
    await prisma.organization.update({ where: { id: organizationId }, data: { status: 'SUSPENDED' } })

    expect((await listStudents()).status).toBe(403)
  })

  it('adds a student without a date of birth, and never links a login', async () => {
    const added = await addStudent(student({ date_of_birth: '' }))

    expect(added.status).toBe(201)
    expect(added.body.data.date_of_birth).toBeNull()
    expect(added.body.data).not.toHaveProperty('user_id')
    expect(await prisma.student.findUniqueOrThrow({ where: { id: added.body.data.id }, select: { user_id: true } })).toEqual({ user_id: null })
  })

  it('numbers students per organization, after the highest number used', async () => {
    const yllkaAuth = await loginAs('owner@yllka.test')
    const yllkaId = (await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })).id
    const yllkaPath = `/api/organizations/${yllkaId}/students`

    const first = await addStudent(student())
    const typed = await addStudent(student({ first_name: 'Besa', student_number: 'STU-0041' }))
    const next = await addStudent(student({ first_name: 'Dren' }))
    const yllkaFirst = await addStudent(student({ first_name: 'Era' }), yllkaAuth, yllkaPath)

    expect(first.body.data.student_number).toBe('STU-0001')
    expect(typed.body.data.student_number).toBe('STU-0041')
    expect(next.body.data.student_number).toBe('STU-0042')
    expect(yllkaFirst.body.data.student_number).toBe('STU-0001')
  })

  it('keeps student numbers unique in the organization', async () => {
    const first = (await addStudent(student({ student_number: 'A-1' }))).body.data
    const second = (await addStudent(student({ first_name: 'Besa' }))).body.data

    const duplicate = await addStudent(student({ first_name: 'Dren', student_number: 'A-1' }))
    const renamed = await request(app).put(`${studentsPath}/${second.id}`).set('Authorization', ownerAuth).send(student({ first_name: 'Besa', student_number: 'A-1' }))
    const kept = await request(app).put(`${studentsPath}/${first.id}`).set('Authorization', ownerAuth).send(student({ student_number: 'A-1', last_name: 'Krasniqi' }))

    expect(duplicate.status).toBe(409)
    expect(duplicate.body.details.fieldErrors).toEqual({ student_number: ['Another student already has the number A-1.'] })
    expect(renamed.status).toBe(409)
    expect(kept.status).toBe(200)
    expect(await namesIn()).toEqual(['Besa Gashi', 'Arta Krasniqi'])
  })

  it('refuses missing names, a future birth date, enrolment before birth and a long student number', async () => {
    const missingName = await addStudent(student({ first_name: ' ' }))
    const future = await addStudent(student({ date_of_birth: '2999-01-01', enrolled_on: '2999-01-02' }))
    const beforeBirth = await addStudent(student({ date_of_birth: '2019-03-14', enrolled_on: '2019-03-13' }))
    const longNumber = await addStudent(student({ student_number: 'X'.repeat(31) }))
    const emptyNumberOnEdit = await request(app)
      .put(`${studentsPath}/${(await addStudent(student())).body.data.id}`)
      .set('Authorization', ownerAuth)
      .send(student({ student_number: '' }))

    expect(missingName.body.details.fieldErrors).toHaveProperty('first_name')
    expect(future.body.details.fieldErrors).toHaveProperty('date_of_birth')
    expect(beforeBirth.body.details.fieldErrors).toHaveProperty('enrolled_on')
    expect(longNumber.body.details.fieldErrors).toHaveProperty('student_number')
    expect(emptyNumberOnEdit.status).toBe(400)
    expect(await namesIn()).toEqual(['Arta Gashi'])
  })

  it('searches names and student numbers in any case, and pages by last name', async () => {
    await addStudent(student({ first_name: 'Arta', last_name: 'Gashi' }))
    await addStudent(student({ first_name: 'Besa', last_name: 'Berisha' }))
    await addStudent(student({ first_name: 'Dren', last_name: 'Hoxha', student_number: 'K-77' }))

    expect(await namesIn({ query: { search: 'arta GASHI' } })).toEqual(['Arta Gashi'])
    expect(await namesIn({ query: { search: 'k-77' } })).toEqual(['Dren Hoxha'])
    expect(await namesIn({ query: { search: 'nobody' } })).toEqual([])
    expect(await namesIn({ query: { page: '1', page_size: '2' } })).toEqual(['Besa Berisha', 'Arta Gashi'])
    expect(await namesIn({ query: { page: '2', page_size: '2' } })).toEqual(['Dren Hoxha'])
    expect((await listStudents({ query: { page_size: '2' } })).body.data).toMatchObject({ total: 3, counts: { ACTIVE: 3, ARCHIVED: 0 } })
    expect((await listStudents({ query: { status: 'GONE' } })).status).toBe(400)
  })

  it('archives a student out of the active list and restores her, keeping the record', async () => {
    const added = (await addStudent(student({ notes: 'Keeps her history' }))).body.data
    const path = `${studentsPath}/${added.id}`

    await request(app).post(`${path}/archive`).set('Authorization', ownerAuth)
    const archivedAgain = await request(app).post(`${path}/archive`).set('Authorization', ownerAuth)
    const activeWhileArchived = await namesIn()
    const archivedList = await listStudents({ query: { status: 'ARCHIVED' } })
    await request(app).post(`${path}/restore`).set('Authorization', ownerAuth)

    expect(archivedAgain.status).toBe(409)
    expect(activeWhileArchived).toEqual([])
    expect(archivedList.body.data).toMatchObject({ total: 1, counts: { ACTIVE: 0, ARCHIVED: 1 } })
    expect(archivedList.body.data.students[0]).toMatchObject({ id: added.id, notes: 'Keeps her history', status: 'ARCHIVED' })
    expect(await namesIn()).toEqual(['Arta Gashi'])
  })

  it('answers 404 for a student of another organization', async () => {
    const yllkaAuth = await loginAs('owner@yllka.test')
    const yllkaId = (await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })).id
    const theirs = (await addStudent(student(), yllkaAuth, `/api/organizations/${yllkaId}/students`)).body.data

    expect((await request(app).get(`${studentsPath}/${theirs.id}`).set('Authorization', ownerAuth)).status).toBe(404)
  })

  it('logs every change with the student’s name', async () => {
    const added = (await addStudent(student())).body.data
    const path = `${studentsPath}/${added.id}`
    await request(app).put(path).set('Authorization', ownerAuth).send(student({ first_name: 'Artë', student_number: 'STU-0001' }))
    await request(app).post(`${path}/archive`).set('Authorization', ownerAuth)
    await request(app).post(`${path}/restore`).set('Authorization', ownerAuth)

    const entries = await prisma.activityLog.findMany({ where: { organization_id: organizationId }, orderBy: { created_at: 'asc' }, select: { action: true, subject_name: true } })

    expect(entries).toEqual([
      { action: 'STUDENT_ADDED', subject_name: 'Arta Gashi' },
      { action: 'STUDENT_UPDATED', subject_name: 'Artë Gashi' },
      { action: 'STUDENT_ARCHIVED', subject_name: 'Artë Gashi' },
      { action: 'STUDENT_RESTORED', subject_name: 'Artë Gashi' },
    ])
  })
})
