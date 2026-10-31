import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

const HOUR_MS = 60 * 60 * 1000

let ownerId: string
let adminUserId: string
let organizationId: string
let overviewPath: string

beforeEach(async () => {
  ownerId = (await createUser({ email: 'owner@oxford.test' })).id
  adminUserId = (await createUser({ email: 'admin1@oxford.test' })).id
  const lecturer = await createUser({ email: 'lecturer@oxford.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId,
      members: [
        { userId: adminUserId, role: 'ADMIN' },
        { userId: lecturer.id, role: 'LECTURER' },
      ],
    })
  ).id
  overviewPath = `/api/organizations/${organizationId}/overview`
})

const inviteAdmin = ({ email, expiresInHours }: { email: string; expiresInHours: number }) =>
  prisma.invitation.create({
    data: {
      organization_id: organizationId,
      email,
      role: 'ADMIN',
      token_hash: email,
      invited_by_id: ownerId,
      expires_at: new Date(Date.now() + expiresInHours * HOUR_MS),
    },
  })

const getOverview = async (email = 'owner@oxford.test') => request(app).get(overviewPath).set('Authorization', await loginAs(email))

describe('GET /api/organizations/:organizationId/overview', () => {
  it('counts active members, school admins and open invitations', async () => {
    const removed = await createUser({ email: 'gone@oxford.test' })
    await prisma.membership.create({ data: { user_id: removed.id, organization_id: organizationId, role: 'ADMIN', status: 'REMOVED' } })
    await inviteAdmin({ email: 'new@oxford.test', expiresInHours: 72 })
    await inviteAdmin({ email: 'old@oxford.test', expiresInHours: -1 })

    const response = await getOverview()

    expect(response.status).toBe(200)
    expect(response.body.data.counts).toEqual({ members: 3, admins: 1, pending_invitations: 1 })
  })

  it('lists open admin invitations soonest first and flags the ones expiring within 48 hours', async () => {
    await inviteAdmin({ email: 'later@oxford.test', expiresInHours: 120 })
    await inviteAdmin({ email: 'soon@oxford.test', expiresInHours: 10 })
    await inviteAdmin({ email: 'expired@oxford.test', expiresInHours: -1 })

    const response = await getOverview()

    expect(response.body.data.pending_invitations).toEqual([
      { id: expect.any(String), email: 'soon@oxford.test', expires_at: expect.any(String), is_expiring_soon: true },
      { id: expect.any(String), email: 'later@oxford.test', expires_at: expect.any(String), is_expiring_soon: false },
    ])
  })

  it('returns no invitations when nothing needs attention', async () => {
    const response = await getOverview()

    expect(response.body.data.pending_invitations).toEqual([])
  })

  it("shows the latest of this organization's activity, newest first, and none of another organization's", async () => {
    const otherOwner = await createUser({ email: 'owner@yllka.test' })
    const otherOrganization = await createOrganization({ name: 'Yllka Kindergarten', ownerId: otherOwner.id })
    await prisma.activityLog.createMany({
      data: [
        { actor_id: ownerId, action: 'MEMBER_UPDATED', organization_id: organizationId, target_user_id: adminUserId, created_at: new Date('2026-10-01T09:00:00.000Z') },
        { actor_id: ownerId, action: 'MEMBER_REMOVED', organization_id: organizationId, target_user_id: adminUserId, created_at: new Date('2026-10-01T10:00:00.000Z') },
        { actor_id: otherOwner.id, action: 'MEMBER_REMOVED', organization_id: otherOrganization.id, created_at: new Date('2026-10-01T11:00:00.000Z') },
        { actor_id: ownerId, action: 'PASSWORD_CHANGED', target_user_id: ownerId, created_at: new Date('2026-10-01T12:00:00.000Z') },
      ],
    })

    const response = await getOverview()

    expect(response.body.data.activity).toEqual([
      {
        id: expect.any(String),
        action: 'MEMBER_REMOVED',
        created_at: '2026-10-01T10:00:00.000Z',
        actor: { id: ownerId, first_name: 'Test', last_name: 'User', email: 'owner@oxford.test' },
        organization: { id: organizationId, name: 'Oxford Academy' },
        target_user: { id: adminUserId, first_name: 'Test', last_name: 'User', email: 'admin1@oxford.test' },
        subject_name: null,
      },
      expect.objectContaining({ action: 'MEMBER_UPDATED', created_at: '2026-10-01T09:00:00.000Z' }),
    ])
  })

  it('shows at most 10 activity entries', async () => {
    await prisma.activityLog.createMany({
      data: Array.from({ length: 12 }, () => ({ actor_id: ownerId, action: 'MEMBER_UPDATED' as const, organization_id: organizationId })),
    })

    const response = await getOverview()

    expect(response.body.data.activity).toHaveLength(10)
  })

  it("refuses a school admin and the owner of another organization", async () => {
    const otherOwner = await createUser({ email: 'owner@yllka.test' })
    await createOrganization({ name: 'Yllka Kindergarten', ownerId: otherOwner.id })

    expect((await getOverview('admin1@oxford.test')).status).toBe(403)
    expect((await getOverview('owner@yllka.test')).status).toBe(403)
  })
})
