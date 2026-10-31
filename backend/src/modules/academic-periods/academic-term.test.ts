import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { prisma } from '@lib/prisma.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let yearsPath: string
let termsPath: string
let ownerAuth: string
let organizationId: string
let yearId: string

const term = (name: string, start_date: string, end_date: string) => ({ name, start_date, end_date })

const addTerm = (body: ReturnType<typeof term>, auth = ownerAuth) => request(app).post(termsPath).set('Authorization', auth).send(body)

const listTerms = async () => {
  const response = await request(app).get(yearsPath).set('Authorization', ownerAuth)
  return response.body.data[0].terms.map(({ name, start_date, end_date }: ReturnType<typeof term>) => ({ name, start_date, end_date }))
}

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const lecturer = await createUser({ email: 'lecturer@oxford.test' })
  organizationId = (await createOrganization({ name: 'Oxford Academy', ownerId: owner.id, members: [{ userId: lecturer.id, role: 'LECTURER' }] })).id
  yearsPath = `/api/organizations/${organizationId}/academic-periods/years`
  ownerAuth = await loginAs('owner@oxford.test')
  const year = await request(app).post(yearsPath).set('Authorization', ownerAuth).send({ name: '2026–27', start_date: '2026-09-01', end_date: '2027-06-30', is_current: true })
  yearId = year.body.data.id
  termsPath = `${yearsPath}/${yearId}/terms`
})

describe('academic terms', () => {
  it('adds terms inside the year and lists them in date order under it', async () => {
    const spring = await addTerm(term('Spring term', '2027-02-01', '2027-06-30'))
    await addTerm(term('Autumn term', '2026-09-01', '2027-01-31'))

    expect(spring.status).toBe(201)
    expect(spring.body.data).toMatchObject({ name: 'Spring term', start_date: '2027-02-01', end_date: '2027-06-30' })
    expect(await listTerms()).toEqual([term('Autumn term', '2026-09-01', '2027-01-31'), term('Spring term', '2027-02-01', '2027-06-30')])
  })

  it('refuses a term that falls outside its year', async () => {
    expect((await addTerm(term('Early', '2026-08-25', '2026-12-20'))).status).toBe(400)
    expect((await addTerm(term('Late', '2027-03-01', '2027-07-10'))).status).toBe(400)
    expect(await listTerms()).toEqual([])
  })

  it('refuses a term that overlaps another term of the year', async () => {
    await addTerm(term('Autumn term', '2026-09-01', '2027-01-31'))

    const response = await addTerm(term('Spring term', '2027-01-31', '2027-06-30'))

    expect(response.status).toBe(409)
  })

  it('refuses a term that ends before it starts, or on the same day', async () => {
    expect((await addTerm(term('Backwards', '2027-01-31', '2026-09-01'))).status).toBe(400)
    expect((await addTerm(term('One day', '2026-09-01', '2026-09-01'))).status).toBe(400)
  })

  it('edits a term without counting it as overlapping itself, and refuses an overlapping edit', async () => {
    const autumn = (await addTerm(term('Autumn term', '2026-09-01', '2027-01-31'))).body.data
    const spring = (await addTerm(term('Spring term', '2027-02-01', '2027-06-30'))).body.data

    const edited = await request(app).put(`${termsPath}/${autumn.id}`).set('Authorization', ownerAuth).send(term('First term', '2026-09-07', '2027-01-29'))
    const clashing = await request(app).put(`${termsPath}/${spring.id}`).set('Authorization', ownerAuth).send(term('Spring term', '2027-01-15', '2027-06-30'))

    expect(edited.status).toBe(200)
    expect(edited.body.data).toMatchObject(term('First term', '2026-09-07', '2027-01-29'))
    expect(clashing.status).toBe(409)
  })

  it('deletes a term', async () => {
    const autumn = (await addTerm(term('Autumn term', '2026-09-01', '2027-01-31'))).body.data

    expect((await request(app).delete(`${termsPath}/${autumn.id}`).set('Authorization', ownerAuth)).status).toBe(200)
    expect(await listTerms()).toEqual([])
  })

  it('keeps the year’s dates around its terms', async () => {
    await addTerm(term('Autumn term', '2026-09-01', '2027-01-31'))

    const response = await request(app).put(`${yearsPath}/${yearId}`).set('Authorization', ownerAuth).send({ name: '2026–27', start_date: '2026-09-15', end_date: '2027-06-30', is_current: true })

    expect(response.status).toBe(409)
  })

  it('answers 404 for a term or year that does not exist', async () => {
    const missing = '00000000-0000-4000-8000-000000000000'

    expect((await request(app).post(`${yearsPath}/${missing}/terms`).set('Authorization', ownerAuth).send(term('Autumn term', '2026-09-01', '2027-01-31'))).status).toBe(404)
    expect((await request(app).put(`${termsPath}/${missing}`).set('Authorization', ownerAuth).send(term('Autumn term', '2026-09-01', '2027-01-31'))).status).toBe(404)
    expect((await request(app).delete(`${termsPath}/${missing}`).set('Authorization', ownerAuth)).status).toBe(404)
  })

  it('removes the year’s terms and holidays with it', async () => {
    await addTerm(term('Autumn term', '2026-09-01', '2027-01-31'))
    await prisma.academicHoliday.create({ data: { academic_year_id: yearId, name: 'Winter break', start_date: new Date('2026-12-24'), end_date: new Date('2027-01-06') } })

    expect((await request(app).delete(`${yearsPath}/${yearId}`).set('Authorization', ownerAuth)).status).toBe(200)
    expect(await prisma.academicTerm.count()).toBe(0)
    expect(await prisma.academicHoliday.count()).toBe(0)
  })

  it('refuses changes from a lecturer', async () => {
    const autumn = (await addTerm(term('Autumn term', '2026-09-01', '2027-01-31'))).body.data
    const auth = await loginAs('lecturer@oxford.test')

    expect((await addTerm(term('Spring term', '2027-02-01', '2027-06-30'), auth)).status).toBe(403)
    expect((await request(app).put(`${termsPath}/${autumn.id}`).set('Authorization', auth).send(term('Renamed', '2026-09-01', '2027-01-31'))).status).toBe(403)
    expect((await request(app).delete(`${termsPath}/${autumn.id}`).set('Authorization', auth)).status).toBe(403)
  })

  it('writes every change to the activity log with who did it', async () => {
    const autumn = (await addTerm(term('Autumn term', '2026-09-01', '2027-01-31'))).body.data
    await request(app).put(`${termsPath}/${autumn.id}`).set('Authorization', ownerAuth).send(term('First term', '2026-09-01', '2027-01-31'))
    await request(app).delete(`${termsPath}/${autumn.id}`).set('Authorization', ownerAuth)

    const entries = await prisma.activityLog.findMany({
      where: { organization_id: organizationId, action: { in: ['ACADEMIC_TERM_CREATED', 'ACADEMIC_TERM_UPDATED', 'ACADEMIC_TERM_REMOVED'] } },
      orderBy: { created_at: 'asc' },
      select: { action: true, subject_name: true, actor: { select: { email: true } } },
    })
    expect(entries).toEqual([
      { action: 'ACADEMIC_TERM_CREATED', subject_name: 'Autumn term', actor: { email: 'owner@oxford.test' } },
      { action: 'ACADEMIC_TERM_UPDATED', subject_name: 'First term', actor: { email: 'owner@oxford.test' } },
      { action: 'ACADEMIC_TERM_REMOVED', subject_name: 'First term', actor: { email: 'owner@oxford.test' } },
    ])
  })
})
