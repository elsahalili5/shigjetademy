import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { app } from '../../app.ts'
import { createOrganization, createUser, loginAs } from '../../../test/factories.ts'

let organizationId: string
let locationId: string
let roomsPath: string
let ownerAuth: string

const room = (name: string, capacity: number | null = null) => ({ name, capacity })

beforeEach(async () => {
  const owner = await createUser({ email: 'owner@oxford.test' })
  const admin = await createUser({ email: 'admin@oxford.test' })
  organizationId = (await createOrganization({ name: 'Oxford Academy', ownerId: owner.id, members: [{ userId: admin.id, role: 'ADMIN' }] })).id
  ownerAuth = await loginAs('owner@oxford.test')
  const location = await request(app)
    .post(`/api/organizations/${organizationId}/locations`)
    .set('Authorization', ownerAuth)
    .send({ name: 'Main campus', address: '', city: '', phone: '', is_main: false })
  locationId = location.body.data.id
  roomsPath = `/api/organizations/${organizationId}/locations/${locationId}/rooms`
})

const addRoom = (body: ReturnType<typeof room>) => request(app).post(roomsPath).set('Authorization', ownerAuth).send(body)

describe('rooms', () => {
  it('adds a room at a location and lists it', async () => {
    const created = await addRoom(room('Room 101', 30))

    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({ name: 'Room 101', capacity: 30, location_id: locationId })
    const list = await request(app).get(roomsPath).set('Authorization', ownerAuth)
    expect(list.body.data).toEqual([expect.objectContaining({ name: 'Room 101', capacity: 30 })])
  })

  it('adds a room without a capacity', async () => {
    const created = await addRoom(room('Room 102'))

    expect(created.status).toBe(201)
    expect(created.body.data).toMatchObject({ name: 'Room 102', capacity: null })
  })

  it('refuses a location from another organization', async () => {
    const otherOwner = await createUser({ email: 'owner@yllka.test' })
    const other = await createOrganization({ name: 'Yllka Kindergarten', ownerId: otherOwner.id })

    const response = await request(app)
      .post(`/api/organizations/${other.id}/locations/${locationId}/rooms`)
      .set('Authorization', await loginAs('owner@yllka.test'))
      .send(room('Room 101'))

    expect(response.status).toBe(404)
  })

  it('renames a room', async () => {
    const created = (await addRoom(room('Room 101'))).body.data

    const response = await request(app).put(`${roomsPath}/${created.id}`).set('Authorization', ownerAuth).send(room('Room 101A', 25))

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({ name: 'Room 101A', capacity: 25 })
  })

  it('removes a room', async () => {
    const created = (await addRoom(room('Room 101'))).body.data

    expect((await request(app).delete(`${roomsPath}/${created.id}`).set('Authorization', ownerAuth)).status).toBe(200)
    expect((await request(app).get(roomsPath).set('Authorization', ownerAuth)).body.data).toEqual([])
  })

  it('still deletes an organization with a location and rooms', async () => {
    await addRoom(room('Room 101'))

    const response = await request(app).delete(`/api/organizations/${organizationId}`).set('Authorization', ownerAuth)

    expect(response.status).toBeLessThan(500)
  })

  it('lets a school admin read but not change rooms, and refuses another organization’s owner', async () => {
    const created = (await addRoom(room('Room 101'))).body.data
    const adminAuth = await loginAs('admin@oxford.test')
    const otherOwner = await createUser({ email: 'owner@yllka.test' })
    await createOrganization({ name: 'Yllka Kindergarten', ownerId: otherOwner.id })
    const otherAuth = await loginAs('owner@yllka.test')

    expect((await request(app).get(roomsPath).set('Authorization', adminAuth)).status).toBe(200)
    expect((await request(app).post(roomsPath).set('Authorization', adminAuth).send(room('Room 102'))).status).toBe(403)
    expect((await request(app).delete(`${roomsPath}/${created.id}`).set('Authorization', adminAuth)).status).toBe(403)
    expect((await request(app).get(roomsPath).set('Authorization', otherAuth)).status).toBe(403)
  })

  it('lists every room of the organization, across its locations, for the group room picker', async () => {
    await addRoom(room('Room 101'))
    const otherLocation = (
      await request(app)
        .post(`/api/organizations/${organizationId}/locations`)
        .set('Authorization', ownerAuth)
        .send({ name: 'Peja branch', address: '', city: '', phone: '', is_main: false })
    ).body.data
    await request(app).post(`/api/organizations/${organizationId}/locations/${otherLocation.id}/rooms`).set('Authorization', ownerAuth).send(room('Room 201'))

    const response = await request(app).get(`/api/organizations/${organizationId}/rooms`).set('Authorization', ownerAuth)

    expect(response.status).toBe(200)
    expect(response.body.data).toEqual([
      expect.objectContaining({ name: 'Room 101', location: expect.objectContaining({ name: 'Main campus' }) }),
      expect.objectContaining({ name: 'Room 201', location: expect.objectContaining({ name: 'Peja branch' }) }),
    ])
  })
})
