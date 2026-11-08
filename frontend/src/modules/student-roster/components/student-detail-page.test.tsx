import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthUser } from '@shigjetademy/shared/auth'
import type { StudentRosterDetail } from '@shigjetademy/shared/student-roster'
import { buildUser, DEFAULT_SETTINGS, signInAs } from '#/test/fixtures'
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
