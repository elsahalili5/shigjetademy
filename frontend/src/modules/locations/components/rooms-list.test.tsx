import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { roomSchema } from '@shigjetademy/shared/rooms'
import type { OrganizationRoom } from '@shigjetademy/shared/rooms'
import type { OrganizationLocation } from '@shigjetademy/shared/location'
import { buildUser, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const MAIN_CAMPUS: OrganizationLocation = {
  id: '6f1c2f43-0d1e-4c55-9a3e-6b1f0c2a1a01',
  name: 'Main campus',
  address: null,
  city: null,
  phone: null,
  is_main: true,
  created_at: '2026-10-01T09:00:00.000Z',
}

const PEJA_BRANCH: OrganizationLocation = {
  id: '6f1c2f43-0d1e-4c55-9a3e-6b1f0c2a1a02',
  name: 'Peja branch',
  address: null,
  city: null,
  phone: null,
  is_main: false,
  created_at: '2026-10-02T09:00:00.000Z',
}

const ROOM_101: OrganizationRoom = { id: '7a2d3e54-1e2f-4d66-8b4f-7c2a1d3b2b01', name: 'Room 101', capacity: 30, location_id: MAIN_CAMPUS.id, created_at: '2026-10-03T09:00:00.000Z' }

const ROOM_201: OrganizationRoom = { id: '7a2d3e54-1e2f-4d66-8b4f-7c2a1d3b2b02', name: 'Room 201', capacity: null, location_id: PEJA_BRANCH.id, created_at: '2026-10-04T09:00:00.000Z' }

const LOCATIONS_PATH = '*/api/organizations/org-1/locations'
const DEPARTMENTS_PATH = '*/api/organizations/org-1/departments'
const MAIN_ROOMS_PATH = `*/api/organizations/org-1/locations/${MAIN_CAMPUS.id}/rooms`
const PEJA_ROOMS_PATH = `*/api/organizations/org-1/locations/${PEJA_BRANCH.id}/rooms`

type ServeParams = {
  mainRooms?: OrganizationRoom[]
  pejaRooms?: OrganizationRoom[]
}

const serveLocations = ({ mainRooms = [ROOM_101], pejaRooms = [ROOM_201] }: ServeParams = {}) =>
  server.use(
    http.get(LOCATIONS_PATH, () => HttpResponse.json({ data: [MAIN_CAMPUS, PEJA_BRANCH] })),
    http.get(DEPARTMENTS_PATH, () => HttpResponse.json({ data: [] })),
    http.get(MAIN_ROOMS_PATH, () => HttpResponse.json({ data: mainRooms })),
    http.get(PEJA_ROOMS_PATH, () => HttpResponse.json({ data: pejaRooms })),
  )

const signInAsOwner = (params?: ServeParams) => {
  signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
  serveLocations(params)
}

const mainCampusRow = async () => (await within(await screen.findByRole('region', { name: 'Locations' })).findAllByRole('listitem'))[0]

const mainCampusRooms = async () => within(await mainCampusRow()).findByRole('list', { name: 'Rooms' })

describe('LocationsPage: rooms', () => {
  it('lists each location’s own rooms, scoped to it', async () => {
    signInAsOwner()
    renderRoute('/dashboard/locations')

    const main = await mainCampusRow()
    expect(await within(main).findByText('Room 101')).toBeInTheDocument()
    expect(within(main).getByText('30 seats')).toBeInTheDocument()
    expect(within(main).queryByText('Room 201')).not.toBeInTheDocument()
  })

  it('says when a location has no rooms yet', async () => {
    signInAsOwner({ mainRooms: [] })
    renderRoute('/dashboard/locations')

    const main = await mainCampusRow()
    expect(await within(main).findByText('No rooms yet.')).toBeInTheDocument()
  })

  it('adds a room to a location', async () => {
    signInAsOwner({ mainRooms: [] })
    server.use(
      http.post(MAIN_ROOMS_PATH, async ({ request }) => {
        const body = roomSchema.parse(await request.json())
        return HttpResponse.json({ data: { ...ROOM_101, ...body } }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/locations')

    const main = await mainCampusRow()
    await user.click(within(main).getByRole('button', { name: 'Add room' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a room' })
    await user.type(within(dialog).getByLabelText('Name'), 'Room 101')
    await user.click(within(dialog).getByRole('button', { name: 'Add room' }))

    expect(await screen.findByText('Saved Room 101.')).toBeInTheDocument()
    expect(within(main).getByText('Room 101')).toBeInTheDocument()
  })

  it('renames a room', async () => {
    signInAsOwner()
    server.use(http.put(`${MAIN_ROOMS_PATH}/${ROOM_101.id}`, () => HttpResponse.json({ data: { ...ROOM_101, name: 'Room 101A' } })))
    const { user } = renderRoute('/dashboard/locations')

    const rooms = await mainCampusRooms()
    await user.click(within(rooms).getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Room 101' })
    const name = within(dialog).getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Room 101A')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saved Room 101A.')).toBeInTheDocument()
    expect(within(rooms).getByText('Room 101A')).toBeInTheDocument()
  })

  it('removes a room after confirming', async () => {
    signInAsOwner()
    server.use(http.delete(`${MAIN_ROOMS_PATH}/${ROOM_101.id}`, () => HttpResponse.json({ message: 'Room removed' })))
    const { user } = renderRoute('/dashboard/locations')

    const rooms = await mainCampusRooms()
    await user.click(within(rooms).getByRole('button', { name: 'Remove' }))
    await user.click(within(rooms).getByRole('button', { name: 'Remove' }))

    expect(await screen.findByText('Removed Room 101.')).toBeInTheDocument()
    expect(within(await mainCampusRow()).getByText('No rooms yet.')).toBeInTheDocument()
  })

  it('shows a school admin the rooms without anything to change', async () => {
    signInAs(buildUser({ memberships: [{ ...OWNER_MEMBERSHIPS[0], role: 'ADMIN' }] }))
    serveLocations()
    renderRoute('/dashboard/locations')

    const main = await mainCampusRow()
    expect(await within(main).findByText('Room 101')).toBeInTheDocument()
    expect(within(main).queryByRole('button', { name: 'Add room' })).not.toBeInTheDocument()
  })
})
