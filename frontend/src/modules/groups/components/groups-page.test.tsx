import { cleanup, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AcademicYear } from '@shigjetademy/shared/academic-periods'
import type { CourseOption } from '@shigjetademy/shared/courses'
import { groupSchema, groupSubstitutionSchema } from '@shigjetademy/shared/groups'
import type { Group, GroupLecturer, GroupLecturerHistory, GroupLecturerOption, GroupPage, GroupStatus, GroupSubstitution } from '@shigjetademy/shared/groups'
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

const ARBEN: GroupLecturer = { id: '9e5b7f6f-b06e-4baa-af8d-5c6de06b7c01', first_name: 'Arben', last_name: 'Hoxha', status: 'ACTIVE' }

const TEUTA: GroupLecturer = { id: '9e5b7f6f-b06e-4baa-af8d-5c6de06b7c02', first_name: 'Teuta', last_name: 'Krasniqi', status: 'ACTIVE' }

const LECTURER_OPTIONS: GroupLecturerOption[] = [
  { id: ARBEN.id, first_name: 'Arben', last_name: 'Hoxha', subjects: ['Mathematics', 'Physics'] },
  { id: TEUTA.id, first_name: 'Teuta', last_name: 'Krasniqi', subjects: [] },
]

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
  lecturer: ARBEN,
  lecturer_change: null,
}

const GROUP_B: Group = { ...GROUP_A, id: '8d4a6e5e-af5d-4a99-9e7c-4b5cdf5a6b02', name: 'Group B', capacity: null, course: ENGLISH, academic_year: { id: NEXT_YEAR.id, name: NEXT_YEAR.name }, academic_term: null, location: null, lecturer: null }

const GROUPS_PATH = '*/api/organizations/org-1/groups'

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

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
    http.get(`*/api/organizations/${organizationId}/groups/lecturer-options`, () => HttpResponse.json({ data: LECTURER_OPTIONS })),
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

  it('shows the permanent lecturer of each group, or that there is none', async () => {
    signInAsOwner({ active: [GROUP_A, GROUP_B] })
    renderRoute('/dashboard/groups')

    expect(await screen.findByRole('columnheader', { name: 'Lecturer' })).toBeInTheDocument()
    const [groupA, groupB] = await rowsOf()
    expect(groupA).toHaveTextContent('Arben Hoxha')
    expect(groupB).toHaveTextContent('No lecturer')
  })

  it('marks an archived lecturer who stays on the group', async () => {
    signInAsOwner({ active: [{ ...GROUP_A, lecturer: { ...ARBEN, status: 'ARCHIVED' } }] })
    renderRoute('/dashboard/groups')

    const [row] = await rowsOf()
    expect(row).toHaveTextContent('Arben Hoxha (archived)')
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

  it('offers a retry when the lecturers fail to load', async () => {
    signInAsOwner()
    server.use(http.get(`${GROUPS_PATH}/lecturer-options`, () => HttpResponse.json({ error: 'Failed' }, { status: 500 })))
    const { user } = renderRoute('/dashboard/groups')

    expect(await screen.findByText('We couldn’t load the groups.')).toBeInTheDocument()
    serveOptions()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Group A')).toBeInTheDocument()
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

  it('offers no lecturer, then active lecturers with their subjects', async () => {
    signInAsOwner({ active: [] })
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openAddDialog(user)

    const lecturer = await within(dialog).findByRole('option', { name: 'Arben Hoxha · Mathematics, Physics' })
    expect(lecturer).toBeInTheDocument()
    expect(within(within(dialog).getByLabelText(/^Lecturer/)).getAllByRole('option').map((option) => option.textContent)).toEqual(['No lecturer', 'Arben Hoxha · Mathematics, Physics', 'Teuta Krasniqi'])
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
    await user.selectOptions(within(dialog).getByLabelText(/^Lecturer/), await within(dialog).findByRole('option', { name: 'Arben Hoxha · Mathematics, Physics' }))
    await user.click(within(dialog).getByRole('button', { name: 'Add group' }))

    expect(await screen.findByText('Added Group A.')).toBeInTheDocument()
    expect(sent).toEqual({ course_id: MATHEMATICS.id, name: 'Group A', academic_year_id: THIS_YEAR.id, academic_term_id: AUTUMN.id, location_id: MAIN_CAMPUS.id, capacity: 20, lecturer_id: ARBEN.id, lecturer_effective_from: null })
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
    expect(sent).toMatchObject({ academic_term_id: null, location_id: null, capacity: null, lecturer_id: null, lecturer_effective_from: null })
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
    expect(sent).toEqual({ course_id: MATHEMATICS.id, name: 'Group A', academic_year_id: THIS_YEAR.id, academic_term_id: AUTUMN.id, location_id: MAIN_CAMPUS.id, capacity: 25, lecturer_id: ARBEN.id, lecturer_effective_from: null })
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

describe('GroupsPage: changing the lecturer', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const openEditDialog = async (user: ReturnType<typeof renderRoute>['user']) => {
    await user.click(await screen.findByRole('button', { name: 'Edit Group A' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Group A' })
    await within(dialog).findByRole('option', { name: 'Teuta Krasniqi' })
    return dialog
  }

  it('asks for no date until the lecturer changes, then defaults to the organization’s today', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    // 23:30 UTC on 2 November is already 3 November in Belgrade
    vi.setSystemTime(new Date('2026-11-02T23:30:00.000Z'))
    signInAsOwner({ active: [GROUP_A] })
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)
    expect(within(dialog).getByLabelText(/^Lecturer/)).toHaveValue(ARBEN.id)
    expect(within(dialog).queryByLabelText('Effective from')).not.toBeInTheDocument()

    await user.selectOptions(within(dialog).getByLabelText(/^Lecturer/), 'Teuta Krasniqi')

    expect(within(dialog).getByLabelText('Effective from')).toHaveValue('2026-11-03')
  })

  const NEXT_YEAR_GROUP: Group = { ...GROUP_A, academic_year: { id: NEXT_YEAR.id, name: NEXT_YEAR.name }, academic_term: null }

  it('defaults to the year’s start for a group without a lecturer in a year that hasn’t started', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-02T10:00:00.000Z'))
    signInAsOwner({ active: [{ ...NEXT_YEAR_GROUP, lecturer: null }] })
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)
    await user.selectOptions(within(dialog).getByLabelText(/^Lecturer/), 'Teuta Krasniqi')

    expect(within(dialog).getByLabelText('Effective from')).toHaveValue(NEXT_YEAR.start_date)
  })

  it('defaults to the year’s start for a group with a lecturer too, since an earlier date would be refused', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-02T10:00:00.000Z'))
    signInAsOwner({ active: [NEXT_YEAR_GROUP] })
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)
    await user.selectOptions(within(dialog).getByLabelText(/^Lecturer/), 'Teuta Krasniqi')

    expect(within(dialog).getByLabelText('Effective from')).toHaveValue(NEXT_YEAR.start_date)
  })

  it('goes by the year chosen in the form', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-02T10:00:00.000Z'))
    signInAsOwner({ active: [{ ...GROUP_A, lecturer: null }] })
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)
    await user.selectOptions(within(dialog).getByLabelText('School year'), NEXT_YEAR.name)
    await user.selectOptions(within(dialog).getByLabelText(/^Lecturer/), 'Teuta Krasniqi')

    expect(within(dialog).getByLabelText('Effective from')).toHaveValue(NEXT_YEAR.start_date)
  })

  it('sends the new lecturer with the chosen date', async () => {
    signInAsOwner({ active: [GROUP_A] })
    let sent: unknown
    server.use(
      http.put(`${GROUPS_PATH}/${GROUP_A.id}`, async ({ request }) => {
        sent = groupSchema.parse(await request.json())
        return HttpResponse.json({ data: GROUP_A })
      }),
    )
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)
    await user.selectOptions(within(dialog).getByLabelText(/^Lecturer/), 'Teuta Krasniqi')
    await user.clear(within(dialog).getByLabelText('Effective from'))
    await user.type(within(dialog).getByLabelText('Effective from'), '2026-12-01')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await screen.findByText('Saved Group A.')
    expect(sent).toMatchObject({ lecturer_id: TEUTA.id, lecturer_effective_from: '2026-12-01' })
  })

  it('asks for a date when it’s cleared', async () => {
    signInAsOwner({ active: [GROUP_A] })
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)
    await user.selectOptions(within(dialog).getByLabelText(/^Lecturer/), 'Teuta Krasniqi')
    await user.clear(within(dialog).getByLabelText('Effective from'))
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await within(dialog).findByText('Enter the date the change starts.')).toBeInTheDocument()
  })

  it('drops the date when the lecturer goes back to what it was', async () => {
    signInAsOwner({ active: [GROUP_A] })
    let sent: unknown
    server.use(
      http.put(`${GROUPS_PATH}/${GROUP_A.id}`, async ({ request }) => {
        sent = groupSchema.parse(await request.json())
        return HttpResponse.json({ data: GROUP_A })
      }),
    )
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)
    await user.selectOptions(within(dialog).getByLabelText(/^Lecturer/), 'Teuta Krasniqi')
    await user.selectOptions(within(dialog).getByLabelText(/^Lecturer/), 'Arben Hoxha · Mathematics, Physics')

    expect(within(dialog).queryByLabelText('Effective from')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await screen.findByText('Saved Group A.')
    expect(sent).toMatchObject({ lecturer_id: ARBEN.id, lecturer_effective_from: null })
  })

  const serveSavedGroup = (group: Group) => {
    const saved: { body?: unknown } = {}
    server.use(
      http.put(`${GROUPS_PATH}/${group.id}`, async ({ request }) => {
        saved.body = groupSchema.parse(await request.json())
        return HttpResponse.json({ data: group })
      }),
    )
    return saved
  }

  it('sends a date with a first lecturer', async () => {
    const empty: Group = { ...GROUP_A, lecturer: null }
    signInAsOwner({ active: [empty] })
    const saved = serveSavedGroup(empty)
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)
    await user.selectOptions(within(dialog).getByLabelText(/^Lecturer/), 'Teuta Krasniqi')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await screen.findByText('Saved Group A.')
    expect(saved.body).toMatchObject({ lecturer_id: TEUTA.id, lecturer_effective_from: expect.stringMatching(DAY_PATTERN) })
  })

  it('sends a date with choosing no lecturer', async () => {
    signInAsOwner({ active: [GROUP_A] })
    const saved = serveSavedGroup(GROUP_A)
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)
    await user.selectOptions(within(dialog).getByLabelText(/^Lecturer/), 'No lecturer')
    expect(within(dialog).getByLabelText('Effective from')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await screen.findByText('Saved Group A.')
    expect(saved.body).toMatchObject({ lecturer_id: null, lecturer_effective_from: expect.stringMatching(DAY_PATTERN) })
  })

  it('asks for no date when choosing the current lecturer drops a pending change, and still sends the change', async () => {
    const pending: Group = { ...GROUP_A, lecturer_change: { lecturer: TEUTA, start_date: '2026-12-01' } }
    signInAsOwner({ active: [pending] })
    const saved = serveSavedGroup(pending)
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)
    await user.selectOptions(within(dialog).getByLabelText(/^Lecturer/), 'Arben Hoxha · Mathematics, Physics')

    expect(within(dialog).queryByLabelText('Effective from')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await screen.findByText('Saved Group A.')
    expect(saved.body).toMatchObject({ lecturer_id: ARBEN.id, lecturer_effective_from: expect.stringMatching(DAY_PATTERN) })
  })

  it('asks for no date when choosing no lecturer drops a pending first lecturer', async () => {
    const pending: Group = { ...GROUP_A, lecturer: null, lecturer_change: { lecturer: TEUTA, start_date: '2026-12-01' } }
    signInAsOwner({ active: [pending] })
    const saved = serveSavedGroup(pending)
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)
    await user.selectOptions(within(dialog).getByLabelText(/^Lecturer/), 'No lecturer')

    expect(within(dialog).queryByLabelText('Effective from')).not.toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await screen.findByText('Saved Group A.')
    expect(saved.body).toMatchObject({ lecturer_id: null, lecturer_effective_from: expect.stringMatching(DAY_PATTERN) })
  })

  it('shows a refused date under its field', async () => {
    signInAsOwner({ active: [GROUP_A] })
    const message = 'The change can’t start before the current lecturer’s start.'
    server.use(http.put(`${GROUPS_PATH}/${GROUP_A.id}`, () => HttpResponse.json({ error: message, details: { formErrors: [], fieldErrors: { lecturer_effective_from: [message] } } }, { status: 400 })))
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)
    await user.selectOptions(within(dialog).getByLabelText(/^Lecturer/), 'Teuta Krasniqi')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await within(dialog).findByLabelText('Effective from')).toHaveAccessibleDescription(message)
  })

  it('opens on the change to come and says when it happens', async () => {
    signInAsOwner({ active: [{ ...GROUP_A, lecturer_change: { lecturer: TEUTA, start_date: '2026-12-01' } }] })
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)

    expect(within(dialog).getByLabelText(/^Lecturer/)).toHaveValue(TEUTA.id)
    expect(within(dialog).getByText('Changes on 1 Dec 2026. Until then: Arben Hoxha.')).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Effective from')).toHaveValue('2026-12-01')
  })

  it('moves a pending date in one save', async () => {
    const pending: Group = { ...GROUP_A, lecturer_change: { lecturer: TEUTA, start_date: '2026-12-01' } }
    signInAsOwner({ active: [pending] })
    const saved = serveSavedGroup(pending)
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)
    await user.clear(within(dialog).getByLabelText('Effective from'))
    await user.type(within(dialog).getByLabelText('Effective from'), '2027-01-15')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await screen.findByText('Saved Group A.')
    expect(saved.body).toMatchObject({ lecturer_id: TEUTA.id, lecturer_effective_from: '2027-01-15' })
  })

  it('moves the date a group is left without a lecturer', async () => {
    const pending: Group = { ...GROUP_A, lecturer_change: { lecturer: null, start_date: '2026-12-01' } }
    signInAsOwner({ active: [pending] })
    const saved = serveSavedGroup(pending)
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)
    expect(within(dialog).getByLabelText(/^Lecturer/)).toHaveValue('')
    await user.clear(within(dialog).getByLabelText('Effective from'))
    await user.type(within(dialog).getByLabelText('Effective from'), '2027-01-15')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await screen.findByText('Saved Group A.')
    expect(saved.body).toMatchObject({ lecturer_id: null, lecturer_effective_from: '2027-01-15' })
  })

  it('sends no date when a pending date stays, so a plain edit can’t redo the change', async () => {
    const pending: Group = { ...GROUP_A, lecturer_change: { lecturer: TEUTA, start_date: '2026-12-01' } }
    signInAsOwner({ active: [pending] })
    const saved = serveSavedGroup(pending)
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    await screen.findByText('Saved Group A.')
    expect(saved.body).toMatchObject({ lecturer_id: TEUTA.id, lecturer_effective_from: null })
  })

  it('brings back the pending date when the pending lecturer is chosen again', async () => {
    signInAsOwner({ active: [{ ...GROUP_A, lecturer: null, lecturer_change: { lecturer: TEUTA, start_date: '2026-12-01' } }] })
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)
    await user.selectOptions(within(dialog).getByLabelText(/^Lecturer/), 'Arben Hoxha · Mathematics, Physics')
    await user.selectOptions(within(dialog).getByLabelText(/^Lecturer/), 'Teuta Krasniqi')

    expect(within(dialog).getByLabelText('Effective from')).toHaveValue('2026-12-01')
  })

  it('asks for no date on an archived group with a pending change', async () => {
    signInAsOwner({ active: [], archived: [{ ...GROUP_A, status: 'ARCHIVED', lecturer_change: { lecturer: TEUTA, start_date: '2026-12-01' } }] })
    const { user } = renderRoute('/dashboard/groups')

    await user.click(await screen.findByRole('tab', { name: 'Archived 1' }))
    const dialog = await openEditDialog(user)

    expect(within(dialog).queryByLabelText('Effective from')).not.toBeInTheDocument()
  })

  it('keeps an archived lecturer already on the group as the current value', async () => {
    signInAsOwner({ active: [{ ...GROUP_A, lecturer: { ...ARBEN, status: 'ARCHIVED' } }] })
    server.use(http.get(`${GROUPS_PATH}/lecturer-options`, () => HttpResponse.json({ data: [LECTURER_OPTIONS[1]] })))
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openEditDialog(user)

    expect(within(dialog).getByLabelText(/^Lecturer/)).toHaveValue(ARBEN.id)
    expect(within(within(dialog).getByLabelText(/^Lecturer/)).getAllByRole('option').map((option) => option.textContent)).toEqual(['No lecturer', 'Teuta Krasniqi', 'Arben Hoxha (archived)'])
  })

  it('doesn’t offer to change the lecturer of an archived group', async () => {
    signInAsOwner({ active: [], archived: [{ ...GROUP_A, status: 'ARCHIVED' }] })
    const { user } = renderRoute('/dashboard/groups')

    await user.click(await screen.findByRole('tab', { name: 'Archived 1' }))
    const dialog = await openEditDialog(user)

    expect(within(dialog).getByLabelText(/^Lecturer/)).toBeDisabled()
  })
})

const HISTORY: GroupLecturerHistory = {
  assignments: [
    { id: 'a2', lecturer: TEUTA, start_date: '2026-11-10', end_date: null },
    { id: 'a1', lecturer: { ...ARBEN, status: 'ARCHIVED' }, start_date: '2026-09-01', end_date: '2026-11-09' },
  ],
  substitutions: [],
}

const serveHistory = (history: GroupLecturerHistory = HISTORY) => server.use(http.get(`${GROUPS_PATH}/${GROUP_A.id}/lecturers`, () => HttpResponse.json({ data: history })))

describe('GroupsPage: lecturers dialog', () => {
  it('shows the history from the row action, newest first', async () => {
    signInAsOwner({ active: [GROUP_A] })
    serveHistory()
    const { user } = renderRoute('/dashboard/groups')

    await user.click(await screen.findByRole('button', { name: 'Lecturers of Group A' }))

    const dialog = screen.getByRole('dialog', { name: 'Lecturers of Group A' })
    const history = await within(dialog).findByRole('list', { name: 'Permanent lecturers' })
    expect(within(history).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Teuta KrasniqiFrom 10 Nov 2026', 'Arben Hoxha (archived)1 Sep 2026 – 9 Nov 2026'])
  })

  it('says when the group never had a lecturer', async () => {
    signInAsOwner({ active: [GROUP_A] })
    serveHistory({ ...HISTORY, assignments: [] })
    const { user } = renderRoute('/dashboard/groups')

    await user.click(await screen.findByRole('button', { name: 'Lecturers of Group A' }))

    expect(await screen.findByText('No lecturer so far.')).toBeInTheDocument()
  })

  it('offers a retry when the history fails to load', async () => {
    signInAsOwner({ active: [GROUP_A] })
    server.use(http.get(`${GROUPS_PATH}/${GROUP_A.id}/lecturers`, () => HttpResponse.json({ error: 'Down' }, { status: 500 })))
    const { user } = renderRoute('/dashboard/groups')

    await user.click(await screen.findByRole('button', { name: 'Lecturers of Group A' }))
    expect(await screen.findByText('We couldn’t load the lecturers.')).toBeInTheDocument()
    serveHistory()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('list', { name: 'Permanent lecturers' })).toBeInTheDocument()
  })
})

const COVER: GroupSubstitution = { id: 'c0a1b2c3-1111-4222-8333-444455556601', lecturer: TEUTA, start_date: '2026-11-10', end_date: '2026-11-12', note: 'Sick leave', cancelled_at: null }

const openLecturersDialog = async (user: ReturnType<typeof renderRoute>['user']) => {
  await user.click(await screen.findByRole('button', { name: 'Lecturers of Group A' }))
  const dialog = screen.getByRole('dialog', { name: 'Lecturers of Group A' })
  await within(dialog).findByRole('list', { name: 'Permanent lecturers' })
  return dialog
}

describe('GroupsPage: substitutions', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('lists substitutions with their dates and note, one day as one date, and marks cancelled ones', async () => {
    signInAsOwner({ active: [GROUP_A] })
    serveHistory({
      ...HISTORY,
      substitutions: [
        COVER,
        { ...COVER, id: 'c0a1b2c3-1111-4222-8333-444455556602', start_date: '2026-11-03', end_date: '2026-11-03', note: null },
        { ...COVER, id: 'c0a1b2c3-1111-4222-8333-444455556603', start_date: '2026-11-01', end_date: '2026-11-01', note: null, cancelled_at: '2026-10-30T09:00:00.000Z' },
      ],
    })
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openLecturersDialog(user)

    const [range, oneDay, cancelled] = within(within(dialog).getByRole('list', { name: 'Substitutions' })).getAllByRole('listitem')
    expect(range).toHaveTextContent('Teuta Krasniqi')
    expect(range).toHaveTextContent('10 Nov 2026 – 12 Nov 2026')
    expect(range).toHaveTextContent('Sick leave')
    expect(oneDay).toHaveTextContent('3 Nov 2026')
    expect(oneDay).not.toHaveTextContent('–')
    expect(cancelled).toHaveTextContent('Cancelled')
  })

  it('says when there are no substitutions', async () => {
    signInAsOwner({ active: [GROUP_A] })
    serveHistory()
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openLecturersDialog(user)

    expect(within(dialog).getByText('No substitutions yet.')).toBeInTheDocument()
  })

  it('adds a substitution for a date range, starting from the organization’s today, and shows it', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-02T23:30:00.000Z'))
    signInAsOwner({ active: [GROUP_A] })
    serveHistory()
    let sent: unknown
    server.use(
      http.post(`${GROUPS_PATH}/${GROUP_A.id}/substitutions`, async ({ request }) => {
        sent = groupSubstitutionSchema.parse(await request.json())
        serveHistory({ ...HISTORY, substitutions: [COVER] })
        return HttpResponse.json({ data: COVER }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openLecturersDialog(user)
    expect(within(dialog).getByLabelText('Start date')).toHaveValue('2026-11-03')
    expect(within(dialog).getByLabelText('End date')).toHaveValue('2026-11-03')
    await user.selectOptions(within(dialog).getByLabelText('Substitute'), 'Teuta Krasniqi')
    await user.clear(within(dialog).getByLabelText('Start date'))
    await user.type(within(dialog).getByLabelText('Start date'), '2026-11-10')
    await user.clear(within(dialog).getByLabelText('End date'))
    await user.type(within(dialog).getByLabelText('End date'), '2026-11-12')
    await user.type(within(dialog).getByLabelText('Note (optional)'), 'Sick leave')
    await user.click(within(dialog).getByRole('button', { name: 'Add substitution' }))

    expect(await within(dialog).findByRole('list', { name: 'Substitutions' })).toHaveTextContent('Teuta Krasniqi')
    expect(sent).toEqual({ lecturer_id: TEUTA.id, start_date: '2026-11-10', end_date: '2026-11-12', note: 'Sick leave' })
    expect(within(dialog).getByLabelText('Substitute')).toHaveValue('')
  })

  it('asks for a lecturer, and an end date not before the start', async () => {
    signInAsOwner({ active: [GROUP_A] })
    serveHistory()
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openLecturersDialog(user)
    await user.clear(within(dialog).getByLabelText('End date'))
    await user.type(within(dialog).getByLabelText('End date'), '2020-01-01')
    await user.click(within(dialog).getByRole('button', { name: 'Add substitution' }))

    expect(await within(dialog).findByText('Choose a lecturer.')).toBeInTheDocument()
    expect(within(dialog).getByText('The end date can’t be before the start date.')).toBeInTheDocument()
  })

  it('shows a refusal under its field', async () => {
    signInAsOwner({ active: [GROUP_A] })
    serveHistory()
    const message = 'Another substitution already covers some of these days.'
    server.use(http.post(`${GROUPS_PATH}/${GROUP_A.id}/substitutions`, () => HttpResponse.json({ error: message, details: { formErrors: [], fieldErrors: { start_date: [message] } } }, { status: 409 })))
    const { user } = renderRoute('/dashboard/groups')

    const dialog = await openLecturersDialog(user)
    await user.selectOptions(within(dialog).getByLabelText('Substitute'), 'Teuta Krasniqi')
    await user.click(within(dialog).getByRole('button', { name: 'Add substitution' }))

    expect(await within(dialog).findByLabelText('Start date')).toHaveAccessibleDescription(message)
  })

  it('offers no form on an archived group', async () => {
    signInAsOwner({ active: [], archived: [{ ...GROUP_A, status: 'ARCHIVED' }] })
    serveHistory()
    const { user } = renderRoute('/dashboard/groups')

    await user.click(await screen.findByRole('tab', { name: 'Archived 1' }))
    const dialog = await openLecturersDialog(user)

    expect(within(dialog).queryByRole('button', { name: 'Add substitution' })).not.toBeInTheDocument()
  })
})

describe('GroupsPage: changing substitutions', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  const openOnNovember11 = async ({ substitutions = [COVER], status = 'ACTIVE' }: { substitutions?: GroupSubstitution[]; status?: GroupStatus } = {}) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-11-11T10:00:00.000Z'))
    const group: Group = { ...GROUP_A, status }
    signInAsOwner(status === 'ACTIVE' ? { active: [group] } : { active: [], archived: [group] })
    serveHistory({ ...HISTORY, substitutions })
    const { user } = renderRoute('/dashboard/groups')
    if (status === 'ARCHIVED') await user.click(await screen.findByRole('tab', { name: 'Archived 1' }))
    return { user, dialog: await openLecturersDialog(user) }
  }

  it('edits a running substitution with its values in the form', async () => {
    let sent: unknown
    server.use(
      http.put(`${GROUPS_PATH}/${GROUP_A.id}/substitutions/${COVER.id}`, async ({ request }) => {
        sent = groupSubstitutionSchema.parse(await request.json())
        serveHistory({ ...HISTORY, substitutions: [{ ...COVER, end_date: '2026-11-20' }] })
        return HttpResponse.json({ data: { ...COVER, end_date: '2026-11-20' } })
      }),
    )
    const { user, dialog } = await openOnNovember11()

    await user.click(within(dialog).getByRole('button', { name: 'Edit the substitution by Teuta Krasniqi' }))

    expect(within(dialog).getByLabelText('Substitute')).toHaveValue(TEUTA.id)
    expect(within(dialog).getByLabelText('Start date')).toHaveValue('2026-11-10')
    expect(within(dialog).getByLabelText('Note (optional)')).toHaveValue('Sick leave')
    await user.clear(within(dialog).getByLabelText('End date'))
    await user.type(within(dialog).getByLabelText('End date'), '2026-11-20')
    await user.click(within(dialog).getByRole('button', { name: 'Save substitution' }))

    expect(await within(dialog).findByText('10 Nov 2026 – 20 Nov 2026')).toBeInTheDocument()
    expect(sent).toEqual({ lecturer_id: TEUTA.id, start_date: '2026-11-10', end_date: '2026-11-20', note: 'Sick leave' })
    expect(within(dialog).getByRole('button', { name: 'Add substitution' })).toBeInTheDocument()
  })

  it('goes back to adding when editing stops', async () => {
    const { user, dialog } = await openOnNovember11()

    await user.click(within(dialog).getByRole('button', { name: 'Edit the substitution by Teuta Krasniqi' }))
    await user.click(within(dialog).getByRole('button', { name: 'Stop editing' }))

    expect(within(dialog).getByLabelText('Substitute')).toHaveValue('')
    expect(within(dialog).getByRole('button', { name: 'Add substitution' })).toBeInTheDocument()
  })

  it('keeps an archived substitute as the current value while editing', async () => {
    server.use(http.get(`${GROUPS_PATH}/lecturer-options`, () => HttpResponse.json({ data: [LECTURER_OPTIONS[0]] })))
    const { user, dialog } = await openOnNovember11({ substitutions: [{ ...COVER, lecturer: { ...TEUTA, status: 'ARCHIVED' } }] })

    expect(within(within(dialog).getByRole('list', { name: 'Substitutions' })).getByText('Teuta Krasniqi (archived)')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Edit the substitution by Teuta Krasniqi (archived)' }))

    expect(within(dialog).getByLabelText('Substitute')).toHaveValue(TEUTA.id)
  })

  it('cancels an upcoming substitution after one confirmation and marks the row', async () => {
    const upcoming: GroupSubstitution = { ...COVER, start_date: '2026-11-20', end_date: '2026-11-21' }
    server.use(
      http.post(`${GROUPS_PATH}/${GROUP_A.id}/substitutions/${COVER.id}/cancel`, () => {
        const cancelled: GroupSubstitution = { ...upcoming, cancelled_at: '2026-11-11T10:00:00.000Z' }
        serveHistory({ ...HISTORY, substitutions: [cancelled] })
        return HttpResponse.json({ data: cancelled })
      }),
    )
    const { user, dialog } = await openOnNovember11({ substitutions: [upcoming] })

    await user.click(within(dialog).getByRole('button', { name: 'Cancel the substitution by Teuta Krasniqi' }))
    const confirm = within(dialog).getByRole('group', { name: 'Cancel the substitution by Teuta Krasniqi' })
    expect(confirm).toHaveTextContent('It stays on record.')
    await user.click(within(confirm).getByRole('button', { name: 'Cancel substitution' }))

    expect(await within(dialog).findByText(/Cancelled/)).toBeInTheDocument()
    expect(within(dialog).queryByRole('button', { name: 'Edit the substitution by Teuta Krasniqi' })).not.toBeInTheDocument()
  })

  it('says a running substitution ends yesterday, and shows the days it covered', async () => {
    server.use(
      http.post(`${GROUPS_PATH}/${GROUP_A.id}/substitutions/${COVER.id}/cancel`, () => {
        const ended: GroupSubstitution = { ...COVER, end_date: '2026-11-10' }
        serveHistory({ ...HISTORY, substitutions: [ended] })
        return HttpResponse.json({ data: ended })
      }),
    )
    const { user, dialog } = await openOnNovember11()

    await user.click(within(dialog).getByRole('button', { name: 'Cancel the substitution by Teuta Krasniqi' }))
    const confirm = within(dialog).getByRole('group', { name: 'Cancel the substitution by Teuta Krasniqi' })
    expect(confirm).toHaveTextContent('It ends yesterday; the days covered stay.')
    await user.click(within(confirm).getByRole('button', { name: 'Cancel substitution' }))

    await vi.waitFor(() => expect(within(dialog).queryByRole('button', { name: 'Edit the substitution by Teuta Krasniqi' })).not.toBeInTheDocument())
    expect(within(dialog).getByRole('list', { name: 'Substitutions' })).not.toHaveTextContent('Cancelled')
  })

  it('locks the start and the substitute of a running substitution, and leaves the end open', async () => {
    const { user, dialog } = await openOnNovember11()

    await user.click(within(dialog).getByRole('button', { name: 'Edit the substitution by Teuta Krasniqi' }))

    expect(within(dialog).getByLabelText('Substitute')).toBeDisabled()
    expect(within(dialog).getByLabelText('Start date')).toBeDisabled()
    expect(within(dialog).getByLabelText('End date')).toBeEnabled()
  })

  it('leaves every field of an upcoming substitution open', async () => {
    const { user, dialog } = await openOnNovember11({ substitutions: [{ ...COVER, start_date: '2026-11-20', end_date: '2026-11-21' }] })

    await user.click(within(dialog).getByRole('button', { name: 'Edit the substitution by Teuta Krasniqi' }))

    expect(within(dialog).getByLabelText('Substitute')).toBeEnabled()
    expect(within(dialog).getByLabelText('Start date')).toBeEnabled()
  })

  it('resets the form when the substitution being edited is cancelled', async () => {
    server.use(
      http.post(`${GROUPS_PATH}/${GROUP_A.id}/substitutions/${COVER.id}/cancel`, () => {
        const cancelled: GroupSubstitution = { ...COVER, cancelled_at: '2026-11-11T10:00:00.000Z' }
        serveHistory({ ...HISTORY, substitutions: [cancelled] })
        return HttpResponse.json({ data: cancelled })
      }),
    )
    const { user, dialog } = await openOnNovember11()

    await user.click(within(dialog).getByRole('button', { name: 'Edit the substitution by Teuta Krasniqi' }))
    await user.click(within(dialog).getByRole('button', { name: 'Cancel the substitution by Teuta Krasniqi' }))
    await user.click(within(within(dialog).getByRole('group', { name: 'Cancel the substitution by Teuta Krasniqi' })).getByRole('button', { name: 'Cancel substitution' }))

    expect(await within(dialog).findByRole('button', { name: 'Add substitution' })).toBeInTheDocument()
    expect(within(dialog).getByLabelText('Substitute')).toHaveValue('')
  })

  it('keeps the form on the substitution being edited when another one is cancelled', async () => {
    const other: GroupSubstitution = { ...COVER, id: 'c0a1b2c3-1111-4222-8333-444455556606', lecturer: ARBEN, start_date: '2026-11-20', end_date: '2026-11-20' }
    server.use(http.post(`${GROUPS_PATH}/${GROUP_A.id}/substitutions/${other.id}/cancel`, () => HttpResponse.json({ data: { ...other, cancelled_at: '2026-11-11T10:00:00.000Z' } })))
    const { user, dialog } = await openOnNovember11({ substitutions: [other, COVER] })

    await user.click(within(dialog).getByRole('button', { name: 'Edit the substitution by Teuta Krasniqi' }))
    await user.click(within(dialog).getByRole('button', { name: 'Cancel the substitution by Arben Hoxha' }))
    await user.click(within(within(dialog).getByRole('group', { name: 'Cancel the substitution by Arben Hoxha' })).getByRole('button', { name: 'Cancel substitution' }))

    await vi.waitFor(() => expect(within(dialog).getByRole('button', { name: 'Save substitution' })).toBeInTheDocument())
    expect(within(dialog).getByLabelText('Substitute')).toHaveValue(TEUTA.id)
  })

  it('shows why a substitution can’t be cancelled', async () => {
    server.use(http.post(`${GROUPS_PATH}/${GROUP_A.id}/substitutions/${COVER.id}/cancel`, () => HttpResponse.json({ error: 'This substitution is over, so it can’t change.' }, { status: 409 })))
    const { user, dialog } = await openOnNovember11()

    await user.click(within(dialog).getByRole('button', { name: 'Cancel the substitution by Teuta Krasniqi' }))
    await user.click(within(within(dialog).getByRole('group', { name: 'Cancel the substitution by Teuta Krasniqi' })).getByRole('button', { name: 'Cancel substitution' }))

    expect(await screen.findByText('This substitution is over, so it can’t change.')).toBeInTheDocument()
  })

  it('offers no changes on a past or cancelled substitution, or on an archived group', async () => {
    const past: GroupSubstitution = { ...COVER, id: 'c0a1b2c3-1111-4222-8333-444455556604', start_date: '2026-11-09', end_date: '2026-11-10' }
    const cancelled: GroupSubstitution = { ...COVER, id: 'c0a1b2c3-1111-4222-8333-444455556605', start_date: '2026-11-20', end_date: '2026-11-20', cancelled_at: '2026-11-01T10:00:00.000Z' }
    const { dialog } = await openOnNovember11({ substitutions: [past, cancelled] })

    expect(within(dialog).queryByRole('button', { name: /the substitution by/ })).not.toBeInTheDocument()
    cleanup()

    const archived = await openOnNovember11({ status: 'ARCHIVED' })
    expect(within(archived.dialog).queryByRole('button', { name: /the substitution by/ })).not.toBeInTheDocument()
  })
})
