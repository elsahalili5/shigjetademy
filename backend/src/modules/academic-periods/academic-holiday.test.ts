import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let yearsPath: string
let holidaysPath: string
let ownerAuth: string
let organizationId: string

const holiday = (name: string, start_date: string, end_date: string) => ({ name, start_date, end_date })

const addHoliday = (body: ReturnType<typeof holiday>, auth = ownerAuth) => request(app).post(holidaysPath).set('Authorization', auth).send(body)

const listHolidays = async () => {
  const response = await request(app).get(yearsPath).set('Authorization', ownerAuth)
  return response.body.data[0].holidays.map(({ name, start_date, end_date }: ReturnType<typeof holiday>) => ({ name, start_date, end_date }))
}

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const permitted = await createUser({ email: 'permitted@oxford.test' })
  const lecturer = await createUser({ email: 'lecturer@oxford.test' })
  organizationId = (
    await createOrganization({
      name: 'Oxford Academy',
      ownerId: owner.id,
      members: [
        { userId: permitted.id, role: 'ADMIN', permissions: ['MANAGE_ACADEMIC_PERIODS'] },
        { userId: lecturer.id, role: 'LECTURER' },
      ],
    })
  ).id
  yearsPath = `/api/organizations/${organizationId}/academic-periods/years`
  ownerAuth = await loginAs('owner@oxford.test')
  const year = await request(app).post(yearsPath).set('Authorization', ownerAuth).send({ name: '2026–27', start_date: '2026-09-01', end_date: '2027-06-30', is_current: true })
  holidaysPath = `${yearsPath}/${year.body.data.id}/holidays`
  await request(app).post(`${yearsPath}/${year.body.data.id}/terms`).set('Authorization', ownerAuth).send({ name: 'Autumn term', start_date: '2026-09-01', end_date: '2027-01-31' })
})

describe('academic holidays', () => {
  it('adds one-day and longer holidays, overlapping terms, listed in date order', async () => {
    const winter = await addHoliday(holiday('Winter break', '2026-12-24', '2027-01-06'))
    const independence = await addHoliday(holiday('Independence Day', '2027-02-17', '2027-02-17'))
    await addHoliday(holiday('Teachers’ Day', '2026-10-07', '2026-10-07'))

    expect(winter.status).toBe(201)
    expect(independence.status).toBe(201)
    expect(independence.body.data).toMatchObject(holiday('Independence Day', '2027-02-17', '2027-02-17'))
    expect(await listHolidays()).toEqual([
      holiday('Teachers’ Day', '2026-10-07', '2026-10-07'),
      holiday('Winter break', '2026-12-24', '2027-01-06'),
      holiday('Independence Day', '2027-02-17', '2027-02-17'),
    ])
  })

  it('refuses a holiday that falls outside its year', async () => {
    expect((await addHoliday(holiday('Summer', '2027-06-25', '2027-08-31'))).status).toBe(400)
    expect(await listHolidays()).toEqual([])
  })

  it('refuses a holiday that ends before it starts', async () => {
    expect((await addHoliday(holiday('Backwards', '2027-01-06', '2026-12-24'))).status).toBe(400)
  })

  it('edits and deletes a holiday', async () => {
    const winter = (await addHoliday(holiday('Winter break', '2026-12-24', '2027-01-06'))).body.data

    const edited = await request(app).put(`${holidaysPath}/${winter.id}`).set('Authorization', ownerAuth).send(holiday('Winter holidays', '2026-12-23', '2027-01-07'))
    expect(edited.status).toBe(200)
    expect(edited.body.data).toMatchObject(holiday('Winter holidays', '2026-12-23', '2027-01-07'))

    expect((await request(app).delete(`${holidaysPath}/${winter.id}`).set('Authorization', ownerAuth)).status).toBe(200)
    expect(await listHolidays()).toEqual([])
  })

  it('answers 404 for a holiday that does not exist', async () => {
    const missing = '00000000-0000-4000-8000-000000000000'

    expect((await request(app).put(`${holidaysPath}/${missing}`).set('Authorization', ownerAuth).send(holiday('Winter break', '2026-12-24', '2027-01-06'))).status).toBe(404)
    expect((await request(app).delete(`${holidaysPath}/${missing}`).set('Authorization', ownerAuth)).status).toBe(404)
  })

  it('lets a school admin with the permission make changes, and refuses a lecturer', async () => {
    expect((await addHoliday(holiday('Winter break', '2026-12-24', '2027-01-06'), await loginAs('permitted@oxford.test'))).status).toBe(201)
    expect((await addHoliday(holiday('Spring break', '2027-04-01', '2027-04-07'), await loginAs('lecturer@oxford.test'))).status).toBe(403)
  })

  it('writes every change to the activity log with who did it', async () => {
    const auth = await loginAs('permitted@oxford.test')
    const winter = (await addHoliday(holiday('Winter break', '2026-12-24', '2027-01-06'), auth)).body.data
    await request(app).put(`${holidaysPath}/${winter.id}`).set('Authorization', auth).send(holiday('Winter holidays', '2026-12-24', '2027-01-06'))
    await request(app).delete(`${holidaysPath}/${winter.id}`).set('Authorization', auth)

    const entries = await prisma.activityLog.findMany({
      where: { organization_id: organizationId, action: { in: ['ACADEMIC_HOLIDAY_CREATED', 'ACADEMIC_HOLIDAY_UPDATED', 'ACADEMIC_HOLIDAY_REMOVED'] } },
      orderBy: { created_at: 'asc' },
      select: { action: true, subject_name: true, actor: { select: { email: true } } },
    })
    expect(entries).toEqual([
      { action: 'ACADEMIC_HOLIDAY_CREATED', subject_name: 'Winter break', actor: { email: 'permitted@oxford.test' } },
      { action: 'ACADEMIC_HOLIDAY_UPDATED', subject_name: 'Winter holidays', actor: { email: 'permitted@oxford.test' } },
      { action: 'ACADEMIC_HOLIDAY_REMOVED', subject_name: 'Winter holidays', actor: { email: 'permitted@oxford.test' } },
    ])
  })

  it('shows academic period changes in the organization’s activity feed', async () => {
    await addHoliday(holiday('Winter break', '2026-12-24', '2027-01-06'))

    const response = await request(app).get(`/api/organizations/${organizationId}/overview`).set('Authorization', ownerAuth)

    expect(response.body.data.activity.map(({ action, subject_name }: { action: string; subject_name: string }) => ({ action, subject_name }))).toEqual([
      { action: 'ACADEMIC_HOLIDAY_CREATED', subject_name: 'Winter break' },
      { action: 'ACADEMIC_TERM_CREATED', subject_name: 'Autumn term' },
      { action: 'ACADEMIC_YEAR_CREATED', subject_name: '2026–27' },
    ])
  })
})
