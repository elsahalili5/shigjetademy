import request from 'supertest'
import type { Router } from 'express'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete'

/** The ids of organization B's records, filled into each endpoint's path */
type TargetIds = {
  organizationId: string
  membershipId: string
  locationId: string
  departmentId: string
  yearId: string
  termId: string
  holidayId: string
  studentId: string
  invitationId: string
}

type ScopedEndpoint = {
  method: HttpMethod
  /** The route as registered on its router */
  route: string
  body?: object
}

const PROFILE = { name: 'Taken over', type: 'School', country: 'XK', currency: 'EUR' } as const
const LOCATION = { name: 'Taken over', address: '', city: '', phone: '', is_main: true } as const
const SETTINGS = { time_zone: 'America/New_York', week_start: 'SUNDAY', date_format: 'MONTH_DAY_YEAR' } as const
const YEAR = { name: 'Taken over', start_date: '2030-09-01', end_date: '2031-06-30', is_current: true } as const
const TERM = { name: 'Taken over', start_date: '2026-09-01', end_date: '2026-12-20' } as const
const HOLIDAY = { name: 'Taken over', start_date: '2026-12-24', end_date: '2026-12-24' } as const
const STUDENT = { first_name: 'Taken', last_name: 'Over', date_of_birth: '', enrolled_on: '2026-09-01', student_number: 'STU-0001', notes: '' } as const

// One line per organization-scoped endpoint; the coverage test below fails when a route is missing here
const SCOPED_ENDPOINTS: ScopedEndpoint[] = [
  { method: 'get', route: '/:organizationId' },
  { method: 'patch', route: '/:organizationId/status', body: { status: 'SUSPENDED' } },
  { method: 'get', route: '/:organizationId/members' },
  { method: 'patch', route: '/:organizationId/members/:membershipId', body: { permissions: ['MANAGE_STUDENTS'] } },
  { method: 'delete', route: '/:organizationId/members/:membershipId' },
  { method: 'get', route: '/:organizationId/invitations' },
  { method: 'post', route: '/:organizationId/invitations', body: { email: 'intruder@oxford.test', permissions: ['MANAGE_STUDENTS'] } },
  { method: 'post', route: '/:organizationId/invitations/:invitationId/resend' },
  { method: 'post', route: '/:organizationId/invitations/:invitationId/link' },
  { method: 'delete', route: '/:organizationId/invitations/:invitationId' },
  { method: 'get', route: '/:organizationId/overview' },
  { method: 'get', route: '/:organizationId/profile' },
  { method: 'put', route: '/:organizationId/profile', body: PROFILE },
  { method: 'get', route: '/:organizationId/locations' },
  { method: 'post', route: '/:organizationId/locations', body: LOCATION },
  { method: 'put', route: '/:organizationId/locations/:locationId', body: LOCATION },
  { method: 'delete', route: '/:organizationId/locations/:locationId' },
  { method: 'get', route: '/:organizationId/departments' },
  { method: 'post', route: '/:organizationId/departments', body: { name: 'Taken over', description: '', location_id: null } },
  { method: 'put', route: '/:organizationId/departments/:departmentId', body: { name: 'Taken over', description: '', location_id: null } },
  { method: 'delete', route: '/:organizationId/departments/:departmentId' },
  { method: 'get', route: '/:organizationId/academic-periods/years' },
  { method: 'post', route: '/:organizationId/academic-periods/years', body: YEAR },
  { method: 'put', route: '/:organizationId/academic-periods/years/:yearId', body: YEAR },
  { method: 'delete', route: '/:organizationId/academic-periods/years/:yearId' },
  { method: 'post', route: '/:organizationId/academic-periods/years/:yearId/terms', body: TERM },
  { method: 'put', route: '/:organizationId/academic-periods/years/:yearId/terms/:termId', body: TERM },
  { method: 'delete', route: '/:organizationId/academic-periods/years/:yearId/terms/:termId' },
  { method: 'post', route: '/:organizationId/academic-periods/years/:yearId/holidays', body: HOLIDAY },
  { method: 'put', route: '/:organizationId/academic-periods/years/:yearId/holidays/:holidayId', body: HOLIDAY },
  { method: 'delete', route: '/:organizationId/academic-periods/years/:yearId/holidays/:holidayId' },
  { method: 'get', route: '/:organizationId/settings' },
  { method: 'put', route: '/:organizationId/settings', body: SETTINGS },
  { method: 'post', route: '/:organizationId/settings/transfer-ownership', body: { membership_id: '00000000-0000-4000-8000-000000000000', password: 'password123' } },
  { method: 'post', route: '/:organizationId/settings/deactivate', body: { confirm_name: 'Yllka Kindergarten', password: 'password123' } },
  { method: 'post', route: '/:organizationId/settings/reactivate', body: { password: 'password123' } },
  { method: 'get', route: '/:organizationId/students' },
  { method: 'post', route: '/:organizationId/students', body: STUDENT },
  { method: 'get', route: '/:organizationId/students/:studentId' },
  { method: 'put', route: '/:organizationId/students/:studentId', body: STUDENT },
  { method: 'post', route: '/:organizationId/students/:studentId/archive' },
  { method: 'post', route: '/:organizationId/students/:studentId/restore' },
  { method: 'post', route: '/:organizationId/students/:studentId/invitation', body: { email: 'intruder@oxford.test' } },
  { method: 'post', route: '/:organizationId/students/:studentId/invitation/resend' },
  { method: 'delete', route: '/:organizationId/students/:studentId/invitation' },
  { method: 'get', route: '/:organizationId/me/student' },
]

type ToPathParams = {
  route: string
  ids: TargetIds
}

const toPath = ({ route, ids }: ToPathParams) =>
  `/api/organizations${route
    .replace(':organizationId', ids.organizationId)
    .replace(':membershipId', ids.membershipId)
    .replace(':locationId', ids.locationId)
    .replace(':departmentId', ids.departmentId)
    .replace(':yearId', ids.yearId)
    .replace(':termId', ids.termId)
    .replace(':holidayId', ids.holidayId)
    .replace(':studentId', ids.studentId)
    .replace(':invitationId', ids.invitationId)}`

type SendParams = ScopedEndpoint & {
  ids: TargetIds
  auth: string
}

const send = ({ method, route, body, ids, auth }: SendParams) => {
  const call = request(app)[method](toPath({ route, ids })).set('Authorization', auth)
  return body ? call.send(body) : call
}

const isRouter = (handle: unknown): handle is Router => typeof handle === 'function' && 'stack' in handle && Array.isArray(handle.stack)

/** Every route with an organization in its path, on every router mounted in the app, as "METHOD /path" */
const registeredScopedRoutes = () =>
  app.router.stack.flatMap((mounted) =>
    (isRouter(mounted.handle) ? mounted.handle.stack : []).flatMap((layer) => {
      const route = layer.route
      if (!route?.path.includes(':organizationId')) return []
      return [...new Set(route.stack.map((routeLayer) => routeLayer.method))].map((method) => `${method.toUpperCase()} ${route.path}`)
    }),
  )

type SeedOrganizationParams = {
  name: string
  slug: string
}

/** An organization with an owner, a school admin, a location, a department, a school year with a term and a holiday, a student with an open login invitation, and an open admin invitation */
const seedOrganization = async ({ name, slug }: SeedOrganizationParams) => {
  const owner = await createUser({ email: `owner@${slug}.test` })
  const admin = await createUser({ email: `admin@${slug}.test` })
  const organization = await createOrganization({ name, ownerId: owner.id, members: [{ userId: admin.id, role: 'ADMIN' }] })
  const adminMembership = await prisma.membership.findFirstOrThrow({ where: { organization_id: organization.id, user_id: admin.id } })
  const location = await prisma.location.create({ data: { organization_id: organization.id, name: `${name} campus`, is_main: true } })
  const department = await prisma.department.create({ data: { organization_id: organization.id, name: `${name} languages`, location_id: location.id } })
  const year = await prisma.academicYear.create({
    data: { organization_id: organization.id, name: `${name} 2026–27`, start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true },
  })
  const term = await prisma.academicTerm.create({ data: { academic_year_id: year.id, name: `${name} autumn term`, start_date: new Date('2026-09-01'), end_date: new Date('2027-01-31') } })
  const holiday = await prisma.academicHoliday.create({ data: { academic_year_id: year.id, name: `${name} winter break`, start_date: new Date('2026-12-24'), end_date: new Date('2027-01-06') } })
  const student = await prisma.student.create({ data: { organization_id: organization.id, first_name: name, last_name: 'Student', student_number: 'STU-0001' } })
  const invitation = await prisma.invitation.create({
    data: { organization_id: organization.id, email: `invited@${slug}.test`, role: 'ADMIN', token_hash: slug, invited_by_id: owner.id, expires_at: new Date(Date.now() + 86_400_000) },
  })
  await prisma.invitation.create({
    data: {
      organization_id: organization.id,
      email: `student@${slug}.test`,
      role: 'STUDENT',
      student_id: student.id,
      token_hash: `${slug}-student`,
      invited_by_id: owner.id,
      expires_at: new Date(Date.now() + 86_400_000),
    },
  })
  return { organizationId: organization.id, membershipId: adminMembership.id, locationId: location.id, departmentId: department.id, yearId: year.id, termId: term.id, holidayId: holiday.id, studentId: student.id, invitationId: invitation.id }
}

let oxford: TargetIds
let yllka: TargetIds
let oxfordOwnerAuth: string

/** What Yllka's owner sees of their organization, to prove nothing changed */
const yllkaAsItsOwnerSeesIt = async () => {
  const auth = await loginAs('owner@yllka.test')
  const read = async (route: string) => (await send({ method: 'get', route, ids: yllka, auth })).body.data
  return {
    profile: await read('/:organizationId/profile'),
    members: await read('/:organizationId/members'),
    invitations: await read('/:organizationId/invitations'),
    overview: await read('/:organizationId/overview'),
    locations: await read('/:organizationId/locations'),
    departments: await read('/:organizationId/departments'),
    academicYears: await read('/:organizationId/academic-periods/years'),
    settings: await read('/:organizationId/settings'),
    students: await read('/:organizationId/students'),
    archivedStudents: (await send({ method: 'get', route: '/:organizationId/students?status=ARCHIVED', ids: yllka, auth })).body.data,
  }
}

beforeEach(async () => {
  oxford = await seedOrganization({ name: 'Oxford Academy', slug: 'oxford' })
  yllka = await seedOrganization({ name: 'Yllka Kindergarten', slug: 'yllka' })
  oxfordOwnerAuth = await loginAs('owner@oxford.test')
})

describe('organization isolation', () => {
  it('sweeps every organization-scoped route', () => {
    const swept = SCOPED_ENDPOINTS.map((endpoint) => `${endpoint.method.toUpperCase()} ${endpoint.route}`)

    expect([...swept].sort()).toEqual(registeredScopedRoutes().sort())
  })

  it('refuses a member of another organization on every endpoint and leaves the data unchanged', async () => {
    const before = await yllkaAsItsOwnerSeesIt()

    for (const endpoint of SCOPED_ENDPOINTS) {
      const response = await send({ ...endpoint, ids: yllka, auth: oxfordOwnerAuth })
      expect([403, 404], `${endpoint.method.toUpperCase()} ${endpoint.route} answered ${response.status}`).toContain(response.status)
    }

    expect(await yllkaAsItsOwnerSeesIt()).toEqual(before)
  })

  it('does not reach another organization’s records through ids in its own paths', async () => {
    const before = await yllkaAsItsOwnerSeesIt()
    // Oxford's own organization id with Yllka's member, location, department, academic period, student and invitation ids
    const mixed: TargetIds = { ...yllka, organizationId: oxford.organizationId }

    for (const endpoint of SCOPED_ENDPOINTS.filter((item) => /:(membership|location|department|year|term|holiday|student|invitation)Id/.test(item.route))) {
      const response = await send({ ...endpoint, ids: mixed, auth: oxfordOwnerAuth })
      expect(response.status, `${endpoint.method.toUpperCase()} ${endpoint.route} answered ${response.status}`).toBe(404)
    }

    expect(await yllkaAsItsOwnerSeesIt()).toEqual(before)
  })

  it('does not link records to another organization through ids in the request body', async () => {
    const before = await yllkaAsItsOwnerSeesIt()
    const department = { name: 'Sciences', description: '', location_id: yllka.locationId }

    const created = await send({ method: 'post', route: '/:organizationId/departments', body: department, ids: oxford, auth: oxfordOwnerAuth })
    const updated = await send({ method: 'put', route: '/:organizationId/departments/:departmentId', body: department, ids: oxford, auth: oxfordOwnerAuth })
    await send({ method: 'post', route: '/:organizationId/locations', body: { ...LOCATION, name: 'Second campus', is_main: false }, ids: oxford, auth: oxfordOwnerAuth })
    const removedMain = await request(app)
      .delete(toPath({ route: '/:organizationId/locations/:locationId', ids: oxford }))
      .query({ newMainId: yllka.locationId })
      .set('Authorization', oxfordOwnerAuth)
    await send({ method: 'post', route: '/:organizationId/academic-periods/years', body: { ...YEAR, is_current: false }, ids: oxford, auth: oxfordOwnerAuth })
    const removedCurrentYear = await request(app)
      .delete(toPath({ route: '/:organizationId/academic-periods/years/:yearId', ids: oxford }))
      .query({ newCurrentId: yllka.yearId })
      .set('Authorization', oxfordOwnerAuth)
    const transferred = await send({
      method: 'post',
      route: '/:organizationId/settings/transfer-ownership',
      body: { membership_id: yllka.membershipId, password: 'password123' },
      ids: oxford,
      auth: oxfordOwnerAuth,
    })

    expect(created.status).toBe(400)
    expect(updated.status).toBe(400)
    expect(removedMain.status).toBe(400)
    expect(removedCurrentYear.status).toBe(400)
    expect(transferred.status).toBe(404)
    expect(await prisma.membership.findUniqueOrThrow({ where: { id: yllka.membershipId }, select: { role: true } })).toEqual({ role: 'ADMIN' })
    expect((await request(app).get(toPath({ route: '/:organizationId/settings', ids: oxford })).set('Authorization', oxfordOwnerAuth)).status).toBe(200)
    expect(await yllkaAsItsOwnerSeesIt()).toEqual(before)
  })
})
