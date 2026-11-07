import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { lockOrganization } from '@lib/organization-lock.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let organizationId: string
let departmentsPath: string
let ownerAuth: string

const department = (name: string, locationId: string | null = null) => ({ name, description: '', location_id: locationId })

const addLocation = async (name: string) => {
  const response = await request(app)
    .post(`/api/organizations/${organizationId}/locations`)
    .set('Authorization', ownerAuth)
    .send({ name, address: '', city: '', phone: '', is_main: false })
  return response.body.data
}

const DEPARTMENT_IN_USE = 'This department can’t be removed while courses use it, archived ones included. Move them to another department first.'

// Long enough for the request to reach the organization lock
const LOCK_WAIT_MS = 200

const addDepartment = (body: ReturnType<typeof department>) => request(app).post(departmentsPath).set('Authorization', ownerAuth).send(body)

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  organizationId = (await createOrganization({ name: 'Oxford Academy', ownerId: owner.id, members: [{ userId: admin.id, role: 'ADMIN' }] })).id
  departmentsPath = `/api/organizations/${organizationId}/departments`
  ownerAuth = await loginAs('owner@oxford.test')
})

describe('departments', () => {
  it('adds a department at a location and lists it', async () => {
    const campus = await addLocation('Main campus')

    const created = await addDepartment({ name: 'Languages', description: 'English and German', location_id: campus.id })

    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({ name: 'Languages', description: 'English and German', location_id: campus.id })
    const list = await request(app).get(departmentsPath).set('Authorization', ownerAuth)
    expect(list.body.data).toEqual([expect.objectContaining({ name: 'Languages' })])
  })

  it('refuses a name already used in the organization, whatever its case', async () => {
    await addDepartment(department('Languages'))

    const response = await addDepartment(department('languages'))

    expect(response.status).toBe(409)
  })

  it('refuses renaming to a name already used, but keeps its own name', async () => {
    await addDepartment(department('Languages'))
    const sciences = (await addDepartment(department('Sciences'))).body.data

    expect((await request(app).put(`${departmentsPath}/${sciences.id}`).set('Authorization', ownerAuth).send(department('LANGUAGES'))).status).toBe(409)
    expect((await request(app).put(`${departmentsPath}/${sciences.id}`).set('Authorization', ownerAuth).send(department('Sciences'))).status).toBe(200)
  })

  it('allows the same name in another organization', async () => {
    await addDepartment(department('Languages'))
    const otherOwner = await createUser({ email: 'owner@yllka.test' })
    const other = await createOrganization({ name: 'Yllka Kindergarten', ownerId: otherOwner.id })

    const response = await request(app)
      .post(`/api/organizations/${other.id}/departments`)
      .set('Authorization', await loginAs('owner@yllka.test'))
      .send(department('Languages'))

    expect(response.status).toBe(201)
  })

  it('refuses a location from another organization', async () => {
    const otherOwner = await createUser({ email: 'owner@yllka.test' })
    const other = await createOrganization({ name: 'Yllka Kindergarten', ownerId: otherOwner.id })
    const otherLocation = await request(app)
      .post(`/api/organizations/${other.id}/locations`)
      .set('Authorization', await loginAs('owner@yllka.test'))
      .send({ name: 'Yllka campus', address: '', city: '', phone: '', is_main: false })

    const response = await addDepartment(department('Languages', otherLocation.body.data.id))

    expect(response.status).toBe(400)
  })

  it('keeps a department without a location when its location is removed', async () => {
    const campus = await addLocation('Main campus')
    await addDepartment(department('Languages', campus.id))

    await request(app).delete(`/api/organizations/${organizationId}/locations/${campus.id}`).set('Authorization', ownerAuth)

    const list = await request(app).get(departmentsPath).set('Authorization', ownerAuth)
    expect(list.body.data).toEqual([expect.objectContaining({ name: 'Languages', location_id: null })])
  })

  it('removes a department', async () => {
    const languages = (await addDepartment(department('Languages'))).body.data

    expect((await request(app).delete(`${departmentsPath}/${languages.id}`).set('Authorization', ownerAuth)).status).toBe(200)
    expect((await request(app).get(departmentsPath).set('Authorization', ownerAuth)).body.data).toEqual([])
  })

  it('refuses removing a department a course uses, and keeps it', async () => {
    const languages = (await addDepartment(department('Languages'))).body.data
    await createCourse({ organizationId, name: 'English', departmentId: languages.id })

    const response = await request(app).delete(`${departmentsPath}/${languages.id}`).set('Authorization', ownerAuth)

    expect(response.status).toBe(409)
    expect(response.body.error).toBe(DEPARTMENT_IN_USE)
    expect((await request(app).get(departmentsPath).set('Authorization', ownerAuth)).body.data).toEqual([expect.objectContaining({ name: 'Languages' })])
  })

  it('refuses removing a department only an archived course uses', async () => {
    const languages = (await addDepartment(department('Languages'))).body.data
    await createCourse({ organizationId, name: 'Old Latin', status: 'ARCHIVED', departmentId: languages.id })

    const response = await request(app).delete(`${departmentsPath}/${languages.id}`).set('Authorization', ownerAuth)

    expect(response.status).toBe(409)
    expect(response.body.error).toBe(DEPARTMENT_IN_USE)
  })

  it('removes a department once its courses have moved to another one', async () => {
    const languages = (await addDepartment(department('Languages'))).body.data
    const sciences = (await addDepartment(department('Sciences'))).body.data
    const english = await createCourse({ organizationId, name: 'English', departmentId: languages.id })
    await request(app)
      .put(`/api/organizations/${organizationId}/courses/${english.id}`)
      .set('Authorization', ownerAuth)
      .send({ name: 'English', code: '', description: '', level: 'B2', department_id: sciences.id })

    expect((await request(app).delete(`${departmentsPath}/${languages.id}`).set('Authorization', ownerAuth)).status).toBe(200)
  })

  it('waits for a course saved at the same moment, then refuses with the message', async () => {
    const languages = (await addDepartment(department('Languages'))).body.data

    const removal = await prisma.$transaction(async (tx) => {
      await lockOrganization({ tx, organizationId })
      await tx.course.create({ data: { organization_id: organizationId, name: 'English', level: 'B2', department_id: languages.id } })
      const pendingRemoval = request(app).delete(`${departmentsPath}/${languages.id}`).set('Authorization', ownerAuth).then((response) => response)
      await new Promise((resolve) => setTimeout(resolve, LOCK_WAIT_MS))
      return { pendingRemoval }
    })

    const response = await removal.pendingRemoval
    expect(response.status).toBe(409)
    expect(response.body.error).toBe(DEPARTMENT_IN_USE)
  })

  it('still deletes an organization with a department and courses, archived ones included', async () => {
    const languages = (await addDepartment(department('Languages'))).body.data
    await createCourse({ organizationId, name: 'English', departmentId: languages.id })
    await createCourse({ organizationId, name: 'Old Latin', status: 'ARCHIVED', departmentId: languages.id })

    await prisma.organization.delete({ where: { id: organizationId } })

    expect(await prisma.department.count({ where: { organization_id: organizationId } })).toBe(0)
    expect(await prisma.course.count({ where: { organization_id: organizationId } })).toBe(0)
  })

  it('lets a school admin read but not change departments, and refuses another organization’s owner', async () => {
    const languages = (await addDepartment(department('Languages'))).body.data
    const adminAuth = await loginAs('admin@oxford.test')
    const otherOwner = await createUser({ email: 'owner@yllka.test' })
    await createOrganization({ name: 'Yllka Kindergarten', ownerId: otherOwner.id })
    const otherAuth = await loginAs('owner@yllka.test')

    expect((await request(app).get(departmentsPath).set('Authorization', adminAuth)).status).toBe(200)
    expect((await request(app).post(departmentsPath).set('Authorization', adminAuth).send(department('Sciences'))).status).toBe(403)
    expect((await request(app).delete(`${departmentsPath}/${languages.id}`).set('Authorization', adminAuth)).status).toBe(403)
    expect((await request(app).get(departmentsPath).set('Authorization', otherAuth)).status).toBe(403)
    expect((await request(app).put(`${departmentsPath}/${languages.id}`).set('Authorization', otherAuth).send(department('Mine'))).status).toBe(403)
  })

  it('logs each change with the department’s name', async () => {
    const languages = (await addDepartment(department('Languages'))).body.data
    await request(app).put(`${departmentsPath}/${languages.id}`).set('Authorization', ownerAuth).send(department('Foreign languages'))
    await request(app).delete(`${departmentsPath}/${languages.id}`).set('Authorization', ownerAuth)

    const overview = await request(app).get(`/api/organizations/${organizationId}/overview`).set('Authorization', ownerAuth)

    expect(overview.body.data.activity.map(({ action, subject_name }: { action: string; subject_name: string }) => [action, subject_name])).toEqual([
      ['DEPARTMENT_REMOVED', 'Foreign languages'],
      ['DEPARTMENT_UPDATED', 'Foreign languages'],
      ['DEPARTMENT_CREATED', 'Languages'],
    ])
  })
})
