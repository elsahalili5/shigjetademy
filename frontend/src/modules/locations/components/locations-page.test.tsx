import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { departmentSchema, locationSchema } from '@shigjetademy/shared/location'
import type { OrganizationDepartment, OrganizationLocation } from '@shigjetademy/shared/location'
import { buildUser, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const MAIN_CAMPUS: OrganizationLocation = {
  id: '6f1c2f43-0d1e-4c55-9a3e-6b1f0c2a1a01',
  name: 'Main campus',
  address: 'Rr. Agim Ramadani 15',
  city: 'Prishtina',
  phone: null,
  is_main: true,
  created_at: '2026-10-01T09:00:00.000Z',
}

const PEJA_BRANCH: OrganizationLocation = {
  id: '6f1c2f43-0d1e-4c55-9a3e-6b1f0c2a1a02',
  name: 'Peja branch',
  address: null,
  city: 'Peja',
  phone: '+383 39 432 100',
  is_main: false,
  created_at: '2026-10-02T09:00:00.000Z',
}

const LANGUAGES: OrganizationDepartment = {
  id: '7a2d3e54-1e2f-4d66-8b4f-7c2a1d3b2b01',
  name: 'Languages',
  description: 'English and German',
  location_id: PEJA_BRANCH.id,
  created_at: '2026-10-03T09:00:00.000Z',
}

const SCIENCES: OrganizationDepartment = {
  id: '7a2d3e54-1e2f-4d66-8b4f-7c2a1d3b2b02',
  name: 'Sciences',
  description: null,
  location_id: null,
  created_at: '2026-10-04T09:00:00.000Z',
}

const LOCATIONS_PATH = '*/api/organizations/org-1/locations'
const DEPARTMENTS_PATH = '*/api/organizations/org-1/departments'

const [OWNER_MEMBERSHIP] = OWNER_MEMBERSHIPS

type ServeParams = {
  locations?: OrganizationLocation[]
  departments?: OrganizationDepartment[]
}

const serveLocations = ({ locations = [MAIN_CAMPUS, PEJA_BRANCH], departments = [] }: ServeParams = {}) =>
  server.use(
    http.get(LOCATIONS_PATH, () => HttpResponse.json({ data: locations })),
    http.get(DEPARTMENTS_PATH, () => HttpResponse.json({ data: departments })),
  )

const signInAsOwner = (params?: ServeParams) => {
  signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
  serveLocations(params)
}

const locationsRegion = () => screen.findByRole('region', { name: 'Locations' })

const departmentsRegion = () => screen.findByRole('region', { name: 'Departments' })

describe('LocationsPage: locations', () => {
  it('lists the locations with the main one marked', async () => {
    signInAsOwner()
    renderRoute('/dashboard/locations')

    const [main, branch] = await within(await locationsRegion()).findAllByRole('listitem')
    expect(main).toHaveTextContent('Main campus')
    expect(main).toHaveTextContent('Main location')
    expect(main).toHaveTextContent('Rr. Agim Ramadani 15, Prishtina')
    expect(branch).toHaveTextContent('Peja · +383 39 432 100')
    expect(branch).not.toHaveTextContent('Main location')
  })

  it('says when there are no locations yet, and adds the first one as main', async () => {
    signInAsOwner({ locations: [] })
    server.use(
      http.post(LOCATIONS_PATH, async ({ request }) => {
        const body = locationSchema.parse(await request.json())
        return HttpResponse.json({ data: { ...MAIN_CAMPUS, ...body, address: null, phone: null, is_main: true } }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/locations')

    const region = await locationsRegion()
    expect(await within(region).findByText('No locations yet.')).toBeInTheDocument()
    await user.click(within(region).getByRole('button', { name: 'Add location' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a location' })
    expect(within(dialog).getByRole('checkbox', { name: 'Main location' })).toBeChecked()
    await user.type(within(dialog).getByLabelText('Name'), 'Main campus')
    await user.type(within(dialog).getByLabelText('City'), 'Prishtina')
    await user.click(within(dialog).getByRole('button', { name: 'Add location' }))

    expect(await screen.findByText('Added Main campus.')).toBeInTheDocument()
    expect(within(region).getByRole('listitem')).toHaveTextContent('Main location')
  })

  it('asks for a name', async () => {
    signInAsOwner()
    const { user } = renderRoute('/dashboard/locations')

    await user.click(await within(await locationsRegion()).findByRole('button', { name: 'Add location' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a location' })
    await user.click(within(dialog).getByRole('button', { name: 'Add location' }))

    expect(within(dialog).getByText('Enter the location’s name.')).toBeInTheDocument()
  })

  it('makes another location the main one when editing it', async () => {
    signInAsOwner()
    server.use(http.put(`${LOCATIONS_PATH}/${PEJA_BRANCH.id}`, () => HttpResponse.json({ data: { ...PEJA_BRANCH, is_main: true } })))
    const { user } = renderRoute('/dashboard/locations')

    const region = await locationsRegion()
    const [, branch] = await within(region).findAllByRole('listitem')
    await user.click(within(branch).getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Peja branch' })
    await user.click(within(dialog).getByRole('checkbox', { name: 'Main location' }))
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saved Peja branch.')).toBeInTheDocument()
    const [first, second] = within(region).getAllByRole('listitem')
    expect(first).toHaveTextContent('Peja branchMain location')
    expect(second).not.toHaveTextContent('Main location')
  })

  it('shows the server’s message in the form when saving fails', async () => {
    signInAsOwner()
    server.use(http.put(`${LOCATIONS_PATH}/${PEJA_BRANCH.id}`, () => HttpResponse.json({ error: 'Location not found' }, { status: 404 })))
    const { user } = renderRoute('/dashboard/locations')

    const [, branch] = await within(await locationsRegion()).findAllByRole('listitem')
    await user.click(within(branch).getByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Peja branch' })
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Location not found')
  })

  it('removes a location after confirming', async () => {
    signInAsOwner()
    server.use(http.delete(`${LOCATIONS_PATH}/${PEJA_BRANCH.id}`, () => HttpResponse.json({ message: 'Location removed' })))
    const { user } = renderRoute('/dashboard/locations')

    const region = await locationsRegion()
    const [, branch] = await within(region).findAllByRole('listitem')
    await user.click(within(branch).getByRole('button', { name: 'Remove' }))
    await user.click(within(branch).getByRole('button', { name: 'Remove' }))

    expect(await screen.findByText('Removed Peja branch.')).toBeInTheDocument()
    expect(within(region).getAllByRole('listitem')).toHaveLength(1)
  })

  it('asks for a new main location before removing the main one', async () => {
    signInAsOwner()
    let newMainId: string | null = null
    server.use(
      http.delete(`${LOCATIONS_PATH}/${MAIN_CAMPUS.id}`, ({ request }) => {
        newMainId = new URL(request.url).searchParams.get('newMainId')
        return HttpResponse.json({ message: 'Location removed' })
      }),
    )
    const { user } = renderRoute('/dashboard/locations')

    const region = await locationsRegion()
    const [main] = await within(region).findAllByRole('listitem')
    await user.click(within(main).getByRole('button', { name: 'Remove' }))
    await user.selectOptions(within(main).getByRole('combobox', { name: 'New main location' }), 'Peja branch')
    await user.click(within(main).getByRole('button', { name: 'Remove' }))

    expect(await screen.findByText('Removed Main campus. Peja branch is now the main location.')).toBeInTheDocument()
    expect(newMainId).toBe(PEJA_BRANCH.id)
    expect(within(region).getByRole('listitem')).toHaveTextContent('Peja branchMain location')
  })

  it('shows a toast when removing fails', async () => {
    signInAsOwner()
    server.use(http.delete(`${LOCATIONS_PATH}/${PEJA_BRANCH.id}`, () => HttpResponse.json({ error: 'This organization is suspended' }, { status: 403 })))
    const { user } = renderRoute('/dashboard/locations')

    const [, branch] = await within(await locationsRegion()).findAllByRole('listitem')
    await user.click(within(branch).getByRole('button', { name: 'Remove' }))
    await user.click(within(branch).getByRole('button', { name: 'Remove' }))

    expect(await screen.findByText('This organization is suspended')).toBeInTheDocument()
  })

  it('shows a school admin the locations without anything to change', async () => {
    signInAs(buildUser({ memberships: [{ ...OWNER_MEMBERSHIP, role: 'ADMIN' }] }))
    serveLocations({ departments: [LANGUAGES] })
    renderRoute('/dashboard/locations')

    const region = await locationsRegion()
    expect(await within(region).findByText('Main campus')).toBeInTheDocument()
    expect(await within(await departmentsRegion()).findByText('Languages')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add|Edit|Remove/ })).not.toBeInTheDocument()
  })

  it('offers to try again when locations fail to load', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    server.use(
      http.get(LOCATIONS_PATH, () => HttpResponse.json({ error: 'Failed' }, { status: 500 })),
      http.get('*/api/organizations/org-1/departments', () => HttpResponse.json({ data: [] })),
    )
    renderRoute('/dashboard/locations')

    const region = await locationsRegion()
    expect(await within(region).findByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(within(region).queryByRole('button', { name: 'Add location' })).not.toBeInTheDocument()
  })

  it('only offers adding a location once the list has loaded', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    server.use(
      http.get(LOCATIONS_PATH, () => new Promise<never>(() => {})),
      http.get(DEPARTMENTS_PATH, () => HttpResponse.json({ data: [] })),
    )
    renderRoute('/dashboard/locations')

    const region = await locationsRegion()
    expect(within(region).getByRole('list', { name: 'Loading' })).toBeInTheDocument()
    expect(within(region).queryByRole('button', { name: 'Add location' })).not.toBeInTheDocument()
  })

  it('does not make a new location main when others exist', async () => {
    signInAsOwner()
    const { user } = renderRoute('/dashboard/locations')

    const region = await locationsRegion()
    await within(region).findAllByRole('listitem')
    await user.click(within(region).getByRole('button', { name: 'Add location' }))

    expect(within(screen.getByRole('dialog', { name: 'Add a location' })).getByRole('checkbox', { name: 'Main location' })).not.toBeChecked()
  })
})

describe('LocationsPage: departments', () => {
  it('lists the departments with the location each belongs to', async () => {
    signInAsOwner({ departments: [LANGUAGES, SCIENCES] })
    renderRoute('/dashboard/locations')

    const [languages, sciences] = await within(await departmentsRegion()).findAllByRole('listitem')
    expect(languages).toHaveTextContent('Languages')
    expect(languages).toHaveTextContent('Peja branch · English and German')
    expect(sciences).toHaveTextContent('No location')
  })

  it('says when there are no departments yet', async () => {
    signInAsOwner()
    renderRoute('/dashboard/locations')

    expect(await within(await departmentsRegion()).findByText('No departments yet.')).toBeInTheDocument()
  })

  it('adds a department at a location', async () => {
    signInAsOwner()
    server.use(
      http.post(DEPARTMENTS_PATH, async ({ request }) => {
        const body = departmentSchema.parse(await request.json())
        return HttpResponse.json({ data: { ...LANGUAGES, ...body, description: body.description || null } }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/locations')

    const region = await departmentsRegion()
    await user.click(within(region).getByRole('button', { name: 'Add department' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a department' })
    await user.type(within(dialog).getByLabelText('Name'), 'Languages')
    await user.selectOptions(within(dialog).getByRole('combobox', { name: /^Location/ }), 'Main campus')
    await user.click(within(dialog).getByRole('button', { name: 'Add department' }))

    expect(await screen.findByText('Added Languages.')).toBeInTheDocument()
    expect(within(region).getByRole('listitem')).toHaveTextContent('Main campus')
  })

  it('shows the server’s message in the form when the name is taken', async () => {
    signInAsOwner({ departments: [LANGUAGES] })
    server.use(http.post(DEPARTMENTS_PATH, () => HttpResponse.json({ error: 'There is already a department with this name' }, { status: 409 })))
    const { user } = renderRoute('/dashboard/locations')

    await user.click(within(await departmentsRegion()).getByRole('button', { name: 'Add department' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a department' })
    await user.type(within(dialog).getByLabelText('Name'), 'languages')
    await user.click(within(dialog).getByRole('button', { name: 'Add department' }))

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('There is already a department with this name')
  })

  it('edits a department', async () => {
    signInAsOwner({ departments: [LANGUAGES] })
    server.use(http.put(`${DEPARTMENTS_PATH}/${LANGUAGES.id}`, () => HttpResponse.json({ data: { ...LANGUAGES, name: 'Foreign languages', location_id: null } })))
    const { user } = renderRoute('/dashboard/locations')

    const region = await departmentsRegion()
    await user.click(await within(region).findByRole('button', { name: 'Edit' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Languages' })
    expect(within(dialog).getByRole('combobox', { name: /^Location/ })).toHaveDisplayValue('Peja branch')
    const name = within(dialog).getByLabelText('Name')
    await user.clear(name)
    await user.type(name, 'Foreign languages')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saved Foreign languages.')).toBeInTheDocument()
    expect(within(region).getByRole('listitem')).toHaveTextContent('Foreign languagesNo location')
  })

  it('removes a department after confirming', async () => {
    signInAsOwner({ departments: [LANGUAGES] })
    server.use(http.delete(`${DEPARTMENTS_PATH}/${LANGUAGES.id}`, () => HttpResponse.json({ message: 'Department removed' })))
    const { user } = renderRoute('/dashboard/locations')

    const region = await departmentsRegion()
    const row = await within(region).findByRole('listitem')
    await user.click(within(row).getByRole('button', { name: 'Remove' }))
    await user.click(within(row).getByRole('button', { name: 'Remove' }))

    expect(await screen.findByText('Removed Languages.')).toBeInTheDocument()
    expect(within(region).getByText('No departments yet.')).toBeInTheDocument()
  })

  it('keeps a department without a location when its location is removed', async () => {
    signInAsOwner({ departments: [LANGUAGES] })
    server.use(http.delete(`${LOCATIONS_PATH}/${PEJA_BRANCH.id}`, () => HttpResponse.json({ message: 'Location removed' })))
    const { user } = renderRoute('/dashboard/locations')

    const [, branch] = await within(await locationsRegion()).findAllByRole('listitem')
    await user.click(within(branch).getByRole('button', { name: 'Remove' }))
    await user.click(within(branch).getByRole('button', { name: 'Remove' }))

    await screen.findByText('Removed Peja branch.')
    expect(within(await departmentsRegion()).getByRole('listitem')).toHaveTextContent('LanguagesNo location')
  })
})
