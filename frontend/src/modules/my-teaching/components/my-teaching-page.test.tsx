import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '@shigjetademy/shared/auth'
import type { MyTeaching, MyTeachingCoverGroup, MyTeachingGroup } from '@shigjetademy/shared/lecturers'
import { buildUser, DEFAULT_SETTINGS, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const LECTURER_MEMBERSHIPS: AuthUser['memberships'] = [
  { id: 'membership-8', role: 'LECTURER', permissions: [], organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS } },
]

const MY_TEACHING: MyTeaching = {
  organization: { id: 'org-1', name: 'Oxford Academy' },
  lecturer: { first_name: 'Arben', last_name: 'Hoxha', subjects: ['Mathematics', 'Physics'], employment_type: 'FULL_TIME', department: 'Sciences', locations: ['Main campus', 'North campus'] },
  academic_year: { name: '2026–27', start_date: '2026-09-01', end_date: '2027-06-30' },
  term: { name: 'Autumn term', start_date: '2026-09-01', end_date: '2026-12-20' },
  holiday: null,
  next_term: null,
  groups: [],
  cover: [],
}

const COVER_GROUP: MyTeachingCoverGroup = {
  id: 'group-a',
  name: 'Group A',
  course: 'Mathematics',
  academic_year: '2026–27',
  location: 'Main campus',
  schedule: [
    { weekday: 'MONDAY', start_time: '17:00', end_time: '18:30' },
    { weekday: 'WEDNESDAY', start_time: '17:00', end_time: '18:30' },
  ],
}

const GROUP_A: MyTeachingGroup = {
  ...COVER_GROUP,
  students: [
    { id: 'student-1', first_name: 'Arta', last_name: 'Gashi' },
    { id: 'student-2', first_name: 'Besa', last_name: 'Berisha' },
  ],
}

const LECTURER = buildUser({ first_name: 'Arben', last_name: 'Hoxha', email: 'arben@lecturer.test', memberships: LECTURER_MEMBERSHIPS })

const serveMyTeaching = (myTeaching: MyTeaching = MY_TEACHING) => server.use(http.get('*/api/organizations/org-1/me/lecturer', () => HttpResponse.json({ data: myTeaching })))

describe('My teaching', () => {
  it('opens for a lecturer who logs in, with their organization, details, subjects, department, locations, year and term', async () => {
    serveMyTeaching()
    server.use(http.post('*/api/auth/login', () => HttpResponse.json({ data: { user: LECTURER, accessToken: 'a', refreshToken: 'r' } })))
    const { router, user } = renderRoute('/login')

    await user.type(await screen.findByLabelText('Email'), 'arben@lecturer.test')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/my-teaching'))
    expect(await screen.findByRole('heading', { level: 1, name: 'My teaching' })).toBeInTheDocument()
    const details = await screen.findByRole('region', { name: 'Your details' })
    expect(await within(details).findByText('Arben Hoxha')).toBeInTheDocument()
    expect(within(details).getByText('Full-time')).toBeInTheDocument()
    expect(within(details).getByText('Mathematics')).toBeInTheDocument()
    expect(within(details).getByText('Physics')).toBeInTheDocument()
    expect(within(details).getByText('Sciences')).toBeInTheDocument()
    expect(within(details).getByText('Main campus, North campus')).toBeInTheDocument()
    expect(screen.getByText('2026–27')).toBeInTheDocument()
    expect(screen.getByText('Autumn term')).toBeInTheDocument()
  })

  it('shows a lecturer only My teaching and Attendance in the sidebar', async () => {
    signInAs(LECTURER)
    serveMyTeaching()
    renderRoute('/dashboard/my-teaching')

    const modules = await screen.findByRole('navigation', { name: 'Modules' })
    expect(within(modules).getAllByRole('link').map((link) => link.textContent)).toEqual(['My teaching', 'Attendance'])
  })

  it('says when no record is linked yet, or no term is running', async () => {
    signInAs(LECTURER)
    serveMyTeaching({ ...MY_TEACHING, lecturer: null, term: null })
    renderRoute('/dashboard/my-teaching')

    expect(await screen.findByText('Your school hasn’t linked your lecturer record yet.')).toBeInTheDocument()
    expect(screen.getByText('No term right now')).toBeInTheDocument()
  })

  it('offers to try again when it fails to load', async () => {
    signInAs(LECTURER)
    server.use(http.get('*/api/organizations/org-1/me/lecturer', () => HttpResponse.json({ error: 'Down' }, { status: 500 })))
    renderRoute('/dashboard/my-teaching')

    expect(await screen.findByText('We couldn’t load the teaching details.')).toBeInTheDocument()
  })

  it('sends a lecturer from owner and staff pages back to My teaching', async () => {
    signInAs(LECTURER)
    serveMyTeaching()

    for (const path of ['/dashboard', '/dashboard/overview', '/dashboard/members', '/dashboard/students', '/dashboard/lecturers', '/dashboard/locations', '/dashboard/my-school', '/dashboard/grades']) {
      const { router } = renderRoute(path)
      await waitFor(() => expect(router.state.location.pathname, path).toBe('/dashboard/my-teaching'))
      cleanup()
    }
  })

  it('sends anyone who isn’t a lecturer away from My teaching', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    server.use(http.get('*/api/organizations/org-1/overview', () => HttpResponse.json({ data: { counts: { members: 1, admins: 0, pending_invitations: 0 }, pending_invitations: [], activity: [] } })))
    const { router } = renderRoute('/dashboard/my-teaching')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/overview'))
  })
})

describe('My teaching: groups and cover', () => {
  it('lists the lecturer’s groups, read-only', async () => {
    signInAs(LECTURER)
    serveMyTeaching({ ...MY_TEACHING, groups: [GROUP_A, { ...GROUP_A, id: 'group-b', name: 'Group B', location: null }] })
    renderRoute('/dashboard/my-teaching')

    const groups = await screen.findByRole('region', { name: 'Your groups' })
    const [groupA, groupB] = within(groups).getAllByRole('listitem')
    expect(groupA).toHaveTextContent('Group A')
    expect(groupA).toHaveTextContent('Mathematics · 2026–27 · Main campus')
    expect(groupB).toHaveTextContent('Mathematics · 2026–27')
    expect(within(groups).queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows each group’s days and times and its students’ names', async () => {
    signInAs(LECTURER)
    serveMyTeaching({ ...MY_TEACHING, groups: [GROUP_A, { ...GROUP_A, id: 'group-b', name: 'Group B', schedule: [], students: [] }] })
    renderRoute('/dashboard/my-teaching')

    const groups = await screen.findByRole('region', { name: 'Your groups' })
    const [groupA, groupB] = within(groups).getAllByRole('listitem')
    expect(groupA).toHaveTextContent('Mon 17:00–18:30 · Wed 17:00–18:30')
    expect(groupA).toHaveTextContent('Students: Arta Gashi, Besa Berisha')
    expect(groupB).toHaveTextContent('No schedule')
    expect(groupB).toHaveTextContent('No students yet')
  })

  it('shows current and upcoming cover apart from the groups, with its dates', async () => {
    signInAs(LECTURER)
    serveMyTeaching({
      ...MY_TEACHING,
      groups: [GROUP_A],
      cover: [
        { id: 'cover-1', status: 'CURRENT', start_date: '2026-11-02', end_date: '2026-11-02', group: { ...COVER_GROUP, id: 'group-c', name: 'Group C' } },
        { id: 'cover-2', status: 'UPCOMING', start_date: '2026-11-10', end_date: '2026-11-12', group: { ...COVER_GROUP, id: 'group-d', name: 'Group D' } },
      ],
    })
    renderRoute('/dashboard/my-teaching')

    const cover = await screen.findByRole('region', { name: 'Cover' })
    const [current, upcoming] = within(cover).getAllByRole('listitem')
    expect(current).toHaveTextContent('Group C')
    expect(current).toHaveTextContent('Now')
    expect(current).toHaveTextContent('2 Nov 2026')
    expect(upcoming).toHaveTextContent('Group D')
    expect(upcoming).toHaveTextContent('Upcoming')
    expect(upcoming).toHaveTextContent('10 Nov 2026 – 12 Nov 2026')
    expect(current).toHaveTextContent('Mon 17:00–18:30 · Wed 17:00–18:30')
    expect(within(screen.getByRole('region', { name: 'Your groups' })).queryByText('Group C')).not.toBeInTheDocument()
  })

  it('says when there are no groups and no cover', async () => {
    signInAs(LECTURER)
    serveMyTeaching()
    renderRoute('/dashboard/my-teaching')

    expect(await screen.findByText('No groups yet.')).toBeInTheDocument()
    expect(screen.getByText('No cover coming up.')).toBeInTheDocument()
  })

  it('leaves both out until a record is linked', async () => {
    signInAs(LECTURER)
    serveMyTeaching({ ...MY_TEACHING, lecturer: null })
    renderRoute('/dashboard/my-teaching')

    await screen.findByText('Your school hasn’t linked your lecturer record yet.')
    expect(screen.queryByRole('region', { name: 'Your groups' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Cover' })).not.toBeInTheDocument()
  })
})

describe('My teaching: welcome banner', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  /** Opens My teaching at this moment; the organization's time zone is Europe/Belgrade (UTC+1 in winter) */
  const openAt = async ({ iso, myTeaching = MY_TEACHING }: { iso: string; myTeaching?: MyTeaching }) => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(iso))
    signInAs(LECTURER)
    serveMyTeaching(myTeaching)
    renderRoute('/dashboard/my-teaching')
    return screen.findByRole('region', { name: 'Welcome' })
  }

  it('greets the lecturer by first name for the time of day in the organization’s time zone', async () => {
    const morning = await openAt({ iso: '2026-11-02T08:00:00.000Z' })
    expect(within(morning).getByRole('heading', { level: 2 })).toHaveTextContent('Good morning, Arben!')
    cleanup()
    expect(within(await openAt({ iso: '2026-11-02T13:00:00.000Z' })).getByRole('heading', { level: 2 })).toHaveTextContent('Good afternoon, Arben!')
    cleanup()
    expect(within(await openAt({ iso: '2026-11-02T19:00:00.000Z' })).getByRole('heading', { level: 2 })).toHaveTextContent('Good evening, Arben!')
    cleanup()
    // 03:30 UTC is 04:30 in Belgrade, still evening
    expect(within(await openAt({ iso: '2026-11-02T03:30:00.000Z' })).getByRole('heading', { level: 2 })).toHaveTextContent('Good evening, Arben!')
  })

  it('offers the calendar, which lecturers can read, from the banner', async () => {
    const banner = await openAt({ iso: '2026-11-02T08:00:00.000Z' })

    expect(within(banner).getByRole('link', { name: 'Open the calendar' })).toHaveAttribute('href', '/dashboard/academic-periods')
  })

  it('shows the same tagline every day', async () => {
    const monday = await openAt({ iso: '2026-11-02T07:00:00.000Z' })
    expect(within(monday).getByText('Empower minds. Inspire futures.')).toBeInTheDocument()
    cleanup()

    expect(within(await openAt({ iso: '2026-11-03T07:00:00.000Z' })).getByText('Empower minds. Inspire futures.')).toBeInTheDocument()
  })

  it('counts the term week from the term’s start, and says no classes are scheduled yet', async () => {
    const banner = await openAt({ iso: '2026-11-02T08:00:00.000Z' })

    expect(await within(banner).findByText('Autumn term, week 9')).toBeInTheDocument()
    expect(within(banner).getByText('No classes scheduled yet. Your timetable will show here.')).toBeInTheDocument()
  })

  it('says it’s the weekend by the organization’s day: 23:30 UTC on a Friday is Saturday in Belgrade', async () => {
    const banner = await openAt({ iso: '2026-11-06T23:30:00.000Z' })

    expect(await within(banner).findByText('It’s the weekend, enjoy it!')).toBeInTheDocument()
    expect(within(banner).queryByText(/Autumn term/)).not.toBeInTheDocument()
  })

  it('names a holiday covering today', async () => {
    const banner = await openAt({ iso: '2026-12-24T09:00:00.000Z', myTeaching: { ...MY_TEACHING, term: null, holiday: { name: 'Winter break' } } })

    expect(await within(banner).findByText('Today is Winter break, enjoy your time off!')).toBeInTheDocument()
  })

  it('says when the next term starts between terms, in the organization’s date format', async () => {
    const nextTerm = { name: 'Spring term', start_date: '2027-01-11', end_date: '2027-06-30' }
    const banner = await openAt({ iso: '2027-01-07T09:00:00.000Z', myTeaching: { ...MY_TEACHING, term: null, next_term: nextTerm } })

    expect(await within(banner).findByText('Spring term starts on 11 Jan 2027')).toBeInTheDocument()
  })

  it('shows only the no-classes line without a current school year', async () => {
    const banner = await openAt({ iso: '2026-11-02T08:00:00.000Z', myTeaching: { ...MY_TEACHING, academic_year: null, term: null } })
    await screen.findByText('No school year set yet')

    expect(within(banner).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['No classes scheduled yet. Your timetable will show here.'])
  })
})
