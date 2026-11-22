import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser, MemberRole, Permission } from '@shigjetademy/shared/auth'
import type { StudentTest, Test, TestGroup, TestResult, TestSheet } from '@shigjetademy/shared/tests'
import { buildUser, DEFAULT_SETTINGS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const ORG = '*/api/organizations/org-1/tests'

const membershipWith = (role: MemberRole, permissions: Permission[] = []): AuthUser['memberships'][number] => ({
  id: 'membership-me',
  role,
  permissions,
  organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS },
})

const signInWithRole = (role: MemberRole, permissions: Permission[] = []) => signInAs(buildUser({ id: 'user-me', memberships: [membershipWith(role, permissions)] }))

const ARBEN = { membership_id: 'membership-arben', first_name: 'Arben', last_name: 'Hoxha' }

const GROUP_A_ID = '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e21'
const GROUP_B_ID = '5b1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e22'

const GROUP_A: TestGroup = { id: GROUP_A_ID, name: 'Group A', course_name: 'Mathematics', is_archived: false, can_set: true }
const GROUP_B: TestGroup = { id: GROUP_B_ID, name: 'Group B', course_name: 'Physics', is_archived: false, can_set: true }

const buildTest = (overrides: Partial<Test> & Pick<Test, 'id' | 'title'>): Test => ({
  group: { id: GROUP_A_ID, name: 'Group A', course_name: 'Mathematics' },
  description: 'Chapters 4 to 6.',
  held_at: '2026-11-20T08:00:00.000Z',
  max_points: 40,
  author: ARBEN,
  created_at: '2026-11-10T11:00:00.000Z',
  updated_at: '2026-11-10T11:00:00.000Z',
  can_edit: true,
  can_remove: true,
  ...overrides,
})

const serveGroups = (groups: TestGroup[]) => server.use(http.get(`${ORG}/groups`, () => HttpResponse.json({ data: groups })))

/** Serves each group's tests by the group in the query */
const serveTests = (byGroup: Record<string, Test[]>) =>
  server.use(
    http.get(ORG, ({ request }) => {
      const groupId = new URL(request.url).searchParams.get('group_id') ?? ''
      return HttpResponse.json({ data: byGroup[groupId] ?? [] })
    }),
  )

describe('tests: setting', () => {
  it('shows a lecturer the first group’s tests by date and switches group with the picker', async () => {
    signInWithRole('LECTURER')
    serveGroups([GROUP_A, GROUP_B])
    serveTests({
      [GROUP_A_ID]: [buildTest({ id: 't-1', title: 'Quiz 1', held_at: '2026-10-01T08:00:00.000Z' }), buildTest({ id: 't-2', title: 'Unit 3 test' })],
      [GROUP_B_ID]: [buildTest({ id: 't-3', title: 'Forces test' })],
    })
    const { user } = renderRoute('/dashboard/tests')

    expect(await screen.findByRole('heading', { level: 1, name: 'Tests' })).toBeInTheDocument()
    const list = await screen.findByRole('list', { name: 'Tests' })
    expect(within(list).getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Quiz 1', 'Unit 3 test'])
    expect(within(list).getAllByText('Out of 40 points')).toHaveLength(2)

    await user.selectOptions(screen.getByLabelText('Group'), 'Group B · Physics')

    expect(await screen.findByText('Forces test')).toBeInTheDocument()
    expect(screen.queryByText('Quiz 1')).not.toBeInTheDocument()
  })

  it('sets a test with its time in the school’s time zone, and checks the fields first', async () => {
    signInWithRole('LECTURER')
    serveGroups([GROUP_A])
    serveTests({})
    let sent: unknown = null
    server.use(
      http.post(ORG, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ data: buildTest({ id: 't-new', title: 'Unit 3 test' }) }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/tests')

    await user.click(await screen.findByRole('button', { name: 'Set test' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Set test' }))
    await user.click(dialog.getByRole('button', { name: 'Set test' }))
    expect(await dialog.findByText('Write a title.')).toBeInTheDocument()
    expect(dialog.getByText('Choose a day.')).toBeInTheDocument()
    expect(dialog.getByText('Enter whole points, like 20.')).toBeInTheDocument()
    expect(sent).toBeNull()

    await user.type(dialog.getByLabelText('Title'), 'Unit 3 test')
    await user.type(dialog.getByLabelText(/Description/), 'Chapters 4 to 6.')
    await user.type(dialog.getByLabelText('Day'), '2026-11-20')
    await user.type(dialog.getByLabelText('Time'), '09:00')
    await user.type(dialog.getByLabelText('Max points'), '40')
    await user.click(dialog.getByRole('button', { name: 'Set test' }))

    expect(await screen.findByText('Unit 3 test')).toBeInTheDocument()
    // 09:00 in Belgrade is 08:00 UTC in November
    expect(sent).toEqual({ group_id: GROUP_A_ID, title: 'Unit 3 test', description: 'Chapters 4 to 6.', held_at: '2026-11-20T08:00:00.000Z', max_points: 40 })
    expect(screen.queryByRole('dialog', { name: 'Set test' })).not.toBeInTheDocument()
  })

  it('edits a test from its menu, starting from what is saved', async () => {
    signInWithRole('LECTURER')
    serveGroups([GROUP_A])
    const saved = buildTest({ id: 't-1', title: 'Unit 3 test' })
    serveTests({ [GROUP_A_ID]: [saved] })
    let sent: unknown = null
    server.use(
      http.put(`${ORG}/t-1`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ data: { ...saved, title: 'Unit 3 test (retake)', max_points: 50 } })
      }),
    )
    const { user } = renderRoute('/dashboard/tests')

    await user.click(await screen.findByRole('button', { name: 'Actions for Unit 3 test' }))
    await user.click(screen.getByRole('menuitem', { name: 'Edit test' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Edit test' }))
    expect(dialog.getByLabelText('Title')).toHaveValue('Unit 3 test')
    expect(dialog.getByLabelText('Day')).toHaveValue('2026-11-20')
    expect(dialog.getByLabelText('Time')).toHaveValue('09:00')
    expect(dialog.getByLabelText('Max points')).toHaveValue('40')
    await user.clear(dialog.getByLabelText('Title'))
    await user.type(dialog.getByLabelText('Title'), 'Unit 3 test (retake)')
    await user.clear(dialog.getByLabelText('Max points'))
    await user.type(dialog.getByLabelText('Max points'), '50')
    await user.click(dialog.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Unit 3 test (retake)')).toBeInTheDocument()
    expect(sent).toEqual({ title: 'Unit 3 test (retake)', description: 'Chapters 4 to 6.', held_at: '2026-11-20T08:00:00.000Z', max_points: 50 })
  })

  it('removes a test after one confirmation', async () => {
    signInWithRole('OWNER')
    serveGroups([GROUP_A])
    serveTests({ [GROUP_A_ID]: [buildTest({ id: 't-1', title: 'Unit 3 test' }), buildTest({ id: 't-2', title: 'Quiz 2' })] })
    let removedId: string | null = null
    server.use(
      http.delete(`${ORG}/:testId`, ({ params }) => {
        removedId = String(params.testId)
        return HttpResponse.json({ data: { id: removedId } })
      }),
    )
    const { user } = renderRoute('/dashboard/tests')

    await user.click(await screen.findByRole('button', { name: 'Actions for Unit 3 test' }))
    await user.click(screen.getByRole('menuitem', { name: 'Remove test' }))
    const confirm = within(screen.getByRole('group', { name: 'Remove Unit 3 test' }))
    expect(confirm.getByText('Remove this test and its results?')).toBeInTheDocument()
    await user.click(confirm.getByRole('button', { name: 'Remove' }))

    await waitFor(() => expect(screen.queryByText('Unit 3 test')).not.toBeInTheDocument())
    expect(removedId).toBe('t-1')
    expect(screen.getByText('Quiz 2')).toBeInTheDocument()
  })

  it('says when a group has no tests yet', async () => {
    signInWithRole('LECTURER')
    serveGroups([GROUP_A])
    serveTests({})
    renderRoute('/dashboard/tests')

    expect(await screen.findByText('No tests here yet.')).toBeInTheDocument()
  })

  it('hides Set test and the menus in an archived group, and says it is read-only', async () => {
    signInWithRole('LECTURER')
    serveGroups([{ ...GROUP_A, is_archived: true, can_set: false }])
    serveTests({ [GROUP_A_ID]: [buildTest({ id: 't-old', title: 'Last year’s final', can_edit: false, can_remove: false })] })
    renderRoute('/dashboard/tests')

    expect(await screen.findByText('Last year’s final')).toBeInTheDocument()
    expect(screen.getByText('This group is archived. Its tests and results stay readable, and nothing can be changed.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Set test' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Actions for/ })).not.toBeInTheDocument()
  })
})

const result = (overrides: Partial<TestResult> = {}): TestResult => ({ points: null, is_absent: false, feedback: null, recorded_at: '2026-11-20T12:00:00.000Z', ...overrides })

const ALBA = { id: '7c1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e01', first_name: 'Alba', last_name: 'Krasniqi', student_number: 'STU-1' }
const DREN = { id: '7c1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e02', first_name: 'Dren', last_name: 'Morina', student_number: 'STU-2' }
const ERZA = { id: '7c1f2c4e-8f7a-4d2b-9c3e-1a2b3c4d5e03', first_name: 'Erza', last_name: 'Shala', student_number: 'STU-3' }

const sheetOf = (overrides: Partial<TestSheet> = {}): TestSheet => ({
  ...buildTest({ id: 't-1', title: 'Unit 3 test' }),
  rows: [
    { student: ALBA, result: result({ points: 36, feedback: 'Strong on limits.' }) },
    { student: DREN, result: result({ is_absent: true }) },
    { student: ERZA, result: null },
  ],
  ...overrides,
})

const serveSheet = (sheet: TestSheet) => server.use(http.get(`${ORG}/${sheet.id}`, () => HttpResponse.json({ data: sheet })))

describe('tests: recording results', () => {
  it('opens a test from the list and shows every student with their saved result', async () => {
    signInWithRole('LECTURER')
    serveGroups([GROUP_A])
    serveTests({ [GROUP_A_ID]: [buildTest({ id: 't-1', title: 'Unit 3 test' })] })
    serveSheet(sheetOf())
    const { user, router } = renderRoute('/dashboard/tests')

    await user.click(await screen.findByRole('link', { name: 'Unit 3 test' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/tests/t-1'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Unit 3 test' })).toBeInTheDocument()
    expect(screen.getByLabelText('Points for Alba Krasniqi')).toHaveValue('36')
    expect(screen.getByLabelText('Note for Alba Krasniqi')).toHaveValue('Strong on limits.')
    expect(screen.getByRole('checkbox', { name: 'Dren Morina was absent' })).toBeChecked()
    expect(screen.getByLabelText('Points for Dren Morina')).toBeDisabled()
    expect(screen.getByLabelText('Points for Erza Shala')).toHaveValue('')
  })

  it('saves the whole sheet in one request, after checking the points', async () => {
    signInWithRole('LECTURER')
    const sheet = sheetOf()
    serveSheet(sheet)
    let sent: unknown = null
    server.use(
      http.put(`${ORG}/t-1/results`, async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({
          data: { ...sheet, rows: [sheet.rows[0], { student: DREN, result: result({ points: 20 }) }, { student: ERZA, result: result({ is_absent: true, feedback: 'Ill.' }) }] },
        })
      }),
    )
    const { user } = renderRoute('/dashboard/tests/t-1')

    await user.type(await screen.findByLabelText('Points for Erza Shala'), '41')
    await user.click(screen.getByRole('button', { name: 'Save results' }))
    expect(await screen.findByText('Points can be at most 40.')).toBeInTheDocument()
    expect(sent).toBeNull()

    await user.clear(screen.getByLabelText('Points for Erza Shala'))
    await user.click(screen.getByRole('checkbox', { name: 'Erza Shala was absent' }))
    await user.type(screen.getByLabelText('Note for Erza Shala'), 'Ill.')
    await user.click(screen.getByRole('checkbox', { name: 'Dren Morina was absent' }))
    await user.type(screen.getByLabelText('Points for Dren Morina'), '20')
    await user.click(screen.getByRole('button', { name: 'Save results' }))

    await waitFor(() =>
      expect(sent).toEqual({
        results: [
          { student_id: ALBA.id, points: 36, is_absent: false, feedback: 'Strong on limits.' },
          { student_id: DREN.id, points: 20, is_absent: false, feedback: '' },
          { student_id: ERZA.id, points: null, is_absent: true, feedback: 'Ill.' },
        ],
      }),
    )
    expect(await screen.findByText('Results saved. Students see them now.')).toBeInTheDocument()
    expect(screen.getByLabelText('Points for Dren Morina')).toHaveValue('20')
    expect(screen.getByRole('checkbox', { name: 'Erza Shala was absent' })).toBeChecked()
  })

  it('starts again from the saved sheet, with results someone else saved meanwhile, and drops the saved line on the next change', async () => {
    signInWithRole('LECTURER')
    const sheet = sheetOf()
    serveSheet(sheet)
    server.use(
      http.put(`${ORG}/t-1/results`, () =>
        HttpResponse.json({ data: { ...sheet, rows: [{ student: ALBA, result: result({ points: 38, feedback: 'Re-marked.', recorded_at: '2026-11-21T09:00:00.000Z' }) }, sheet.rows[1], sheet.rows[2]] } }),
      ),
    )
    const { user } = renderRoute('/dashboard/tests/t-1')

    await user.click(await screen.findByRole('button', { name: 'Save results' }))

    expect(await screen.findByText('Results saved. Students see them now.')).toBeInTheDocument()
    expect(screen.getByLabelText('Points for Alba Krasniqi')).toHaveValue('38')
    expect(screen.getByLabelText('Note for Alba Krasniqi')).toHaveValue('Re-marked.')

    await user.type(screen.getByLabelText('Points for Erza Shala'), '1')

    expect(screen.queryByText('Results saved. Students see them now.')).not.toBeInTheDocument()
  })

  it('shows the server’s refusal', async () => {
    signInWithRole('LECTURER')
    serveSheet(sheetOf())
    server.use(http.put(`${ORG}/t-1/results`, () => HttpResponse.json({ error: 'Only the group’s enrolled students get results.' }, { status: 400 })))
    const { user } = renderRoute('/dashboard/tests/t-1')

    await user.click(await screen.findByRole('button', { name: 'Save results' }))

    expect(await screen.findByText('Only the group’s enrolled students get results.')).toBeInTheDocument()
  })

  it('shows an archived group’s results read-only', async () => {
    signInWithRole('LECTURER')
    serveSheet(sheetOf({ can_edit: false, can_remove: false }))
    renderRoute('/dashboard/tests/t-1')

    expect(await screen.findByLabelText('Points for Alba Krasniqi')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Save results' })).not.toBeInTheDocument()
  })

  it('says when the test is not found', async () => {
    signInWithRole('LECTURER')
    server.use(http.get(`${ORG}/t-gone`, () => HttpResponse.json({ error: 'Test not found' }, { status: 404 })))
    renderRoute('/dashboard/tests/t-gone')

    expect(await screen.findByText('Test not found.')).toBeInTheDocument()
  })
})

const studentTest = (overrides: Partial<StudentTest> & Pick<StudentTest, 'id' | 'title'>): StudentTest => ({
  ...buildTest({ id: overrides.id, title: overrides.title, can_edit: false, can_remove: false }),
  result: null,
  ...overrides,
})

const serveMine = (tests: StudentTest[]) => server.use(http.get(`${ORG}/mine`, () => HttpResponse.json({ data: tests })))

describe('tests: a student’s own', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows upcoming tests soonest first and past ones latest first, each with its group and only their own result', async () => {
    vi.useFakeTimers({ now: new Date('2026-11-22T12:00:00.000Z'), toFake: ['Date'] })
    signInWithRole('STUDENT')
    serveMine([
      studentTest({ id: 't-1', title: 'Quiz 1', held_at: '2026-10-01T08:00:00.000Z', result: result({ points: 18, feedback: 'Well done.' }) }),
      studentTest({ id: 't-2', title: 'Quiz 2', held_at: '2026-11-01T08:00:00.000Z', result: result({ is_absent: true }) }),
      studentTest({ id: 't-3', title: 'Quiz 3', held_at: '2026-11-15T08:00:00.000Z' }),
      studentTest({ id: 't-4', title: 'Unit 3 test', held_at: '2026-12-01T08:00:00.000Z', group: { id: GROUP_B_ID, name: 'Group B', course_name: 'Physics' } }),
      studentTest({ id: 't-5', title: 'Final', held_at: '2027-01-20T08:00:00.000Z' }),
    ])
    renderRoute('/dashboard/tests')

    const upcoming = within(await screen.findByRole('region', { name: 'Upcoming' }))
    const past = within(screen.getByRole('region', { name: 'Past' }))
    expect(upcoming.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Unit 3 test', 'Final'])
    expect(upcoming.getByText('Group B · Physics')).toBeInTheDocument()
    expect(past.getAllByRole('heading', { level: 3 }).map((heading) => heading.textContent)).toEqual(['Quiz 3', 'Quiz 2', 'Quiz 1'])
    const [quiz3, quiz2, quiz1] = past.getAllByRole('listitem')
    expect(within(quiz1).getByText('18 / 40 points')).toBeInTheDocument()
    expect(within(quiz1).getByText('Well done.')).toBeInTheDocument()
    expect(within(quiz2).getByText('Absent')).toBeInTheDocument()
    expect(within(quiz3).getByText('No result yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Set test' })).not.toBeInTheDocument()
  })

  it('says when the student has no tests yet', async () => {
    signInWithRole('STUDENT')
    serveMine([])
    renderRoute('/dashboard/tests')

    expect(await screen.findByText('No tests yet.')).toBeInTheDocument()
  })
})

describe('tests: navigation', () => {
  it.each(['LECTURER', 'STUDENT', 'OWNER'] as const)('has a Tests link in the %s sidebar', async (role) => {
    signInWithRole(role)
    serveGroups([])
    serveTests({})
    serveMine([])
    renderRoute('/dashboard/tests')

    const sidebar = within(await screen.findByRole('navigation', { name: 'Modules' }))
    expect(await sidebar.findByRole('link', { name: 'Tests' })).toHaveAttribute('href', '/dashboard/tests')
  })

  it('opens the page for an admin with Tests, with the link in their sidebar', async () => {
    signInWithRole('ADMIN', ['MANAGE_TESTS'])
    serveGroups([GROUP_A])
    serveTests({})
    renderRoute('/dashboard/tests')

    expect(await screen.findByRole('heading', { level: 1, name: 'Tests' })).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: 'Tests' })).toHaveAttribute('href', '/dashboard/tests')
  })

  it('sends an admin without Tests back to their dashboard and leaves the link out', async () => {
    signInWithRole('ADMIN')
    server.use(http.get('*/api/organizations/org-1/academic-periods/years', () => HttpResponse.json({ data: [] })))
    const { router } = renderRoute('/dashboard/tests')

    const sidebar = within(await screen.findByRole('navigation', { name: 'Modules' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/academic-periods'))
    expect(sidebar.queryByRole('link', { name: 'Tests' })).not.toBeInTheDocument()
  })
})
