import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let organizationId: string
let lecturersPath: string
let ownerAuth: string
let mainCampusId: string
let northCampusId: string
let sciencesId: string

type LecturerBody = {
  first_name: string
  last_name: string
  email: string
  phone: string
  subjects: string[]
  employment_type: string
  started_on: string
  notes: string
  department_id: string | null
  location_ids: string[]
}

const lecturer = (overrides: Partial<LecturerBody> = {}): LecturerBody => ({
  first_name: 'Arben',
  last_name: 'Hoxha',
  email: '',
  phone: '',
  subjects: ['Mathematics'],
  employment_type: 'FULL_TIME',
  started_on: '',
  notes: '',
  department_id: null,
  location_ids: [],
  ...overrides,
})

type ListParams = {
  query?: Record<string, string>
  auth?: string
}

const listLecturers = async ({ query = {}, auth = ownerAuth }: ListParams = {}) => request(app).get(lecturersPath).query(query).set('Authorization', auth)

const namesIn = async (params: ListParams = {}) =>
  (await listLecturers(params)).body.data.lecturers.map((item: { first_name: string; last_name: string }) => `${item.first_name} ${item.last_name}`)

const yllkaPlaces = async () => {
  const yllka = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })
  const location = await prisma.location.create({ data: { organization_id: yllka.id, name: 'Yllka campus', is_main: true } })
  const department = await prisma.department.create({ data: { organization_id: yllka.id, name: 'Languages' } })
  return { yllkaId: yllka.id, locationId: location.id, departmentId: department.id }
}

const addLecturer = async (body: LecturerBody, auth = ownerAuth, path = lecturersPath) => request(app).post(path).set('Authorization', auth).send(body)

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const permitted = await createUser({ email: 'permitted@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  const lecturerUser = await createUser({ email: 'lecturer@oxford.test' })
  const studentUser = await createUser({ email: 'student@oxford.test' })
  const guardian = await createUser({ email: 'guardian@oxford.test' })
  const yllkaOwner = await createUser({ email: 'owner@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: permitted.id, role: 'ADMIN', permissions: ['MANAGE_LECTURERS'] },
        { userId: admin.id, role: 'ADMIN', permissions: ['MANAGE_STUDENTS'] },
        { userId: lecturerUser.id, role: 'LECTURER' },
        { userId: studentUser.id, role: 'STUDENT' },
        { userId: guardian.id, role: 'GUARDIAN' },
      ],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id })
  mainCampusId = (await prisma.location.create({ data: { organization_id: organizationId, name: 'Main campus', is_main: true } })).id
  northCampusId = (await prisma.location.create({ data: { organization_id: organizationId, name: 'North campus' } })).id
  sciencesId = (await prisma.department.create({ data: { organization_id: organizationId, name: 'Sciences' } })).id
  lecturersPath = `/api/organizations/${organizationId}/lecturers`
  ownerAuth = await loginAs('owner@oxford.test')
})

describe('lecturer records', () => {
  it('adds Arben Hoxha, Mathematics, full-time, Main campus, Sciences, and saves all of it', async () => {
    const added = await addLecturer(
      lecturer({ email: 'Arben@Oxford.test', phone: '+383 44 123 456', started_on: '2024-09-01', notes: 'Head of maths', department_id: sciencesId, location_ids: [mainCampusId] }),
    )
    const read = await request(app).get(`${lecturersPath}/${added.body.data.id}`).set('Authorization', ownerAuth)

    expect(added.status).toBe(201)
    expect(read.body.data).toEqual({
      id: added.body.data.id,
      first_name: 'Arben',
      last_name: 'Hoxha',
      email: 'arben@oxford.test',
      phone: '+383 44 123 456',
      subjects: ['Mathematics'],
      employment_type: 'FULL_TIME',
      started_on: '2024-09-01',
      notes: 'Head of maths',
      status: 'ACTIVE',
      created_at: expect.any(String),
      department: { id: sciencesId, name: 'Sciences' },
      locations: [{ id: mainCampusId, name: 'Main campus' }],
      login_status: 'NONE',
      invitation: null,
    })
  })

  it('lets an admin with Lecturers add, edit, archive and restore', async () => {
    const auth = await loginAs('permitted@oxford.test')
    const added = await addLecturer(lecturer(), auth)
    const path = `${lecturersPath}/${added.body.data.id}`
    const updated = await request(app).put(path).set('Authorization', auth).send(lecturer({ employment_type: 'PART_TIME' }))
    const archived = await request(app).post(`${path}/archive`).set('Authorization', auth)
    const restored = await request(app).post(`${path}/restore`).set('Authorization', auth)
    const subjects = await request(app).get(`${lecturersPath}/subjects`).set('Authorization', auth)
    const read = await request(app).get(path).set('Authorization', auth)

    expect([added.status, updated.status, archived.status, restored.status, subjects.status, read.status]).toEqual([201, 200, 200, 200, 200, 200])
    expect(read.body.data).toMatchObject({ employment_type: 'PART_TIME', status: 'ACTIVE' })
  })

  it('refuses every other role, and other organizations, on every lecturer endpoint', async () => {
    const existing = (await addLecturer(lecturer())).body.data
    const path = `${lecturersPath}/${existing.id}`
    const calls = [
      (auth: string) => request(app).get(lecturersPath).set('Authorization', auth),
      (auth: string) => request(app).post(lecturersPath).set('Authorization', auth).send(lecturer({ first_name: 'Intruder' })),
      (auth: string) => request(app).get(`${lecturersPath}/subjects`).set('Authorization', auth),
      (auth: string) => request(app).get(path).set('Authorization', auth),
      (auth: string) => request(app).put(path).set('Authorization', auth).send(lecturer({ first_name: 'Intruder' })),
      (auth: string) => request(app).post(`${path}/archive`).set('Authorization', auth),
      (auth: string) => request(app).post(`${path}/restore`).set('Authorization', auth),
    ]

    for (const email of ['admin@oxford.test', 'lecturer@oxford.test', 'student@oxford.test', 'guardian@oxford.test', 'owner@yllka.test']) {
      const auth = await loginAs(email)
      for (const call of calls) {
        expect((await call(auth)).status, email).toBe(403)
      }
    }
    expect(await namesIn()).toEqual(['Arben Hoxha'])
  })

  it('keeps each organization’s lecturers to itself', async () => {
    const { yllkaId } = await yllkaPlaces()
    const yllkaAuth = await loginAs('owner@yllka.test')
    const yllkaPath = `/api/organizations/${yllkaId}/lecturers`
    await addLecturer(lecturer())
    const theirs = (await addLecturer(lecturer({ first_name: 'Teuta', subjects: ['English'] }), yllkaAuth, yllkaPath)).body.data

    expect(await namesIn()).toEqual(['Arben Hoxha'])
    expect((await request(app).get(`${lecturersPath}/subjects`).set('Authorization', ownerAuth)).body.data).toEqual(['Mathematics'])
    expect((await request(app).get(`${lecturersPath}/${theirs.id}`).set('Authorization', ownerAuth)).status).toBe(404)
    expect((await request(app).post(`${lecturersPath}/${theirs.id}/archive`).set('Authorization', ownerAuth)).status).toBe(404)
  })

  it('refuses a location or department from another organization', async () => {
    const { locationId, departmentId } = await yllkaPlaces()
    const existing = (await addLecturer(lecturer())).body.data

    const otherLocation = await addLecturer(lecturer({ location_ids: [mainCampusId, locationId] }))
    const otherDepartment = await addLecturer(lecturer({ department_id: departmentId }))
    const editedIn = await request(app).put(`${lecturersPath}/${existing.id}`).set('Authorization', ownerAuth).send(lecturer({ location_ids: [locationId] }))

    expect(otherLocation.status).toBe(400)
    expect(otherLocation.body.details.fieldErrors).toEqual({ location_ids: ['Choose your organization’s locations only.'] })
    expect(otherDepartment.status).toBe(400)
    expect(otherDepartment.body.details.fieldErrors).toEqual({ department_id: ['Choose one of your organization’s departments.'] })
    expect(editedIn.status).toBe(400)
    expect(await namesIn()).toEqual(['Arben Hoxha'])
    expect((await request(app).get(`${lecturersPath}/${existing.id}`).set('Authorization', ownerAuth)).body.data.locations).toEqual([])
  })

  it('refuses missing names, an unknown employment type, a bad email and a long subject', async () => {
    const missingName = await addLecturer(lecturer({ first_name: ' ' }))
    const unknownType = await addLecturer(lecturer({ employment_type: 'VOLUNTEER' }))
    const badEmail = await addLecturer(lecturer({ email: 'not-an-email' }))
    const longSubject = await addLecturer(lecturer({ subjects: ['X'.repeat(61)] }))

    expect(missingName.body.details.fieldErrors).toHaveProperty('first_name')
    expect(unknownType.body.details.fieldErrors).toHaveProperty('employment_type')
    expect(badEmail.body.details.fieldErrors).toHaveProperty('email')
    expect(longSubject.body.details.fieldErrors).toHaveProperty('subjects')
    expect(await namesIn()).toEqual([])
  })

  it('tidies subjects, keeps one of each, and reuses the casing the organization already has', async () => {
    await addLecturer(lecturer({ subjects: ['Mathematics', '  Computer   Science '] }))

    const second = await addLecturer(lecturer({ first_name: 'Teuta', subjects: ['mathematics', 'English', 'english', ' ', 'COMPUTER SCIENCE'] }))
    const suggestions = await request(app).get(`${lecturersPath}/subjects`).set('Authorization', ownerAuth)

    expect(second.body.data.subjects).toEqual(['Mathematics', 'English', 'Computer Science'])
    expect(suggestions.body.data).toEqual(['Computer Science', 'English', 'Mathematics'])
  })

  it('searches names, subjects and emails in any case, and filters by location, department and subject', async () => {
    await addLecturer(lecturer({ subjects: ['Mathematics', 'Physics'], email: 'arben@oxford.test', department_id: sciencesId, location_ids: [mainCampusId] }))
    await addLecturer(lecturer({ first_name: 'Teuta', last_name: 'Krasniqi', subjects: ['English'], location_ids: [northCampusId] }))
    await addLecturer(lecturer({ first_name: 'Dren', last_name: 'Berisha', subjects: ['Applied mathematics'], location_ids: [mainCampusId, northCampusId] }))

    expect(await namesIn({ query: { search: 'math' } })).toEqual(['Dren Berisha', 'Arben Hoxha'])
    expect(await namesIn({ query: { search: 'TEUTA krasniqi' } })).toEqual(['Teuta Krasniqi'])
    expect(await namesIn({ query: { search: 'arben@' } })).toEqual(['Arben Hoxha'])
    expect(await namesIn({ query: { search: '100%' } })).toEqual([])
    expect(await namesIn({ query: { location_id: mainCampusId } })).toEqual(['Dren Berisha', 'Arben Hoxha'])
    expect(await namesIn({ query: { location_id: northCampusId, search: 'english' } })).toEqual(['Teuta Krasniqi'])
    expect(await namesIn({ query: { department_id: sciencesId } })).toEqual(['Arben Hoxha'])
    expect(await namesIn({ query: { subject: 'mathematics' } })).toEqual(['Arben Hoxha'])
    expect((await listLecturers({ query: { location_id: northCampusId } })).body.data).toMatchObject({ total: 2, counts: { ACTIVE: 2, ARCHIVED: 0 } })
    expect(await namesIn({ query: { page: '2', page_size: '2' } })).toEqual(['Teuta Krasniqi'])
    expect((await listLecturers({ query: { location_id: 'nowhere' } })).status).toBe(400)
  })

  it('archives a lecturer out of the active list and restores him, keeping the record', async () => {
    const added = (await addLecturer(lecturer({ notes: 'Keeps his history' }))).body.data
    const path = `${lecturersPath}/${added.id}`

    await request(app).post(`${path}/archive`).set('Authorization', ownerAuth)
    const archivedAgain = await request(app).post(`${path}/archive`).set('Authorization', ownerAuth)
    const activeWhileArchived = await namesIn()
    const archivedList = await listLecturers({ query: { status: 'ARCHIVED' } })
    await request(app).post(`${path}/restore`).set('Authorization', ownerAuth)

    expect(archivedAgain.status).toBe(409)
    expect(activeWhileArchived).toEqual([])
    expect(archivedList.body.data).toMatchObject({ total: 1, counts: { ACTIVE: 0, ARCHIVED: 1 } })
    expect(archivedList.body.data.lecturers[0]).toMatchObject({ id: added.id, notes: 'Keeps his history', status: 'ARCHIVED' })
    expect(await namesIn()).toEqual(['Arben Hoxha'])
  })

  it('keeps the lecturer when their location or department is removed', async () => {
    const added = (await addLecturer(lecturer({ department_id: sciencesId, location_ids: [mainCampusId, northCampusId] }))).body.data

    const removedLocation = await request(app).delete(`/api/organizations/${organizationId}/locations/${northCampusId}`).set('Authorization', ownerAuth)
    const removedDepartment = await request(app).delete(`/api/organizations/${organizationId}/departments/${sciencesId}`).set('Authorization', ownerAuth)
    const read = await request(app).get(`${lecturersPath}/${added.id}`).set('Authorization', ownerAuth)

    expect([removedLocation.status, removedDepartment.status]).toEqual([200, 200])
    expect(read.status).toBe(200)
    expect(read.body.data).toMatchObject({ department: null, locations: [{ id: mainCampusId, name: 'Main campus' }] })
  })

  it('replaces the locations and department on edit', async () => {
    const added = (await addLecturer(lecturer({ department_id: sciencesId, location_ids: [mainCampusId] }))).body.data

    const updated = await request(app).put(`${lecturersPath}/${added.id}`).set('Authorization', ownerAuth).send(lecturer({ location_ids: [northCampusId, mainCampusId] }))

    expect(updated.body.data).toMatchObject({ department: null, locations: [{ name: 'Main campus' }, { name: 'North campus' }] })
  })

  it('logs every change with the lecturer’s name', async () => {
    const added = (await addLecturer(lecturer())).body.data
    const path = `${lecturersPath}/${added.id}`

    await request(app).put(path).set('Authorization', ownerAuth).send(lecturer({ first_name: 'Arbën' }))
    await request(app).post(`${path}/archive`).set('Authorization', ownerAuth)
    await request(app).post(`${path}/restore`).set('Authorization', ownerAuth)
    const entries = await prisma.activityLog.findMany({ where: { organization_id: organizationId }, orderBy: { created_at: 'asc' }, select: { action: true, subject_name: true } })

    expect(entries).toEqual([
      { action: 'LECTURER_ADDED', subject_name: 'Arben Hoxha' },
      { action: 'LECTURER_UPDATED', subject_name: 'Arbën Hoxha' },
      { action: 'LECTURER_ARCHIVED', subject_name: 'Arbën Hoxha' },
      { action: 'LECTURER_RESTORED', subject_name: 'Arbën Hoxha' },
    ])
  })
})
