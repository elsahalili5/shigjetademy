import express from 'express'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '@lib/prisma.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'
import { authMiddleware } from './authMiddleware.ts'
import { requirePermission } from './permissionMiddleware.ts'

// A route guarded the way a module guards its changes
const guardedApp = express()
guardedApp.post('/organizations/:organizationId/guarded', authMiddleware, requirePermission('MANAGE_ACADEMIC_PERIODS'), (_req, res) => {
  res.status(200).json({ data: 'passed' })
})

let organizationId: string

const callAs = async (email: string) => {
  const auth = await loginAs(email)
  return request(guardedApp).post(`/organizations/${organizationId}/guarded`).set('Authorization', auth)
}

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const permitted = await createUser({ email: 'permitted@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  const lecturer = await createUser({ email: 'lecturer@oxford.test' })
  const student = await createUser({ email: 'student@oxford.test' })
  const otherOwner = await createUser({ email: 'owner@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: permitted.id, role: 'ADMIN', permissions: ['MANAGE_ACADEMIC_PERIODS'] },
        { userId: admin.id, role: 'ADMIN', permissions: ['MANAGE_STUDENTS'] },
        { userId: lecturer.id, role: 'LECTURER', permissions: ['MANAGE_ACADEMIC_PERIODS'] },
        { userId: student.id, role: 'STUDENT' },
      ],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: otherOwner.id })
})

describe('requirePermission', () => {
  it('lets the owner through', async () => {
    expect((await callAs('owner@oxford.test')).status).toBe(200)
  })

  it('lets a school admin with the permission through', async () => {
    expect((await callAs('permitted@oxford.test')).status).toBe(200)
  })

  it('refuses a school admin without the permission', async () => {
    expect((await callAs('admin@oxford.test')).status).toBe(403)
  })

  it('refuses lecturers and students, even when they carry the permission', async () => {
    expect((await callAs('lecturer@oxford.test')).status).toBe(403)
    expect((await callAs('student@oxford.test')).status).toBe(403)
  })

  it('refuses the owner of another organization', async () => {
    expect((await callAs('owner@yllka.test')).status).toBe(403)
  })

  it('refuses everyone in a suspended or deactivated organization', async () => {
    await prisma.organization.update({ where: { id: organizationId }, data: { status: 'SUSPENDED' } })
    const suspended = await callAs('owner@oxford.test')
    await prisma.organization.update({ where: { id: organizationId }, data: { status: 'DEACTIVATED' } })
    const deactivated = await callAs('permitted@oxford.test')

    expect(suspended.status).toBe(403)
    expect(suspended.body.error).toBe('This organization is suspended')
    expect(deactivated.status).toBe(403)
    expect(deactivated.body.error).toBe('This organization is deactivated')
  })

  it('asks for a login first', async () => {
    expect((await request(guardedApp).post(`/organizations/${organizationId}/guarded`)).status).toBe(401)
  })
})
