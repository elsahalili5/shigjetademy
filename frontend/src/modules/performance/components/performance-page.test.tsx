import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { AuthUser, MemberRole, Permission } from '@shigjetademy/shared/auth'
import type { GradeColumn, GradeGroup, GradeOverview, GroupReport, ReportTerm, StudentReport } from '@shigjetademy/shared/grades'
import { buildUser, DEFAULT_SETTINGS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const GRADES = '*/api/organizations/org-1/grades'

const membershipWith = (role: MemberRole, permissions: Permission[] = []): AuthUser['memberships'][number] => ({
  id: 'membership-me',
  role,
  permissions,
  organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS },
})

const signInWithRole = (role: MemberRole, permissions: Permission[] = []) => signInAs(buildUser({ id: 'user-me', memberships: [membershipWith(role, permissions)] }))

const GROUP_A: GradeGroup = { id: '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e21', name: 'Group A', course_name: 'Mathematics', is_archived: false }
const GROUP_B: GradeGroup = { id: '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e22', name: 'Group B', course_name: 'Physics', is_archived: false }

const AUTUMN: ReportTerm = { id: '7c1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e01', name: 'Autumn', start_date: '2026-09-01', end_date: '2026-12-31', year_name: '2026–27' }
const SPRING: ReportTerm = { id: '7c1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e02', name: 'Spring', start_date: '2026-02-01', end_date: '2026-06-30', year_name: '2025–26' }

const AUTUMN_OVERVIEW: GradeOverview = {
  terms: [AUTUMN, SPRING],
  term: AUTUMN,
  below_pass_count: 1,
  groups: [
    { group: GROUP_A, student_count: 2, average: { points: 45, max_points: 60, percent: 75 }, marked_count: 2, missing_count: 1 },
    { group: GROUP_B, student_count: 1, average: null, marked_count: 0, missing_count: 0 },
  ],
}

const SPRING_OVERVIEW: GradeOverview = {
  terms: [AUTUMN, SPRING],
  term: SPRING,
  below_pass_count: 0,
  groups: [
    { group: GROUP_A, student_count: 2, average: { points: 20, max_points: 30, percent: 67 }, marked_count: 4, missing_count: 3 },
    { group: GROUP_B, student_count: 1, average: { points: 9, max_points: 10, percent: 90 }, marked_count: 1, missing_count: 0 },
  ],
}

/** Serves the overview of the term in the query, or the current one without */
const serveOverviews = (byTerm: Record<string, GradeOverview>, current: GradeOverview) =>
  server.use(
    http.get(`${GRADES}/overview`, ({ request }) => {
      const termId = new URL(request.url).searchParams.get('term_id')
      return HttpResponse.json({ data: termId ? byTerm[termId] : current })
    }),
  )

const rowTexts = (table: HTMLElement) =>
  within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => [within(row).getByRole('rowheader').textContent, ...within(row).getAllByRole('cell').map((item) => item.textContent)])

describe('reports: group overview', () => {
  it('shows the owner each group’s students, average and marked and missing work for the current term', async () => {
    signInWithRole('OWNER')
    serveOverviews({}, AUTUMN_OVERVIEW)
    renderRoute('/dashboard/performance')

    expect(await screen.findByRole('heading', { level: 1, name: 'Reports' })).toBeInTheDocument()
    const table = await screen.findByRole('table', { name: 'Groups in Autumn' })
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Group', 'Students', 'Average', 'Marked', 'Missing assignments'])
    expect(rowTexts(table)).toEqual([
      ['Group AMathematics', '2', '75%', '2', '1'],
      ['Group BPhysics', '1', '—', '0', '0'],
    ])
    expect(screen.getByLabelText('Term')).toHaveDisplayValue('Autumn · 2026–27')
  })

  it('sums up the term in tiles and charts each group’s average against the pass mark, highest first', async () => {
    signInWithRole('OWNER')
    const groupC: GradeGroup = { id: '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e23', name: 'Group C', course_name: 'Chemistry', is_archived: false }
    serveOverviews(
      {},
      {
        ...AUTUMN_OVERVIEW,
        below_pass_count: 3,
        groups: [...AUTUMN_OVERVIEW.groups, { group: groupC, student_count: 3, average: { points: 12, max_points: 40, percent: 30 }, marked_count: 2, missing_count: 4 }],
      },
    )
    renderRoute('/dashboard/performance')

    await screen.findByRole('table', { name: 'Groups in Autumn' })
    // 57 of 100 points over both groups with marks
    const terms = screen.getAllByRole('term').map((term) => term.textContent)
    const values = screen.getAllByRole('definition').map((value) => value.textContent)
    expect(terms.map((term, index) => [term, values[index]])).toEqual([
      ['Average', '57%'],
      ['Groups', '3'],
      ['Students below 50%', '3'],
      ['Missing assignments', '5'],
    ])

    const chart = within(screen.getByRole('figure', { name: 'Group averages' }))
    expect(chart.getByText('Pass mark')).toBeInTheDocument()
    const bars = chart.getAllByRole('img')
    expect(bars.map((bar) => bar.getAttribute('aria-label'))).toEqual(['Group A · Mathematics: 75%', 'Group C · Chemistry: 30%'])
    expect(chart.getByText('No marks yet')).toBeInTheDocument()
    expect(chart.getByText('Below 50%')).toBeInTheDocument()

    expect(bars[1]).toHaveAccessibleDescription('30%12 of 40 points · Group C')
  })

  it('refetches and shows the picked term’s numbers', async () => {
    signInWithRole('LECTURER')
    serveOverviews({ [SPRING.id]: SPRING_OVERVIEW }, AUTUMN_OVERVIEW)
    const { user } = renderRoute('/dashboard/performance')

    await screen.findByRole('table', { name: 'Groups in Autumn' })
    await user.selectOptions(screen.getByLabelText('Term'), 'Spring · 2025–26')

    const table = await screen.findByRole('table', { name: 'Groups in Spring' })
    expect(rowTexts(table)).toEqual([
      ['Group AMathematics', '2', '67%', '4', '3'],
      ['Group BPhysics', '1', '90%', '1', '0'],
    ])
    const bars = within(screen.getByRole('figure', { name: 'Group averages' })).getAllByRole('img')
    expect(bars.map((bar) => bar.getAttribute('aria-label'))).toEqual(['Group B · Physics: 90%', 'Group A · Mathematics: 67%'])
  })

  it('opens on the term and group in the address', async () => {
    signInWithRole('OWNER')
    serveOverviews({ [SPRING.id]: SPRING_OVERVIEW }, AUTUMN_OVERVIEW)
    server.use(http.get(`${GRADES}/overview/groups/${GROUP_A.id}`, () => HttpResponse.json({ data: { ...GROUP_A_REPORT, term: SPRING } })))
    renderRoute(`/dashboard/performance?term_id=${SPRING.id}&group_id=${GROUP_A.id}`)

    expect(await screen.findByRole('table', { name: 'Students in Group A' })).toBeInTheDocument()
    expect(screen.getByLabelText('Term')).toHaveDisplayValue('Spring · 2025–26')
    expect(screen.getByLabelText('Group')).toHaveDisplayValue('Group A · Mathematics')
  })

  it('says every date counts when no terms are set up', async () => {
    signInWithRole('ADMIN', ['MANAGE_GRADES'])
    serveOverviews({}, { ...AUTUMN_OVERVIEW, terms: [], term: null })
    renderRoute('/dashboard/performance')

    expect(await screen.findByRole('table', { name: 'Groups in all terms' })).toBeInTheDocument()
    expect(screen.getByText('No terms are set up, so this covers every date.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Term')).not.toBeInTheDocument()
  })

  it('says when there are no groups yet', async () => {
    signInWithRole('LECTURER')
    serveOverviews({}, { ...AUTUMN_OVERVIEW, groups: [] })
    renderRoute('/dashboard/performance')

    expect(await screen.findByText('No groups yet.')).toBeInTheDocument()
  })

  it('offers to try again when the overview fails to load', async () => {
    signInWithRole('OWNER')
    server.use(http.get(`${GRADES}/overview`, () => HttpResponse.json({ error: 'Failed' }, { status: 500 })))
    renderRoute('/dashboard/performance')

    expect(await screen.findByText('We couldn’t load the reports.')).toBeInTheDocument()
    serveOverviews({}, AUTUMN_OVERVIEW)
    await screen.findByRole('button', { name: 'Try again' }).then((button) => button.click())
    expect(await screen.findByRole('table', { name: 'Groups in Autumn' })).toBeInTheDocument()
  })

  it('sends a student back to their dashboard', async () => {
    signInWithRole('STUDENT')
    const { router } = renderRoute('/dashboard/performance')

    // The dashboard sends a student on to My school
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/my-school'))
  })
})

const ALBA = { id: '9a1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e01', first_name: 'Alba', last_name: 'Krasniqi' }
const DREN = { id: '9a1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e02', first_name: 'Dren', last_name: 'Morina' }

const GROUP_A_REPORT: GroupReport = {
  terms: [AUTUMN, SPRING],
  term: AUTUMN,
  group: GROUP_A,
  students: [
    { student: ALBA, average: { points: 45, max_points: 60, percent: 75 }, marked_count: 2, missing_count: 0 },
    { student: DREN, average: { points: 10, max_points: 40, percent: 25 }, marked_count: 1, missing_count: 1 },
  ],
}

describe('reports: a group’s students', () => {
  it('shows the picked group’s students for the term and flags those under 50% in words', async () => {
    signInWithRole('LECTURER')
    serveOverviews({}, AUTUMN_OVERVIEW)
    const termIds: (string | null)[] = []
    server.use(
      http.get(`${GRADES}/overview/groups/${GROUP_A.id}`, ({ request }) => {
        termIds.push(new URL(request.url).searchParams.get('term_id'))
        return HttpResponse.json({ data: GROUP_A_REPORT })
      }),
    )
    const { user, router } = renderRoute('/dashboard/performance')

    await screen.findByRole('table', { name: 'Groups in Autumn' })
    await user.selectOptions(screen.getByLabelText('Group'), 'Group A · Mathematics')

    const table = await screen.findByRole('table', { name: 'Students in Group A' })
    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual(['Student', 'Average', 'Marked', 'Missing assignments'])
    expect(rowTexts(table)).toEqual([
      ['Alba Krasniqi', '75%', '2', '0'],
      ['Dren Morina', '25%Below 50%', '1', '1'],
    ])
    expect(termIds).toEqual([AUTUMN.id])
    expect(screen.queryByRole('table', { name: 'Groups in Autumn' })).not.toBeInTheDocument()
    const bands = within(screen.getByRole('figure', { name: 'Students by average' }))
    expect(bands.getAllByRole('img').map((band) => band.getAttribute('aria-label'))).toEqual(['0–49%: 1 student', '50–69%: 0 students', '70–84%: 1 student', '85–100%: 0 students'])
    expect(bands.getByText('Below 50%')).toBeInTheDocument()
    expect(router.state.location.search).toEqual({ group_id: GROUP_A.id })

    await user.selectOptions(screen.getByLabelText('Group'), 'All groups')
    expect(await screen.findByRole('table', { name: 'Groups in Autumn' })).toBeInTheDocument()
  })

  it('says when the group has no students', async () => {
    signInWithRole('OWNER')
    serveOverviews({}, AUTUMN_OVERVIEW)
    server.use(http.get(`${GRADES}/overview/groups/${GROUP_B.id}`, () => HttpResponse.json({ data: { ...GROUP_A_REPORT, group: GROUP_B, students: [] } })))
    const { user } = renderRoute('/dashboard/performance')

    await screen.findByRole('table', { name: 'Groups in Autumn' })
    await user.selectOptions(screen.getByLabelText('Group'), 'Group B · Physics')

    expect(await screen.findByText('No students in this group.')).toBeInTheDocument()
  })

  it('says a group the member can’t read isn’t found, without offering to try again', async () => {
    signInWithRole('LECTURER')
    serveOverviews({}, AUTUMN_OVERVIEW)
    server.use(http.get(`${GRADES}/overview/groups/${GROUP_A.id}`, () => HttpResponse.json({ error: 'Group not found' }, { status: 404 })))
    const { user } = renderRoute('/dashboard/performance')

    await screen.findByRole('table', { name: 'Groups in Autumn' })
    await user.selectOptions(screen.getByLabelText('Group'), 'Group A · Mathematics')

    expect(await screen.findByText('Group not found.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })
})

const LIMITS: GradeColumn = { kind: 'ASSIGNMENT', id: 'a-1', title: 'Limits worksheet', date: '2026-10-20T16:00:00.000Z', max_points: 20 }

const ALBA_REPORT: StudentReport = {
  terms: [AUTUMN, SPRING],
  term: AUTUMN,
  student: ALBA,
  groups: [
    {
      group: GROUP_A,
      grades: [{ column: LIMITS, cell: { column_id: LIMITS.id, status: 'MARKED', points: 15, feedback: 'Check question 4.' } }],
      average: { points: 15, max_points: 20, percent: 75 },
    },
  ],
}

/** Serves Alba's report and keeps the term each request asked for */
const serveAlbaReport = () => {
  const termIds: (string | null)[] = []
  server.use(
    http.get(`${GRADES}/students/${ALBA.id}/report`, ({ request }) => {
      termIds.push(new URL(request.url).searchParams.get('term_id'))
      return HttpResponse.json({ data: ALBA_REPORT })
    }),
  )
  return termIds
}

describe('reports: a student’s report', () => {
  it('opens from the group’s students with the same term, and shows their work and average in each group', async () => {
    signInWithRole('LECTURER')
    serveOverviews({ [AUTUMN.id]: AUTUMN_OVERVIEW }, AUTUMN_OVERVIEW)
    server.use(http.get(`${GRADES}/overview/groups/${GROUP_A.id}`, () => HttpResponse.json({ data: GROUP_A_REPORT })))
    const termIds = serveAlbaReport()
    const { user, router } = renderRoute('/dashboard/performance')

    await screen.findByRole('table', { name: 'Groups in Autumn' })
    await user.selectOptions(screen.getByLabelText('Group'), 'Group A · Mathematics')
    await user.click(await screen.findByRole('link', { name: 'Alba Krasniqi' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Alba Krasniqi' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/dashboard/performance/${ALBA.id}`)
    expect(termIds).toEqual([AUTUMN.id])
    expect(screen.getByText('Report for Autumn · 2026–27')).toBeInTheDocument()
    const groupA = within(screen.getByRole('region', { name: 'Group A · Mathematics' }))
    expect(groupA.getByText('Average 75%')).toBeInTheDocument()
    expect(groupA.getByText('15 / 20')).toBeInTheDocument()
    expect(groupA.getByText('Check question 4.')).toBeInTheDocument()
    expect(screen.getByText('Term average').nextElementSibling).toHaveTextContent('75%')
    expect(screen.getByText('15 of 20 points across one group')).toBeInTheDocument()

    // The trend's crosshair readout follows keyboard focus
    const trend = within(screen.getByRole('figure', { name: 'Marks over the term' }))
    const point = trend.getByRole('img', { name: /^Limits worksheet, Group A, .*: 15 \/ 20, 75%$/ })
    expect(trend.queryByRole('tooltip')).not.toBeInTheDocument()
    point.focus()
    expect(await trend.findByRole('tooltip')).toHaveTextContent('15 / 20 · 75%Limits worksheetGroup A')
    // The pointer leaving the plot keeps the readout of the focused point
    fireEvent.pointerLeave(point.parentElement ?? point)
    expect(trend.getByRole('tooltip')).toBeInTheDocument()
    expect(router.state.location.search).toEqual({ term_id: AUTUMN.id, group_id: GROUP_A.id })

    // Back returns to the same term and group
    await user.click(screen.getByRole('link', { name: 'Back to reports' }))
    expect(await screen.findByRole('table', { name: 'Students in Group A' })).toBeInTheDocument()
    expect(router.state.location.search).toEqual({ term_id: AUTUMN.id, group_id: GROUP_A.id })
  })

  it('prints the report, without the sidebar and the page’s controls', async () => {
    signInWithRole('OWNER')
    serveAlbaReport()
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    const { user } = renderRoute(`/dashboard/performance/${ALBA.id}`)

    await user.click(await screen.findByRole('button', { name: 'Print' }))

    expect(print).toHaveBeenCalledOnce()
    // jsdom has no print media, so this checks the classes that hide them there
    expect(screen.getByRole('navigation', { name: 'Modules' }).closest('aside')).toHaveClass('print:hidden')
    expect(screen.getByRole('button', { name: 'Print' }).parentElement).toHaveClass('print:hidden')
    expect(screen.getByRole('link', { name: 'Back to reports' })).toHaveClass('print:hidden')
    print.mockRestore()
  })

  it('says a student outside the member’s groups isn’t found, without offering to try again', async () => {
    signInWithRole('LECTURER')
    server.use(http.get(`${GRADES}/students/${ALBA.id}/report`, () => HttpResponse.json({ error: 'Student not found' }, { status: 404 })))
    renderRoute(`/dashboard/performance/${ALBA.id}`)

    expect(await screen.findByText('Student not found.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('offers to try again when the report fails to load', async () => {
    signInWithRole('LECTURER')
    server.use(http.get(`${GRADES}/students/${ALBA.id}/report`, () => HttpResponse.json({ error: 'Failed' }, { status: 500 })))
    renderRoute(`/dashboard/performance/${ALBA.id}`)

    expect(await screen.findByText('We couldn’t load the report.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('sends a student back to their dashboard', async () => {
    signInWithRole('STUDENT')
    const { router } = renderRoute(`/dashboard/performance/${ALBA.id}`)

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/my-school'))
  })
})

describe('reports: navigation', () => {
  it('lists Reports in the owner’s Learning section right after Grades', async () => {
    signInWithRole('OWNER')
    serveOverviews({}, AUTUMN_OVERVIEW)
    renderRoute('/dashboard/performance')

    const learning = within(await screen.findByRole('group', { name: 'Learning' }))
    const labels = learning.getAllByRole('link').map((link) => link.textContent)
    expect(labels.slice(labels.indexOf('Grades'))).toEqual(['Grades', 'Reports'])
    expect(learning.getByRole('link', { name: 'Reports' })).toHaveAttribute('href', '/dashboard/performance')
    expect(within(screen.getByRole('group', { name: 'Finance' })).queryByRole('link', { name: 'Reports' })).not.toBeInTheDocument()
  })

  it.each([
    ['LECTURER', [], 'Reports'],
    ['ADMIN', ['MANAGE_GRADES'], 'Performance & reports'],
  ] as const)('has the link in the %s sidebar', async (role, permissions, label) => {
    signInWithRole(role, [...permissions])
    serveOverviews({}, AUTUMN_OVERVIEW)
    renderRoute('/dashboard/performance')

    const sidebar = within(await screen.findByRole('navigation', { name: 'Modules' }))
    expect(await sidebar.findByRole('link', { name: label })).toHaveAttribute('href', '/dashboard/performance')
  })
})
