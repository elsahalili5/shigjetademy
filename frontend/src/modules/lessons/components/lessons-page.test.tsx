import { fireEvent, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LessonPlan, LessonPlanSession } from '@shigjetademy/shared/lesson-plans'
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

const GROUP_A: LessonPlanSession = { group_id: 'group-a', name: 'Group A', course: 'Mathematics', location: 'Main campus', start_time: '17:00', end_time: '18:30', rescheduled_from: null }

const GROUP_B: LessonPlanSession = { group_id: 'group-b', name: 'Group B', course: 'English', location: null, start_time: '19:00', end_time: '20:00', rescheduled_from: null }

type ServeSessionsParams = {
  organizationId?: string
  sessionsByDate?: Record<string, LessonPlanSession[]>
}

/** Answers the day's sessions and records which days were asked for */
const serveSessions = ({ organizationId = 'org-1', sessionsByDate = { [MONDAY]: [GROUP_A, GROUP_B] } }: ServeSessionsParams = {}) => {
  const dates: string[] = []
  server.use(
    http.get(`*/api/organizations/${organizationId}/lesson-plans/sessions`, ({ request }) => {
      const date = new URL(request.url).searchParams.get('date') ?? ''
      dates.push(date)
      return HttpResponse.json({ data: sessionsByDate[date] ?? [] })
    }),
  )
  return dates
}

const PLAN: LessonPlan = { group_id: 'group-a', date: MONDAY, start_time: '17:00', end_time: '18:30', rescheduled_from: null, topic: null, covered: null, can_edit_covered: true }

const PLAN_PATH = `*/api/organizations/org-1/groups/group-a/lesson-plans/${MONDAY}/17\\:00`

/** Answers Group A's plan on Monday and saves fields into it the way the server does, recording every request */
const servePlan = (initial: LessonPlan = PLAN) => {
  const fake = { plan: initial, reads: 0, topicBodies: new Array<unknown>(), coveredBodies: new Array<unknown>() }
  server.use(
    http.get(PLAN_PATH, () => {
      fake.reads += 1
      return HttpResponse.json({ data: fake.plan })
    }),
    http.put(`${PLAN_PATH}/topic`, async ({ request }) => {
      const body: unknown = await request.json()
      fake.topicBodies.push(body)
      const { topic } = body as { topic: string | null }
      fake.plan = { ...fake.plan, topic }
      return HttpResponse.json({ data: fake.plan })
    }),
    http.put(`${PLAN_PATH}/covered`, async ({ request }) => {
      const body: unknown = await request.json()
      fake.coveredBodies.push(body)
      const { covered } = body as { covered: string | null }
      fake.plan = { ...fake.plan, covered }
      return HttpResponse.json({ data: fake.plan })
    }),
  )
  return fake
}

type OpenPlanParams = {
  plan?: LessonPlan
}

/** Signs in as the lecturer and opens Group A's 17:00 session on Monday */
const openPlan = async ({ plan = PLAN }: OpenPlanParams = {}) => {
  signInAs(LECTURER)
  serveSessions()
  const fake = servePlan(plan)
  const rendered = renderRoute('/dashboard/lessons')
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

describe('LessonsPage: picking a date and a session', () => {
  it('opens on the organization’s today with the day’s lesson sessions, earliest first', async () => {
    vi.setSystemTime(new Date('2026-11-08T23:30:00.000Z'))
    signInAs(LECTURER)
    const dates = serveSessions()
    renderRoute('/dashboard/lessons')

    expect(await screen.findByRole('heading', { level: 1, name: 'Lessons' })).toBeInTheDocument()
    expect(screen.getByLabelText('Date')).toHaveValue(MONDAY)
    const picker = await screen.findByRole('combobox', { name: 'Group' })
    expect(within(picker).getAllByRole('option').map((option) => option.textContent)).toEqual(['Choose a group', 'Group A · Mathematics · 17:00–18:30', 'Group B · English · 19:00–20:00'])
    expect(dates).toEqual([MONDAY])
  })

  it('lists another day’s sessions when the date changes, and says when a day has no lessons', async () => {
    signInAs(LECTURER)
    const dates = serveSessions({ sessionsByDate: { [MONDAY]: [GROUP_A], '2026-11-10': [GROUP_B] } })
    renderRoute('/dashboard/lessons')
    await screen.findByRole('option', { name: 'Group A · Mathematics · 17:00–18:30' })

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-10' } })
    expect(await screen.findByRole('option', { name: 'Group B · English · 19:00–20:00' })).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-11-11' } })
    expect(await screen.findByText('No lessons on this day')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Group' })).not.toBeInTheDocument()
    expect(dates).toEqual([MONDAY, '2026-11-10', '2026-11-11'])
  })

  it('offers to try again when the sessions fail to load', async () => {
    signInAs(LECTURER)
    server.use(http.get('*/api/organizations/org-1/lesson-plans/sessions', () => HttpResponse.json({ error: 'Down' }, { status: 500 })))
    renderRoute('/dashboard/lessons')

    expect(await screen.findByText('We couldn’t load the sessions.')).toBeInTheDocument()
  })
})

describe('LessonsPage: writing the topic', () => {
  it('sets the topic at any time, including before the session starts', async () => {
    const { section, user, fake } = await openPlan({ plan: { ...PLAN, can_edit_covered: false } })

    await user.clear(within(section).getByLabelText('Topic'))
    await user.type(within(section).getByLabelText('Topic'), 'Fractions')
    await user.click(within(section).getByRole('button', { name: 'Save topic' }))

    await vi.waitFor(() => expect(fake.topicBodies).toEqual([{ topic: 'Fractions' }]))
    expect(within(section).getByRole('button', { name: 'Save topic' })).toBeDisabled()
  })

  it('shows the error when saving the topic fails', async () => {
    const { section, user } = await openPlan()
    server.use(http.put(`${PLAN_PATH}/topic`, () => HttpResponse.json({ error: 'Down' }, { status: 500 })))

    await user.type(within(section).getByLabelText('Topic'), 'Fractions')
    await user.click(within(section).getByRole('button', { name: 'Save topic' }))

    expect(await within(section).findByRole('alert')).toHaveTextContent('Down')
  })
})

describe('LessonsPage: writing what was covered', () => {
  it('lets covered be set once the session has started', async () => {
    const { section, user, fake } = await openPlan()

    await user.type(within(section).getByLabelText('Covered'), 'Covered fractions')
    await user.click(within(section).getByRole('button', { name: 'Save covered' }))

    await vi.waitFor(() => expect(fake.coveredBodies).toEqual([{ covered: 'Covered fractions' }]))
  })

  it('says when covered opens, and offers no field before then', async () => {
    const { section } = await openPlan({ plan: { ...PLAN, can_edit_covered: false } })

    expect(within(section).getByText('Opens at 17:00.')).toBeInTheDocument()
    expect(within(section).queryByLabelText('Covered')).not.toBeInTheDocument()
  })

  it('shows the error when saving covered fails', async () => {
    const { section, user } = await openPlan()
    server.use(http.put(`${PLAN_PATH}/covered`, () => HttpResponse.json({ error: 'This session hasn’t started yet.' }, { status: 409 })))

    await user.type(within(section).getByLabelText('Covered'), 'Covered fractions')
    await user.click(within(section).getByRole('button', { name: 'Save covered' }))

    expect(await within(section).findByRole('alert')).toHaveTextContent('This session hasn’t started yet.')
  })
})

describe('LessonsPage: access', () => {
  it('gives a lecturer Lessons beside My teaching and Attendance in the sidebar', async () => {
    signInAs(LECTURER)
    serveSessions()
    renderRoute('/dashboard/lessons')

    const modules = await screen.findByRole('navigation', { name: 'Modules' })
    expect(within(modules).getAllByRole('link').map((link) => link.textContent)).toEqual(['My teaching', 'Attendance', 'Lessons'])
    expect(within(modules).getByRole('link', { name: 'Lessons' })).toHaveAttribute('href', '/dashboard/lessons')
  })

  it('opens from the owner’s sidebar', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serveSessions()
    renderRoute('/dashboard/lessons')

    await screen.findByRole('option', { name: 'Group A · Mathematics · 17:00–18:30' })
    expect(within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: 'Lessons' })).toHaveAttribute('href', '/dashboard/lessons')
  })

  it('lets a school admin with MANAGE_COURSES in, with Lessons in the sidebar', async () => {
    signInAs(buildUser({ memberships: [{ ...YLLKA_ADMIN_MEMBERSHIP, permissions: ['MANAGE_COURSES'] }] }))
    serveSessions({ organizationId: 'org-2' })
    renderRoute('/dashboard/lessons')

    await screen.findByRole('option', { name: 'Group A · Mathematics · 17:00–18:30' })
    expect(within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: 'Lessons' })).toHaveAttribute('href', '/dashboard/lessons')
  })

  it('sends a school admin without MANAGE_COURSES back to the dashboard, and hides it from the sidebar', async () => {
    signInAs(buildUser({ memberships: [YLLKA_ADMIN_MEMBERSHIP] }))
    server.use(http.get('*/api/organizations/org-2/*', () => HttpResponse.json({ data: [] })))
    const { router } = renderRoute('/dashboard/lessons')

    await vi.waitFor(() => expect(router.state.location.pathname).not.toBe('/dashboard/lessons'))
    expect(screen.queryByRole('link', { name: 'Lessons' })).not.toBeInTheDocument()
  })

  it('sends a student to My school', async () => {
    signInAs(buildUser({ memberships: [{ ...LECTURER_MEMBERSHIPS[0], role: 'STUDENT' }] }))
    server.use(http.get('*/api/organizations/org-1/me/student', () => HttpResponse.json({ error: 'Not needed' }, { status: 500 })))
    const { router } = renderRoute('/dashboard/lessons')

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/my-school'))
  })
})
