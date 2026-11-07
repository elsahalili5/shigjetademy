import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { AcademicYear } from '@shigjetademy/shared/academic-periods'
import type { CourseOption } from '@shigjetademy/shared/courses'
import { groupSchema } from '@shigjetademy/shared/groups'
import type { Group, GroupPage, GroupStatus } from '@shigjetademy/shared/groups'
import type { OrganizationLocation } from '@shigjetademy/shared/location'
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

const MATHEMATICS: CourseOption = { id: '7c1c2f43-0d1e-4c55-9a3e-6b1f0c2a2b01', name: 'Mathematics', status: 'ACTIVE' }

const ENGLISH: CourseOption = { id: '7c1c2f43-0d1e-4c55-9a3e-6b1f0c2a2b02', name: 'English', status: 'ACTIVE' }

const OLD_LATIN: CourseOption = { id: '7c1c2f43-0d1e-4c55-9a3e-6b1f0c2a2b03', name: 'Old Latin', status: 'ARCHIVED' }

const AUTUMN = { id: '5b2e4c3c-8d3b-4e77-9c5a-2f3abd3e4f01', name: 'Autumn term', start_date: '2026-09-01', end_date: '2027-01-31' }

const SPRING_NEXT_YEAR = { id: '5b2e4c3c-8d3b-4e77-9c5a-2f3abd3e4f02', name: 'Spring term', start_date: '2028-02-01', end_date: '2028-06-30' }

const NEXT_YEAR: AcademicYear = {
  id: '6c3f5d4d-9e4c-4f88-8d6b-3a4bce4f5a02',
  name: '2027–28',
  start_date: '2027-09-01',
  end_date: '2028-06-30',
  is_current: false,
  terms: [SPRING_NEXT_YEAR],
  holidays: [],
}

const THIS_YEAR: AcademicYear = { ...NEXT_YEAR, id: '6c3f5d4d-9e4c-4f88-8d6b-3a4bce4f5a01', name: '2026–27', start_date: '2026-09-01', end_date: '2027-06-30', is_current: true, terms: [AUTUMN] }

const GROUP_A: Group = {
  id: '8d4a6e5e-af5d-4a99-9e7c-4b5cdf5a6b01',
  name: 'Group A',
  capacity: 20,
  status: 'ACTIVE',
  created_at: '2026-10-01T09:00:00.000Z',
  course: MATHEMATICS,
  academic_year: { id: THIS_YEAR.id, name: THIS_YEAR.name },
  academic_term: { id: AUTUMN.id, name: AUTUMN.name },
  location: { id: MAIN_CAMPUS.id, name: MAIN_CAMPUS.name },
}

const GROUP_B: Group = { ...GROUP_A, id: '8d4a6e5e-af5d-4a99-9e7c-4b5cdf5a6b02', name: 'Group B', capacity: null, course: ENGLISH, academic_year: { id: NEXT_YEAR.id, name: NEXT_YEAR.name }, academic_term: null, location: null }

const GROUPS_PATH = '*/api/organizations/org-1/groups'

type ServeGroupsParams = {
  active?: Group[]
  archived?: Group[]
}

/** Answers the list like the server: by status, narrowed by the filters, with both counts */
const serveGroups = ({ active = [GROUP_A], archived = [] }: ServeGroupsParams = {}) => {
  const requests: URLSearchParams[] = []
  server.use(
    http.get(GROUPS_PATH, ({ request }) => {
      const params = new URL(request.url).searchParams
      requests.push(params)
      const courseId = params.get('course_id')
      const yearId = params.get('academic_year_id')
      const matches = (groups: Group[]) => groups.filter((group) => (!courseId || group.course.id === courseId) && (!yearId || group.academic_year.id === yearId))
      const byStatus: Record<GroupStatus, Group[]> = { ACTIVE: matches(active), ARCHIVED: matches(archived) }
      const status = params.get('status') === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE'
      const page: GroupPage = { groups: byStatus[status], total: byStatus[status].length, counts: { ACTIVE: byStatus.ACTIVE.length, ARCHIVED: byStatus.ARCHIVED.length } }
      return HttpResponse.json({ data: page })
    }),
  )
  return requests
}

type ServeOptionsParams = {
  organizationId?: string
  courses?: CourseOption[]
  years?: AcademicYear[]
}

const serveOptions = ({ organizationId = 'org-1', courses = [ENGLISH, MATHEMATICS, OLD_LATIN], years = [THIS_YEAR, NEXT_YEAR] }: ServeOptionsParams = {}) =>
  server.use(
    http.get(`*/api/organizations/${organizationId}/courses/options`, () => HttpResponse.json({ data: courses })),
    http.get(`*/api/organizations/${organizationId}/academic-periods/years`, () => HttpResponse.json({ data: years })),
    http.get(`*/api/organizations/${organizationId}/locations`, () => HttpResponse.json({ data: [MAIN_CAMPUS] })),
  )

type SignInParams = ServeGroupsParams & Omit<ServeOptionsParams, 'organizationId'>

const signInAsOwner = ({ active, archived, courses, years }: SignInParams = {}) => {
  signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
  serveOptions({ courses, years })
  return serveGroups({ active, archived })
}

const rowsOf = async () => within(await screen.findByRole('table', { name: 'Groups' })).getAllByRole('row').slice(1)

const openAddDialog = async (user: ReturnType<typeof renderRoute>['user']) => {
  await user.click((await screen.findAllByRole('button', { name: 'Add group' }))[0])
  return screen.getByRole('dialog', { name: 'Add a group' })
}

describe('GroupsPage: list', () => {
  it('lists groups with their course, year, term, location and capacity', async () => {
    signInAsOwner({ active: [GROUP_A, GROUP_B] })
    renderRoute('/dashboard/groups')

    expect(await screen.findByRole('heading', { level: 1, name: 'Groups' })).toBeInTheDocument()
    const [groupA, groupB] = await rowsOf()
    expect(groupA).toHaveTextContent('Group A')
    expect(groupA).toHaveTextContent('Mathematics')
    expect(groupA).toHaveTextContent('2026–27')
    expect(groupA).toHaveTextContent('Autumn term')
    expect(groupA).toHaveTextContent('Main campus')
    expect(groupA).toHaveTextContent('20 seats')
    expect(groupB).toHaveTextContent('English')
    expect(groupB).toHaveTextContent('2027–28')
  })

  it('says "1 seat" for a capacity of one', async () => {
    signInAsOwner({ active: [{ ...GROUP_A, capacity: 1 }] })
    renderRoute('/dashboard/groups')

    const [row] = await rowsOf()
    expect(within(row).getAllByText('Main campus · 1 seat')[0]).toBeInTheDocument()
  })

  it('shows skeleton rows while loading', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serveOptions()
    server.use(http.get(GROUPS_PATH, () => new Promise<never>(() => {})))
    renderRoute('/dashboard/groups')

    expect(await screen.findByRole('list', { name: 'Loading' })).toBeInTheDocument()
  })

  it('says there are no groups yet and offers to add one', async () => {
    signInAsOwner({ active: [] })
    const { user } = renderRoute('/dashboard/groups')

    expect(await screen.findByText('No groups yet.')).toBeInTheDocument()
    expect(await openAddDialog(user)).toBeVisible()
  })

  it('offers a retry when the school years fail to load', async () => {
    signInAsOwner()
    server.use(http.get('*/api/organizations/org-1/academic-periods/years', () => HttpResponse.json({ error: 'Failed' }, { status: 500 })))
    const { user } = renderRoute('/dashboard/groups')

    expect(await screen.findByText('We couldn’t load the groups.')).toBeInTheDocument()
    serveOptions()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Group A')).toBeInTheDocument()
  })
})

describe('GroupsPage: what to create first', () => {
  it('asks for a school year first when there are none, and links to them', async () => {
    signInAsOwner({ active: [], years: [] })
    renderRoute('/dashboard/groups')

    expect(await screen.findByText('Add a school year first.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Academic periods' })).toHaveAttribute('href', '/dashboard/academic-periods')
    expect(screen.queryByRole('button', { name: 'Add group' })).not.toBeInTheDocument()
  })

  it('asks for a course first when there are none, and links to them', async () => {
    signInAsOwner({ active: [], courses: [] })
    renderRoute('/dashboard/groups')

    expect(await screen.findByText('Add a course first.')).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Go to Courses' })).toHaveAttribute('href', '/dashboard/courses')
    expect(screen.queryByRole('button', { name: 'Add group' })).not.toBeInTheDocument()
  })

  it('asks for a course when every course is archived', async () => {
    signInAsOwner({ active: [], courses: [OLD_LATIN] })
    renderRoute('/dashboard/groups')

    expect(await screen.findByText('Add a course first.')).toBeInTheDocument()
  })
})

describe('GroupsPage: add', () => {
  it('starts on the current year and offers only active courses', async () => {
    signInAsOwner({ active: [] })
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openAddDialog(user)

    expect(within(dialog).getByLabelText('School year')).toHaveValue(THIS_YEAR.id)
    expect(within(within(dialog).getByLabelText('Course')).getAllByRole('option').map((option) => option.textContent)).toEqual(['Choose a course', 'English', 'Mathematics'])
  })

  it('adds Group A with every field and shows it in the list', async () => {
    signInAsOwner({ active: [] })
    let sent: unknown
    server.use(
      http.post(GROUPS_PATH, async ({ request }) => {
        sent = groupSchema.parse(await request.json())
        serveGroups({ active: [GROUP_A] })
        return HttpResponse.json({ data: GROUP_A }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openAddDialog(user)
    await user.selectOptions(within(dialog).getByLabelText('Course'), 'Mathematics')
    await user.type(within(dialog).getByLabelText('Name'), 'Group A')
    await user.selectOptions(within(dialog).getByLabelText(/^Term/), 'Autumn term')
    await user.selectOptions(within(dialog).getByLabelText(/^Location/), 'Main campus')
    await user.type(within(dialog).getByLabelText('Capacity (optional)'), '20')
    await user.click(within(dialog).getByRole('button', { name: 'Add group' }))

    expect(await screen.findByText('Added Group A.')).toBeInTheDocument()
    expect(sent).toEqual({ course_id: MATHEMATICS.id, name: 'Group A', academic_year_id: THIS_YEAR.id, academic_term_id: AUTUMN.id, location_id: MAIN_CAMPUS.id, capacity: 20 })
    expect(dialog).not.toBeVisible()
    expect(await screen.findByRole('table', { name: 'Groups' })).toHaveTextContent('Group A')
  })

  it('leaves optional fields empty as null', async () => {
    signInAsOwner({ active: [] })
    let sent: unknown
    server.use(
      http.post(GROUPS_PATH, async ({ request }) => {
        sent = groupSchema.parse(await request.json())
        return HttpResponse.json({ data: GROUP_A }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openAddDialog(user)
    await user.selectOptions(within(dialog).getByLabelText('Course'), 'Mathematics')
    await user.type(within(dialog).getByLabelText('Name'), 'Group A')
    await user.click(within(dialog).getByRole('button', { name: 'Add group' }))

    await screen.findByText('Added Group A.')
    expect(sent).toMatchObject({ academic_term_id: null, location_id: null, capacity: null })
  })

  it('offers the chosen year’s terms and clears the term when the year changes', async () => {
    signInAsOwner({ active: [] })
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openAddDialog(user)
    const term = within(dialog).getByLabelText(/^Term/)
    await user.selectOptions(term, 'Autumn term')
    await user.selectOptions(within(dialog).getByLabelText('School year'), '2027–28')

    expect(term).toHaveValue('')
    expect(within(term).getAllByRole('option').map((option) => option.textContent)).toEqual(['No term', 'Spring term'])
  })

  it('asks for the course and name before sending', async () => {
    signInAsOwner({ active: [] })
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openAddDialog(user)
    await user.click(within(dialog).getByRole('button', { name: 'Add group' }))

    expect(await within(dialog).findByText('Choose a course.')).toBeInTheDocument()
    expect(within(dialog).getByText('Enter the group name.')).toBeInTheDocument()
  })

  it('shows a taken name under its field', async () => {
    signInAsOwner({ active: [] })
    const message = 'This course already has a group with this name in this year.'
    server.use(http.post(GROUPS_PATH, () => HttpResponse.json({ error: message, details: { formErrors: [], fieldErrors: { name: [message] } } }, { status: 409 })))
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openAddDialog(user)
    await user.selectOptions(within(dialog).getByLabelText('Course'), 'Mathematics')
    await user.type(within(dialog).getByLabelText('Name'), 'Group A')
    await user.click(within(dialog).getByRole('button', { name: 'Add group' }))

    expect(await within(dialog).findByLabelText('Name')).toHaveAccessibleDescription(message)
  })
})

describe('GroupsPage: access', () => {
  it('lets a school admin with Courses and groups in, with Groups in the sidebar', async () => {
    signInAs(buildUser({ memberships: [{ ...YLLKA_ADMIN_MEMBERSHIP, permissions: ['MANAGE_COURSES'] }] }))
    serveOptions({ organizationId: 'org-2' })
    server.use(http.get('*/api/organizations/org-2/groups', () => HttpResponse.json({ data: { groups: [GROUP_A], total: 1, counts: { ACTIVE: 1, ARCHIVED: 0 } } })))
    renderRoute('/dashboard/groups')

    expect(await screen.findByText('Group A')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: 'Groups' })).toHaveAttribute('href', '/dashboard/groups')
  })

  it('sends a school admin without Courses and groups back to the dashboard, and hides it from the sidebar', async () => {
    signInAs(buildUser({ memberships: [YLLKA_ADMIN_MEMBERSHIP] }))
    server.use(http.get('*/api/organizations/org-2/*', () => HttpResponse.json({ data: [] })))
    const { router } = renderRoute('/dashboard/groups')

    await vi.waitFor(() => expect(router.state.location.pathname).not.toBe('/dashboard/groups'))
    expect(screen.queryByRole('link', { name: 'Groups' })).not.toBeInTheDocument()
  })

  it('opens from the owner’s sidebar', async () => {
    signInAsOwner()
    renderRoute('/dashboard/groups')

    await screen.findByText('Group A')
    expect(within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: 'Groups' })).toHaveAttribute('href', '/dashboard/groups')
  })
})

describe('GroupsPage: tabs and filters', () => {
  it('shows only the groups of the chosen course, and the tab counts follow', async () => {
    const requests = signInAsOwner({ active: [GROUP_A, GROUP_B], archived: [{ ...GROUP_B, id: '8d4a6e5e-af5d-4a99-9e7c-4b5cdf5a6b03', name: 'Group C', status: 'ARCHIVED' }] })
    const { user } = renderRoute('/dashboard/groups')
    await screen.findByText('Group B')
    expect(screen.getByRole('tab', { name: 'Active 2' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Archived 1' })).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Filter by course'), 'Mathematics')

    await vi.waitFor(() => expect(screen.queryByText('Group B')).not.toBeInTheDocument())
    expect(screen.getByText('Group A')).toBeInTheDocument()
    expect(requests.at(-1)?.get('course_id')).toBe(MATHEMATICS.id)
    expect(screen.getByRole('tab', { name: 'Active 1' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Archived 0' })).toBeInTheDocument()
  })

  it('shows only the groups of the chosen year', async () => {
    const requests = signInAsOwner({ active: [GROUP_A, GROUP_B] })
    const { user } = renderRoute('/dashboard/groups')
    await screen.findByText('Group B')

    await user.selectOptions(screen.getByLabelText('Filter by school year'), '2027–28')

    await vi.waitFor(() => expect(screen.queryByText('Group A')).not.toBeInTheDocument())
    expect(screen.getByText('Group B')).toBeInTheDocument()
    expect(requests.at(-1)?.get('academic_year_id')).toBe(NEXT_YEAR.id)
  })

  it('offers archived courses in the filter, marked as archived', async () => {
    signInAsOwner()
    renderRoute('/dashboard/groups')
    await screen.findByText('Group A')

    expect(within(screen.getByLabelText('Filter by course')).getAllByRole('option').map((option) => option.textContent)).toEqual(['All courses', 'English', 'Mathematics', 'Old Latin (archived)'])
  })

  it('says when nothing matches the filters', async () => {
    signInAsOwner({ active: [GROUP_A] })
    const { user } = renderRoute('/dashboard/groups')
    await screen.findByText('Group A')

    await user.selectOptions(screen.getByLabelText('Filter by course'), 'English')

    expect(await screen.findByText('No groups match.')).toBeInTheDocument()
  })

  it('shows the archived groups on their own tab, with an empty state when there are none', async () => {
    signInAsOwner({ active: [GROUP_A], archived: [] })
    const { user } = renderRoute('/dashboard/groups')
    await screen.findByText('Group A')

    await user.click(screen.getByRole('tab', { name: 'Archived 0' }))

    expect(await screen.findByText('No archived groups.')).toBeInTheDocument()
  })
})

describe('GroupsPage: edit', () => {
  it('opens with the group’s values and saves the change', async () => {
    signInAsOwner({ active: [GROUP_A] })
    let sent: unknown
    server.use(
      http.put(`${GROUPS_PATH}/${GROUP_A.id}`, async ({ request }) => {
        sent = groupSchema.parse(await request.json())
        return HttpResponse.json({ data: { ...GROUP_A, capacity: 25 } })
      }),
    )
    const { user } = renderRoute('/dashboard/groups')

    await user.click(await screen.findByRole('button', { name: 'Edit Group A' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Group A' })
    expect(within(dialog).getByLabelText('Course')).toHaveValue(MATHEMATICS.id)
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Group A')
    expect(within(dialog).getByLabelText('School year')).toHaveValue(THIS_YEAR.id)
    expect(within(dialog).getByLabelText(/^Term/)).toHaveValue(AUTUMN.id)
    expect(within(dialog).getByLabelText(/^Location/)).toHaveValue(MAIN_CAMPUS.id)
    await user.clear(within(dialog).getByLabelText('Capacity (optional)'))
    await user.type(within(dialog).getByLabelText('Capacity (optional)'), '25')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saved Group A.')).toBeInTheDocument()
    expect(sent).toEqual({ course_id: MATHEMATICS.id, name: 'Group A', academic_year_id: THIS_YEAR.id, academic_term_id: AUTUMN.id, location_id: MAIN_CAMPUS.id, capacity: 25 })
    expect(dialog).not.toBeVisible()
  })

  it('keeps an archived group’s archived course among the choices', async () => {
    const archived: Group = { ...GROUP_A, status: 'ARCHIVED', course: OLD_LATIN }
    signInAsOwner({ active: [], archived: [archived] })
    const { user } = renderRoute('/dashboard/groups')

    await user.click(await screen.findByRole('tab', { name: 'Archived 1' }))
    await user.click(await screen.findByRole('button', { name: 'Edit Group A' }))

    const courseField = within(screen.getByRole('dialog', { name: 'Edit Group A' })).getByLabelText('Course')
    expect(courseField).toHaveValue(OLD_LATIN.id)
    expect(within(courseField).getAllByRole('option').map((option) => option.textContent)).toEqual(['Choose a course', 'English', 'Mathematics', 'Old Latin (archived)'])
  })
})

describe('GroupsPage: reopening the edit dialog', () => {
  it('drops unsaved values and an old server error after cancel', async () => {
    signInAsOwner({ active: [GROUP_A] })
    const message = 'This course already has a group with this name in this year.'
    server.use(http.put(`${GROUPS_PATH}/${GROUP_A.id}`, () => HttpResponse.json({ error: message, details: { formErrors: [], fieldErrors: { name: [message] } } }, { status: 409 })))
    const { user } = renderRoute('/dashboard/groups')

    await user.click(await screen.findByRole('button', { name: 'Edit Group A' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Group A' })
    await user.clear(within(dialog).getByLabelText('Name'))
    await user.type(within(dialog).getByLabelText('Name'), 'Group Z')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(await within(dialog).findByLabelText('Name')).toHaveAccessibleDescription(message)
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await user.click(screen.getByRole('button', { name: 'Edit Group A' }))

    const reopened = screen.getByRole('dialog', { name: 'Edit Group A' })
    expect(within(reopened).getByLabelText('Name')).toHaveValue('Group A')
    expect(within(reopened).getByLabelText('Name')).not.toHaveAccessibleDescription(message)
    expect(within(reopened).queryByText(message)).not.toBeInTheDocument()
  })
})

describe('GroupsPage: archive and restore', () => {
  it('archives after one confirmation', async () => {
    signInAsOwner({ active: [GROUP_A] })
    server.use(
      http.post(`${GROUPS_PATH}/${GROUP_A.id}/archive`, () => {
        serveGroups({ active: [], archived: [{ ...GROUP_A, status: 'ARCHIVED' }] })
        return HttpResponse.json({ data: { ...GROUP_A, status: 'ARCHIVED' } })
      }),
    )
    const { user } = renderRoute('/dashboard/groups')

    await user.click(await screen.findByRole('button', { name: 'Archive Group A' }))
    await user.click(within(screen.getByRole('group', { name: 'Archive Group A' })).getByRole('button', { name: 'Archive' }))

    expect(await screen.findByText('Archived Group A.')).toBeInTheDocument()
    expect(await screen.findByRole('tab', { name: 'Archived 1' })).toBeInTheDocument()
  })

  it('restores an archived group', async () => {
    const archived: Group = { ...GROUP_A, status: 'ARCHIVED' }
    signInAsOwner({ active: [], archived: [archived] })
    server.use(
      http.post(`${GROUPS_PATH}/${GROUP_A.id}/restore`, () => {
        serveGroups({ active: [GROUP_A], archived: [] })
        return HttpResponse.json({ data: GROUP_A })
      }),
    )
    const { user } = renderRoute('/dashboard/groups')

    await user.click(await screen.findByRole('tab', { name: 'Archived 1' }))
    await user.click(await screen.findByRole('button', { name: 'Restore Group A' }))
    await user.click(within(screen.getByRole('group', { name: 'Restore Group A' })).getByRole('button', { name: 'Restore' }))

    expect(await screen.findByText('Restored Group A.')).toBeInTheDocument()
  })

  it('shows why a group can’t come back while its course is archived', async () => {
    const archived: Group = { ...GROUP_A, status: 'ARCHIVED', course: OLD_LATIN }
    signInAsOwner({ active: [], archived: [archived] })
    server.use(http.post(`${GROUPS_PATH}/${GROUP_A.id}/restore`, () => HttpResponse.json({ error: 'Restore the course Old Latin first.' }, { status: 409 })))
    const { user } = renderRoute('/dashboard/groups')

    await user.click(await screen.findByRole('tab', { name: 'Archived 1' }))
    await user.click(await screen.findByRole('button', { name: 'Restore Group A' }))
    await user.click(within(screen.getByRole('group', { name: 'Restore Group A' })).getByRole('button', { name: 'Restore' }))

    expect(await screen.findByText('Restore the course Old Latin first.')).toBeInTheDocument()
  })
})
