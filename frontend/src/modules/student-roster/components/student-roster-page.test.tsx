import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthUser } from '@shigjetademy/shared/auth'
import type { RosterEntry } from '@shigjetademy/shared/student-roster'
import { buildUser, DEFAULT_SETTINGS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const LECTURER_MEMBERSHIPS: AuthUser['memberships'] = [
  { id: 'membership-8', role: 'LECTURER', permissions: [], organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS } },
]

const ALBA: RosterEntry = { student_id: 'student-1', first_name: 'Alba', last_name: 'Gashi', email: 'alba@student.test', group: { id: 'group-a', name: 'Group A' } }

const BESA: RosterEntry = { student_id: 'student-2', first_name: 'Besa', last_name: 'Berisha', email: null, group: { id: 'group-a', name: 'Group A' } }

const DRITON: RosterEntry = { student_id: 'student-3', first_name: 'Driton', last_name: 'Krasniqi', email: 'driton@student.test', group: { id: 'group-b', name: 'Group B' } }

const signInAsLecturer = () => signInAs(buildUser({ first_name: 'Arben', last_name: 'Hoxha', email: 'arben@lecturer.test', memberships: LECTURER_MEMBERSHIPS }))

const serveRoster = (entries: RosterEntry[]) => server.use(http.get('*/api/organizations/org-1/my-students', () => HttpResponse.json({ data: entries })))

afterEach(() => {
  server.resetHandlers()
})

describe('StudentRosterPage', () => {
  it('lists the lecturer’s students with their name, email and group', async () => {
    signInAsLecturer()
    serveRoster([ALBA, BESA])
    renderRoute('/dashboard/my-students')

    const table = await screen.findByRole('table', { name: 'Students' })
    expect(within(table).getByText('Alba Gashi')).toBeInTheDocument()
    expect(within(table).getAllByText('alba@student.test').length).toBeGreaterThan(0)
    expect(within(table).getByText('Besa Berisha')).toBeInTheDocument()
    expect(within(table).getAllByText('No login').length).toBeGreaterThan(0)
    expect(within(table).getAllByText('Group A').length).toBeGreaterThan(0)
  })

  it('shows a student twice when they’re in two of the lecturer’s groups', async () => {
    signInAsLecturer()
    serveRoster([ALBA, { ...ALBA, group: { id: 'group-b', name: 'Group B' } }])
    renderRoute('/dashboard/my-students')

    const table = await screen.findByRole('table', { name: 'Students' })
    expect(within(table).getAllByText('Alba Gashi')).toHaveLength(2)
    expect(within(table).getAllByText('Group A').length).toBeGreaterThan(0)
    expect(within(table).getAllByText('Group B').length).toBeGreaterThan(0)
  })

  it('shows an empty state when the lecturer has no students', async () => {
    signInAsLecturer()
    serveRoster([])
    renderRoute('/dashboard/my-students')

    expect(await screen.findByText('No students yet')).toBeInTheDocument()
  })

  it('shows a retry option when the roster fails to load', async () => {
    signInAsLecturer()
    server.use(http.get('*/api/organizations/org-1/my-students', () => HttpResponse.json({ error: 'Failed' }, { status: 500 })))
    renderRoute('/dashboard/my-students')

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('opens a student’s page from their row', async () => {
    signInAsLecturer()
    serveRoster([ALBA])
    server.use(http.get('*/api/organizations/org-1/my-students/student-1', () => HttpResponse.json({ data: { student: { id: 'student-1', first_name: 'Alba', last_name: 'Gashi' }, groups: [], attendance: [], summary: { present: 0, tardy: 0, absent: 0, rate: null } } })))
    const { router, user } = renderRoute('/dashboard/my-students')

    await user.click(await screen.findByRole('link', { name: 'Alba Gashi' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/my-students/student-1'))
  })

  it('opens a student’s page from their row’s "View details" button', async () => {
    signInAsLecturer()
    serveRoster([ALBA])
    server.use(http.get('*/api/organizations/org-1/my-students/student-1', () => HttpResponse.json({ data: { student: { id: 'student-1', first_name: 'Alba', last_name: 'Gashi' }, groups: [], attendance: [], summary: { present: 0, tardy: 0, absent: 0, rate: null } } })))
    const { router, user } = renderRoute('/dashboard/my-students')

    const table = await screen.findByRole('table', { name: 'Students' })
    await user.click(within(table).getByRole('link', { name: 'View details' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/my-students/student-1'))
  })

  it('narrows the list to students matching the search', async () => {
    signInAsLecturer()
    serveRoster([ALBA, BESA, DRITON])
    const { user } = renderRoute('/dashboard/my-students')

    const table = await screen.findByRole('table', { name: 'Students' })
    expect(within(table).getByText('Driton Krasniqi')).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Search students' }), 'driton')

    expect(within(table).getByText('Driton Krasniqi')).toBeInTheDocument()
    expect(within(table).queryByText('Alba Gashi')).not.toBeInTheDocument()
    expect(within(table).queryByText('Besa Berisha')).not.toBeInTheDocument()
  })

  it('filters the list by group, offering each of the lecturer’s groups once, and combines it with the search', async () => {
    signInAsLecturer()
    serveRoster([ALBA, BESA, DRITON, { ...ALBA, group: { id: 'group-b', name: 'Group B' } }])
    const { user } = renderRoute('/dashboard/my-students')

    const table = await screen.findByRole('table', { name: 'Students' })
    const filter = screen.getByRole('combobox', { name: 'Filter by group' })
    expect(within(filter).getAllByRole('option').map((option) => option.textContent)).toEqual(['All groups', 'Group A', 'Group B'])

    await user.selectOptions(filter, 'Group B')
    expect(within(table).getByText('Driton Krasniqi')).toBeInTheDocument()
    expect(within(table).getByText('Alba Gashi')).toBeInTheDocument()
    expect(within(table).queryByText('Besa Berisha')).not.toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Search students' }), 'driton')
    expect(within(table).getByText('Driton Krasniqi')).toBeInTheDocument()
    expect(within(table).queryByText('Alba Gashi')).not.toBeInTheDocument()

    await user.selectOptions(filter, 'All groups')
    expect(within(table).getByText('Driton Krasniqi')).toBeInTheDocument()
  })

  it('shows "No matches" when the search finds no one', async () => {
    signInAsLecturer()
    serveRoster([ALBA])
    const { user } = renderRoute('/dashboard/my-students')

    await screen.findByText('Alba Gashi')
    await user.type(screen.getByRole('searchbox', { name: 'Search students' }), 'no one by this name')

    expect(await screen.findByText('No matches')).toBeInTheDocument()
  })
})
