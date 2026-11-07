import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let organizationId: string
let myTeachingPath: string

const readMyTeaching = async (email: string, path = myTeachingPath) => request(app).get(path).set('Authorization', await loginAs(email))

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-31T10:00:00.000Z'))
  const owner = await createUser({ email: 'owner@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  const arben = await createUser({ email: 'arben@lecturer.test' })
  const teuta = await createUser({ email: 'teuta@lecturer.test' })
  const unlinked = await createUser({ email: 'unlinked@lecturer.test' })
  const student = await createUser({ email: 'student@oxford.test' })
  const yllkaOwner = await createUser({ email: 'owner@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: admin.id, role: 'ADMIN', permissions: ['MANAGE_LECTURERS'] },
        { userId: arben.id, role: 'LECTURER' },
        { userId: teuta.id, role: 'LECTURER' },
        { userId: unlinked.id, role: 'LECTURER' },
        { userId: student.id, role: 'STUDENT' },
      ],
    })
  ).id
  await createOrganization({ name: 'Yllka Kindergarten', ownerId: yllkaOwner.id, members: [{ userId: teuta.id, role: 'LECTURER' }] })
  const main = await prisma.location.create({ data: { organization_id: organizationId, name: 'Main campus', is_main: true } })
  const north = await prisma.location.create({ data: { organization_id: organizationId, name: 'North campus' } })
  const sciences = await prisma.department.create({ data: { organization_id: organizationId, name: 'Sciences' } })
  await prisma.lecturer.create({
    data: {
      organization_id: organizationId,
      first_name: 'Arben',
      last_name: 'Hoxha',
      email: 'arben@lecturer.test',
      phone: '+383 44 123 456',
      notes: 'Private note',
      subjects: ['Mathematics', 'Physics'],
      employment_type: 'FULL_TIME',
      department_id: sciences.id,
      user_id: arben.id,
      locations: { create: [{ location_id: north.id }, { location_id: main.id }] },
    },
  })
  await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Teuta', last_name: 'Krasniqi', subjects: ['English'], employment_type: 'PART_TIME', user_id: teuta.id } })
  const year = await prisma.academicYear.create({
    data: { organization_id: organizationId, name: '2026–27', start_date: new Date('2026-09-01'), end_date: new Date('2027-06-30'), is_current: true },
  })
  await prisma.academicTerm.create({ data: { academic_year_id: year.id, name: 'Autumn term', start_date: new Date('2026-09-01'), end_date: new Date('2026-12-20') } })
  myTeachingPath = `/api/organizations/${organizationId}/me/lecturer`
})

afterEach(() => {
  vi.useRealTimers()
})

describe('My teaching', () => {
  it('shows a lecturer their organization, only their own details with subjects and places, and the current year and term', async () => {
    const response = await readMyTeaching('arben@lecturer.test')

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual({
      organization: { id: organizationId, name: 'Oxford Academy' },
      lecturer: { first_name: 'Arben', last_name: 'Hoxha', subjects: ['Mathematics', 'Physics'], employment_type: 'FULL_TIME', department: 'Sciences', locations: ['Main campus', 'North campus'] },
      academic_year: { name: '2026–27', start_date: '2026-09-01', end_date: '2027-06-30' },
      term: { name: 'Autumn term', start_date: '2026-09-01', end_date: '2026-12-20' },
      holiday: null,
      next_term: null,
    })
  })

  it('names a holiday covering today, and the next term of the year between terms, in the organization’s time zone', async () => {
    const year = await prisma.academicYear.findFirstOrThrow({ where: { organization_id: organizationId } })
    await prisma.academicTerm.create({ data: { academic_year_id: year.id, name: 'Spring term', start_date: new Date('2027-01-10'), end_date: new Date('2027-06-30') } })
    await prisma.academicHoliday.create({ data: { academic_year_id: year.id, name: 'Winter break', start_date: new Date('2026-12-24'), end_date: new Date('2027-01-06') } })
    await prisma.organizationSettings.create({ data: { organization_id: organizationId, time_zone: 'Europe/Belgrade' } })

    // 23:30 UTC on 23 December is already 24 December in Belgrade
    vi.setSystemTime(new Date('2026-12-23T23:30:00.000Z'))
    const onHoliday = await readMyTeaching('arben@lecturer.test')
    vi.setSystemTime(new Date('2027-01-07T10:00:00.000Z'))
    const betweenTerms = await readMyTeaching('arben@lecturer.test')

    expect(onHoliday.body.data).toMatchObject({ holiday: { name: 'Winter break' }, term: null, next_term: { name: 'Spring term', start_date: '2027-01-10', end_date: '2027-06-30' } })
    expect(betweenTerms.body.data).toMatchObject({ holiday: null, term: null, next_term: { name: 'Spring term', start_date: '2027-01-10' } })
  })

  it('shows a lecturer without a linked record no record, and none from another organization', async () => {
    const yllka = await prisma.organization.findFirstOrThrow({ where: { name: 'Yllka Kindergarten' } })

    expect((await readMyTeaching('unlinked@lecturer.test')).body.data.lecturer).toBeNull()
    expect((await readMyTeaching('teuta@lecturer.test', `/api/organizations/${yllka.id}/me/lecturer`)).body.data).toMatchObject({ lecturer: null, academic_year: null })
  })

  it('refuses the owner, admins, students and other organizations', async () => {
    for (const email of ['owner@oxford.test', 'admin@oxford.test', 'student@oxford.test', 'owner@yllka.test']) {
      expect((await readMyTeaching(email)).status, email).toBe(403)
    }
  })

  it('keeps lecturers out of the staff endpoints', async () => {
    const auth = await loginAs('arben@lecturer.test')

    expect((await request(app).get(`/api/organizations/${organizationId}/lecturers`).set('Authorization', auth)).status).toBe(403)
    expect((await request(app).get(`/api/organizations/${organizationId}/students`).set('Authorization', auth)).status).toBe(403)
  })
})
