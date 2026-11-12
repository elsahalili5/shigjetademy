import { cleanup, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { AuthUser } from '@shigjetademy/shared/auth'
import type { MySchool, MySchoolGroup } from '@shigjetademy/shared/students'
import { buildUser, DEFAULT_SETTINGS, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const STUDENT_MEMBERSHIPS: AuthUser['memberships'] = [
  { id: 'membership-9', role: 'STUDENT', permissions: [], organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS } },
]

const MY_SCHOOL: MySchool = {
  organization: { id: 'org-1', name: 'Oxford Academy' },
  student: { first_name: 'Arta', last_name: 'Gashi', student_number: 'STU-0007' },
  academic_year: { name: '2026–27', start_date: '2026-09-01', end_date: '2027-06-30' },
  term: { name: 'Autumn term', start_date: '2026-09-01', end_date: '2026-12-20' },
  groups: [],
  rescheduled_lessons: [],
}

const GROUP_A: MySchoolGroup = {
  id: 'group-a',
  name: 'Group A',
  course: 'Mathematics',
  academic_year: '2026–27',
  academic_term: 'Autumn term',
  location: 'Main campus',
  schedule: [
    { weekday: 'MONDAY', start_time: '17:00', end_time: '18:30' },
    { weekday: 'WEDNESDAY', start_time: '17:00', end_time: '18:30' },
  ],
}

const STUDENT = buildUser({ first_name: 'Arta', last_name: 'Gashi', email: 'arta@student.test', memberships: STUDENT_MEMBERSHIPS })

const serveMySchool = (mySchool: MySchool = MY_SCHOOL) => server.use(http.get('*/api/organizations/org-1/me/student', () => HttpResponse.json({ data: mySchool })))

describe('My school', () => {
  it('opens for a student who logs in, with their school, name, number, year and term', async () => {
    serveMySchool()
    server.use(http.post('*/api/auth/login', () => HttpResponse.json({ data: { user: STUDENT, accessToken: 'a', refreshToken: 'r' } })))
    const { router, user } = renderRoute('/login')

    await user.type(await screen.findByLabelText('Email'), 'arta@student.test')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Log in' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/my-school'))
    expect(await screen.findByRole('heading', { level: 1, name: 'My school' })).toBeInTheDocument()
    const record = await screen.findByRole('region', { name: 'Your record' })
    expect(await within(record).findByText('STU-0007')).toBeInTheDocument()
    expect(within(record).getByText('Arta Gashi')).toBeInTheDocument()
    expect(screen.getByText('2026–27')).toBeInTheDocument()
    expect(screen.getByText('Autumn term')).toBeInTheDocument()
    expect(screen.getByText('1 Sep 2026 – 20 Dec 2026')).toBeInTheDocument()
  })

  it('welcomes the student by first name', async () => {
    signInAs(STUDENT)
    serveMySchool()
    renderRoute('/dashboard/my-school')

    const welcome = await screen.findByRole('region', { name: 'Welcome' })
    expect(within(welcome).getByRole('heading', { level: 2 })).toHaveTextContent(/^Good (morning|afternoon|evening), Arta!$/)
    expect(within(welcome).getByText('Oxford Academy · Student')).toBeInTheDocument()
  })

  it('shows a student only My school in the sidebar', async () => {
    signInAs(STUDENT)
    serveMySchool()
    renderRoute('/dashboard/my-school')

    const modules = await screen.findByRole('navigation', { name: 'Modules' })
    expect(within(modules).getAllByRole('link').map((link) => link.textContent)).toEqual(['My school'])
  })

  it('says when no record is linked yet, or no term is running', async () => {
    signInAs(STUDENT)
    serveMySchool({ ...MY_SCHOOL, student: null, term: null })
    renderRoute('/dashboard/my-school')

    expect(await screen.findByText('Your school hasn’t linked your student record yet.')).toBeInTheDocument()
    expect(screen.getByText('No term right now')).toBeInTheDocument()
  })

  it('lists the student’s groups with their course, year, term, location and schedule, read-only', async () => {
    signInAs(STUDENT)
    serveMySchool({ ...MY_SCHOOL, groups: [GROUP_A, { ...GROUP_A, id: 'group-b', name: 'Group B', academic_term: null, location: null, schedule: [] }] })
    renderRoute('/dashboard/my-school')

    const groups = await screen.findByRole('region', { name: 'Your groups' })
    const [groupA, groupB] = within(groups).getAllByRole('listitem')
    expect(groupA).toHaveTextContent('Group A')
    expect(groupA).toHaveTextContent('Mathematics · 2026–27 · Autumn term · Main campus')
    expect(groupA).toHaveTextContent('Mon 17:00–18:30 · Wed 17:00–18:30')
    expect(groupB).toHaveTextContent('Mathematics · 2026–27')
    expect(groupB).toHaveTextContent('No schedule')
    expect(within(groups).queryByRole('button')).not.toBeInTheDocument()
  })

  it('says when the student isn’t in any group yet', async () => {
    signInAs(STUDENT)
    serveMySchool()
    renderRoute('/dashboard/my-school')

    const groups = await screen.findByRole('region', { name: 'Your groups' })
    expect(within(groups).getByText('You aren’t in any group yet.')).toBeInTheDocument()
  })

  it('lists the student’s upcoming rescheduled lessons with the original and new date and time', async () => {
    signInAs(STUDENT)
    serveMySchool({
      ...MY_SCHOOL,
      groups: [GROUP_A],
      rescheduled_lessons: [
        { id: 'r1', group: { id: 'group-a', name: 'Group A', course: 'Mathematics' }, original_date: '2026-11-16', original_start_time: '17:00', new_date: '2026-11-20', new_start_time: '16:00', new_end_time: '17:30' },
      ],
    })
    renderRoute('/dashboard/my-school')

    const section = await screen.findByRole('region', { name: 'Rescheduled lessons' })
    const [lesson] = within(section).getAllByRole('listitem')
    expect(lesson).toHaveTextContent('Group A · Mathematics')
    expect(lesson).toHaveTextContent('Moved from Mon 16 Nov, 17:00 to Fri 20 Nov, 16:00–17:30')
  })

  it('says when no lesson is moved', async () => {
    signInAs(STUDENT)
    serveMySchool()
    renderRoute('/dashboard/my-school')

    const section = await screen.findByRole('region', { name: 'Rescheduled lessons' })
    expect(within(section).getByText('No lessons moved.')).toBeInTheDocument()
  })

  it('offers to try again when it fails to load', async () => {
    signInAs(STUDENT)
    server.use(http.get('*/api/organizations/org-1/me/student', () => HttpResponse.json({ error: 'Down' }, { status: 500 })))
    renderRoute('/dashboard/my-school')

    expect(await screen.findByText('We couldn’t load the school details.')).toBeInTheDocument()
  })

  it('sends a student from owner and staff pages back to My school', async () => {
    signInAs(STUDENT)
    serveMySchool()

    for (const path of ['/dashboard/overview', '/dashboard/members', '/dashboard/students', '/dashboard/locations', '/dashboard/attendance']) {
      const { router } = renderRoute(path)
      await waitFor(() => expect(router.state.location.pathname, path).toBe('/dashboard/my-school'))
      cleanup()
    }
  })

  it('sends anyone who isn’t a student away from My school', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    server.use(http.get('*/api/organizations/org-1/overview', () => HttpResponse.json({ data: { counts: { members: 1, admins: 0, pending_invitations: 0 }, pending_invitations: [], activity: [] } })))
    const { router } = renderRoute('/dashboard/my-school')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/overview'))
  })
})
