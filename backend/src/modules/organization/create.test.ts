import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

const YLLKA = { name: 'Yllka Kindergarten', type: 'Kindergarten', country: 'XK', currency: 'EUR' } as const

let oxfordId: string
let ownerAuth: string

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  oxfordId = (await createOrganization({ name: 'Oxford Academy', ownerId: owner.id, members: [{ userId: admin.id, role: 'ADMIN' }] })).id
  ownerAuth = await loginAs('owner@oxford.test')
})

describe('POST /api/organizations', () => {
  it('lets someone who already owns an organization create another one, which they own too', async () => {
    const response = await request(app).post('/api/organizations').set('Authorization', ownerAuth).send(YLLKA)

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ id: expect.any(String), name: 'Yllka Kindergarten' })
    const me = await request(app).get('/api/auth/me').set('Authorization', ownerAuth)
    const owned = me.body.data.memberships.filter((membership: { role: string }) => membership.role === 'OWNER')
    expect(owned.map((membership: { organization: { name: string } }) => membership.organization.name).sort()).toEqual(['Oxford Academy', 'Yllka Kindergarten'])
  })

  it('keeps the two organizations’ members, locations and activity apart', async () => {
    const yllkaId = (await request(app).post('/api/organizations').set('Authorization', ownerAuth).send(YLLKA)).body.data.id
    await request(app).post(`/api/organizations/${yllkaId}/locations`).set('Authorization', ownerAuth).send({ name: 'Arbëria building', address: '', city: '', phone: '', is_main: true })

    const members = async (organizationId: string) =>
      (await request(app).get(`/api/organizations/${organizationId}/members`).set('Authorization', ownerAuth)).body.data.map((member: { email: string }) => member.email)
    expect(await members(oxfordId)).toEqual(expect.arrayContaining(['owner@oxford.test', 'admin@oxford.test']))
    expect(await members(yllkaId)).toEqual(['owner@oxford.test'])

    const locations = async (organizationId: string) =>
      (await request(app).get(`/api/organizations/${organizationId}/locations`).set('Authorization', ownerAuth)).body.data.map((location: { name: string }) => location.name)
    expect(await locations(yllkaId)).toEqual(['Arbëria building'])
    expect(await locations(oxfordId)).toEqual([])

    const activity = async (organizationId: string) =>
      (await request(app).get(`/api/organizations/${organizationId}/overview`).set('Authorization', ownerAuth)).body.data.activity.map((entry: { action: string }) => entry.action)
    expect(await activity(yllkaId)).toEqual(['LOCATION_CREATED'])
    expect(await activity(oxfordId)).toEqual([])
  })
})
