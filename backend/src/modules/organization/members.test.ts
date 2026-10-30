import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let membersPath: string
let organizationId: string

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const admin = await createUser({ email: 'admin1@oxford.com' })
  const organization = await createOrganization({ name: 'Oxford Academy', ownerId: owner.id, members: [{ userId: admin.id, role: 'ADMIN' }] })
  organizationId = organization.id
  membersPath = `/api/organizations/${organization.id}/members`
})

describe('GET /api/organizations/:organizationId/members', () => {
  it('lists the members for the owner, owner first', async () => {
    const response = await request(app).get(membersPath).set('Authorization', await loginAs('owner@oxford.test'))

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      expect.objectContaining({ email: 'owner@oxford.test', role: 'OWNER' }),
      expect.objectContaining({ email: 'admin1@oxford.com', role: 'ADMIN' }),
    ])
  })

  it('refuses a school admin and the owner of another organization', async () => {
    const otherOwner = await createUser({ email: 'owner@yllka.test' })
    await createOrganization({ name: 'Yllka Kindergarten', ownerId: otherOwner.id })

    expect((await request(app).get(membersPath).set('Authorization', await loginAs('admin1@oxford.com'))).status).toBe(403)
    expect((await request(app).get(membersPath).set('Authorization', await loginAs('owner@yllka.test'))).status).toBe(403)
  })

  it('refuses a suspended organization', async () => {
    await prisma.organization.updateMany({ where: { name: 'Oxford Academy' }, data: { status: 'SUSPENDED' } })

    const response = await request(app).get(membersPath).set('Authorization', await loginAs('owner@oxford.test'))

    expect(response.status).toBe(403)
  })
})

describe('managing school admins', () => {
  const adminMembership = () => prisma.membership.findFirstOrThrow({ where: { organization_id: organizationId, role: 'ADMIN' } })

  it('lets the owner change an admin’s permissions', async () => {
    const membership = await adminMembership()

    const response = await request(app)
      .patch(`${membersPath}/${membership.id}`)
      .set('Authorization', await loginAs('owner@oxford.test'))
      .send({ permissions: ['MANAGE_STUDENTS', 'VIEW_REPORTS'] })

    expect(response.status).toBe(200)
    expect(response.body.data.permissions).toEqual(['MANAGE_STUDENTS', 'VIEW_REPORTS'])
  })

  it('removes an admin, who then no longer appears', async () => {
    const membership = await adminMembership()
    const ownerAuth = await loginAs('owner@oxford.test')

    expect((await request(app).delete(`${membersPath}/${membership.id}`).set('Authorization', ownerAuth)).status).toBe(200)

    const members = await request(app).get(membersPath).set('Authorization', ownerAuth)
    expect(members.body.data.map((member: { email: string }) => member.email)).toEqual(['owner@oxford.test'])
  })

  it('does not let the owner remove themselves', async () => {
    const ownerMembership = await prisma.membership.findFirstOrThrow({ where: { organization_id: organizationId, role: 'OWNER' } })

    const response = await request(app).delete(`${membersPath}/${ownerMembership.id}`).set('Authorization', await loginAs('owner@oxford.test'))

    expect(response.status).toBe(400)
  })

  it('lists only pending invitations that have not expired', async () => {
    const owner = await prisma.user.findUniqueOrThrow({ where: { email: 'owner@oxford.test' } })
    const base = { organization_id: organizationId, role: 'ADMIN' as const, invited_by_id: owner.id }
    await prisma.invitation.createMany({
      data: [
        { ...base, email: 'new@oxford.com', token_hash: 'a', expires_at: new Date(Date.now() + 60_000) },
        { ...base, email: 'old@oxford.com', token_hash: 'b', expires_at: new Date(Date.now() - 60_000) },
      ],
    })

    const response = await request(app).get(`/api/organizations/${organizationId}/invitations`).set('Authorization', await loginAs('owner@oxford.test'))

    expect(response.body.data.map((invitation: { email: string }) => invitation.email)).toEqual(['new@oxford.com'])
  })
})
