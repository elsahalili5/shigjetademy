import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let organizationId: string
let coursesPath: string
let ownerAuth: string
let sciencesId: string

type CourseBody = {
  name: string
  code: string
  description: string
  level: string
  department_id: string
}

const course = (overrides: Partial<CourseBody> = {}): CourseBody => ({
  name: 'Mathematics',
  code: '',
  description: '',
  level: 'B2',
  department_id: sciencesId,
  ...overrides,
})

const addCourse = async (body: CourseBody, auth = ownerAuth) => request(app).post(coursesPath).set('Authorization', auth).send(body)

const listCourses = async (query: Record<string, string> = {}, auth = ownerAuth) => request(app).get(coursesPath).query(query).set('Authorization', auth)

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const manager = await createUser({ email: 'manager@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  const lecturer = await createUser({ email: 'lecturer@oxford.test' })
  const organization = await createOrganization({
    name: 'Oxford Academy',
    ownerId: owner.id,
    members: [
      { userId: manager.id, role: 'ADMIN', permissions: ['MANAGE_COURSES'] },
      { userId: admin.id, role: 'ADMIN', permissions: ['MANAGE_STUDENTS'] },
      { userId: lecturer.id, role: 'LECTURER' },
    ],
  })
  organizationId = organization.id
  coursesPath = `/api/organizations/${organizationId}/courses`
  ownerAuth = await loginAs('owner@oxford.test')
  const sciences = await prisma.department.create({ data: { organization_id: organizationId, name: 'Sciences' } })
  sciencesId = sciences.id
})

describe('adding and listing courses', () => {
  it('adds a course with every field and lists it', async () => {
    const response = await addCourse(course({ name: 'Mathematics', code: 'MATH-1', description: 'Algebra and geometry', level: 'B2', department_id: sciencesId }))

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({
      name: 'Mathematics',
      code: 'MATH-1',
      description: 'Algebra and geometry',
      level: 'B2',
      status: 'ACTIVE',
      department: { id: sciencesId, name: 'Sciences' },
    })
    const list = await listCourses()
    expect(list.status).toBe(200)
    expect(list.body.data.courses.map((item: { name: string }) => item.name)).toEqual(['Mathematics'])
    expect(list.body.data.total).toBe(1)
  })

  it('stores the optional fields left empty as null', async () => {
    const response = await addCourse(course())

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ code: null, description: null, level: 'B2', department: { id: sciencesId, name: 'Sciences' } })
  })

  it('asks for a level', async () => {
    const response = await addCourse(course({ level: '   ' }))

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.level).toEqual(['Enter the course level.'])
  })

  it('asks for a department', async () => {
    const response = await request(app).post(coursesPath).set('Authorization', ownerAuth).send({ ...course(), department_id: null })

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.department_id).toEqual(['Choose a department.'])
  })

  it('asks for a level and a department when editing too', async () => {
    const added = await addCourse(course())

    const response = await request(app).put(`${coursesPath}/${added.body.data.id}`).set('Authorization', ownerAuth).send({ ...course(), level: '', department_id: '' })

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors).toEqual({ level: ['Enter the course level.'], department_id: ['Choose a department.'] })
  })

  it('lists courses by name', async () => {
    await addCourse(course({ name: 'Physics' }))
    await addCourse(course({ name: 'English' }))
    await addCourse(course({ name: 'Mathematics' }))

    const list = await listCourses()

    expect(list.body.data.courses.map((item: { name: string }) => item.name)).toEqual(['English', 'Mathematics', 'Physics'])
  })

  it('asks for a name', async () => {
    const response = await addCourse(course({ name: '  ' }))

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.name).toEqual(['Enter the course name.'])
  })

  it('answers a field error for a name already in the organization, in any case', async () => {
    await addCourse(course({ name: 'Mathematics' }))

    const response = await addCourse(course({ name: 'MATHEMATICS' }))

    expect(response.status).toBe(409)
    expect(response.body.details.fieldErrors.name).toEqual(['There is already a course with this name.'])
  })

  it('answers a field error for a code already in the organization, in any case', async () => {
    await addCourse(course({ name: 'Mathematics', code: 'MATH-1' }))

    const response = await addCourse(course({ name: 'Algebra', code: 'math-1' }))

    expect(response.status).toBe(409)
    expect(response.body.details.fieldErrors.code).toEqual(['There is already a course with this code.'])
  })

  it('takes _ and % literally when comparing names and codes', async () => {
    await addCourse(course({ name: 'MATX101', code: 'MATX-1' }))

    const similarName = await addCourse(course({ name: 'MAT_101' }))
    const similarCode = await addCourse(course({ name: 'Algebra', code: 'MAT_-1' }))
    const percentName = await addCourse(course({ name: 'MAT%' }))

    expect(similarName.status).toBe(201)
    expect(similarCode.status).toBe(201)
    expect(percentName.status).toBe(201)
  })

  it('still refuses the same name or code when it holds _, %, or a backslash', async () => {
    await addCourse(course({ name: 'MAT_101', code: '50%\\A' }))

    const sameName = await addCourse(course({ name: 'mat_101' }))
    const sameCode = await addCourse(course({ name: 'Algebra', code: '50%\\a' }))

    expect(sameName.status).toBe(409)
    expect(sameCode.status).toBe(409)
  })

  it('lets any number of courses go without a code', async () => {
    await addCourse(course({ name: 'Mathematics' }))

    const response = await addCourse(course({ name: 'Physics' }))

    expect(response.status).toBe(201)
  })

  it('lets two organizations use the same name and code', async () => {
    await addCourse(course({ name: 'Mathematics', code: 'MATH-1' }))
    const owner = await createUser({ email: 'owner@yllka.test' })
    const yllka = await createOrganization({ name: 'Yllka Kindergarten', ownerId: owner.id })
    const languages = await prisma.department.create({ data: { organization_id: yllka.id, name: 'Languages' } })

    const response = await request(app)
      .post(`/api/organizations/${yllka.id}/courses`)
      .set('Authorization', await loginAs('owner@yllka.test'))
      .send(course({ name: 'Mathematics', code: 'MATH-1', department_id: languages.id }))

    expect(response.status).toBe(201)
  })

  it('refuses a department from another organization', async () => {
    const owner = await createUser({ email: 'owner@yllka.test' })
    const yllka = await createOrganization({ name: 'Yllka Kindergarten', ownerId: owner.id })
    const languages = await prisma.department.create({ data: { organization_id: yllka.id, name: 'Languages' } })

    const response = await addCourse(course({ department_id: languages.id }))

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.department_id).toEqual(['Choose one of your organization’s departments.'])
    expect((await listCourses()).body.data.courses).toEqual([])
  })
})

describe('course access', () => {
  it('lets a school admin with MANAGE_COURSES add and list courses', async () => {
    const auth = await loginAs('manager@oxford.test')

    expect((await addCourse(course(), auth)).status).toBe(201)
    expect((await listCourses({}, auth)).status).toBe(200)
  })

  it.each(['admin@oxford.test', 'lecturer@oxford.test'])('refuses %s, who lacks MANAGE_COURSES', async (email) => {
    const auth = await loginAs(email)

    expect((await addCourse(course(), auth)).status).toBe(403)
    expect((await listCourses({}, auth)).status).toBe(403)
  })
})

const updateCourse = async (id: string, body: CourseBody, auth = ownerAuth) => request(app).put(`${coursesPath}/${id}`).set('Authorization', auth).send(body)

const setStatus = async (id: string, verb: 'archive' | 'restore', auth = ownerAuth) => request(app).post(`${coursesPath}/${id}/${verb}`).set('Authorization', auth)

const namesIn = async (query: Record<string, string> = {}) => (await listCourses(query)).body.data.courses.map((item: { name: string }) => item.name)

const logged = () => prisma.activityLog.findMany({ where: { organization_id: organizationId }, orderBy: { created_at: 'asc' }, select: { action: true, subject_name: true } })

describe('editing courses', () => {
  it('saves every field', async () => {
    const added = await addCourse(course({ code: 'MATH-1' }))

    const response = await updateCourse(added.body.data.id, course({ name: 'Algebra', code: '', description: 'Numbers', level: 'C1', department_id: sciencesId }))

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ name: 'Algebra', code: null, description: 'Numbers', level: 'C1', department: { id: sciencesId } })
    expect(await namesIn()).toEqual(['Algebra'])
  })

  it('lets a course keep its own name and code', async () => {
    const added = await addCourse(course({ code: 'MATH-1' }))

    const response = await updateCourse(added.body.data.id, course({ code: 'MATH-1', level: 'B2' }))

    expect(response.status).toBe(200)
  })

  it('answers field errors for another course’s name and code', async () => {
    await addCourse(course({ name: 'Mathematics', code: 'MATH-1' }))
    const added = await addCourse(course({ name: 'Physics', code: 'PHY-1' }))

    const sameName = await updateCourse(added.body.data.id, course({ name: 'mathematics' }))
    const sameCode = await updateCourse(added.body.data.id, course({ name: 'Physics', code: 'MATH-1' }))

    expect(sameName.status).toBe(409)
    expect(sameName.body.details.fieldErrors.name).toEqual(['There is already a course with this name.'])
    expect(sameCode.status).toBe(409)
    expect(sameCode.body.details.fieldErrors.code).toEqual(['There is already a course with this code.'])
  })

  it('keeps an archived course’s name and code taken', async () => {
    const added = await addCourse(course({ name: 'Mathematics', code: 'MATH-1' }))
    await setStatus(added.body.data.id, 'archive')

    const response = await addCourse(course({ name: 'Mathematics' }))

    expect(response.status).toBe(409)
  })

  it('answers 404 for a course that doesn’t exist', async () => {
    const response = await updateCourse('00000000-0000-4000-8000-000000000000', course())

    expect(response.status).toBe(404)
  })
})

describe('searching courses', () => {
  beforeEach(async () => {
    await addCourse(course({ name: 'Mathematics', code: 'MATH-1', level: 'Advanced' }))
    const archived = await addCourse(course({ name: 'Applied mathematics', code: 'MATH-2' }))
    await setStatus(archived.body.data.id, 'archive')
    await addCourse(course({ name: 'English', code: 'ENG-1', level: 'Beginner' }))
  })

  it('finds courses by name, code or level, in any case', async () => {
    expect(await namesIn({ search: 'MATH' })).toEqual(['Mathematics'])
    expect(await namesIn({ search: 'eng-1' })).toEqual(['English'])
    expect(await namesIn({ search: 'beginner' })).toEqual(['English'])
  })

  it('needs every word to match', async () => {
    expect(await namesIn({ search: 'mathematics advanced' })).toEqual(['Mathematics'])
    expect(await namesIn({ search: 'mathematics beginner' })).toEqual([])
  })

  it('takes % and _ in the search literally', async () => {
    await addCourse(course({ name: 'MAT_101' }))
    await addCourse(course({ name: 'MATX101' }))
    await addCourse(course({ name: '100% maths' }))

    expect(await namesIn({ search: 'MAT_' })).toEqual(['MAT_101'])
    expect(await namesIn({ search: '100%' })).toEqual(['100% maths'])
    expect(await namesIn({ search: '%' })).toEqual(['100% maths'])
    expect(await namesIn({ search: '\\' })).toEqual([])
  })

  it('counts each status with the search applied', async () => {
    expect((await listCourses()).body.data.counts).toEqual({ ACTIVE: 2, ARCHIVED: 1 })
    expect((await listCourses({ search: 'math' })).body.data.counts).toEqual({ ACTIVE: 1, ARCHIVED: 1 })
    expect((await listCourses({ search: 'english' })).body.data.counts).toEqual({ ACTIVE: 1, ARCHIVED: 0 })
  })

  it('lists one status at a time', async () => {
    expect(await namesIn({ status: 'ARCHIVED' })).toEqual(['Applied mathematics'])
  })

  it('pages through the list', async () => {
    const first = await listCourses({ page_size: '1' })
    const second = await listCourses({ page_size: '1', page: '2' })

    expect(first.body.data.courses.map((item: { name: string }) => item.name)).toEqual(['English'])
    expect(second.body.data.courses.map((item: { name: string }) => item.name)).toEqual(['Mathematics'])
    expect(first.body.data.total).toBe(2)
  })
})

describe('archiving and restoring courses', () => {
  it('moves a course between the tabs', async () => {
    const added = await addCourse(course())

    const archived = await setStatus(added.body.data.id, 'archive')

    expect(archived.status).toBe(200)
    expect(archived.body.data.status).toBe('ARCHIVED')
    expect(await namesIn()).toEqual([])
    expect(await namesIn({ status: 'ARCHIVED' })).toEqual(['Mathematics'])

    const restored = await setStatus(added.body.data.id, 'restore')

    expect(restored.status).toBe(200)
    expect(restored.body.data.status).toBe('ACTIVE')
    expect(await namesIn()).toEqual(['Mathematics'])
  })

  it('answers 409 when already in that status', async () => {
    const added = await addCourse(course())

    const restored = await setStatus(added.body.data.id, 'restore')
    await setStatus(added.body.data.id, 'archive')
    const archived = await setStatus(added.body.data.id, 'archive')

    expect(restored.status).toBe(409)
    expect(restored.body.error).toBe('This course is already active.')
    expect(archived.status).toBe(409)
    expect(archived.body.error).toBe('This course is already archived.')
  })

  it('lets a school admin with MANAGE_COURSES edit, archive and restore, and refuses one without it', async () => {
    const added = await addCourse(course())
    const auth = await loginAs('manager@oxford.test')
    const refused = await loginAs('admin@oxford.test')
    const id = added.body.data.id

    expect((await updateCourse(id, course({ level: 'B2' }), auth)).status).toBe(200)
    expect((await setStatus(id, 'archive', auth)).status).toBe(200)
    expect((await setStatus(id, 'restore', auth)).status).toBe(200)
    expect((await updateCourse(id, course(), refused)).status).toBe(403)
    expect((await setStatus(id, 'archive', refused)).status).toBe(403)
    expect((await setStatus(id, 'restore', refused)).status).toBe(403)
  })
})

describe('course activity', () => {
  it('logs each change with the course’s name', async () => {
    const added = await addCourse(course())
    await updateCourse(added.body.data.id, course({ name: 'Algebra' }))
    await setStatus(added.body.data.id, 'archive')
    await setStatus(added.body.data.id, 'restore')

    expect(await logged()).toEqual([
      { action: 'COURSE_ADDED', subject_name: 'Mathematics' },
      { action: 'COURSE_UPDATED', subject_name: 'Algebra' },
      { action: 'COURSE_ARCHIVED', subject_name: 'Algebra' },
      { action: 'COURSE_RESTORED', subject_name: 'Algebra' },
    ])
  })

  it('logs nothing when a change is refused', async () => {
    const added = await addCourse(course())
    await setStatus(added.body.data.id, 'restore')

    expect(await logged()).toEqual([{ action: 'COURSE_ADDED', subject_name: 'Mathematics' }])
  })
})

describe('course options', () => {
  const options = async (auth = ownerAuth) => request(app).get(`${coursesPath}/options`).set('Authorization', auth)

  it('lists every course by name, archived ones included, with no paging', async () => {
    await addCourse(course({ name: 'Physics', code: 'PHY-1' }))
    const archived = await addCourse(course({ name: 'English' }))
    await setStatus(archived.body.data.id, 'archive')

    const response = await options()

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      { id: archived.body.data.id, name: 'English', status: 'ARCHIVED' },
      { id: expect.any(String), name: 'Physics', status: 'ACTIVE' },
    ])
  })

  it('refuses a school admin without MANAGE_COURSES', async () => {
    expect((await options(await loginAs('admin@oxford.test'))).status).toBe(403)
  })
})
