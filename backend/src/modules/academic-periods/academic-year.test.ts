import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

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
