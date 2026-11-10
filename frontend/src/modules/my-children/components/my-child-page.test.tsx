import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { AuthUser } from '@shigjetademy/shared/auth'
import type { MyChild, MyChildDetail } from '@shigjetademy/shared/guardians'
import { buildUser, DEFAULT_SETTINGS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const GUARDIAN_MEMBERSHIPS: AuthUser['memberships'] = [
  { id: 'membership-5', role: 'GUARDIAN', permissions: [], organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS } },
]

const ARTA: MyChild = { id: 'student-1', first_name: 'Arta', last_name: 'Gashi' }
const BESA: MyChild = { id: 'student-2', first_name: 'Besa', last_name: 'Gashi' }

const DETAIL: MyChildDetail = {
  student: ARTA,
  groups: [{ id: 'group-a', name: 'Group A', course: 'Mathematics', academic_year: '2026–27', academic_term: 'Autumn term', location: 'Room 101', schedule: [{ weekday: 'WEDNESDAY', start_time: '17:00', end_time: '18:30' }] }],
  rescheduled_lessons: [
    { id: 'move-1', group: { id: 'group-a', name: 'Group A', course: 'Mathematics' }, original_date: '2026-11-04', original_start_time: '17:00', new_date: '2026-11-06', new_start_time: '16:00', new_end_time: '17:30' },
  ],
  attendance: [
    { date: '2026-10-14', group: { id: 'group-a', name: 'Group A' }, start_time: '17:00', status: 'ABSENT' },
    { date: '2026-10-07', group: { id: 'group-a', name: 'Group A' }, start_time: '17:00', status: 'PRESENT' },
  ],
  summary: { present: 1, tardy: 0, absent: 1, rate: 50 },
}

const serve = ({ detail = DETAIL, children = [ARTA, BESA] }: { detail?: MyChildDetail; children?: MyChild[] } = {}) =>
  server.use(
    http.get('*/api/organizations/org-1/me/children', () => HttpResponse.json({ data: children })),
    http.get(`*/api/organizations/org-1/me/children/${ARTA.id}`, () => HttpResponse.json({ data: detail })),
  )

const PATH = `/dashboard/my-children/${ARTA.id}`

describe('MyChildPage', () => {
  it('shows the child’s groups, weekly schedule, attendance rate and history, with a way back to My children', async () => {
    signInAs(buildUser({ memberships: GUARDIAN_MEMBERSHIPS }))
    serve()
    renderRoute(PATH)

    expect(await screen.findByRole('heading', { level: 1, name: 'Arta Gashi' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to My children' })).toHaveAttribute('href', '/dashboard/my-children')
    expect(within(screen.getByRole('region', { name: 'Groups' })).getByText('Group A')).toBeInTheDocument()
    const schedule = within(screen.getByRole('region', { name: 'Weekly schedule' }))
    expect(schedule.getByText('Mathematics · Autumn term · Room 101')).toBeInTheDocument()
    expect(schedule.getByText(/Wed/)).toHaveTextContent('17:00')
    expect(within(screen.getByRole('region', { name: 'Rescheduled lessons' })).getByText('Group A · Mathematics')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    const rows = within(screen.getByRole('list', { name: 'Attendance history' })).getAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('Absent')
    expect(rows[1]).toHaveTextContent('Present')
  })

  it('shows no staff sections: no guardians list and no invite or edit actions', async () => {
    signInAs(buildUser({ memberships: GUARDIAN_MEMBERSHIPS }))
    serve()
    renderRoute(PATH)

    await screen.findByRole('heading', { name: 'Arta Gashi' })
    expect(screen.queryByRole('region', { name: 'Guardians' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add guardian|Invite|Edit|Unlink|Resend|Revoke/ })).not.toBeInTheDocument()
  })

  it('switches between the guardian’s children from the child’s page', async () => {
    signInAs(buildUser({ memberships: GUARDIAN_MEMBERSHIPS }))
    serve()
    renderRoute(PATH)

    const switcher = await screen.findByRole('navigation', { name: 'Switch child' })
    expect(within(switcher).getByRole('link', { name: 'Arta Gashi' })).toHaveAttribute('aria-current', 'page')
    expect(within(switcher).getByRole('link', { name: 'Besa Gashi' })).toHaveAttribute('href', '/dashboard/my-children/student-2')
  })

  it('leaves out the switcher for an only child', async () => {
    signInAs(buildUser({ memberships: GUARDIAN_MEMBERSHIPS }))
    serve({ children: [ARTA] })
    renderRoute(PATH)

    await screen.findByRole('heading', { name: 'Arta Gashi' })
    expect(screen.queryByRole('navigation', { name: 'Switch child' })).not.toBeInTheDocument()
  })

  it('says when there are no groups, schedule or attendance yet', async () => {
    signInAs(buildUser({ memberships: GUARDIAN_MEMBERSHIPS }))
    serve({ detail: { ...DETAIL, groups: [], rescheduled_lessons: [], attendance: [], summary: { present: 0, tardy: 0, absent: 0, rate: null } } })
    renderRoute(PATH)

    await screen.findByRole('heading', { name: 'Arta Gashi' })
    expect(within(screen.getByRole('region', { name: 'Groups' })).getByText('Not in any group right now.')).toBeInTheDocument()
    expect(screen.getByText('No lessons scheduled right now.')).toBeInTheDocument()
    expect(screen.getByText('No attendance recorded yet.')).toBeInTheDocument()
    expect(screen.getByText('Marks from their groups will show up here.')).toBeInTheDocument()
  })

  it('says the child isn’t theirs when the server answers 404', async () => {
    signInAs(buildUser({ memberships: GUARDIAN_MEMBERSHIPS }))
    server.use(
      http.get('*/api/organizations/org-1/me/children', () => HttpResponse.json({ data: [] })),
      http.get('*/api/organizations/org-1/me/children/student-9', () => HttpResponse.json({ error: 'Child not found' }, { status: 404 })),
    )
    renderRoute('/dashboard/my-children/student-9')

    expect(await screen.findByText('Student not found.')).toBeInTheDocument()
    expect(screen.getByText('This child isn’t linked to you, or the link is old.')).toBeInTheDocument()
  })

  it('opens a child from the My children list', async () => {
    signInAs(buildUser({ memberships: GUARDIAN_MEMBERSHIPS }))
    serve()
    const { router, user } = renderRoute('/dashboard/my-children')

    await user.click(await screen.findByRole('link', { name: 'Arta Gashi' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Arta Gashi' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(PATH)
  })
})
