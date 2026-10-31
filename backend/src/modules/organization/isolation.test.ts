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
}

type ScopedEndpoint = {
  method: HttpMethod
  /** The route as registered on its router */
  route: string
  body?: object
}

const PROFILE = { name: 'Taken over', type: 'School', country: 'XK', currency: 'EUR' } as const
const LOCATION = { name: 'Taken over', address: '', city: '', phone: '', is_main: true } as const

// One line per organization-scoped endpoint; the coverage test below fails when a route is missing here
const SCOPED_ENDPOINTS: ScopedEndpoint[] = [
  { method: 'get', route: '/:organizationId' },
  { method: 'patch', route: '/:organizationId/status', body: { status: 'SUSPENDED' } },
  { method: 'get', route: '/:organizationId/members' },
  { method: 'patch', route: '/:organizationId/members/:membershipId', body: { permissions: ['MANAGE_STUDENTS'] } },
  { method: 'delete', route: '/:organizationId/members/:membershipId' },
  { method: 'get', route: '/:organizationId/invitations' },
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
    .replace(':departmentId', ids.departmentId)}`

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

/** An organization with an owner, a school admin, a location, a department and an open invitation */
const seedOrganization = async ({ name, slug }: SeedOrganizationParams) => {
  const owner = await createUser({ email: `owner@${slug}.test` })
  const admin = await createUser({ email: `admin@${slug}.test` })
  const organization = await createOrganization({ name, ownerId: owner.id, members: [{ userId: admin.id, role: 'ADMIN' }] })
  const adminMembership = await prisma.membership.findFirstOrThrow({ where: { organization_id: organization.id, user_id: admin.id } })
  const location = await prisma.location.create({ data: { organization_id: organization.id, name: `${name} campus`, is_main: true } })
  const department = await prisma.department.create({ data: { organization_id: organization.id, name: `${name} languages`, location_id: location.id } })
  await prisma.invitation.create({
    data: { organization_id: organization.id, email: `invited@${slug}.test`, role: 'ADMIN', token_hash: slug, invited_by_id: owner.id, expires_at: new Date(Date.now() + 86_400_000) },
  })
  return { organizationId: organization.id, membershipId: adminMembership.id, locationId: location.id, departmentId: department.id }
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
    // Oxford's own organization id with Yllka's member, location and department ids
    const mixed: TargetIds = { ...yllka, organizationId: oxford.organizationId }

    for (const endpoint of SCOPED_ENDPOINTS.filter((item) => /:(membership|location|department)Id/.test(item.route))) {
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

    expect(created.status).toBe(400)
    expect(updated.status).toBe(400)
    expect(removedMain.status).toBe(400)
    expect(await yllkaAsItsOwnerSeesIt()).toEqual(before)
  })
})
