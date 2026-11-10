import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '@shigjetademy/shared/auth'
import type { StudentRosterDetail } from '@shigjetademy/shared/student-roster'
import { buildUser, DEFAULT_SETTINGS, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const LECTURER_MEMBERSHIPS: AuthUser['memberships'] = [
  { id: 'membership-8', role: 'LECTURER', permissions: [], organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS } },
]

const DETAIL: StudentRosterDetail = {
  student: { id: 'student-1', first_name: 'Alba', last_name: 'Gashi' },
  groups: [{ id: 'group-a', name: 'Group A' }],
  attendance: [
    { date: '2026-09-21', group: { id: 'group-a', name: 'Group A' }, start_time: '17:00', status: 'ABSENT' },
    { date: '2026-09-14', group: { id: 'group-a', name: 'Group A' }, start_time: '17:00', status: 'TARDY' },
    { date: '2026-09-07', group: { id: 'group-a', name: 'Group A' }, start_time: '17:00', status: 'PRESENT' },
  ],
  summary: { present: 1, tardy: 1, absent: 1, rate: 67 },
}

const DETAIL_PATH = `/dashboard/my-students/${DETAIL.student.id}`

const signInAsLecturer = () => signInAs(buildUser({ first_name: 'Arben', last_name: 'Hoxha', email: 'arben@lecturer.test', memberships: LECTURER_MEMBERSHIPS }))

const serveStudent = (detail: StudentRosterDetail | null, status = 200) =>
  server.use(http.get(`*/api/organizations/org-1/my-students/${DETAIL.student.id}`, () => HttpResponse.json(detail ? { data: detail } : { error: 'Not found' }, { status })))

afterEach(() => {
  server.resetHandlers()
})

describe('StudentDetailPage', () => {
  it('shows the student’s name, groups, attendance rate and history, newest first', async () => {
    signInAsLecturer()
    serveStudent(DETAIL)
    renderRoute(DETAIL_PATH)

    expect(await screen.findByRole('heading', { name: 'Alba Gashi' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Groups' })).getByText('Group A')).toBeInTheDocument()
    expect(screen.getByText('67%')).toBeInTheDocument()

    const history = screen.getByRole('list', { name: 'Attendance history' })
    const rows = within(history).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Absent')
    expect(rows[1]).toHaveTextContent('Tardy')
    expect(rows[2]).toHaveTextContent('Present')
  })

  it('shows "No attendance recorded yet" instead of a 0% rate when nothing is marked', async () => {
    signInAsLecturer()
    serveStudent({ ...DETAIL, attendance: [], summary: { present: 0, tardy: 0, absent: 0, rate: null } })
    renderRoute(DETAIL_PATH)

    await screen.findByRole('heading', { name: 'Alba Gashi' })
    expect(screen.getByText('No attendance recorded yet.')).toBeInTheDocument()
    expect(screen.getByText('No attendance recorded yet', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()
  })

  it('shows a not-found message for a student outside the lecturer’s groups', async () => {
    signInAsLecturer()
    serveStudent(null, 403)
    renderRoute(DETAIL_PATH)

    expect(await screen.findByText('Student not found.')).toBeInTheDocument()
  })
})

const MANAGER_DETAIL_PATH = `/dashboard/students/${DETAIL.student.id}`

const STUDENTS_ADMIN_MEMBERSHIPS: AuthUser['memberships'] = [{ ...OWNER_MEMBERSHIPS[0], id: 'membership-9', role: 'ADMIN', permissions: ['MANAGE_STUDENTS'] }]

describe('StudentDetailPage: from Students', () => {
  it.each([
    ['the owner', OWNER_MEMBERSHIPS],
    ['an admin with Students', STUDENTS_ADMIN_MEMBERSHIPS],
  ])('shows %s the student with the manager wording and a way back to Students', async (_viewer, memberships) => {
    signInAs(buildUser({ memberships }))
    serveStudent({ ...DETAIL, groups: [], attendance: [], summary: { present: 0, tardy: 0, absent: 0, rate: null } })
    renderRoute(MANAGER_DETAIL_PATH)

    expect(await screen.findByRole('heading', { name: 'Alba Gashi' })).toBeInTheDocument()
    expect(screen.getByText('Their groups and attendance.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Students' })).toHaveAttribute('href', '/dashboard/students')
    expect(within(screen.getByRole('region', { name: 'Groups' })).getByText('Not in any group.')).toBeInTheDocument()
    expect(screen.getByText('Marks from any of their groups will show up here.')).toBeInTheDocument()
    expect(screen.queryByText(/groups you teach/)).not.toBeInTheDocument()
  })

  it('says the student isn’t in the organization when they can’t be found', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serveStudent(null, 404)
    renderRoute(MANAGER_DETAIL_PATH)

    expect(await screen.findByText('Student not found.')).toBeInTheDocument()
    expect(screen.getByText('This student isn’t in your organization, or the link is old.')).toBeInTheDocument()
  })

  it.each([
    ['an admin without Students', [{ ...STUDENTS_ADMIN_MEMBERSHIPS[0], permissions: ['MANAGE_COURSES'] }]],
    ['a lecturer', LECTURER_MEMBERSHIPS],
  ] satisfies [string, AuthUser['memberships']][])('sends %s back to the dashboard', async (_viewer, memberships) => {
    signInAs(buildUser({ memberships }))
    serveStudent(DETAIL)
    server.use(http.get('*/api/organizations/org-1/*', () => HttpResponse.json({ data: [] })))
    const { router } = renderRoute(MANAGER_DETAIL_PATH)

    await vi.waitFor(() => expect(router.state.location.pathname).not.toBe(MANAGER_DETAIL_PATH))
  })
})
