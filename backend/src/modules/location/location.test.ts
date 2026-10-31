import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let organizationId: string
let locationsPath: string
let ownerAuth: string

const location = (name: string, isMain = false) => ({ name, address: '', city: 'Prishtina', phone: '', is_main: isMain })

const addLocation = async (name: string, isMain = false) => {
  const response = await request(app).post(locationsPath).set('Authorization', ownerAuth).send(location(name, isMain))
  return response.body.data
}

const listLocations = async () => {
  const response = await request(app).get(locationsPath).set('Authorization', ownerAuth)
  return response.body.data.map(({ name, is_main }: { name: string; is_main: boolean }) => ({ name, is_main }))
}

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  organizationId = (await createOrganization({ name: 'Oxford Academy', ownerId: owner.id, members: [{ userId: admin.id, role: 'ADMIN' }] })).id
  locationsPath = `/api/organizations/${organizationId}/locations`
  ownerAuth = await loginAs('owner@oxford.test')
})

describe('locations', () => {
  it('makes the first location the main one, even when not asked', async () => {
    const created = await addLocation('Main campus')

    expect(created).toMatchObject({ name: 'Main campus', city: 'Prishtina', address: null, phone: null, is_main: true })
  })

  it('keeps one main location when another is made main', async () => {
    await addLocation('Main campus')
    const branch = await addLocation('Peja branch')
    expect(await listLocations()).toEqual([
      { name: 'Main campus', is_main: true },
      { name: 'Peja branch', is_main: false },
    ])

    const response = await request(app).put(`${locationsPath}/${branch.id}`).set('Authorization', ownerAuth).send(location('Peja branch', true))

    expect(response.status).toBe(200)
    expect(await listLocations()).toEqual([
      { name: 'Peja branch', is_main: true },
      { name: 'Main campus', is_main: false },
    ])
  })

  it('refuses to unset the main location without choosing another', async () => {
    const main = await addLocation('Main campus')

    const response = await request(app).put(`${locationsPath}/${main.id}`).set('Authorization', ownerAuth).send(location('Main campus', false))

    expect(response.status).toBe(409)
  })

  it('refuses to remove the main location without a replacement, and removes it with one', async () => {
    const main = await addLocation('Main campus')
    const branch = await addLocation('Peja branch')

    expect((await request(app).delete(`${locationsPath}/${main.id}`).set('Authorization', ownerAuth)).status).toBe(409)

    const response = await request(app).delete(`${locationsPath}/${main.id}`).query({ newMainId: branch.id }).set('Authorization', ownerAuth)

    expect(response.status).toBe(200)
    expect(await listLocations()).toEqual([{ name: 'Peja branch', is_main: true }])
  })

  it('removes the last location without asking for a replacement', async () => {
    const main = await addLocation('Main campus')

    expect((await request(app).delete(`${locationsPath}/${main.id}`).set('Authorization', ownerAuth)).status).toBe(200)
    expect(await listLocations()).toEqual([])
  })

  it('refuses a replacement from another organization', async () => {
    const main = await addLocation('Main campus')
    await addLocation('Peja branch')
    const otherOwner = await createUser({ email: 'owner@yllka.test' })
    const other = await createOrganization({ name: 'Yllka Kindergarten', ownerId: otherOwner.id })
    const otherLocation = await request(app)
      .post(`/api/organizations/${other.id}/locations`)
      .set('Authorization', await loginAs('owner@yllka.test'))
      .send(location('Yllka campus'))

    const response = await request(app).delete(`${locationsPath}/${main.id}`).query({ newMainId: otherLocation.body.data.id }).set('Authorization', ownerAuth)

    expect(response.status).toBe(400)
  })

  it('does not reach another organization’s location through its own path', async () => {
    const otherOwner = await createUser({ email: 'owner@yllka.test' })
    const other = await createOrganization({ name: 'Yllka Kindergarten', ownerId: otherOwner.id })
    const otherLocation = await request(app)
      .post(`/api/organizations/${other.id}/locations`)
      .set('Authorization', await loginAs('owner@yllka.test'))
      .send(location('Yllka campus'))

    const response = await request(app).put(`${locationsPath}/${otherLocation.body.data.id}`).set('Authorization', ownerAuth).send(location('Taken'))

    expect(response.status).toBe(404)
  })

  it('lets a school admin read but not change locations', async () => {
    await addLocation('Main campus')
    const adminAuth = await loginAs('admin@oxford.test')

    expect((await request(app).get(locationsPath).set('Authorization', adminAuth)).status).toBe(200)
    expect((await request(app).post(locationsPath).set('Authorization', adminAuth).send(location('Peja branch'))).status).toBe(403)
  })

  it('refuses the owner of another organization', async () => {
    const otherOwner = await createUser({ email: 'owner@yllka.test' })
    await createOrganization({ name: 'Yllka Kindergarten', ownerId: otherOwner.id })
    const otherAuth = await loginAs('owner@yllka.test')

    expect((await request(app).get(locationsPath).set('Authorization', otherAuth)).status).toBe(403)
    expect((await request(app).post(locationsPath).set('Authorization', otherAuth).send(location('Peja branch'))).status).toBe(403)
  })

  it('logs each change with the location’s name', async () => {
    const main = await addLocation('Main campus')
    await request(app).put(`${locationsPath}/${main.id}`).set('Authorization', ownerAuth).send(location('Prishtina campus', true))
    await request(app).delete(`${locationsPath}/${main.id}`).set('Authorization', ownerAuth)

    const overview = await request(app).get(`/api/organizations/${organizationId}/overview`).set('Authorization', ownerAuth)

    expect(overview.body.data.activity.map(({ action, subject_name }: { action: string; subject_name: string }) => [action, subject_name])).toEqual([
      ['LOCATION_REMOVED', 'Prishtina campus'],
      ['LOCATION_UPDATED', 'Prishtina campus'],
      ['LOCATION_CREATED', 'Main campus'],
    ])
  })
})
