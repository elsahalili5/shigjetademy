import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { lastInviteToken } from '../../../test/fake-mailer.ts'
import { createOrganization, createUser, loginAs, TEST_PASSWORD } from '../../../test/factories.ts'

let organizationId: string
let yllkaId: string
let ownerAuth: string
let guardianAuth: string
let artaId: string
let besaId: string
let strangerChildId: string

const childrenPath = (id = organizationId) => `/api/organizations/${id}/me/children`

const listChildren = (auth = guardianAuth, id = organizationId) => request(app).get(childrenPath(id)).set('Authorization', auth)

const addStudent = (firstName: string, studentNumber: string, orgId = organizationId) =>
  prisma.student.create({ data: { organization_id: orgId, first_name: firstName, last_name: 'Gashi', student_number: studentNumber, notes: 'Private staff note' } })

const link = (guardianId: string, studentId: string) => prisma.studentGuardian.create({ data: { guardian_id: guardianId, student_id: studentId, relationship: 'MOTHER' } })

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const guardianUser = await createUser({ email: 'drita@family.test' })
  const otherGuardianUser = await createUser({ email: 'other@family.test' })
  const student = await createUser({ email: 'student@oxford.test' })
  const yllkaOwner = await createUser({ email: 'owner@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: guardianUser.id, role: 'GUARDIAN' },
        { userId: otherGuardianUser.id, role: 'GUARDIAN' },
        { userId: student.id, role: 'STUDENT' },
      ],
    })
  ).id
  yllkaId = (await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id, members: [{ userId: guardianUser.id, role: 'GUARDIAN' }] })).id
  artaId = (await addStudent('Arta', 'STU-0001')).id
  besaId = (await addStudent('Besa', 'STU-0002')).id
  strangerChildId = (await addStudent('Stranger', 'STU-0003')).id
  const drita = await prisma.guardian.create({ data: { organization_id: organizationId, first_name: 'Drita', last_name: 'Gashi', email: 'drita@family.test', user_id: guardianUser.id } })
  const other = await prisma.guardian.create({ data: { organization_id: organizationId, first_name: 'Other', last_name: 'Parent', email: 'other@family.test', user_id: otherGuardianUser.id } })
  await link(drita.id, artaId)
  await link(drita.id, besaId)
  await link(other.id, strangerChildId)
  // The same login is a guardian in another organization, linked to a child there
  const yllkaChild = await addStudent('Yllka', 'STU-0001', yllkaId)
  const yllkaDrita = await prisma.guardian.create({ data: { organization_id: yllkaId, first_name: 'Drita', last_name: 'Gashi', email: 'drita@family.test', user_id: guardianUser.id } })
  await link(yllkaDrita.id, yllkaChild.id)
  ownerAuth = await loginAs('owner@oxford.test')
  guardianAuth = await loginAs('drita@family.test')
})

describe('GET /me/children', () => {
  it('lists only the linked children of this organization, with just their names', async () => {
    const response = await listChildren()

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      { id: artaId, first_name: 'Arta', last_name: 'Gashi' },
      { id: besaId, first_name: 'Besa', last_name: 'Gashi' },
    ])
  })

  it('reads the other organization’s children there, never here', async () => {
    const response = await listChildren(guardianAuth, yllkaId)

    expect(response.status).toBe(200)
    expect(response.body.data.map((child: { first_name: string }) => child.first_name)).toEqual(['Yllka'])
  })

  it('answers an empty list for a guardian with no children, and after unlinking', async () => {
    await prisma.studentGuardian.deleteMany({ where: { guardian: { user_id: { not: null }, email: 'drita@family.test', organization_id: organizationId } } })

    const response = await listChildren()

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([])
    expect(await prisma.guardian.count({ where: { email: 'drita@family.test' } })).toBe(2)
  })

  it('leaves out an archived child', async () => {
    await prisma.student.update({ where: { id: besaId }, data: { status: 'ARCHIVED' } })

    expect((await listChildren()).body.data.map((child: { id: string }) => child.id)).toEqual([artaId])
  })

  it('refuses everyone who isn’t a guardian here with 403', async () => {
    for (const email of ['owner@oxford.test', 'student@oxford.test', 'owner@yllka.test']) {
      expect((await listChildren(await loginAs(email))).status, email).toBe(403)
    }
  })

  it('shows a child to a guardian who just accepted an invitation, and later children without a new invitation', async () => {
    const newcomer = await request(app)
      .post(`/api/organizations/${organizationId}/students/${artaId}/guardians`)
      .set('Authorization', ownerAuth)
      .send({ first_name: 'Agim', last_name: 'Gashi', email: 'agim@family.test', phone: '', relationship: 'FATHER' })
    await request(app).post(`/api/organizations/${organizationId}/guardians/${newcomer.body.data.id}/invitation`).set('Authorization', ownerAuth)
    const registered = await request(app).post('/api/auth/register').send({ first_name: 'Agim', last_name: 'Gashi', email: 'agim@family.test', password: TEST_PASSWORD })
    const auth = `Bearer ${registered.body.data.accessToken}`
    await request(app).post(`/api/invitations/${lastInviteToken()}/accept`).set('Authorization', auth)
    expect((await listChildren(auth)).body.data).toEqual([{ id: artaId, first_name: 'Arta', last_name: 'Gashi' }])

    await request(app)
      .post(`/api/organizations/${organizationId}/students/${besaId}/guardians`)
      .set('Authorization', ownerAuth)
      .send({ first_name: 'Agim', last_name: 'Gashi', email: 'agim@family.test', phone: '', relationship: 'FATHER' })

    expect((await listChildren(auth)).body.data.map((child: { id: string }) => child.id)).toEqual([artaId, besaId])
    expect(await prisma.invitation.count({ where: { email: 'agim@family.test' } })).toBe(1)
  })
})
