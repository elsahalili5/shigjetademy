import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let organizationId: string
let mySchoolPath: string

const readMySchool = async (email: string, path = mySchoolPath) => request(app).get(path).set('Authorization', await loginAs(email))

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-31T10:00:00.000Z'))
  const owner = await createUser({ email: 'owner@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  const arta = await createUser({ email: 'arta@student.test' })
  const besa = await createUser({ email: 'besa@student.test' })
  const unlinked = await createUser({ email: 'unlinked@student.test' })
  const yllkaOwner = await createUser({ email: 'owner@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: admin.id, role: 'ADMIN', permissions: ['MANAGE_STUDENTS'] },
        { userId: arta.id, role: 'STUDENT' },
        { userId: besa.id, role: 'STUDENT' },
        { userId: unlinked.id, role: 'STUDENT' },
      ],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id, members: [{ userId: besa.id, role: 'STUDENT' }] })
  await prisma.student.createMany({
    data: [
      { organization_id: organizationId, first_name: 'Arta', last_name: 'Gashi', student_number: 'STU-0007', user_id: arta.id },
      { organization_id: organizationId, first_name: 'Besa', last_name: 'Berisha', student_number: 'STU-0008', user_id: besa.id },
    ],
  })
  const year = await prisma.academicYear.create({
    data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true },
  })
  await prisma.academicTerm.createMany({
    data: [
      { academic_year_id: year.id, name: 'Autumn term', start_date: new Date('2026-09-01'), end_date: new Date('2026-12-20') },
      { academic_year_id: year.id, name: 'Spring term', start_date: new Date('2027-01-10'), end_date: new Date('2027-06-30') },
    ],
  })
  mySchoolPath = `/api/organizations/${organizationId}/me/student`
})

afterEach(() => {
  vi.useRealTimers()
})

describe('My school', () => {
  it('shows a student their organization, their own name and number, and the current year and term', async () => {
    const response = await readMySchool('arta@student.test')

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      organization: { id: organizationId, name: 'Oxford Academy' },
      student: { first_name: 'Arta', last_name: 'Gashi', student_number: 'STU-0007' },
      academic_year: { name: '2026–27', start_date: '2026-09-01', end_date: '2027-06-30' },
      term: { name: 'Autumn term', start_date: '2026-09-01', end_date: '2026-12-20' },
    })
  })

  it('says when there is no term today or no current year', async () => {
    vi.setSystemTime(new Date('2027-01-05T10:00:00.000Z'))
    const betweenTerms = await readMySchool('arta@student.test')
    await prisma.academicYear.deleteMany()
    const noYear = await readMySchool('arta@student.test')

    expect(betweenTerms.body.data.term).toBeNull()
    expect(noYear.body.data).toMatchObject({ academic_year: null, term: null })
  })

  it('shows a student without a linked record no record, not someone else’s', async () => {
    const response = await readMySchool('unlinked@student.test')

    expect(response.status).toBe(200)
    expect(response.body.data.student).toBeNull()
  })

  it('refuses the owner, staff, and a student of another organization', async () => {
    const yllka = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })

    expect((await readMySchool('owner@oxford.test')).status).toBe(403)
    expect((await readMySchool('admin@oxford.test')).status).toBe(403)
    expect((await readMySchool('owner@yllka.test')).status).toBe(403)
    expect((await readMySchool('besa@student.test', `/api/organizations/${yllka.id}/me/student`)).body.data.student).toBeNull()
  })

  it('keeps students out of the staff endpoints', async () => {
    const auth = await loginAs('arta@student.test')

    expect((await request(app).get(`/api/organizations/${organizationId}/students`).set('Authorization', auth)).status).toBe(403)
    expect((await request(app).get(`/api/organizations/${organizationId}/members`).set('Authorization', auth)).status).toBe(403)
  })
})
