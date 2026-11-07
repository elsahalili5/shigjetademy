import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { lecturerSchema } from '@shigjetademy/shared/lecturers'
import type { Lecturer, LecturerPage, LecturerStatus } from '@shigjetademy/shared/lecturers'
import type { OrganizationDepartment, OrganizationLocation } from '@shigjetademy/shared/location'
import { buildUser, OWNER_MEMBERSHIPS, signInAs, YLLKA_ADMIN_MEMBERSHIP } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const MAIN_CAMPUS: OrganizationLocation = {
  id: '3f0c2a1a-6b1f-4c55-9a3e-0d1e9b1c2f01',
  name: 'Main campus',
  address: null,
  city: null,
  phone: null,
  is_main: true,
  created_at: '2026-09-01T09:00:00.000Z',
}

const NORTH_CAMPUS: OrganizationLocation = { ...MAIN_CAMPUS, id: '3f0c2a1a-6b1f-4c55-9a3e-0d1e9b1c2f02', name: 'North campus', is_main: false }

const SCIENCES: OrganizationDepartment = { id: '4a1d3b2b-7c2a-4d66-8b4f-1e2fac2d3e01', name: 'Sciences', description: null, location_id: null, created_at: '2026-09-01T09:00:00.000Z' }

const ARBEN: Lecturer = {
  id: '9b1c2f43-0d1e-4c55-9a3e-6b1f0c2a2b01',
  first_name: 'Arben',
  last_name: 'Hoxha',
  email: 'arben@oxford.test',
  phone: null,
  subjects: ['Mathematics'],
  employment_type: 'FULL_TIME',
  started_on: null,
  notes: null,
  status: 'ACTIVE',
  created_at: '2026-10-01T09:00:00.000Z',
  department: { id: SCIENCES.id, name: 'Sciences' },
  locations: [{ id: MAIN_CAMPUS.id, name: 'Main campus' }],
  login_status: 'NONE',
  invitation: null,
}

const TEUTA: Lecturer = {
  ...ARBEN,
  id: '9b1c2f43-0d1e-4c55-9a3e-6b1f0c2a2b02',
  first_name: 'Teuta',
  last_name: 'Krasniqi',
  email: null,
  subjects: ['English'],
  employment_type: 'PART_TIME',
  department: null,
  locations: [{ id: NORTH_CAMPUS.id, name: 'North campus' }],
}

const LECTURERS_PATH = '*/api/organizations/org-1/lecturers'

type ServeParams = {
  active?: Lecturer[]
  archived?: Lecturer[]
}

/** Answers the list like the server: by status, narrowed by the search and filters, with both counts */
const serveLecturers = ({ active = [ARBEN], archived = [] }: ServeParams = {}) => {
  const requests: URLSearchParams[] = []
  server.use(
    http.get(`${LECTURERS_PATH}/subjects`, () => HttpResponse.json({ data: ['English', 'Mathematics'] })),
    http.get(LECTURERS_PATH, ({ request }) => {
      const params = new URL(request.url).searchParams
      requests.push(params)
      const search = (params.get('search') ?? '').toLowerCase()
      const locationId = params.get('location_id')
      const departmentId = params.get('department_id')
      const subject = params.get('subject')
      const matches = (lecturers: Lecturer[]) =>
        lecturers.filter(
          (lecturer) =>
            `${lecturer.first_name} ${lecturer.last_name} ${lecturer.email ?? ''} ${lecturer.subjects.join(' ')}`.toLowerCase().includes(search) &&
            (!locationId || lecturer.locations.some((location) => location.id === locationId)) &&
            (!departmentId || lecturer.department?.id === departmentId) &&
            (!subject || lecturer.subjects.includes(subject)),
        )
      const byStatus: Record<LecturerStatus, Lecturer[]> = { ACTIVE: matches(active), ARCHIVED: matches(archived) }
      const status = params.get('status') === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE'
      const page: LecturerPage = { lecturers: byStatus[status], total: byStatus[status].length, counts: { ACTIVE: byStatus.ACTIVE.length, ARCHIVED: byStatus.ARCHIVED.length } }
      return HttpResponse.json({ data: page })
    }),
  )
  return requests
}

const servePlaces = (organizationId = 'org-1') =>
  server.use(
    http.get(`*/api/organizations/${organizationId}/locations`, () => HttpResponse.json({ data: [MAIN_CAMPUS, NORTH_CAMPUS] })),
    http.get(`*/api/organizations/${organizationId}/departments`, () => HttpResponse.json({ data: [SCIENCES] })),
  )

const signInAsOwner = (params?: ServeParams) => {
  signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
  servePlaces()
  return serveLecturers(params)
}

const lecturersTable = () => screen.findByRole('table', { name: 'Lecturers' })

const rowsOf = async () => within(await lecturersTable()).getAllByRole('row').slice(1)

describe('LecturersPage: list', () => {
  it('lists lecturers with their subjects, department and locations', async () => {
    signInAsOwner({ active: [ARBEN, TEUTA] })
    renderRoute('/dashboard/lecturers')

    expect(await screen.findByRole('heading', { level: 1, name: 'Lecturers' })).toBeInTheDocument()
    const [arben, teuta] = await rowsOf()
    expect(arben).toHaveTextContent('Arben Hoxha')
    expect(arben).toHaveTextContent('Mathematics')
    expect(arben).toHaveTextContent('Sciences')
    expect(arben).toHaveTextContent('Main campus')
    expect(arben).toHaveTextContent('Full-time')
    expect(teuta).toHaveTextContent('English')
    expect(teuta).toHaveTextContent('North campus')
    expect(teuta).toHaveTextContent('Part-time')
    // The row actions stay on one line; the table scrolls sideways instead
    expect(within(arben).getByRole('group', { name: 'Actions for Arben Hoxha' })).toHaveClass('flex-nowrap')
  })
})

describe('LecturersPage: add, search and filter', () => {
  it('adds Arben Hoxha, Mathematics, full-time, shows him in the list, and finds him by searching "math"', async () => {
    let requests = signInAsOwner({ active: [TEUTA] })
    let sent: unknown
    server.use(
      http.post(LECTURERS_PATH, async ({ request }) => {
        sent = lecturerSchema.parse(await request.json())
        requests = serveLecturers({ active: [ARBEN, TEUTA] })
        return HttpResponse.json({ data: ARBEN }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/lecturers')

    await user.click(await screen.findByRole('button', { name: 'Add lecturer' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a lecturer' })
    await user.type(within(dialog).getByLabelText('First name'), 'Arben')
    await user.type(within(dialog).getByLabelText('Last name'), 'Hoxha')
    await user.type(within(dialog).getByRole('combobox', { name: 'Subjects' }), 'Mathematics{Enter}')
    await user.selectOptions(within(dialog).getByLabelText('Employment type'), 'Full-time')
    await user.click(within(dialog).getByRole('checkbox', { name: 'Main campus' }))
    await user.selectOptions(within(dialog).getByLabelText(/^Department/), 'Sciences')
    await user.click(within(dialog).getByRole('button', { name: 'Add lecturer' }))

    expect(await screen.findByText('Added Arben Hoxha.')).toBeInTheDocument()
    expect(sent).toMatchObject({ first_name: 'Arben', last_name: 'Hoxha', subjects: ['Mathematics'], employment_type: 'FULL_TIME', location_ids: [MAIN_CAMPUS.id], department_id: SCIENCES.id })
    expect(dialog).not.toBeVisible()
    expect(await screen.findByText('Arben Hoxha')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Search lecturers' }), 'math')
    await vi.waitFor(() => expect(screen.queryByText('Teuta Krasniqi')).not.toBeInTheDocument())
    expect(screen.getByText('Arben Hoxha')).toBeInTheDocument()
    expect(requests.at(-1)?.get('search')).toBe('math')
  })

  it('shows only the lecturers who teach at Main campus when filtered by it', async () => {
    const requests = signInAsOwner({ active: [ARBEN, TEUTA] })
    const { user } = renderRoute('/dashboard/lecturers')
    await screen.findByText('Teuta Krasniqi')

    await user.selectOptions(screen.getByLabelText('Location'), 'Main campus')

    await vi.waitFor(() => expect(screen.queryByText('Teuta Krasniqi')).not.toBeInTheDocument())
    expect(screen.getByText('Arben Hoxha')).toBeInTheDocument()
    expect(requests.at(-1)?.get('location_id')).toBe(MAIN_CAMPUS.id)
  })
})

describe('LecturersPage: list states', () => {
  it('shows a skeleton while loading', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    servePlaces()
    server.use(http.get(LECTURERS_PATH, () => new Promise<never>(() => {})))
    renderRoute('/dashboard/lecturers')

    expect(await screen.findByRole('list', { name: 'Loading' })).toBeInTheDocument()
  })

  it('says there are no lecturers yet and offers to add one', async () => {
    signInAsOwner({ active: [] })
    const { user } = renderRoute('/dashboard/lecturers')

    expect(await screen.findByText('No lecturers yet.')).toBeInTheDocument()
    await user.click(within(screen.getByRole('tabpanel')).getByRole('button', { name: 'Add lecturer' }))
    expect(screen.getByRole('dialog', { name: 'Add a lecturer' })).toBeVisible()
  })

  it('offers to try again when the list fails to load', async () => {
    signInAsOwner()
    // Added last, so it answers first, once
    server.use(http.get(LECTURERS_PATH, () => HttpResponse.json({ error: 'Down' }, { status: 500 }), { once: true }))
    const { user } = renderRoute('/dashboard/lecturers')

    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Arben Hoxha')).toBeInTheDocument()
  })

  it('switches between active and archived lecturers, with counts on the tabs', async () => {
    signInAsOwner({ active: [ARBEN], archived: [{ ...TEUTA, status: 'ARCHIVED' }] })
    const { user } = renderRoute('/dashboard/lecturers')

    expect(await screen.findByRole('tab', { name: 'Active 1' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: 'Archived 1' }))

    expect(await screen.findByText('Teuta Krasniqi')).toBeInTheDocument()
    expect(screen.queryByText('Arben Hoxha')).not.toBeInTheDocument()
  })

  it('filters by department and subject, and says when nothing matches', async () => {
    const requests = signInAsOwner({ active: [ARBEN, TEUTA] })
    const { user } = renderRoute('/dashboard/lecturers')
    await screen.findByText('Teuta Krasniqi')
    const filters = screen.getByRole('group', { name: 'Filters' })

    await user.selectOptions(within(filters).getByLabelText('Department'), 'Sciences')
    await vi.waitFor(() => expect(screen.queryByText('Teuta Krasniqi')).not.toBeInTheDocument())
    await user.selectOptions(within(filters).getByLabelText('Subject'), 'English')

    expect(await screen.findByText('No lecturers match.')).toBeInTheDocument()
    expect(requests.at(-1)?.get('department_id')).toBe(SCIENCES.id)
    expect(requests.at(-1)?.get('subject')).toBe('English')
  })
})

describe('LecturersPage: subjects input', () => {
  it('suggests subjects already used, adds with a comma, and removes the last with Backspace', async () => {
    signInAsOwner({ active: [] })
    const { user } = renderRoute('/dashboard/lecturers')

    await user.click(await screen.findByRole('button', { name: 'Add lecturer' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a lecturer' })
    const input = within(dialog).getByRole('combobox', { name: 'Subjects' })
    await user.type(input, 'mat')
    const suggestions = within(dialog).getByRole('listbox', { name: 'Subject suggestions' })
    expect(within(suggestions).getAllByRole('option').map((option) => option.textContent)).toEqual(['Mathematics'])
    await user.keyboard('{ArrowDown}{Enter}')
    await user.type(input, 'Physics,')
    const chosen = within(dialog).getByRole('list', { name: 'Chosen subjects' })
    expect(within(chosen).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Mathematics', 'Physics'])

    await user.keyboard('{Backspace}')
    expect(within(chosen).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Mathematics'])
    await user.click(within(dialog).getByRole('button', { name: 'Remove Mathematics' }))
    expect(within(dialog).queryByRole('list', { name: 'Chosen subjects' })).not.toBeInTheDocument()
  })
})

describe('LecturersPage: subject limit', () => {
  it('keeps a 21st subject visible and says the limit', async () => {
    signInAsOwner({ active: [] })
    const { user } = renderRoute('/dashboard/lecturers')

    await user.click(await screen.findByRole('button', { name: 'Add lecturer' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a lecturer' })
    await user.type(within(dialog).getByLabelText('First name'), 'Arben')
    await user.type(within(dialog).getByLabelText('Last name'), 'Hoxha')
    const subjects = Array.from({ length: 21 }, (_, index) => `Subject ${index + 1}`)
    await user.type(within(dialog).getByRole('combobox', { name: 'Subjects' }), subjects.map((subject) => `${subject},`).join(''))
    await user.click(within(dialog).getByRole('button', { name: 'Add lecturer' }))

    expect(within(within(dialog).getByRole('list', { name: 'Chosen subjects' })).getAllByRole('listitem')).toHaveLength(21)
    expect(await within(dialog).findByText('Add at most 20 subjects.')).toBeInTheDocument()
  })
})

describe('LecturersPage: edit and archive', () => {
  it('edits a lecturer’s locations and department', async () => {
    signInAsOwner()
    let sent: unknown
    const moved: Lecturer = { ...ARBEN, department: null, locations: [{ id: NORTH_CAMPUS.id, name: 'North campus' }] }
    server.use(
      http.put(`${LECTURERS_PATH}/${ARBEN.id}`, async ({ request }) => {
        sent = lecturerSchema.parse(await request.json())
        serveLecturers({ active: [moved] })
        return HttpResponse.json({ data: moved })
      }),
    )
    const { user } = renderRoute('/dashboard/lecturers')

    await user.click(await screen.findByRole('button', { name: 'Edit Arben Hoxha' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Arben Hoxha' })
    expect(within(dialog).getByRole('checkbox', { name: 'Main campus' })).toBeChecked()
    expect(within(dialog).getByLabelText(/^Department/)).toHaveValue(SCIENCES.id)
    await user.click(within(dialog).getByRole('checkbox', { name: 'Main campus' }))
    await user.click(within(dialog).getByRole('checkbox', { name: 'North campus' }))
    await user.selectOptions(within(dialog).getByLabelText(/^Department/), 'No department')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saved Arben Hoxha.')).toBeInTheDocument()
    expect(sent).toMatchObject({ subjects: ['Mathematics'], location_ids: [NORTH_CAMPUS.id], department_id: null })
    const [arben] = await rowsOf()
    await vi.waitFor(() => expect(arben).toHaveTextContent('North campus'))
  })

  it('shows the server’s field error under its field', async () => {
    signInAsOwner({ active: [] })
    const message = 'Choose your organization’s locations only.'
    server.use(http.post(LECTURERS_PATH, () => HttpResponse.json({ error: message, details: { formErrors: [], fieldErrors: { location_ids: [message] } } }, { status: 400 })))
    const { user } = renderRoute('/dashboard/lecturers')

    await user.click(await screen.findByRole('button', { name: 'Add lecturer' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a lecturer' })
    await user.click(within(dialog).getByRole('button', { name: 'Add lecturer' }))
    expect(within(dialog).getByText('Enter the first name.')).toBeInTheDocument()
    await user.type(within(dialog).getByLabelText('First name'), 'Arben')
    await user.type(within(dialog).getByLabelText('Last name'), 'Hoxha')
    await user.click(within(dialog).getByRole('button', { name: 'Add lecturer' }))

    expect(await within(dialog).findByRole('group', { name: /Locations/ })).toHaveAccessibleDescription(message)
    expect(dialog).toBeVisible()
  })

  it('archives a lecturer after one confirmation, and restores him', async () => {
    signInAsOwner()
    const archivedArben: Lecturer = { ...ARBEN, status: 'ARCHIVED' }
    server.use(
      http.post(`${LECTURERS_PATH}/${ARBEN.id}/archive`, () => {
        serveLecturers({ active: [], archived: [archivedArben] })
        return HttpResponse.json({ data: archivedArben })
      }),
      http.post(`${LECTURERS_PATH}/${ARBEN.id}/restore`, () => {
        serveLecturers({ active: [ARBEN] })
        return HttpResponse.json({ data: ARBEN })
      }),
    )
    const { user } = renderRoute('/dashboard/lecturers')

    await user.click(await screen.findByRole('button', { name: 'Archive Arben Hoxha' }))
    await user.click(within(screen.getByRole('group', { name: 'Archive Arben Hoxha' })).getByRole('button', { name: 'Archive' }))
    expect(await screen.findByText('Archived Arben Hoxha.')).toBeInTheDocument()
    expect(await screen.findByText('No lecturers yet.')).toBeInTheDocument()

    await user.click(await screen.findByRole('tab', { name: 'Archived 1' }))
    await user.click(await screen.findByRole('button', { name: 'Restore Arben Hoxha' }))
    await user.click(within(screen.getByRole('group', { name: 'Restore Arben Hoxha' })).getByRole('button', { name: 'Restore' }))
    expect(await screen.findByText('Restored Arben Hoxha.')).toBeInTheDocument()
  })

  it('shows a toast when archiving fails', async () => {
    signInAsOwner()
    server.use(http.post(`${LECTURERS_PATH}/${ARBEN.id}/archive`, () => HttpResponse.json({ error: 'This lecturer is already archived.' }, { status: 409 })))
    const { user } = renderRoute('/dashboard/lecturers')

    await user.click(await screen.findByRole('button', { name: 'Archive Arben Hoxha' }))
    await user.click(within(screen.getByRole('group', { name: 'Archive Arben Hoxha' })).getByRole('button', { name: 'Archive' }))

    expect(await screen.findByText('This lecturer is already archived.')).toBeInTheDocument()
  })
})

describe('LecturersPage: access', () => {
  it('lets a school admin with Lecturers in, with Lecturers in the sidebar', async () => {
    signInAs(buildUser({ memberships: [{ ...YLLKA_ADMIN_MEMBERSHIP, permissions: ['MANAGE_LECTURERS'] }] }))
    servePlaces('org-2')
    server.use(
      http.get('*/api/organizations/org-2/lecturers/subjects', () => HttpResponse.json({ data: [] })),
      http.get('*/api/organizations/org-2/lecturers', () => HttpResponse.json({ data: { lecturers: [ARBEN], total: 1, counts: { ACTIVE: 1, ARCHIVED: 0 } } })),
    )
    renderRoute('/dashboard/lecturers')

    expect(await screen.findByText('Arben Hoxha')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: 'Lecturers' })).toHaveAttribute('href', '/dashboard/lecturers')
  })

  it('sends a school admin without Lecturers back to the dashboard, and hides it from the sidebar', async () => {
    signInAs(buildUser({ memberships: [YLLKA_ADMIN_MEMBERSHIP] }))
    server.use(http.get('*/api/organizations/org-2/*', () => HttpResponse.json({ data: [] })))
    const { router } = renderRoute('/dashboard/lecturers')

    await vi.waitFor(() => expect(router.state.location.pathname).not.toBe('/dashboard/lecturers'))
    expect(screen.queryByRole('link', { name: 'Lecturers' })).not.toBeInTheDocument()
  })

  it('opens from the owner’s sidebar', async () => {
    signInAsOwner()
    renderRoute('/dashboard/lecturers')

    await screen.findByText('Arben Hoxha')
    expect(within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: 'Lecturers' })).toHaveAttribute('href', '/dashboard/lecturers')
  })
})

describe('LecturersPage: logins', () => {
  const INVITED_TEUTA: Lecturer = { ...TEUTA, login_status: 'INVITED', invitation: { email: 'teuta@lecturer.test', expires_at: '2026-11-07T10:00:00.000Z' } }
  const LINKED_DREN: Lecturer = { ...ARBEN, id: '9b1c2f43-0d1e-4c55-9a3e-6b1f0c2a2b03', first_name: 'Dren', last_name: 'Berisha', login_status: 'LINKED' }

  it('shows whether each lecturer has no login, is invited until a date, or has a login', async () => {
    signInAsOwner({ active: [ARBEN, INVITED_TEUTA, LINKED_DREN] })
    renderRoute('/dashboard/lecturers')

    const [arben, teuta, dren] = await rowsOf()
    expect(arben).toHaveTextContent('No login')
    expect(teuta).toHaveTextContent('Invited')
    expect(teuta).toHaveTextContent('teuta@lecturer.test · until 7 Nov 2026')
    expect(dren).toHaveTextContent('Has login')
    expect(within(dren).queryByRole('button', { name: /Invite|Resend|Revoke/ })).not.toBeInTheDocument()
  })

  it('invites a lecturer with the record’s email prefilled, and shows him as invited', async () => {
    signInAsOwner()
    let sent: unknown
    server.use(
      http.post(`${LECTURERS_PATH}/${ARBEN.id}/invitation`, async ({ request }) => {
        sent = await request.json()
        // The answered row updates the list; the list itself isn't fetched again
        return HttpResponse.json({ data: { ...ARBEN, login_status: 'INVITED', invitation: { email: 'arben@school.test', expires_at: '2026-11-07T10:00:00.000Z' } } }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/lecturers')

    await user.click(await screen.findByRole('button', { name: 'Invite Arben Hoxha to log in' }))
    const dialog = screen.getByRole('dialog', { name: 'Invite Arben Hoxha to log in' })
    expect(within(dialog).getByLabelText('Email')).toHaveValue('arben@oxford.test')
    await user.clear(within(dialog).getByLabelText('Email'))
    await user.type(within(dialog).getByLabelText('Email'), 'arben@school.test')
    await user.click(within(dialog).getByRole('button', { name: 'Send invitation' }))

    expect(await screen.findByText('Sent an invitation to arben@school.test.')).toBeInTheDocument()
    expect(sent).toEqual({ email: 'arben@school.test' })
    const [arben] = await rowsOf()
    await vi.waitFor(() => expect(arben).toHaveTextContent('Invited'))
  })

  it('shows the server’s refusal under the email', async () => {
    signInAsOwner()
    const taken = 'This email belongs to someone with another role in your organization.'
    server.use(http.post(`${LECTURERS_PATH}/${ARBEN.id}/invitation`, () => HttpResponse.json({ error: taken, details: { formErrors: [], fieldErrors: { email: [taken] } } }, { status: 409 })))
    const { user } = renderRoute('/dashboard/lecturers')

    await user.click(await screen.findByRole('button', { name: 'Invite Arben Hoxha to log in' }))
    const dialog = screen.getByRole('dialog', { name: 'Invite Arben Hoxha to log in' })
    await user.click(within(dialog).getByRole('button', { name: 'Send invitation' }))

    expect(await within(dialog).findByText(taken)).toBeInTheDocument()
  })

  it('resends a pending invitation, with the buttons waiting meanwhile', async () => {
    signInAsOwner({ active: [INVITED_TEUTA] })
    server.use(
      http.post(`${LECTURERS_PATH}/${TEUTA.id}/invitation/resend`, async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        return HttpResponse.json({ data: { ...INVITED_TEUTA, invitation: { email: 'teuta@lecturer.test', expires_at: '2026-11-08T10:00:00.000Z' } } })
      }),
    )
    const { user } = renderRoute('/dashboard/lecturers')

    await user.click(await screen.findByRole('button', { name: 'Resend invitation to Teuta Krasniqi' }))
    expect(screen.getByRole('button', { name: 'Resend invitation to Teuta Krasniqi' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Revoke invitation to Teuta Krasniqi' })).toBeDisabled()

    expect(await screen.findByText('Sent a new link to teuta@lecturer.test. The old one no longer works.')).toBeInTheDocument()
    const [teuta] = await rowsOf()
    await vi.waitFor(() => expect(teuta).toHaveTextContent('until 8 Nov 2026'))
  })

  it('revokes a pending invitation after one confirmation', async () => {
    signInAsOwner({ active: [INVITED_TEUTA] })
    server.use(http.delete(`${LECTURERS_PATH}/${TEUTA.id}/invitation`, () => HttpResponse.json({ data: TEUTA })))
    const { user } = renderRoute('/dashboard/lecturers')

    await user.click(await screen.findByRole('button', { name: 'Revoke invitation to Teuta Krasniqi' }))
    await user.click(within(screen.getByRole('group', { name: 'Revoke invitation to Teuta Krasniqi' })).getByRole('button', { name: 'Revoke' }))

    expect(await screen.findByText('Withdrew the invitation to teuta@lecturer.test.')).toBeInTheDocument()
    const [teuta] = await rowsOf()
    await vi.waitFor(() => expect(teuta).toHaveTextContent('No login'))
  })
})
