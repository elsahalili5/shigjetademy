import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { PERMISSIONS } from '@shigjetademy/shared/auth'
import { createOrganization, createUser, loginAs, TEST_PASSWORD } from '../../../test/factories.ts'

let organizationId: string
let settingsPath: string
let ownerAuth: string
let adminAuth: string
let ownerId: string
let adminId: string

const PREFERENCES = { time_zone: 'Europe/Tirane', week_start: 'SUNDAY', date_format: 'MONTH_DAY_YEAR' } as const

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  ownerId = owner.id
  adminId = admin.id
  organizationId = (await createOrganization({ name: 'Oxford Academy', ownerId: owner.id, members: [{ userId: admin.id, role: 'ADMIN' }] })).id
  settingsPath = `/api/organizations/${organizationId}/settings`
  ownerAuth = await loginAs('owner@oxford.test')
  adminAuth = await loginAs('admin@oxford.test')
})

describe('organization settings: general preferences', () => {
  it('gives an organization with no settings yet the defaults, with the time zone from its country', async () => {
    const response = await request(app).get(settingsPath).set('Authorization', ownerAuth)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({ time_zone: 'Europe/Belgrade', week_start: 'MONDAY', date_format: 'DAY_MONTH_YEAR' })
    // Reading writes nothing; the row comes with the first save
    expect(await prisma.organizationSettings.count()).toBe(0)
  })

  it('sends every member the organization’s settings with their session, defaults included', async () => {
    const before = await request(app).get('/api/auth/me').set('Authorization', adminAuth)
    expect(before.body.data.memberships[0].organization).toMatchObject({ time_zone: 'Europe/Belgrade', week_start: 'MONDAY', date_format: 'DAY_MONTH_YEAR' })

    await request(app).put(settingsPath).set('Authorization', ownerAuth).send(PREFERENCES)

    const after = await request(app).get('/api/auth/me').set('Authorization', adminAuth)
    expect(after.body.data.memberships[0].organization).toEqual({ id: organizationId, name: 'Oxford Academy', type: 'SCHOOL', status: 'ACTIVE', ...PREFERENCES })
  })

  it('saves the owner’s preferences and logs the change', async () => {
    const response = await request(app).put(settingsPath).set('Authorization', ownerAuth).send(PREFERENCES)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(PREFERENCES)
    expect((await request(app).get(settingsPath).set('Authorization', ownerAuth)).body.data).toEqual(PREFERENCES)
    const activity = await prisma.activityLog.findMany({ where: { organization_id: organizationId }, select: { action: true } })
    expect(activity).toEqual([{ action: 'ORGANIZATION_SETTINGS_UPDATED' }])
  })

  it('refuses a time zone that doesn’t exist', async () => {
    const response = await request(app).put(settingsPath).set('Authorization', ownerAuth).send({ ...PREFERENCES, time_zone: 'Europe/Atlantis' })

    expect(response.status).toBe(400)
    expect(response.body.details.fieldErrors.time_zone).toBeDefined()
  })

  it('refuses a school admin', async () => {
    expect((await request(app).get(settingsPath).set('Authorization', adminAuth)).status).toBe(403)
    expect((await request(app).put(settingsPath).set('Authorization', adminAuth).send(PREFERENCES)).status).toBe(403)
  })

  it('refuses the owner of another organization', async () => {
    const other = await createUser({ email: 'owner@yllka.test' })
    await createOrganization({ name: 'Yllka Kindergarten', ownerId: other.id })
    const otherAuth = await loginAs('owner@yllka.test')

    expect((await request(app).get(settingsPath).set('Authorization', otherAuth)).status).toBe(403)
    expect((await request(app).put(settingsPath).set('Authorization', otherAuth).send(PREFERENCES)).status).toBe(403)
  })
})

const membershipOf = (userId: string) =>
  prisma.membership.findFirstOrThrow({ where: { organization_id: organizationId, user_id: userId }, select: { id: true, role: true, permissions: true } })

describe('organization settings: transfer ownership', () => {
  const transfer = (body: object, auth = ownerAuth) => request(app).post(`${settingsPath}/transfer-ownership`).set('Authorization', auth).send(body)

  it('makes the school admin the owner and the old owner a school admin with every permission', async () => {
    const target = await membershipOf(adminId)

    const response = await transfer({ membership_id: target.id, password: TEST_PASSWORD })

    expect(response.status).toBe(200)
    expect(await membershipOf(adminId)).toMatchObject({ role: 'OWNER', permissions: [] })
    expect(await membershipOf(ownerId)).toMatchObject({ role: 'ADMIN', permissions: [...PERMISSIONS] })
    const activity = await prisma.activityLog.findMany({ where: { organization_id: organizationId }, select: { action: true, actor_id: true, target_user_id: true } })
    expect(activity).toEqual([{ action: 'OWNERSHIP_TRANSFERRED', actor_id: ownerId, target_user_id: adminId }])
    // The old owner is now refused on owner-only routes, and the new one let in
    expect((await request(app).get(settingsPath).set('Authorization', ownerAuth)).status).toBe(403)
    expect((await request(app).get(settingsPath).set('Authorization', adminAuth)).status).toBe(200)
  })

  it('refuses a wrong password and changes nothing', async () => {
    const target = await membershipOf(adminId)

    const response = await transfer({ membership_id: target.id, password: 'not-my-password' })

    expect(response.status).toBe(400)
    expect(await membershipOf(ownerId)).toMatchObject({ role: 'OWNER' })
    expect(await membershipOf(adminId)).toMatchObject({ role: 'ADMIN' })
  })

  it('refuses a member who isn’t a school admin', async () => {
    const lecturer = await createUser({ email: 'lecturer@oxford.test' })
    const membership = await prisma.membership.create({ data: { organization_id: organizationId, user_id: lecturer.id, role: 'LECTURER' } })

    expect((await transfer({ membership_id: membership.id, password: TEST_PASSWORD })).status).toBe(400)
    expect((await transfer({ membership_id: (await membershipOf(ownerId)).id, password: TEST_PASSWORD })).status).toBe(400)
    expect(await membershipOf(ownerId)).toMatchObject({ role: 'OWNER' })
  })

  it('refuses a removed school admin and one from another organization', async () => {
    const target = await membershipOf(adminId)
    await prisma.membership.update({ where: { id: target.id }, data: { status: 'REMOVED' } })
    const other = await createUser({ email: 'owner@yllka.test' })
    const otherAdmin = await createUser({ email: 'admin@yllka.test' })
    const yllka = await createOrganization({ name: 'Yllka Kindergarten', ownerId: other.id, members: [{ userId: otherAdmin.id, role: 'ADMIN' }] })
    const foreign = await prisma.membership.findFirstOrThrow({ where: { organization_id: yllka.id, user_id: otherAdmin.id } })

    expect((await transfer({ membership_id: target.id, password: TEST_PASSWORD })).status).toBe(404)
    expect((await transfer({ membership_id: foreign.id, password: TEST_PASSWORD })).status).toBe(404)
    expect(await membershipOf(ownerId)).toMatchObject({ role: 'OWNER' })
  })

  it('refuses a school admin whose account is locked or disabled', async () => {
    const target = await membershipOf(adminId)

    for (const status of ['LOCKED', 'DISABLED'] as const) {
      await prisma.user.update({ where: { id: adminId }, data: { status } })
      expect((await transfer({ membership_id: target.id, password: TEST_PASSWORD })).status).toBe(400)
    }
    expect(await membershipOf(ownerId)).toMatchObject({ role: 'OWNER' })
    expect(await membershipOf(adminId)).toMatchObject({ role: 'ADMIN' })
  })

  it('refuses a school admin', async () => {
    const target = await membershipOf(adminId)

    expect((await transfer({ membership_id: target.id, password: TEST_PASSWORD }, adminAuth)).status).toBe(403)
  })
})

describe('organization settings: deactivate and reactivate', () => {
  const deactivate = (body: object, auth = ownerAuth) => request(app).post(`${settingsPath}/deactivate`).set('Authorization', auth).send(body)
  const reactivate = (body: object, auth = ownerAuth) => request(app).post(`${settingsPath}/reactivate`).set('Authorization', auth).send(body)
  const statusOf = async () => (await prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { status: true } })).status
  const overview = (auth: string) => request(app).get(`/api/organizations/${organizationId}/overview`).set('Authorization', auth)
  const members = (auth: string) => request(app).get(`/api/organizations/${organizationId}/members`).set('Authorization', auth)
  const profile = (auth: string) => request(app).get(`/api/organizations/${organizationId}/profile`).set('Authorization', auth)

  it('refuses a name that doesn’t match exactly, or a wrong password', async () => {
    expect((await deactivate({ confirm_name: 'oxford academy', password: TEST_PASSWORD })).status).toBe(400)
    expect((await deactivate({ confirm_name: 'Oxford Academy', password: 'not-my-password' })).status).toBe(400)
    expect(await statusOf()).toBe('ACTIVE')
  })

  it('blocks everyone after deactivating, lets the owner still read settings, and reactivating restores access', async () => {
    const deactivated = await deactivate({ confirm_name: '  Oxford Academy ', password: TEST_PASSWORD })

    expect(deactivated.status).toBe(200)
    expect(await statusOf()).toBe('DEACTIVATED')
    expect((await overview(ownerAuth)).status).toBe(403)
    expect((await members(ownerAuth)).status).toBe(403)
    expect((await profile(adminAuth)).status).toBe(403)
    expect((await request(app).get(settingsPath).set('Authorization', ownerAuth)).status).toBe(200)
    expect((await request(app).get(settingsPath).set('Authorization', adminAuth)).status).toBe(403)
    expect((await request(app).put(settingsPath).set('Authorization', ownerAuth).send(PREFERENCES)).status).toBe(403)

    expect((await reactivate({ password: 'not-my-password' })).status).toBe(400)
    expect((await reactivate({ password: TEST_PASSWORD }, adminAuth)).status).toBe(403)
    expect(await statusOf()).toBe('DEACTIVATED')

    const reactivated = await reactivate({ password: TEST_PASSWORD })

    expect(reactivated.status).toBe(200)
    expect(await statusOf()).toBe('ACTIVE')
    expect((await overview(ownerAuth)).status).toBe(200)
    expect((await members(ownerAuth)).status).toBe(200)
    expect((await profile(adminAuth)).status).toBe(200)
    const activity = await prisma.activityLog.findMany({ where: { organization_id: organizationId }, orderBy: { created_at: 'asc' }, select: { action: true } })
    expect(activity).toEqual([{ action: 'ORGANIZATION_DEACTIVATED_BY_OWNER' }, { action: 'ORGANIZATION_REACTIVATED_BY_OWNER' }])
  })

  it('refuses a school admin', async () => {
    expect((await deactivate({ confirm_name: 'Oxford Academy', password: TEST_PASSWORD }, adminAuth)).status).toBe(403)
    expect(await statusOf()).toBe('ACTIVE')
  })

  it('refuses reactivating an active organization', async () => {
    expect((await reactivate({ password: TEST_PASSWORD })).status).toBe(409)
  })

  it('doesn’t let the owner lift a suspension by Shigjetademy, or deactivate while suspended', async () => {
    await prisma.organization.update({ where: { id: organizationId }, data: { status: 'SUSPENDED' } })

    expect((await reactivate({ password: TEST_PASSWORD })).status).toBe(403)
    expect((await deactivate({ confirm_name: 'Oxford Academy', password: TEST_PASSWORD })).status).toBe(403)
    expect((await request(app).get(settingsPath).set('Authorization', ownerAuth)).status).toBe(403)
    expect(await statusOf()).toBe('SUSPENDED')
  })

  it('keeps the platform admin from suspending or restoring an organization its owner deactivated', async () => {
    await deactivate({ confirm_name: 'Oxford Academy', password: TEST_PASSWORD })
    await createUser({ email: 'platform@shigjetademy.test', isPlatformAdmin: true })
    const platformAuth = await loginAs('platform@shigjetademy.test')

    const response = await request(app).patch(`/api/organizations/${organizationId}/status`).set('Authorization', platformAuth).send({ status: 'ACTIVE' })

    expect(response.status).toBe(409)
    expect(await statusOf()).toBe('DEACTIVATED')
  })
})
