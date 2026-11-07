import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createCourse, createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let organizationId: string
let yearsPath: string
let ownerAuth: string

const year = (name: string, start_date: string, end_date: string, isCurrent = false) => ({ name, start_date, end_date, is_current: isCurrent })

const addYear = async (body: ReturnType<typeof year>, auth = ownerAuth) => request(app).post(yearsPath).set('Authorization', auth).send(body)

const listYears = async (auth = ownerAuth) => {
  const response = await request(app).get(yearsPath).set('Authorization', auth)
  return response.body.data.map(({ name, is_current }: { name: string; is_current: boolean }) => ({ name, is_current }))
}

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const permitted = await createUser({ email: 'permitted@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  const lecturer = await createUser({ email: 'lecturer@oxford.test' })
  const student = await createUser({ email: 'student@oxford.test' })
  const guardian = await createUser({ email: 'guardian@oxford.test' })
  await createUser({ email: 'outsider@yllka.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: permitted.id, role: 'ADMIN', permissions: ['MANAGE_ACADEMIC_PERIODS'] },
        { userId: admin.id, role: 'ADMIN' },
        { userId: lecturer.id, role: 'LECTURER' },
        { userId: student.id, role: 'STUDENT' },
        { userId: guardian.id, role: 'GUARDIAN' },
      ],
    })
  ).id
  yearsPath = `/api/organizations/${organizationId}/academic-periods/years`
  ownerAuth = await loginAs('owner@oxford.test')
})

describe('academic years', () => {
  it('makes the first year current and keeps its dates as calendar days', async () => {
    const response = await addYear(year('2026–27', '2026-09-01', '2027-06-30'))

    expect(response.status).toBe(201)
    expect(response.body.data).toMatchObject({ name: '2026–27', start_date: '2026-09-01', end_date: '2027-06-30', is_current: true, terms: [], holidays: [] })
  })

  it('lists the current year first, then the newest', async () => {
    await addYear(year('2025–26', '2025-09-01', '2026-06-30'))
    await addYear(year('2026–27', '2026-09-01', '2027-06-30'))
    await addYear(year('2024–25', '2024-09-01', '2025-06-30'))

    expect(await listYears()).toEqual([
      { name: '2025–26', is_current: true },
      { name: '2026–27', is_current: false },
      { name: '2024–25', is_current: false },
    ])
  })

  it('refuses a year that overlaps another', async () => {
    await addYear(year('2026–27', '2026-09-01', '2027-06-30'))

    const response = await addYear(year('Summer 2027', '2027-06-30', '2027-08-31'))

    expect(response.status).toBe(409)
    expect(await listYears()).toHaveLength(1)
  })

  it('refuses a year that ends before it starts, or on the same day', async () => {
    expect((await addYear(year('Backwards', '2027-06-30', '2026-09-01'))).status).toBe(400)
    expect((await addYear(year('One day', '2026-09-01', '2026-09-01'))).status).toBe(400)
    expect((await addYear(year('No date', '2026-09-01', ''))).status).toBe(400)
  })

  it('switches the current year, and refuses to unset it without choosing another', async () => {
    const first = (await addYear(year('2025–26', '2025-09-01', '2026-06-30'))).body.data
    const second = (await addYear(year('2026–27', '2026-09-01', '2027-06-30'))).body.data

    const unset = await request(app).put(`${yearsPath}/${first.id}`).set('Authorization', ownerAuth).send(year('2025–26', '2025-09-01', '2026-06-30', false))
    const switched = await request(app).put(`${yearsPath}/${second.id}`).set('Authorization', ownerAuth).send(year('2026–27', '2026-09-01', '2027-06-30', true))

    expect(unset.status).toBe(409)
    expect(switched.status).toBe(200)
    expect(await listYears()).toEqual([
      { name: '2026–27', is_current: true },
      { name: '2025–26', is_current: false },
    ])
  })

  it('edits a year without counting it as overlapping itself', async () => {
    const created = (await addYear(year('2026–27', '2026-09-01', '2027-06-30'))).body.data

    const response = await request(app).put(`${yearsPath}/${created.id}`).set('Authorization', ownerAuth).send(year('2026/27', '2026-08-25', '2027-07-05', true))

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ name: '2026/27', start_date: '2026-08-25', end_date: '2027-07-05', is_current: true })
  })

  it('refuses an edit that overlaps another year', async () => {
    await addYear(year('2025–26', '2025-09-01', '2026-06-30'))
    const second = (await addYear(year('2026–27', '2026-09-01', '2027-06-30'))).body.data

    const response = await request(app).put(`${yearsPath}/${second.id}`).set('Authorization', ownerAuth).send(year('2026–27', '2026-06-01', '2027-06-30'))

    expect(response.status).toBe(409)
  })

  it('needs a replacement to delete the current year while others remain', async () => {
    const current = (await addYear(year('2025–26', '2025-09-01', '2026-06-30'))).body.data
    const next = (await addYear(year('2026–27', '2026-09-01', '2027-06-30'))).body.data

    expect((await request(app).delete(`${yearsPath}/${current.id}`).set('Authorization', ownerAuth)).status).toBe(409)

    const response = await request(app).delete(`${yearsPath}/${current.id}`).query({ newCurrentId: next.id }).set('Authorization', ownerAuth)

    expect(response.status).toBe(200)
    expect(await listYears()).toEqual([{ name: '2026–27', is_current: true }])
  })

  it('deletes the only year without asking for a replacement', async () => {
    const only = (await addYear(year('2026–27', '2026-09-01', '2027-06-30'))).body.data

    expect((await request(app).delete(`${yearsPath}/${only.id}`).set('Authorization', ownerAuth)).status).toBe(200)
    expect(await listYears()).toEqual([])
  })

  it('deletes a year that is not current without a replacement', async () => {
    await addYear(year('2025–26', '2025-09-01', '2026-06-30'))
    const next = (await addYear(year('2026–27', '2026-09-01', '2027-06-30'))).body.data

    expect((await request(app).delete(`${yearsPath}/${next.id}`).set('Authorization', ownerAuth)).status).toBe(200)
    expect(await listYears()).toEqual([{ name: '2025–26', is_current: true }])
  })

  it('answers 404 for a year that does not exist', async () => {
    const missing = '00000000-0000-4000-8000-000000000000'

    expect((await request(app).put(`${yearsPath}/${missing}`).set('Authorization', ownerAuth).send(year('2026–27', '2026-09-01', '2027-06-30'))).status).toBe(404)
    expect((await request(app).delete(`${yearsPath}/${missing}`).set('Authorization', ownerAuth)).status).toBe(404)
  })

  it('writes every change to the activity log with who did it', async () => {
    const created = (await addYear(year('2026–27', '2026-09-01', '2027-06-30'))).body.data
    await request(app).put(`${yearsPath}/${created.id}`).set('Authorization', ownerAuth).send(year('2026/27', '2026-09-01', '2027-06-30', true))
    await request(app).delete(`${yearsPath}/${created.id}`).set('Authorization', ownerAuth)

    const entries = await prisma.activityLog.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: 'asc' },
      select: { action: true, subject_name: true, actor: { select: { email: true } } },
    })
    expect(entries).toEqual([
      { action: 'ACADEMIC_YEAR_CREATED', subject_name: '2026–27', actor: { email: 'owner@oxford.test' } },
      { action: 'ACADEMIC_YEAR_UPDATED', subject_name: '2026/27', actor: { email: 'owner@oxford.test' } },
      { action: 'ACADEMIC_YEAR_REMOVED', subject_name: '2026/27', actor: { email: 'owner@oxford.test' } },
    ])
  })
})

describe('shortening a year with groups', () => {
  const MESSAGE = 'Some substitutions or planned lecturer changes fall outside these dates'

  let currentYearId: string
  let groupId: string
  let lecturerId: string

  const moveYear = (startDate: string, endDate: string) => request(app).put(`${yearsPath}/${currentYearId}`).set('Authorization', ownerAuth).send(year('2026–27', startDate, endDate, true))

  const addCover = (startDate: string, endDate: string, cancelledAt?: Date) =>
    prisma.groupSubstitution.create({ data: { group_id: groupId, lecturer_id: lecturerId, start_date: new Date(startDate), end_date: new Date(endDate), cancelled_at: cancelledAt } })

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-02T10:00:00.000Z'))
    ownerAuth = await loginAs('owner@oxford.test')
    currentYearId = (await addYear(year('2026–27', '2026-09-01', '2027-06-30', true))).body.data.id
    const course = await createCourse({ organizationId, name: 'Mathematics' })
    groupId = (await prisma.group.create({ data: { organization_id: organizationId, course_id: course.id, name: 'Group A', academic_year_id: currentYearId } })).id
    lecturerId = (await prisma.lecturer.create({ data: { organization_id: organizationId, first_name: 'Arben', last_name: 'Hoxha', employment_type: 'FULL_TIME' } })).id
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('refuses leaving a substitution ending today or later outside, at either end', async () => {
    await addCover('2026-11-01', '2026-11-02')
    await addCover('2027-06-10', '2027-06-12')

    const end = await moveYear('2026-09-01', '2027-06-11')
    const start = await moveYear('2026-11-02', '2027-06-30')

    expect(end.status).toBe(409)
    expect(end.body.error).toBe(MESSAGE)
    expect(start.status).toBe(409)
  })

  it('lets a past substitution fall outside, as history', async () => {
    await addCover('2026-09-10', '2026-09-12')

    expect((await moveYear('2026-09-11', '2027-06-30')).status).toBe(200)
  })

  it('doesn’t count a cancelled substitution', async () => {
    await addCover('2027-06-10', '2027-06-12', new Date('2026-11-01'))

    expect((await moveYear('2026-09-01', '2027-06-01')).status).toBe(200)
  })

  it('refuses leaving a pending lecturer outside', async () => {
    await prisma.groupLecturerAssignment.create({ data: { group_id: groupId, lecturer_id: lecturerId, start_date: new Date('2027-06-10') } })

    const response = await moveYear('2026-09-01', '2027-06-01')

    expect(response.status).toBe(409)
    expect(response.body.error).toBe(MESSAGE)
  })

  it('lets past and current assignment rows fall outside', async () => {
    await prisma.groupLecturerAssignment.create({ data: { group_id: groupId, lecturer_id: lecturerId, start_date: new Date('2026-09-01'), end_date: new Date('2026-09-30') } })
    await prisma.groupLecturerAssignment.create({ data: { group_id: groupId, lecturer_id: lecturerId, start_date: new Date('2026-10-01') } })

    expect((await moveYear('2026-11-01', '2027-06-30')).status).toBe(200)
  })

  it('takes a longer year or new name, whatever already sits outside', async () => {
    await prisma.groupLecturerAssignment.create({ data: { group_id: groupId, lecturer_id: lecturerId, start_date: new Date('2026-11-10') } })
    await prisma.academicYear.update({ where: { id: currentYearId }, data: { start_date: new Date('2026-12-01') } })

    expect((await moveYear('2026-12-01', '2027-07-15')).status).toBe(200)
  })
})

describe('academic year access', () => {
  it('lets every member read the years, and refuses outsiders', async () => {
    await addYear(year('2026–27', '2026-09-01', '2027-06-30'))

    for (const email of ['admin@oxford.test', 'lecturer@oxford.test', 'student@oxford.test', 'guardian@oxford.test']) {
      expect(await listYears(await loginAs(email))).toEqual([{ name: '2026–27', is_current: true }])
    }
    expect((await request(app).get(yearsPath).set('Authorization', await loginAs('outsider@yllka.test'))).status).toBe(403)
  })

  it('lets a school admin with the permission make changes', async () => {
    expect((await addYear(year('2026–27', '2026-09-01', '2027-06-30'), await loginAs('permitted@oxford.test'))).status).toBe(201)
  })

  it('refuses changes from a lecturer or a school admin without the permission', async () => {
    const created = (await addYear(year('2026–27', '2026-09-01', '2027-06-30'))).body.data

    for (const email of ['lecturer@oxford.test', 'admin@oxford.test']) {
      const auth = await loginAs(email)
      expect((await addYear(year('2027–28', '2027-09-01', '2028-06-30'), auth)).status).toBe(403)
      expect((await request(app).put(`${yearsPath}/${created.id}`).set('Authorization', auth).send(year('Renamed', '2026-09-01', '2027-06-30', true))).status).toBe(403)
      expect((await request(app).delete(`${yearsPath}/${created.id}`).set('Authorization', auth)).status).toBe(403)
    }
    expect(await listYears()).toEqual([{ name: '2026–27', is_current: true }])
  })
})
