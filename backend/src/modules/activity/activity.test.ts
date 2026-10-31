import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createOrganization, createUser, loginAs, TEST_PASSWORD } from '../../../test/factories.ts'

const MAX_FAILED_ATTEMPTS = 5

let adminId: string
let ownerId: string
let organizationId: string

beforeEach(async () => {
  adminId = (await createUser({ email: 'admin@platform.test', isPlatformAdmin: true })).id
  ownerId = (await createUser({ email: 'owner@oxford.test' })).id
  organizationId = (await createOrganization({ name: 'Oxford Academy', ownerId })).id
})

const readLog = () =>
  prisma.activityLog.findMany({
    orderBy: { created_at: 'asc' },
    select: { actor_id: true, action: true, organization_id: true, target_user_id: true, created_at: true },
  })

describe('recording activity', () => {
  it('records the admin suspending and reactivating a client', async () => {
    const adminAuth = await loginAs('admin@platform.test')
    const path = `/api/organizations/${organizationId}/status`

    await request(app).patch(path).set('Authorization', adminAuth).send({ status: 'SUSPENDED' })
    await request(app).patch(path).set('Authorization', adminAuth).send({ status: 'ACTIVE' })

    expect(await readLog()).toEqual([
      { actor_id: adminId, action: 'ORGANIZATION_SUSPENDED', organization_id: organizationId, target_user_id: null, created_at: expect.any(Date) },
      { actor_id: adminId, action: 'ORGANIZATION_REACTIVATED', organization_id: organizationId, target_user_id: null, created_at: expect.any(Date) },
    ])
  })

  it('records a suspension once when the client is suspended twice', async () => {
    const adminAuth = await loginAs('admin@platform.test')
    const path = `/api/organizations/${organizationId}/status`

    await request(app).patch(path).set('Authorization', adminAuth).send({ status: 'SUSPENDED' })
    const again = await request(app).patch(path).set('Authorization', adminAuth).send({ status: 'SUSPENDED' })

    expect(again.body.data.status).toBe('SUSPENDED')
    expect((await readLog()).map((entry) => entry.action)).toEqual(['ORGANIZATION_SUSPENDED'])
  })

  it('records nothing when the status update fails', async () => {
    const adminAuth = await loginAs('admin@platform.test')
    await prisma.organization.update({ where: { id: organizationId }, data: { status: 'DEACTIVATED' } })

    const response = await request(app).patch(`/api/organizations/${organizationId}/status`).set('Authorization', adminAuth).send({ status: 'SUSPENDED' })

    expect(response.status).toBe(409)
    expect(await readLog()).toEqual([])
  })

  it('records a user changing their password', async () => {
    const ownerAuth = await loginAs('owner@oxford.test')

    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', ownerAuth)
      .send({ current_password: TEST_PASSWORD, new_password: 'new-password-1' })

    expect(await readLog()).toEqual([
      { actor_id: ownerId, action: 'PASSWORD_CHANGED', organization_id: null, target_user_id: ownerId, created_at: expect.any(Date) },
    ])
  })

  it('records the owner editing and then removing a school admin', async () => {
    const adminUserId = (await createUser({ email: 'admin1@oxford.test' })).id
    const { id: membershipId } = await prisma.membership.create({ data: { user_id: adminUserId, organization_id: organizationId, role: 'ADMIN' } })
    const ownerAuth = await loginAs('owner@oxford.test')
    const memberPath = `/api/organizations/${organizationId}/members/${membershipId}`

    await request(app).patch(memberPath).set('Authorization', ownerAuth).send({ first_name: 'Drita', last_name: 'Berisha', permissions: ['MANAGE_STUDENTS'] })
    await request(app).delete(memberPath).set('Authorization', ownerAuth)

    expect(await readLog()).toEqual([
      { actor_id: ownerId, action: 'MEMBER_UPDATED', organization_id: organizationId, target_user_id: adminUserId, created_at: expect.any(Date) },
      { actor_id: ownerId, action: 'MEMBER_REMOVED', organization_id: organizationId, target_user_id: adminUserId, created_at: expect.any(Date) },
    ])
  })

  it('records one removal when a school admin is removed twice, and refuses editing them afterwards', async () => {
    const adminUserId = (await createUser({ email: 'admin1@oxford.test' })).id
    const { id: membershipId } = await prisma.membership.create({ data: { user_id: adminUserId, organization_id: organizationId, role: 'ADMIN' } })
    const ownerAuth = await loginAs('owner@oxford.test')
    const memberPath = `/api/organizations/${organizationId}/members/${membershipId}`

    const removals = await Promise.all([request(app).delete(memberPath).set('Authorization', ownerAuth), request(app).delete(memberPath).set('Authorization', ownerAuth)])
    const edit = await request(app).patch(memberPath).set('Authorization', ownerAuth).send({ first_name: 'Drita', last_name: 'Berisha', permissions: ['MANAGE_STUDENTS'] })

    expect(removals.map((removal) => removal.status).sort()).toEqual([200, 404])
    expect(edit.status).toBe(404)
    expect((await readLog()).map((entry) => entry.action)).toEqual(['MEMBER_REMOVED'])
    expect((await prisma.user.findUniqueOrThrow({ where: { id: adminUserId } })).first_name).toBe('Test')
  })

  it('records nothing when the owner tries to remove themselves', async () => {
    const ownerMembership = await prisma.membership.findFirstOrThrow({ where: { organization_id: organizationId, role: 'OWNER' } })

    await request(app).delete(`/api/organizations/${organizationId}/members/${ownerMembership.id}`).set('Authorization', await loginAs('owner@oxford.test'))

    expect(await readLog()).toEqual([])
  })

  it('records a lockout after too many failed logins, with no actor', async () => {
    for (let count = 0; count < MAX_FAILED_ATTEMPTS; count += 1) {
      await request(app).post('/api/auth/login').send({ email: 'owner@oxford.test', password: 'wrong-password' })
    }

    expect(await readLog()).toEqual([
      { actor_id: null, action: 'ACCOUNT_LOCKED', organization_id: null, target_user_id: ownerId, created_at: expect.any(Date) },
    ])
  })
})

describe('GET /api/activity', () => {
  let otherOrganizationId: string

  // Three entries a minute apart: a suspension, a password change by another client's owner, then a lockout
  beforeEach(async () => {
    const otherOwner = await prisma.user.create({
      data: { first_name: 'Arta', last_name: 'Gashi', email: 'owner@yllka.test', password_hash: 'unused', status: 'ACTIVE' },
    })
    otherOrganizationId = (await createOrganization({ name: 'Yllka Kindergarten', ownerId: otherOwner.id })).id
    await prisma.activityLog.createMany({
      data: [
        { actor_id: adminId, action: 'ORGANIZATION_SUSPENDED', organization_id: organizationId, created_at: new Date('2026-10-01T09:00:00.000Z') },
        { actor_id: otherOwner.id, action: 'PASSWORD_CHANGED', target_user_id: otherOwner.id, created_at: new Date('2026-10-01T09:01:00.000Z') },
        { action: 'ACCOUNT_LOCKED', target_user_id: ownerId, created_at: new Date('2026-10-01T09:02:00.000Z') },
      ],
    })
  })

  const listActivity = async (query: Record<string, string> = {}) =>
    request(app)
      .get('/api/activity')
      .query(query)
      .set('Authorization', await loginAs('admin@platform.test'))

  it('refuses an organization owner', async () => {
    const response = await request(app).get('/api/activity').set('Authorization', await loginAs('owner@oxford.test'))

    expect(response.status).toBe(403)
  })

  it('lists entries newest first with who, what and which client', async () => {
    const response = await listActivity()

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      {
        id: expect.any(String),
        action: 'ACCOUNT_LOCKED',
        created_at: '2026-10-01T09:02:00.000Z',
        actor: null,
        organization: null,
        target_user: { id: ownerId, first_name: 'Test', last_name: 'User', email: 'owner@oxford.test' },
        subject_name: null,
      },
      expect.objectContaining({ action: 'PASSWORD_CHANGED', actor: expect.objectContaining({ first_name: 'Arta', last_name: 'Gashi' }) }),
      expect.objectContaining({
        action: 'ORGANIZATION_SUSPENDED',
        actor: expect.objectContaining({ id: adminId }),
        organization: { id: organizationId, name: 'Oxford Academy' },
        target_user: null,
      }),
    ])
  })

  it('filters by client and by action', async () => {
    const byClient = await listActivity({ organizationId: otherOrganizationId })
    const byAction = await listActivity({ action: 'ORGANIZATION_SUSPENDED' })

    expect(byClient.body.data.map((entry: { action: string }) => entry.action)).toEqual(['PASSWORD_CHANGED'])
    expect(byAction.body.data.map((entry: { action: string }) => entry.action)).toEqual(['ORGANIZATION_SUSPENDED'])
  })

  it('includes the password changes and lockouts of a client\'s members when filtering by that client', async () => {
    await prisma.activityLog.create({
      data: { actor_id: ownerId, action: 'PASSWORD_CHANGED', target_user_id: ownerId, created_at: new Date('2026-10-01T09:03:00.000Z') },
    })

    const response = await listActivity({ organizationId })

    expect(response.body.data.map((entry: { action: string }) => entry.action)).toEqual(['PASSWORD_CHANGED', 'ACCOUNT_LOCKED', 'ORGANIZATION_SUSPENDED'])
    expect(response.body.data[0].actor.id).toBe(ownerId)
  })

  it('pages with a limit and a before cursor', async () => {
    const firstPage = await listActivity({ limit: '2' })
    const last = firstPage.body.data[1]
    const nextPage = await listActivity({ limit: '2', before: last.created_at, beforeId: last.id })

    expect(firstPage.body.data.map((entry: { action: string }) => entry.action)).toEqual(['ACCOUNT_LOCKED', 'PASSWORD_CHANGED'])
    expect(nextPage.body.data.map((entry: { action: string }) => entry.action)).toEqual(['ORGANIZATION_SUSPENDED'])
  })

  it('skips no entry when a page ends inside one millisecond', async () => {
    const sameMoment = new Date('2026-10-01T09:05:00.000Z')
    await prisma.activityLog.createMany({
      data: Array.from({ length: 3 }, () => ({ action: 'ACCOUNT_LOCKED' as const, target_user_id: ownerId, created_at: sameMoment })),
    })

    const firstPage = await listActivity({ limit: '2' })
    const last = firstPage.body.data[1]
    const nextPage = await listActivity({ limit: '2', before: last.created_at, beforeId: last.id })

    const ids = [...firstPage.body.data, ...nextPage.body.data].map((entry: { id: string }) => entry.id)
    const sameMomentIds = (await prisma.activityLog.findMany({ where: { created_at: sameMoment }, select: { id: true } })).map((entry) => entry.id)
    expect(ids.slice(0, 3).sort()).toEqual(sameMomentIds.sort())
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('rejects an unknown action, a limit over 100 or half a cursor', async () => {
    expect((await listActivity({ action: 'LOGGED_IN' })).status).toBe(400)
    expect((await listActivity({ limit: '101' })).status).toBe(400)
    expect((await listActivity({ before: '2026-10-01T09:00:00.000Z' })).status).toBe(400)
  })
})
