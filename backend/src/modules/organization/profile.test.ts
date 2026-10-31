import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let organizationId: string
let profilePath: string

const PROFILE_UPDATE = {
  name: 'Oxford Academy Prishtina',
  type: 'Academy',
  country: 'AL',
  currency: 'ALL',
  size: '50–250 students',
  email: 'hello@oxford.test',
  phone: '+383 44 123 456',
  website: 'https://oxford.test',
} as const

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  organizationId = (await createOrganization({ name: 'Oxford Academy', ownerId: owner.id, members: [{ userId: admin.id, role: 'ADMIN' }] })).id
  profilePath = `/api/organizations/${organizationId}/profile`
})

describe('GET /api/organizations/:organizationId/profile', () => {
  it('shows the profile to the owner and a school admin', async () => {
    for (const email of ['owner@oxford.test', 'admin@oxford.test']) {
      const response = await request(app).get(profilePath).set('Authorization', await loginAs(email))

      expect(response.status).toBe(200)
      expect(response.body.data).toMatchObject({ id: organizationId, name: 'Oxford Academy', type: 'SCHOOL', status: 'ACTIVE', email: null, website: null })
      expect(response.body.data).not.toHaveProperty('address')
      expect(response.body.data).not.toHaveProperty('city')
      expect(response.body.data.created_at).toEqual(expect.any(String))
    }
  })

  it('refuses the owner of another organization', async () => {
    const otherOwner = await createUser({ email: 'owner@yllka.test' })
    await createOrganization({ name: 'Yllka Kindergarten', ownerId: otherOwner.id })

    const response = await request(app).get(profilePath).set('Authorization', await loginAs('owner@yllka.test'))

    expect(response.status).toBe(403)
  })
})

describe('PUT /api/organizations/:organizationId/profile', () => {
  it('lets the owner change the profile, and logs it', async () => {
    const ownerAuth = await loginAs('owner@oxford.test')

    const response = await request(app).put(profilePath).set('Authorization', ownerAuth).send(PROFILE_UPDATE)

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ ...PROFILE_UPDATE, type: 'ACADEMY', status: 'ACTIVE' })

    const overview = await request(app).get(`/api/organizations/${organizationId}/overview`).set('Authorization', ownerAuth)
    expect(overview.body.data.activity).toEqual([expect.objectContaining({ action: 'ORGANIZATION_PROFILE_UPDATED' })])
  })

  it('clears optional fields sent empty', async () => {
    const ownerAuth = await loginAs('owner@oxford.test')
    await request(app).put(profilePath).set('Authorization', ownerAuth).send(PROFILE_UPDATE)

    const response = await request(app)
      .put(profilePath)
      .set('Authorization', ownerAuth)
      .send({ ...PROFILE_UPDATE, size: undefined, email: '', phone: '', website: '' })

    expect(response.body.data).toMatchObject({ size: null, email: null, phone: null, website: null })
  })

  it('refuses an invalid email', async () => {
    const response = await request(app)
      .put(profilePath)
      .set('Authorization', await loginAs('owner@oxford.test'))
      .send({ ...PROFILE_UPDATE, email: 'not-an-email' })

    expect(response.status).toBe(400)
  })

  it('refuses a school admin and the owner of another organization', async () => {
    const otherOwner = await createUser({ email: 'owner@yllka.test' })
    await createOrganization({ name: 'Yllka Kindergarten', ownerId: otherOwner.id })

    for (const email of ['admin@oxford.test', 'owner@yllka.test']) {
      const response = await request(app).put(profilePath).set('Authorization', await loginAs(email)).send(PROFILE_UPDATE)
      expect(response.status).toBe(403)
    }
  })
})
