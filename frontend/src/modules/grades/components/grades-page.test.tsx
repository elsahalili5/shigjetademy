import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { AuthUser, MemberRole, Permission } from '@shigjetademy/shared/auth'
import type { Gradebook, GradeCell, GradeColumn, GradeGroup, StudentGroupGrades } from '@shigjetademy/shared/grades'
import { buildUser, DEFAULT_SETTINGS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const ORG = '*/api/organizations/org-1/grades'

/** More tab stops than the page has before the gradebook */
const TAB_LIMIT = 80

const membershipWith = (role: MemberRole, permissions: Permission[] = []): AuthUser['memberships'][number] => ({
  id: 'membership-me',
  role,
  permissions,
  organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS },
})

const signInWithRole = (role: MemberRole, permissions: Permission[] = []) => signInAs(buildUser({ id: 'user-me', memberships: [membershipWith(role, permissions)] }))

const GROUP_A_ID = '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e21'
const GROUP_B_ID = '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e22'

const GROUP_A: GradeGroup = { id: GROUP_A_ID, name: 'Group A', course_name: 'Mathematics', is_archived: false }
const GROUP_B: GradeGroup = { id: GROUP_B_ID, name: 'Group B', course_name: 'Physics', is_archived: false }

const LIMITS: GradeColumn = { kind: 'ASSIGNMENT', id: 'a-1', title: 'Limits worksheet', date: '2026-10-20T16:00:00.000Z', max_points: 20 }
const UNIT_TEST: GradeColumn = { kind: 'TEST', id: 't-1', title: 'Unit 3 test', date: '2026-11-01T08:00:00.000Z', max_points: 40 }
const SERIES: GradeColumn = { kind: 'ASSIGNMENT', id: 'a-2', title: 'Series worksheet', date: '2026-11-10T16:00:00.000Z', max_points: 10 }
const QUIZ: GradeColumn = { kind: 'ASSIGNMENT', id: 'a-3', title: 'Derivatives quiz', date: '2026-12-01T16:00:00.000Z', max_points: 10 }

const cell = (column: GradeColumn, overrides: Partial<GradeCell> = {}): GradeCell => ({ column_id: column.id, status: 'NOT_DUE', points: null, feedback: null, ...overrides })

const ALBA = { id: 's-1', first_name: 'Alba', last_name: 'Krasniqi' }
const DREN = { id: 's-2', first_name: 'Dren', last_name: 'Morina' }

const GROUP_A_GRADEBOOK: Gradebook = {
  group: GROUP_A,
  columns: [LIMITS, UNIT_TEST, SERIES, QUIZ],
  rows: [
    {
      student: ALBA,
      cells: [cell(LIMITS, { status: 'MARKED', points: 15, feedback: 'Check question 4.' }), cell(UNIT_TEST, { status: 'MARKED', points: 30 }), cell(SERIES, { status: 'HANDED_IN' }), cell(QUIZ)],
      average: { points: 45, max_points: 60, percent: 75 },
    },
    { student: DREN, cells: [cell(LIMITS, { status: 'MISSING' }), cell(UNIT_TEST, { status: 'ABSENT' }), cell(SERIES, { status: 'MISSING' }), cell(QUIZ)], average: null },
  ],
}

const FORCES: GradeColumn = { kind: 'ASSIGNMENT', id: 'b-1', title: 'Forces lab report', date: '2026-10-20T16:00:00.000Z', max_points: 30 }

const GROUP_B_GRADEBOOK: Gradebook = { group: GROUP_B, columns: [FORCES], rows: [{ student: DREN, cells: [cell(FORCES, { status: 'MISSING' })], average: null }] }

const serveGroups = (groups: GradeGroup[]) => server.use(http.get(`${ORG}/groups`, () => HttpResponse.json({ data: groups })))

/** Serves each group's gradebook by the group in the query */
const serveGradebooks = (byGroup: Record<string, Gradebook>) =>
  server.use(
    http.get(ORG, ({ request }) => {
      const groupId = new URL(request.url).searchParams.get('group_id') ?? ''
      return HttpResponse.json({ data: byGroup[groupId] })
    }),
  )

describe('grades: gradebook', () => {
  it('shows a lecturer the first group’s students by assignments and tests, and switches group with the picker', async () => {
    signInWithRole('LECTURER')
    serveGroups([GROUP_A, GROUP_B])
    serveGradebooks({ [GROUP_A_ID]: GROUP_A_GRADEBOOK, [GROUP_B_ID]: GROUP_B_GRADEBOOK })
    const { user } = renderRoute('/dashboard/grades')

    expect(await screen.findByRole('heading', { level: 1, name: 'Grades' })).toBeInTheDocument()
    const table = within(await screen.findByRole('table', { name: 'Gradebook for Group A' }))
    expect(table.getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Student',
      expect.stringMatching(/^AssignmentLimits worksheetDue /),
      expect.stringMatching(/^TestUnit 3 testOn /),
      expect.stringMatching(/^AssignmentSeries worksheetDue /),
      expect.stringMatching(/^AssignmentDerivatives quizDue /),
      'Average',
    ])
    expect(table.getByRole('link', { name: 'Limits worksheet' })).toHaveAttribute('href', '/dashboard/assignments/a-1')
    expect(table.getByRole('link', { name: 'Unit 3 test' })).toHaveAttribute('href', '/dashboard/tests/t-1')

    const [, albaRow, drenRow] = table.getAllByRole('row')
    expect(within(albaRow).getByRole('rowheader')).toHaveTextContent('Alba Krasniqi')
    const albaCells = within(albaRow).getAllByRole('cell')
    expect(within(albaCells[0]).getByText('15 / 20')).toBeInTheDocument()
    expect(albaCells.slice(1).map((item) => item.textContent)).toEqual(['30 / 40', 'Handed in', '', '75%'])
    expect(within(drenRow).getAllByRole('cell').map((item) => item.textContent)).toEqual(['Missing', 'Absent', 'Missing', '', '—'])

    await user.selectOptions(screen.getByLabelText('Group'), 'Group B · Physics')

    expect(await screen.findByRole('table', { name: 'Gradebook for Group B' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Forces lab report' })).toBeInTheDocument()
  })

  it('shows only the tests or only the assignments from the tabs, each with its own average', async () => {
    signInWithRole('LECTURER')
    serveGroups([GROUP_A, GROUP_B])
    serveGradebooks({ [GROUP_A_ID]: GROUP_A_GRADEBOOK, [GROUP_B_ID]: GROUP_B_GRADEBOOK })
    const { user } = renderRoute('/dashboard/grades')

    const headerTexts = async () =>
      within(await screen.findByRole('table', { name: /^Gradebook for/ }))
        .getAllByRole('columnheader')
        .map((header) => header.textContent)
    expect(await screen.findByRole('tab', { name: 'All 4' })).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('tab', { name: 'Tests 1' }))
    expect(await headerTexts()).toEqual(['Student', expect.stringMatching(/^TestUnit 3 test/), 'Test average'])
    const rowCells = () =>
      within(screen.getByRole('table'))
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell').map((item) => item.textContent))
    // Alba's test average is her test alone; Dren was absent, so has none
    expect(rowCells()).toEqual([
      ['30 / 40', '75%'],
      ['Absent', '—'],
    ])

    await user.click(screen.getByRole('tab', { name: 'Assignments 3' }))
    expect(await headerTexts()).toEqual(['Student', expect.stringMatching(/^AssignmentLimits/), expect.stringMatching(/^AssignmentSeries/), expect.stringMatching(/^AssignmentDerivatives/), 'Assignment average'])
    expect(rowCells()).toEqual([
      ['15 / 20Check question 4.', 'Handed in', '', '75%'],
      ['Missing', 'Missing', '', '—'],
    ])

    // Group B has only assignments, so it has no tabs and shows them all
    await user.selectOptions(screen.getByLabelText('Group'), 'Group B · Physics')
    expect(await screen.findByRole('table', { name: 'Gradebook for Group B' })).toBeInTheDocument()
    expect(screen.queryByRole('tablist', { name: 'Show columns' })).not.toBeInTheDocument()
  })

  it('shows a test’s title as plain text to an admin with Grades but not Tests', async () => {
    signInWithRole('ADMIN', ['MANAGE_GRADES'])
    serveGroups([GROUP_A])
    serveGradebooks({ [GROUP_A_ID]: GROUP_A_GRADEBOOK })
    renderRoute('/dashboard/grades')

    const table = within(await screen.findByRole('table', { name: 'Gradebook for Group A' }))
    expect(table.getByText('Unit 3 test')).toBeInTheDocument()
    expect(table.queryByRole('link', { name: 'Unit 3 test' })).not.toBeInTheDocument()
    expect(table.getByRole('link', { name: 'Limits worksheet' })).toBeInTheDocument()
  })

  it('shows a mark’s feedback to keyboard and pointer users', async () => {
    signInWithRole('OWNER')
    serveGroups([GROUP_A])
    serveGradebooks({ [GROUP_A_ID]: GROUP_A_GRADEBOOK })
    const { user } = renderRoute('/dashboard/grades')

    const mark = await screen.findByText('15 / 20')
    expect(mark).toHaveAccessibleDescription('Check question 4.')
    // Tabbing through the page reaches the mark
    for (let step = 0; step < TAB_LIMIT && document.activeElement !== mark; step += 1) await user.tab()
    expect(mark).toHaveFocus()
  })

  it('says when the lecturer teaches no group', async () => {
    signInWithRole('LECTURER')
    serveGroups([])
    renderRoute('/dashboard/grades')

    expect(await screen.findByText('No groups yet.')).toBeInTheDocument()
  })

  it('says when a group has no assignments with points or tests yet', async () => {
    signInWithRole('ADMIN', ['MANAGE_GRADES'])
    serveGroups([GROUP_A])
    serveGradebooks({ [GROUP_A_ID]: { group: GROUP_A, columns: [], rows: [{ student: ALBA, cells: [], average: null }] } })
    renderRoute('/dashboard/grades')

    expect(await screen.findByText('No marks here yet.')).toBeInTheDocument()
  })

  it('sends an admin without Grades back to their dashboard', async () => {
    signInWithRole('ADMIN')
    server.use(http.get('*/api/organizations/org-1/academic-periods/years', () => HttpResponse.json({ data: [] })))
    const { router } = renderRoute('/dashboard/grades')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/academic-periods'))
  })
})

const serveMine = (grades: StudentGroupGrades[]) => server.use(http.get(`${ORG}/mine`, () => HttpResponse.json({ data: grades })))

describe('grades: a student’s own', () => {
  it('shows one card per group with the student’s marks, feedback and average', async () => {
    signInWithRole('STUDENT')
    serveMine([
      {
        group: GROUP_A,
        grades: [
          { column: LIMITS, cell: cell(LIMITS, { status: 'MARKED', points: 15, feedback: 'Check question 4.' }) },
          { column: UNIT_TEST, cell: cell(UNIT_TEST, { status: 'ABSENT', feedback: 'Ill that day.' }) },
          { column: SERIES, cell: cell(SERIES, { status: 'MISSING' }) },
          { column: QUIZ, cell: cell(QUIZ) },
        ],
        average: { points: 15, max_points: 20, percent: 75 },
      },
      { group: GROUP_B, grades: [], average: null },
    ])
    renderRoute('/dashboard/grades')

    const groupA = within(await screen.findByRole('region', { name: 'Group A · Mathematics' }))
    expect(groupA.getByText('Average 75%')).toBeInTheDocument()
    const items = groupA.getAllByRole('listitem')
    expect(within(items[0]).getByText('Limits worksheet')).toBeInTheDocument()
    expect(within(items[0]).getByText('15 / 20')).toBeInTheDocument()
    expect(within(items[0]).getByText('Check question 4.')).toBeInTheDocument()
    expect(within(items[1]).getByText('Unit 3 test')).toBeInTheDocument()
    expect(within(items[1]).getByText('Absent')).toBeInTheDocument()
    expect(within(items[1]).getByText('Ill that day.')).toBeInTheDocument()
    expect(within(items[0]).getByText('Assignment')).toBeInTheDocument()
    expect(within(items[1]).getByText('Test')).toBeInTheDocument()
    expect(within(items[1]).getByText(/^On /)).toBeInTheDocument()
    expect(within(items[2]).getByText('Missing')).toBeInTheDocument()
    expect(within(items[3]).getByText('Not due yet')).toBeInTheDocument()
    const groupB = within(screen.getByRole('region', { name: 'Group B · Physics' }))
    expect(groupB.getByText('No marks yet.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Group')).not.toBeInTheDocument()
  })

  it('says when the student is in no group yet', async () => {
    signInWithRole('STUDENT')
    serveMine([])
    renderRoute('/dashboard/grades')

    expect(await screen.findByText('No grades yet.')).toBeInTheDocument()
  })
})

describe('grades: navigation', () => {
  it.each(['LECTURER', 'STUDENT', 'OWNER'] as const)('has a Grades link in the %s sidebar', async (role) => {
    signInWithRole(role)
    serveGroups([])
    serveMine([])
    renderRoute('/dashboard/grades')

    const sidebar = within(await screen.findByRole('navigation', { name: 'Modules' }))
    expect(await sidebar.findByRole('link', { name: 'Grades' })).toHaveAttribute('href', '/dashboard/grades')
  })

  it('has the Grades link for an admin with Grades', async () => {
    signInWithRole('ADMIN', ['MANAGE_GRADES'])
    serveGroups([GROUP_A])
    serveGradebooks({ [GROUP_A_ID]: GROUP_A_GRADEBOOK })
    renderRoute('/dashboard/grades')

    const sidebar = within(await screen.findByRole('navigation', { name: 'Modules' }))
    expect(await sidebar.findByRole('link', { name: 'Grades' })).toHaveAttribute('href', '/dashboard/grades')
  })

  it('leaves the link out for an admin without Grades and for a guardian', async () => {
    signInWithRole('ADMIN')
    server.use(http.get('*/api/organizations/org-1/academic-periods/years', () => HttpResponse.json({ data: [] })))
    renderRoute('/dashboard/academic-periods')

    const adminSidebar = within(await screen.findByRole('navigation', { name: 'Modules' }))
    expect(await adminSidebar.findByRole('link', { name: 'Academic periods' })).toBeInTheDocument()
    expect(adminSidebar.queryByRole('link', { name: 'Grades' })).not.toBeInTheDocument()
    cleanup()

    signInWithRole('GUARDIAN')
    server.use(http.get('*/api/organizations/org-1/me/children', () => HttpResponse.json({ data: [] })))
    renderRoute('/dashboard/my-children')

    const guardianSidebar = within(await screen.findByRole('navigation', { name: 'Modules' }))
    expect(await guardianSidebar.findByRole('link', { name: 'My children' })).toBeInTheDocument()
    expect(guardianSidebar.queryByRole('link', { name: 'Grades' })).not.toBeInTheDocument()
  })
})
