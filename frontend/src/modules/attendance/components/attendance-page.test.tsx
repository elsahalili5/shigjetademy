import { fireEvent, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { attendanceMarkSchema } from '@shigjetademy/shared/attendance'
import type { AttendanceRegister, AttendanceSession } from '@shigjetademy/shared/attendance'
import type { AuthUser } from '@shigjetademy/shared/auth'
import { buildUser, DEFAULT_SETTINGS, OWNER_MEMBERSHIPS, signInAs, YLLKA_ADMIN_MEMBERSHIP } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

// Monday 9 November 2026, 11:00 in Belgrade, the organizations' time zone; already Monday there at 23:30 UTC on Sunday
const MONDAY_MORNING = '2026-11-09T10:00:00.000Z'
const MONDAY = '2026-11-09'

const LECTURER_MEMBERSHIPS: AuthUser['memberships'] = [
  { id: 'membership-8', role: 'LECTURER', permissions: [], organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS } },
]

const LECTURER = buildUser({ first_name: 'Arben', last_name: 'Hoxha', email: 'arben@lecturer.test', memberships: LECTURER_MEMBERSHIPS })

const GROUP_A: AttendanceSession = { group_id: 'group-a', name: 'Group A', course: 'Mathematics', location: 'Main campus', start_time: '17:00', end_time: '18:30', rescheduled_from: null }

const GROUP_B: AttendanceSession = { group_id: 'group-b', name: 'Group B', course: 'English', location: null, start_time: '19:00', end_time: '20:00', rescheduled_from: null }

type ServeGroupsParams = {
  organizationId?: string
  groupsByDate?: Record<string, AttendanceSession[]>
}

/** Answers the day's sessions and records which days were asked for */
const serveGroups = ({ organizationId = 'org-1', groupsByDate = { [MONDAY]: [GROUP_A, GROUP_B] } }: ServeGroupsParams = {}) => {
  const dates: string[] = []
  server.use(
    http.get(`*/api/organizations/${organizationId}/attendance/groups`, ({ request }) => {
      const date = new URL(request.url).searchParams.get('date') ?? ''
      dates.push(date)
      return HttpResponse.json({ data: groupsByDate[date] ?? [] })
    }),
  )
  return dates
}

const REGISTER: AttendanceRegister = {
  group: { id: 'group-a', name: 'Group A', course: 'Mathematics', status: 'ACTIVE' },
  date: MONDAY,
  start_time: '17:00',
  end_time: '18:30',
  rescheduled_from: null,
  window: 'OPEN',
  can_edit: true,
  substitute: null,
  students: [
    { id: 'student-arta', first_name: 'Arta', last_name: 'Gashi', is_archived: false, status: 'PRESENT' },
    { id: 'student-besa', first_name: 'Besa', last_name: 'Berisha', is_archived: false, status: null },
    { id: 'student-genta', first_name: 'Genta', last_name: 'Rama', is_archived: true, status: 'ABSENT' },
  ],
}

const REGISTER_PATH = `*/api/organizations/org-1/attendance/groups/group-a/${MONDAY}/17\\:00`

/** Answers Group A's register on Monday and saves marks into it the way the server does, recording every request */
const serveRegister = (initial: AttendanceRegister = REGISTER) => {
  const fake = { register: initial, reads: 0, markBodies: new Array<unknown>(), markAllCalls: 0 }
  server.use(
    http.get(REGISTER_PATH, () => {
      fake.reads += 1
      return HttpResponse.json({ data: fake.register })
    }),
    http.put(`${REGISTER_PATH}/students/:studentId`, async ({ request, params }) => {
      const body: unknown = await request.json()
      fake.markBodies.push(body)
      const { status } = attendanceMarkSchema.parse(body)
      fake.register = { ...fake.register, students: fake.register.students.map((student) => (student.id === params.studentId ? { ...student, status } : student)) }
      return HttpResponse.json({ data: fake.register.students.find((student) => student.id === params.studentId) })
    }),
    http.put(`${REGISTER_PATH}/mark-all-present`, () => {
      fake.markAllCalls += 1
      fake.register = { ...fake.register, students: fake.register.students.map((student) => ({ ...student, status: student.status ?? 'PRESENT' })) }
      return HttpResponse.json({ data: fake.register })
    }),
  )
  return fake
}

/** A response held back until release() is called, to look at the page while a save is pending */
const holdResponse = () => {
  let release = () => {}
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  return { released, release: () => release() }
}

type OpenRegisterParams = {
  register?: AttendanceRegister
}

/** Signs in as the lecturer and opens the register of Group A's 17:00 session on Monday */
const openRegister = async ({ register = REGISTER }: OpenRegisterParams = {}) => {
  signInAs(LECTURER)
  serveGroups()
  const fake = serveRegister(register)
  const rendered = renderRoute('/dashboard/attendance')
  await rendered.user.selectOptions(await screen.findByRole('combobox', { name: 'Group' }), 'Group A · Mathematics · 17:00–18:30')
  return { ...rendered, fake, section: await screen.findByRole('region', { name: 'Group A' }) }
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(MONDAY_MORNING))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AttendancePage: picking a date and a group', () => {
  it('opens on the organization’s today with the day’s lesson sessions, earliest first', async () => {
    vi.setSystemTime(new Date('2026-11-08T23:30:00.000Z'))
    signInAs(LECTURER)
    const dates = serveGroups()
    renderRoute('/dashboard/attendance')

    expect(await screen.findByRole('heading', { level: 1, name: 'Attendance' })).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toHaveValue(MONDAY)
    const picker = await screen.findByRole('combobox', { name: 'Group' })
    expect(within(picker).getAllByRole('option').map((option) => option.textContent)).toEqual(['Choose a group', 'Group A · Mathematics · 17:00–18:30', 'Group B · English · 19:00–20:00'])
    expect(dates).toEqual([MONDAY])
  })

  it('lists another day’s groups when the date changes, and says when a day has no lessons', async () => {
    signInAs(LECTURER)
    const dates = serveGroups({ groupsByDate: { [MONDAY]: [GROUP_A], '2026-11-10': [GROUP_B] } })
    renderRoute('/dashboard/attendance')
    await screen.findByRole('option', { name: 'Group A · Mathematics · 17:00–18:30' })

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-10' } })
    expect(await screen.findByRole('option', { name: 'Group B · English · 19:00–20:00' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-11' } })
    expect(await screen.findByText('No lessons on this day')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Group' })).not.toBeInTheDocument()
    expect(dates).toEqual([MONDAY, '2026-11-10', '2026-11-11'])
  })

  it('lists a group meeting twice that day once per session, and opens the chosen session’s register', async () => {
    signInAs(LECTURER)
    serveGroups({ groupsByDate: { [MONDAY]: [{ ...GROUP_A, start_time: '09:00', end_time: '10:30' }, { ...GROUP_A, start_time: '14:00', end_time: '15:30' }] } })
    const startTimes: string[] = []
    server.use(
      http.get(`*/api/organizations/org-1/attendance/groups/group-a/${MONDAY}/:startTime`, ({ params }) => {
        const startTime = String(params.startTime)
        startTimes.push(startTime)
        return HttpResponse.json({ data: { ...REGISTER, start_time: startTime, end_time: '15:30' } })
      }),
    )
    const { user } = renderRoute('/dashboard/attendance')
    const picker = await screen.findByRole('combobox', { name: 'Group' })

    expect(within(picker).getAllByRole('option').map((option) => option.textContent)).toEqual(['Choose a group', 'Group A · Mathematics · 09:00–10:30', 'Group A · Mathematics · 14:00–15:30'])
    await user.selectOptions(picker, 'Group A · Mathematics · 14:00–15:30')

    expect(await within(await screen.findByRole('region', { name: 'Group A' })).findByText('Mathematics · 9 Nov 2026 · 14:00–15:30')).toBeInTheDocument()
    expect(startTimes).toEqual(['14:00'])
  })

  it('marks a session moved to this day with where it came from, and opens its register at its new start', async () => {
    signInAs(LECTURER)
    const moved: AttendanceSession = { ...GROUP_A, start_time: '15:00', end_time: '16:00', rescheduled_from: { date: '2026-11-06', start_time: '17:00' } }
    serveGroups({ groupsByDate: { [MONDAY]: [moved] } })
    server.use(
      http.get(`*/api/organizations/org-1/attendance/groups/group-a/${MONDAY}/15\\:00`, () =>
        HttpResponse.json({ data: { ...REGISTER, start_time: '15:00', end_time: '16:00', rescheduled_from: moved.rescheduled_from } }),
      ),
    )
    const { user } = renderRoute('/dashboard/attendance')

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Group' }), 'Group A · Mathematics · 15:00–16:00 · Rescheduled from Fri 6 Nov, 17:00')

    const section = await screen.findByRole('region', { name: 'Group A' })
    expect(await within(section).findByText('Mathematics · 9 Nov 2026 · 15:00–16:00')).toBeInTheDocument()
    expect(within(section).getByText('Rescheduled from Fri 6 Nov, 17:00')).toBeInTheDocument()
  })

  it('offers to try again when the groups fail to load', async () => {
    signInAs(LECTURER)
    server.use(http.get('*/api/organizations/org-1/attendance/groups', () => HttpResponse.json({ error: 'Down' }, { status: 500 })))
    renderRoute('/dashboard/attendance')

    expect(await screen.findByText('We couldn’t load the groups.')).toBeInTheDocument()
  })
})

describe('AttendancePage: the register', () => {
  it('shows the group’s students with their status, or that they aren’t marked yet', async () => {
    const { section } = await openRegister({ register: { ...REGISTER, can_edit: false, window: 'LOCKED' } })

    expect(within(section).getByText('Mathematics · 9 Nov 2026 · 17:00–18:30')).toBeInTheDocument()
    const rows = within(within(section).getByRole('list', { name: 'Students' })).getAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual(['Arta GashiPresent', 'Besa BerishaNot marked', 'Genta Rama (archived)Absent'])
  })

  it('says when a register opens, and changes nothing before then', async () => {
    const { section } = await openRegister({ register: { ...REGISTER, window: 'UPCOMING', can_edit: false } })

    expect(within(section).getByText('Opens at 17:00')).toBeInTheDocument()
    expect(within(section).queryByRole('button')).not.toBeInTheDocument()
  })

  it('says when a register is locked and keeps it read-only', async () => {
    const { section } = await openRegister({ register: { ...REGISTER, window: 'LOCKED', can_edit: false } })

    expect(within(section).getByText('Locked at 18:30. A school admin can still correct it.')).toBeInTheDocument()
    expect(within(section).queryByRole('button')).not.toBeInTheDocument()
  })

  it('keeps an archived group’s register read-only', async () => {
    const { section } = await openRegister({ register: { ...REGISTER, group: { ...REGISTER.group, status: 'ARCHIVED' }, window: 'LOCKED', can_edit: false } })

    expect(within(section).getByText('This group is archived, so its register is read-only.')).toBeInTheDocument()
  })

  it('says when nobody is in the group on that day', async () => {
    const { section } = await openRegister({ register: { ...REGISTER, students: [] } })

    expect(within(section).getByText('No students on this day')).toBeInTheDocument()
    expect(within(section).queryByRole('list', { name: 'Students' })).not.toBeInTheDocument()
  })

  it('tells the permanent lecturer who covers a lesson that it’s read-only for them', async () => {
    const { section } = await openRegister({ register: { ...REGISTER, can_edit: false, substitute: { first_name: 'Teuta', last_name: 'Krasniqi' } } })

    expect(within(section).getByText('Teuta Krasniqi is covering this lesson, so it’s read-only for you.')).toBeInTheDocument()
    expect(within(section).queryByRole('button')).not.toBeInTheDocument()
  })

  it('offers to try again when the register fails to load', async () => {
    signInAs(LECTURER)
    serveGroups()
    server.use(http.get(REGISTER_PATH, () => HttpResponse.json({ error: 'Down' }, { status: 500 })))
    const { user } = renderRoute('/dashboard/attendance')

    await user.selectOptions(await screen.findByRole('combobox', { name: 'Group' }), 'Group A · Mathematics · 17:00–18:30')

    expect(await screen.findByText('We couldn’t load the register.')).toBeInTheDocument()
  })
})

describe('AttendancePage: marking students', () => {
  it('saves a status on each tap, shows it pressed, and reads the register again once saved', async () => {
    const { section, user, fake } = await openRegister()
    const besa = within(section).getByRole('group', { name: 'Attendance for Besa Berisha' })
    expect(within(section).getByRole('listitem', { name: 'Besa Berisha' })).toHaveTextContent('Not marked')

    await user.click(within(besa).getByRole('button', { name: 'Tardy' }))

    await vi.waitFor(() => expect(within(besa).getByRole('button', { name: 'Tardy' })).toHaveAttribute('aria-pressed', 'true'))
    expect(within(besa).getByRole('button', { name: 'Present' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(section).getByRole('listitem', { name: 'Besa Berisha' })).not.toHaveTextContent('Not marked')
    expect(fake.markBodies).toEqual([{ status: 'TARDY' }])
    await vi.waitFor(() => expect(fake.reads).toBe(2))
  })

  it('keeps focus on the pressed button and ignores taps while its save is pending', async () => {
    const { section, user, fake } = await openRegister()
    const held = holdResponse()
    server.use(
      http.put(`${REGISTER_PATH}/students/student-arta`, async () => {
        fake.markBodies.push('held')
        await held.released
        fake.register = { ...fake.register, students: fake.register.students.map((student) => (student.id === 'student-arta' ? { ...student, status: 'ABSENT' } : student)) }
        return HttpResponse.json({ data: fake.register.students[0] })
      }),
    )
    const arta = within(section).getByRole('group', { name: 'Attendance for Arta Gashi' })

    await user.click(within(arta).getByRole('button', { name: 'Absent' }))
    await vi.waitFor(() => expect(within(arta).getByRole('button', { name: 'Absent' })).toHaveAttribute('aria-disabled', 'true'))
    expect(within(arta).getByRole('button', { name: 'Absent' })).toHaveFocus()
    await user.click(within(arta).getByRole('button', { name: 'Tardy' }))
    held.release()

    await vi.waitFor(() => expect(within(arta).getByRole('button', { name: 'Absent' })).toHaveAttribute('aria-pressed', 'true'))
    expect(within(arta).getByRole('button', { name: 'Absent' })).toHaveAttribute('aria-disabled', 'false')
    expect(within(arta).getByRole('button', { name: 'Tardy' })).toHaveAttribute('aria-pressed', 'false')
    expect(fake.markBodies).toEqual(['held'])
  })

  it('shows what the server holds after a save, even when the save answers with an older mark', async () => {
    const { section, user, fake } = await openRegister()
    server.use(
      http.put(`${REGISTER_PATH}/students/student-besa`, () => {
        fake.register = { ...fake.register, students: fake.register.students.map((student) => (student.id === 'student-besa' ? { ...student, status: 'ABSENT' } : student)) }
        return HttpResponse.json({ data: { ...REGISTER.students[1], status: 'TARDY' } })
      }),
    )
    const besa = within(section).getByRole('group', { name: 'Attendance for Besa Berisha' })

    await user.click(within(besa).getByRole('button', { name: 'Tardy' }))

    await vi.waitFor(() => expect(within(besa).getByRole('button', { name: 'Absent' })).toHaveAttribute('aria-pressed', 'true'))
    expect(within(besa).getByRole('button', { name: 'Tardy' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps the old status and shows why when a save fails', async () => {
    const { section, user } = await openRegister()
    server.use(http.put(`${REGISTER_PATH}/students/student-arta`, () => HttpResponse.json({ error: 'This register locked at 18:30.' }, { status: 409 })))
    const arta = within(section).getByRole('group', { name: 'Attendance for Arta Gashi' })

    await user.click(within(arta).getByRole('button', { name: 'Absent' }))

    expect(await within(section).findByRole('alert')).toHaveTextContent('This register locked at 18:30.')
    expect(within(arta).getByRole('button', { name: 'Present' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(arta).getByRole('button', { name: 'Absent' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('marks everyone unmarked present at once', async () => {
    const { section, user, fake } = await openRegister()

    await user.click(within(section).getByRole('button', { name: 'Mark all present' }))

    const besa = within(section).getByRole('group', { name: 'Attendance for Besa Berisha' })
    await vi.waitFor(() => expect(within(besa).getByRole('button', { name: 'Present' })).toHaveAttribute('aria-pressed', 'true'))
    expect(within(within(section).getByRole('group', { name: 'Attendance for Genta Rama' })).getByRole('button', { name: 'Absent' })).toHaveAttribute('aria-pressed', 'true')
    expect(fake.markAllCalls).toBe(1)
  })

  it('ignores single marks while marking everyone present', async () => {
    const { section, user, fake } = await openRegister()
    const held = holdResponse()
    server.use(
      http.put(`${REGISTER_PATH}/mark-all-present`, async () => {
        await held.released
        fake.register = { ...fake.register, students: fake.register.students.map((student) => ({ ...student, status: student.status ?? 'PRESENT' })) }
        return HttpResponse.json({ data: fake.register })
      }),
    )
    const besa = within(section).getByRole('group', { name: 'Attendance for Besa Berisha' })

    await user.click(within(section).getByRole('button', { name: 'Mark all present' }))
    await vi.waitFor(() => expect(within(besa).getByRole('button', { name: 'Tardy' })).toHaveAttribute('aria-disabled', 'true'))
    await user.click(within(besa).getByRole('button', { name: 'Tardy' }))
    held.release()

    await vi.waitFor(() => expect(within(besa).getByRole('button', { name: 'Present' })).toHaveAttribute('aria-pressed', 'true'))
    expect(fake.markBodies).toEqual([])
  })

  it('shows the error when marking everyone present fails', async () => {
    const { section, user } = await openRegister()
    server.use(http.put(`${REGISTER_PATH}/mark-all-present`, () => HttpResponse.json({ error: 'This register locked at 18:30.' }, { status: 409 })))

    await user.click(within(section).getByRole('button', { name: 'Mark all present' }))

    expect(await within(section).findByRole('alert')).toHaveTextContent('This register locked at 18:30.')
    expect(within(within(section).getByRole('group', { name: 'Attendance for Besa Berisha' })).getByRole('button', { name: 'Present' })).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('AttendancePage: opening and locking while the page is open', () => {
  it('opens the register at its start time without a refresh', async () => {
    // One second before 17:00 in Belgrade
    vi.setSystemTime(new Date('2026-11-09T15:59:59.000Z'))
    const { section, fake } = await openRegister({ register: { ...REGISTER, window: 'UPCOMING', can_edit: false } })
    expect(within(section).getByText('Opens at 17:00')).toBeInTheDocument()
    fake.register = REGISTER

    expect(await within(section).findByRole('group', { name: 'Attendance for Arta Gashi' }, { timeout: 4000 })).toBeInTheDocument()
    expect(within(section).queryByText('Opens at 17:00')).not.toBeInTheDocument()
  })

  it('locks the register at its end time without a refresh', async () => {
    // One second before 18:30 in Belgrade
    vi.setSystemTime(new Date('2026-11-09T17:29:59.000Z'))
    const { section, fake } = await openRegister()
    fake.register = { ...REGISTER, window: 'LOCKED', can_edit: false }

    expect(await within(section).findByText('Locked at 18:30. A school admin can still correct it.', undefined, { timeout: 4000 })).toBeInTheDocument()
    expect(within(section).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('AttendancePage: corrections', () => {
  it('lets the owner correct a locked register, and says the change is logged', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serveGroups()
    serveRegister({ ...REGISTER, window: 'LOCKED', can_edit: true })
    const { user } = renderRoute('/dashboard/attendance')
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Group' }), 'Group A · Mathematics · 17:00–18:30')
    const section = await screen.findByRole('region', { name: 'Group A' })

    expect(within(section).getByText('Locked at 18:30. Changes now are logged as corrections.')).toBeInTheDocument()
    const arta = within(section).getByRole('group', { name: 'Attendance for Arta Gashi' })
    await user.click(within(arta).getByRole('button', { name: 'Absent' }))

    await vi.waitFor(() => expect(within(arta).getByRole('button', { name: 'Absent' })).toHaveAttribute('aria-pressed', 'true'))
  })
})

describe('AttendancePage: access', () => {
  it('gives a lecturer Attendance beside My teaching in the sidebar', async () => {
    signInAs(LECTURER)
    serveGroups()
    renderRoute('/dashboard/attendance')

    const modules = await screen.findByRole('navigation', { name: 'Modules' })
    expect(within(modules).getAllByRole('link').map((link) => link.textContent)).toEqual(['My teaching', 'Attendance'])
    expect(within(modules).getByRole('link', { name: 'Attendance' })).toHaveAttribute('href', '/dashboard/attendance')
  })

  it('opens from the owner’s sidebar', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serveGroups()
    renderRoute('/dashboard/attendance')

    await screen.findByRole('option', { name: 'Group A · Mathematics · 17:00–18:30' })
    expect(within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: 'Attendance' })).toHaveAttribute('href', '/dashboard/attendance')
  })

  it('lets a school admin with Attendance in, with Attendance in the sidebar', async () => {
    signInAs(buildUser({ memberships: [{ ...YLLKA_ADMIN_MEMBERSHIP, permissions: ['MANAGE_ATTENDANCE'] }] }))
    serveGroups({ organizationId: 'org-2' })
    renderRoute('/dashboard/attendance')

    await screen.findByRole('option', { name: 'Group A · Mathematics · 17:00–18:30' })
    expect(within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: 'Attendance' })).toHaveAttribute('href', '/dashboard/attendance')
  })

  it('sends a school admin without Attendance back to the dashboard, and hides it from the sidebar', async () => {
    signInAs(buildUser({ memberships: [YLLKA_ADMIN_MEMBERSHIP] }))
    server.use(http.get('*/api/organizations/org-2/*', () => HttpResponse.json({ data: [] })))
    const { router } = renderRoute('/dashboard/attendance')

    await vi.waitFor(() => expect(router.state.location.pathname).not.toBe('/dashboard/attendance'))
    expect(screen.queryByRole('link', { name: 'Attendance' })).not.toBeInTheDocument()
  })

  it('sends a student to My school', async () => {
    signInAs(buildUser({ memberships: [{ ...LECTURER_MEMBERSHIPS[0], role: 'STUDENT' }] }))
    server.use(http.get('*/api/organizations/org-1/me/student', () => HttpResponse.json({ error: 'Not needed' }, { status: 500 })))
    const { router } = renderRoute('/dashboard/attendance')

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/my-school'))
  })
})
