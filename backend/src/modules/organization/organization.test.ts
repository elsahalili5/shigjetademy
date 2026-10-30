import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let adminAuth: string

beforeEach(async () => {
  await createUser({ email: 'admin@platform.test', isPlatformAdmin: true })
  adminAuth = await loginAs('admin@platform.test')
  const owner = await createUser({ email: 'owner@oxford.test' })
  const student = await createUser({ email: 'student@oxford.test' })
  await createOrganization({ name: 'Oxford Academy', type: 'ACADEMY', ownerId: owner.id, members: [{ userId: student.id, role: 'STUDENT' }] })
})

describe('platform admin endpoints', () => {
  it('refuses an organization owner', async () => {
    const ownerAuth = await loginAs('owner@oxford.test')

    expect((await request(app).get('/api/organizations').set('Authorization', ownerAuth)).status).toBe(403)
    expect((await request(app).get('/api/organizations/stats').set('Authorization', ownerAuth)).status).toBe(403)
  })

  it('lists clients with their owner and member counts', async () => {
    const response = await request(app).get('/api/organizations').set('Authorization', adminAuth)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      expect.objectContaining({
        name: 'Oxford Academy',
        owner: expect.objectContaining({ email: 'owner@oxford.test' }),
        member_counts: { OWNER: 1, ADMIN: 0, LECTURER: 0, STUDENT: 1, GUARDIAN: 0 },
      }),
    ])
  })

  it('counts organizations, users and members by role', async () => {
    const stats = (await request(app).get('/api/organizations/stats').set('Authorization', adminAuth)).body.data

    expect(stats.organizations).toEqual({ total: 1, active: 1, suspended: 0 })
    expect(stats.new_organizations_this_month).toBe(1)
    expect(stats.users_total).toBe(3)
    expect(stats.members_by_role).toMatchObject({ OWNER: 1, STUDENT: 1 })
    expect(stats.organizations_per_week).toHaveLength(12)
    expect(stats.organizations_per_week.at(-1).count).toBe(1)
    expect(stats.organizations_by_type).toEqual([{ type: 'ACADEMY', count: 1 }])
  })
})

describe('client detail and status', () => {
  const clientPath = async () => {
    const organization = await prisma.organization.findFirstOrThrow({ where: { name: 'Oxford Academy' } })
    return `/api/organizations/${organization.id}`
  }

  it('shows a client with its members and roles', async () => {
    const response = await request(app).get(await clientPath()).set('Authorization', adminAuth)

    expect(response.status).toBe(200)
    expect(response.body.data.members).toEqual([
      expect.objectContaining({ email: 'owner@oxford.test', role: 'OWNER' }),
      expect.objectContaining({ email: 'student@oxford.test', role: 'STUDENT' }),
    ])
  })

  it('refuses an owner and answers 404 for an unknown client', async () => {
    const ownerAuth = await loginAs('owner@oxford.test')

    expect((await request(app).get(await clientPath()).set('Authorization', ownerAuth)).status).toBe(403)
    expect((await request(app).get('/api/organizations/00000000-0000-4000-8000-000000000000').set('Authorization', adminAuth)).status).toBe(404)
  })

  it('suspends a client, which its owner sees, then reactivates it', async () => {
    const path = `${await clientPath()}/status`

    const suspended = await request(app).patch(path).set('Authorization', adminAuth).send({ status: 'SUSPENDED' })
    expect(suspended.body.data.status).toBe('SUSPENDED')

    const ownerAuth = await loginAs('owner@oxford.test')
    const me = await request(app).get('/api/auth/me').set('Authorization', ownerAuth)
    expect(me.body.data.memberships[0].organization.status).toBe('SUSPENDED')

    const restored = await request(app).patch(path).set('Authorization', adminAuth).send({ status: 'ACTIVE' })
    expect(restored.body.data.status).toBe('ACTIVE')
  })

  it('only accepts active or suspended', async () => {
    const response = await request(app).patch(`${await clientPath()}/status`).set('Authorization', adminAuth).send({ status: 'DEACTIVATED' })

    expect(response.status).toBe(400)
  })
})
