import { fireEvent, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { groupEnrolmentSchema, groupMoveSchema, lessonRescheduleSchema } from '@shigjetademy/shared/groups'
import type { Group, GroupEnrolment, GroupLecturer, GroupLecturerHistory, GroupPage, GroupStudentOption, LessonReschedule } from '@shigjetademy/shared/groups'
import type { LessonPlan } from '@shigjetademy/shared/lesson-plans'
import { buildUser, OWNER_MEMBERSHIPS, signInAs, YLLKA_ADMIN_MEMBERSHIP } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const ARBEN: GroupLecturer = { id: '9e5b7f6f-b06e-4baa-af8d-5c6de06b7c01', first_name: 'Arben', last_name: 'Hoxha', status: 'ACTIVE' }

const TEUTA: GroupLecturer = { id: '9e5b7f6f-b06e-4baa-af8d-5c6de06b7c02', first_name: 'Teuta', last_name: 'Krasniqi', status: 'ACTIVE' }

const GROUP_A: Group = {
  id: '8d4a6e5e-af5d-4a99-9e7c-4b5cdf5a6b01',
  name: 'Group A',
  capacity: 20,
  status: 'ACTIVE',
  created_at: '2026-10-01T09:00:00.000Z',
  course: { id: '7c1c2f43-0d1e-4c55-9a3e-6b1f0c2a2b01', name: 'Mathematics', status: 'ACTIVE' },
  academic_year: { id: '6c3f5d4d-9e4c-4f88-8d6b-3a4bce4f5a01', name: '2026–27' },
  academic_term: { id: '5b2e4c3c-8d3b-4e77-9c5a-2f3abd3e4f01', name: 'Autumn term' },
  location: { id: '3f0c2a1a-6b1f-4c55-9a3e-0d1e9b1c2f01', name: 'Main campus' },
  lecturer: TEUTA,
  lecturer_change: null,
  schedule: [
    { weekday: 'MONDAY', start_time: '17:00', end_time: '18:30' },
    { weekday: 'WEDNESDAY', start_time: '17:00', end_time: '18:30' },
  ],
  enrolled_count: 1,
}

const ARTA: GroupStudentOption = { id: '1a2b3c4d-0000-4000-8000-000000000001', first_name: 'Arta', last_name: 'Gashi', student_number: 'STU-0007' }

const BESA: GroupStudentOption = { id: '1a2b3c4d-0000-4000-8000-000000000002', first_name: 'Besa', last_name: 'Berisha', student_number: 'STU-0008' }

const ARTA_IN_A: GroupEnrolment = { id: 'e0000000-0000-4000-8000-000000000001', enrolled_on: '2026-09-01', withdrawn_on: null, student: { ...ARTA, status: 'ACTIVE' } }

const HISTORY: GroupLecturerHistory = {
  assignments: [
    { id: 'a1', lecturer: TEUTA, start_date: '2026-11-10', end_date: null },
    { id: 'a2', lecturer: ARBEN, start_date: '2026-09-01', end_date: '2026-11-09' },
  ],
  substitutions: [{ id: 's1', lecturer: ARBEN, start_date: '2026-11-20', end_date: '2026-11-21', note: 'Sick leave', cancelled_at: null }],
}

const GROUPS_PATH = '*/api/organizations/org-1/groups'

const GROUP_PAGE_PATH = `/dashboard/groups/${GROUP_A.id}`

type ServeGroupParams = {
  group?: Group
  history?: GroupLecturerHistory
  enrolments?: GroupEnrolment[]
  reschedules?: LessonReschedule[]
  lessonPlans?: LessonPlan[]
}

const serveGroup = ({ group = GROUP_A, history = HISTORY, enrolments = [ARTA_IN_A], reschedules = [], lessonPlans = [] }: ServeGroupParams = {}) =>
  server.use(
    http.get(`${GROUPS_PATH}/${group.id}/reschedules`, () => HttpResponse.json({ data: reschedules })),
    http.get(`${GROUPS_PATH}/${group.id}`, () => HttpResponse.json({ data: group })),
    http.get(`${GROUPS_PATH}/${group.id}/lecturers`, () => HttpResponse.json({ data: history })),
    http.get(`${GROUPS_PATH}/${group.id}/enrolments`, () => HttpResponse.json({ data: enrolments })),
    http.get(`${GROUPS_PATH}/lecturer-options`, () => HttpResponse.json({ data: [] })),
    http.get(`${GROUPS_PATH}/student-options`, () => HttpResponse.json({ data: [ARTA, BESA] })),
    http.get(`${GROUPS_PATH}/${group.id}/lesson-plans`, () => HttpResponse.json({ data: lessonPlans })),
  )

const studentsSection = () => screen.findByRole('region', { name: 'Students' })

const signInAsOwner = () => signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))

describe('GroupDetailPage: students', () => {
  it('lists the active students with their number, and the count against the capacity', async () => {
    signInAsOwner()
    serveGroup()
    renderRoute(GROUP_PAGE_PATH)

    const students = await within(await studentsSection()).findByRole('list', { name: 'Active students' })
    expect(within(students).getByRole('listitem')).toHaveTextContent('Arta Gashi')
    expect(within(students).getByRole('listitem')).toHaveTextContent('STU-0007')
    expect(within(screen.getByRole('region', { name: 'Details' })).getByText('1/20')).toBeInTheDocument()
  })

  it('says Full when the group has reached its capacity, and offers no enrolling', async () => {
    signInAsOwner()
    serveGroup({ group: { ...GROUP_A, capacity: 1 } })
    renderRoute(GROUP_PAGE_PATH)

    const section = await studentsSection()
    expect(await within(section).findByText('This group is full.')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Details' })).getByText('1/1 · Full')).toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: 'Enrol' })).not.toBeInTheDocument()
  })

  it('says when the group has no students yet', async () => {
    signInAsOwner()
    serveGroup({ group: { ...GROUP_A, enrolled_count: 0 }, enrolments: [] })
    renderRoute(GROUP_PAGE_PATH)

    expect(await within(await studentsSection()).findByText('No students yet.')).toBeInTheDocument()
  })

  it('enrols a chosen student, offering only those not already in the group', async () => {
    signInAsOwner()
    serveGroup()
    let sent: unknown
    server.use(
      http.post(`${GROUPS_PATH}/${GROUP_A.id}/enrolments`, async ({ request }) => {
        sent = groupEnrolmentSchema.parse(await request.json())
        const besaInA: GroupEnrolment = { id: 'e0000000-0000-4000-8000-000000000002', enrolled_on: '2026-11-03', withdrawn_on: null, student: { ...BESA, status: 'ACTIVE' } }
        serveGroup({ group: { ...GROUP_A, enrolled_count: 2 }, enrolments: [besaInA, ARTA_IN_A] })
        return HttpResponse.json({ data: besaInA }, { status: 201 })
      }),
    )
    const { user } = renderRoute(GROUP_PAGE_PATH)

    const section = await studentsSection()
    const picker = await within(section).findByLabelText('Student')
    await within(picker).findByRole('option', { name: 'Besa Berisha · STU-0008' })
    expect(within(picker).getAllByRole('option').map((option) => option.textContent)).toEqual(['Choose a student', 'Besa Berisha · STU-0008'])
    await user.selectOptions(picker, 'Besa Berisha · STU-0008')
    await user.click(within(section).getByRole('button', { name: 'Enrol' }))

    expect(await screen.findByText('Enrolled Besa Berisha.')).toBeInTheDocument()
    expect(sent).toEqual({ student_id: BESA.id })
    expect(await within(screen.getByRole('region', { name: 'Details' })).findByText('2/20')).toBeInTheDocument()
    expect(within(within(section).getByRole('list', { name: 'Active students' })).getAllByRole('listitem')).toHaveLength(2)
  })

  it('keeps the loaded page when loading the group again fails after enrolling', async () => {
    signInAsOwner()
    serveGroup()
    server.use(
      http.post(`${GROUPS_PATH}/${GROUP_A.id}/enrolments`, () => {
        server.use(http.get(`${GROUPS_PATH}/${GROUP_A.id}`, () => HttpResponse.json({ error: 'Down' }, { status: 500 })))
        return HttpResponse.json({ data: { ...ARTA_IN_A, id: 'e0000000-0000-4000-8000-000000000002', student: { ...BESA, status: 'ACTIVE' } } }, { status: 201 })
      }),
    )
    const { user } = renderRoute(GROUP_PAGE_PATH)

    const section = await studentsSection()
    const picker = await within(section).findByLabelText('Student')
    await user.selectOptions(picker, await within(picker).findByRole('option', { name: 'Besa Berisha · STU-0008' }))
    await user.click(within(section).getByRole('button', { name: 'Enrol' }))

    expect(await screen.findByText('Enrolled Besa Berisha.')).toBeInTheDocument()
    await vi.waitFor(() => expect(screen.queryByText('We couldn’t load the group.')).not.toBeInTheDocument())
    expect(screen.getByRole('region', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Group A' })).toBeInTheDocument()
  })

  it('asks for a student before sending', async () => {
    signInAsOwner()
    serveGroup()
    const { user } = renderRoute(GROUP_PAGE_PATH)

    const section = await studentsSection()
    await user.click(await within(section).findByRole('button', { name: 'Enrol' }))

    expect(await within(section).findByText('Choose a student.')).toBeInTheDocument()
  })

  it('shows a refusal under the picker, like a group that filled up meanwhile', async () => {
    signInAsOwner()
    serveGroup()
    const message = 'This group is full.'
    server.use(http.post(`${GROUPS_PATH}/${GROUP_A.id}/enrolments`, () => HttpResponse.json({ error: message, details: { formErrors: [], fieldErrors: { student_id: [message] } } }, { status: 409 })))
    const { user } = renderRoute(GROUP_PAGE_PATH)

    const section = await studentsSection()
    const picker = await within(section).findByLabelText('Student')
    await user.selectOptions(picker, await within(picker).findByRole('option', { name: 'Besa Berisha · STU-0008' }))
    await user.click(within(section).getByRole('button', { name: 'Enrol' }))

    expect(await within(section).findByLabelText('Student')).toHaveAccessibleDescription(message)
  })

  it('offers no enrolling on an archived group', async () => {
    signInAsOwner()
    serveGroup({ group: { ...GROUP_A, status: 'ARCHIVED' } })
    renderRoute(GROUP_PAGE_PATH)

    const section = await studentsSection()
    await within(section).findByRole('list', { name: 'Active students' })
    expect(within(section).queryByLabelText('Student')).not.toBeInTheDocument()
  })

  it('offers a retry when the students fail to load', async () => {
    signInAsOwner()
    serveGroup()
    server.use(http.get(`${GROUPS_PATH}/${GROUP_A.id}/enrolments`, () => HttpResponse.json({ error: 'Down' }, { status: 500 }), { once: true }))
    const { user } = renderRoute(GROUP_PAGE_PATH)

    const section = await studentsSection()
    expect(await within(section).findByText('We couldn’t load the students.')).toBeInTheDocument()
    await user.click(within(section).getByRole('button', { name: 'Try again' }))

    expect(await within(section).findByRole('list', { name: 'Active students' })).toBeInTheDocument()
  })
})

const GROUP_B: Group = {
  ...GROUP_A,
  id: '8d4a6e5e-af5d-4a99-9e7c-4b5cdf5a6b02',
  name: 'Group B',
  course: { id: '7c1c2f43-0d1e-4c55-9a3e-6b1f0c2a2b02', name: 'Physics', status: 'ACTIVE' },
  enrolled_count: 3,
}

/** The active groups the move dialog offers, this one included, as the list answers them */
const serveActiveGroups = () => {
  const page: GroupPage = { groups: [GROUP_A, GROUP_B], total: 2, counts: { ACTIVE: 2, ARCHIVED: 0 } }
  server.use(http.get(GROUPS_PATH, () => HttpResponse.json({ data: page })))
}

const WITHDRAWN_ARTA: GroupEnrolment = { ...ARTA_IN_A, withdrawn_on: '2026-11-03' }

describe('GroupDetailPage: withdrawing and moving', () => {
  it('withdraws after one confirmation and keeps the student in the history', async () => {
    signInAsOwner()
    serveGroup()
    let isWithdrawn = false
    server.use(
      http.post(`${GROUPS_PATH}/${GROUP_A.id}/enrolments/${ARTA_IN_A.id}/withdraw`, () => {
        isWithdrawn = true
        serveGroup({ group: { ...GROUP_A, enrolled_count: 0 }, enrolments: [WITHDRAWN_ARTA] })
        return HttpResponse.json({ data: WITHDRAWN_ARTA })
      }),
    )
    const { user } = renderRoute(GROUP_PAGE_PATH)

    const section = await studentsSection()
    await user.click(await within(section).findByRole('button', { name: 'Withdraw Arta Gashi' }))
    const confirm = within(section).getByRole('group', { name: 'Withdraw Arta Gashi' })
    await user.click(within(confirm).getByRole('button', { name: 'Withdraw' }))

    expect(await within(section).findByText('Withdrew Arta Gashi.')).toBeInTheDocument()
    expect(isWithdrawn).toBe(true)
    const history = await within(section).findByRole('list', { name: 'Withdrawn students' })
    expect(within(history).getByRole('listitem')).toHaveTextContent('Arta Gashi')
    expect(within(history).getByRole('listitem')).toHaveTextContent('1 Sep 2026 – 3 Nov 2026')
    expect(within(section).getByText('No students yet.')).toBeInTheDocument()
  })

  it('moves a student to another active group of any course', async () => {
    signInAsOwner()
    serveGroup()
    serveActiveGroups()
    let sent: unknown
    server.use(
      http.post(`${GROUPS_PATH}/${GROUP_A.id}/enrolments/${ARTA_IN_A.id}/move`, async ({ request }) => {
        sent = groupMoveSchema.parse(await request.json())
        serveGroup({ group: { ...GROUP_A, enrolled_count: 0 }, enrolments: [WITHDRAWN_ARTA] })
        return HttpResponse.json({ data: { ...ARTA_IN_A, id: 'e0000000-0000-4000-8000-000000000009', enrolled_on: '2026-11-03' } }, { status: 201 })
      }),
    )
    const { user } = renderRoute(GROUP_PAGE_PATH)

    await user.click(await within(await studentsSection()).findByRole('button', { name: 'Move Arta Gashi' }))
    const dialog = screen.getByRole('dialog', { name: 'Move Arta Gashi' })
    const target = within(dialog).getByLabelText('Group')
    await within(target).findByRole('option', { name: 'Group B · Physics · 2026–27 · 3/20' })
    expect(within(target).getAllByRole('option').map((option) => option.textContent)).toEqual(['Choose a group', 'Group B · Physics · 2026–27 · 3/20'])
    await user.selectOptions(target, 'Group B · Physics · 2026–27 · 3/20')
    await user.click(within(dialog).getByRole('button', { name: 'Move student' }))

    expect(await screen.findByText('Moved Arta Gashi to Group B.')).toBeInTheDocument()
    expect(sent).toEqual({ group_id: GROUP_B.id })
    expect(dialog).not.toBeVisible()
  })

  it('shows why a move is refused and leaves the dialog open', async () => {
    signInAsOwner()
    serveGroup()
    serveActiveGroups()
    const message = 'This group is full.'
    server.use(http.post(`${GROUPS_PATH}/${GROUP_A.id}/enrolments/${ARTA_IN_A.id}/move`, () => HttpResponse.json({ error: message, details: { formErrors: [], fieldErrors: { group_id: [message] } } }, { status: 409 })))
    const { user } = renderRoute(GROUP_PAGE_PATH)

    await user.click(await within(await studentsSection()).findByRole('button', { name: 'Move Arta Gashi' }))
    const dialog = screen.getByRole('dialog', { name: 'Move Arta Gashi' })
    await user.selectOptions(within(dialog).getByLabelText('Group'), await within(dialog).findByRole('option', { name: 'Group B · Physics · 2026–27 · 3/20' }))
    await user.click(within(dialog).getByRole('button', { name: 'Move student' }))

    expect(await within(dialog).findByLabelText('Group')).toHaveAccessibleDescription(message)
    expect(dialog).toBeVisible()
  })

  it('offers only groups with a free seat as move targets', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serveGroup()
    const fullGroup: Group = { ...GROUP_B, id: '8d4a6e5e-af5d-4a99-9e7c-4b5cdf5a6b03', name: 'Group C', enrolled_count: 20 }
    const page: GroupPage = { groups: [GROUP_A, GROUP_B, fullGroup], total: 3, counts: { ACTIVE: 3, ARCHIVED: 0 } }
    server.use(http.get(GROUPS_PATH, () => HttpResponse.json({ data: page })))
    const { user } = renderRoute(GROUP_PAGE_PATH)

    await user.click(await within(await studentsSection()).findByRole('button', { name: 'Move Arta Gashi' }))
    const dialog = screen.getByRole('dialog', { name: 'Move Arta Gashi' })

    expect(await within(dialog).findByRole('option', { name: 'Group C · Physics · 2026–27 · 20/20 · Full' })).toBeDisabled()
    expect(within(dialog).getByRole('option', { name: 'Group B · Physics · 2026–27 · 3/20' })).toBeEnabled()
  })

  it('offers no move for an archived student, who can still be withdrawn', async () => {
    signInAsOwner()
    serveGroup({ enrolments: [{ ...ARTA_IN_A, student: { ...ARTA_IN_A.student, status: 'ARCHIVED' } }] })
    renderRoute(GROUP_PAGE_PATH)

    const section = await studentsSection()
    expect(await within(section).findByRole('button', { name: 'Withdraw Arta Gashi' })).toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: 'Move Arta Gashi' })).not.toBeInTheDocument()
  })

  it('offers no withdrawing or moving on an archived group', async () => {
    signInAsOwner()
    serveGroup({ group: { ...GROUP_A, status: 'ARCHIVED' } })
    renderRoute(GROUP_PAGE_PATH)

    const section = await studentsSection()
    await within(section).findByRole('list', { name: 'Active students' })
    expect(within(section).queryByRole('button', { name: 'Withdraw Arta Gashi' })).not.toBeInTheDocument()
    expect(within(section).queryByRole('button', { name: 'Move Arta Gashi' })).not.toBeInTheDocument()
  })
})

describe('GroupDetailPage', () => {
  it('lists the group’s days and times in the order the server sends them', async () => {
    signInAsOwner()
    serveGroup()
    renderRoute(GROUP_PAGE_PATH)

    const schedule = await screen.findByRole('list', { name: 'Schedule' })
    expect(within(schedule).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Mon 17:00–18:30', 'Wed 17:00–18:30'])
  })

  it('says when the group has no schedule', async () => {
    signInAsOwner()
    serveGroup({ group: { ...GROUP_A, schedule: [] } })
    renderRoute(GROUP_PAGE_PATH)

    const section = await screen.findByRole('region', { name: 'Schedule' })
    expect(within(section).getByText('No schedule')).toBeInTheDocument()
  })

  it('opens from the group’s name in the Groups table', async () => {
    signInAsOwner()
    const page: GroupPage = { groups: [GROUP_A], total: 1, counts: { ACTIVE: 1, ARCHIVED: 0 } }
    server.use(
      http.get(GROUPS_PATH, () => HttpResponse.json({ data: page })),
      http.get('*/api/organizations/org-1/courses/options', () => HttpResponse.json({ data: [] })),
      http.get('*/api/organizations/org-1/academic-periods/years', () => HttpResponse.json({ data: [] })),
      http.get('*/api/organizations/org-1/locations', () => HttpResponse.json({ data: [] })),
    )
    serveGroup()
    const { router, user } = renderRoute('/dashboard/groups')

    await user.click(await screen.findByRole('link', { name: 'Group A' }))

    await vi.waitFor(() => expect(router.state.location.pathname).toBe(GROUP_PAGE_PATH))
    expect(await screen.findByRole('heading', { level: 1, name: 'Group A' })).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: 'Groups' })).not.toBeInTheDocument()
  })

  it('shows the course, year, term, location, capacity, lecturer history and substitutions', async () => {
    signInAsOwner()
    serveGroup()
    renderRoute(GROUP_PAGE_PATH)

    const details = await screen.findByRole('region', { name: 'Details' })
    expect(await within(details).findByText('Mathematics')).toBeInTheDocument()
    expect(within(details).getByText('2026–27')).toBeInTheDocument()
    expect(within(details).getByText('Autumn term')).toBeInTheDocument()
    expect(within(details).getByText('Main campus')).toBeInTheDocument()
    expect(within(details).getByText('20 seats')).toBeInTheDocument()
    const history = await screen.findByRole('list', { name: 'Permanent lecturers' })
    expect(within(history).getAllByRole('listitem').map((item) => item.textContent)).toEqual(['Teuta KrasniqiFrom 10 Nov 2026', 'Arben Hoxha1 Sep 2026 – 9 Nov 2026'])
    const substitutions = screen.getByRole('list', { name: 'Substitutions' })
    expect(within(substitutions).getByRole('listitem')).toHaveTextContent('Arben Hoxha')
    expect(within(substitutions).getByRole('listitem')).toHaveTextContent('Sick leave')
  })

  it('says what isn’t set for a group without a term, location or capacity', async () => {
    signInAsOwner()
    serveGroup({ group: { ...GROUP_A, academic_term: null, location: null, capacity: null } })
    renderRoute(GROUP_PAGE_PATH)

    const details = await screen.findByRole('region', { name: 'Details' })
    expect(await within(details).findByText('No term')).toBeInTheDocument()
    expect(within(details).getByText('No location')).toBeInTheDocument()
    expect(within(details).getByText('No limit')).toBeInTheDocument()
  })

  it('says the group isn’t found when the server doesn’t know it, and links back to Groups', async () => {
    signInAsOwner()
    server.use(http.get(`${GROUPS_PATH}/${GROUP_A.id}`, () => HttpResponse.json({ error: 'Group not found' }, { status: 404 })))
    renderRoute(GROUP_PAGE_PATH)

    expect(await screen.findByText('Group not found.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Groups' })).toHaveAttribute('href', '/dashboard/groups')
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('says a malformed id isn’t found', async () => {
    signInAsOwner()
    server.use(http.get(`${GROUPS_PATH}/not-a-group`, () => HttpResponse.json({ error: 'Validation failed' }, { status: 400 })))
    renderRoute('/dashboard/groups/not-a-group')

    expect(await screen.findByText('Group not found.')).toBeInTheDocument()
  })

  it('shows a skeleton while loading', async () => {
    signInAsOwner()
    server.use(http.get(`${GROUPS_PATH}/${GROUP_A.id}`, () => new Promise(() => {})))
    renderRoute(GROUP_PAGE_PATH)

    expect(await screen.findByRole('list', { name: 'Loading' })).toBeInTheDocument()
  })

  it('offers a retry when the group fails to load', async () => {
    signInAsOwner()
    serveGroup()
    // Added last, so it answers first, once
    server.use(http.get(`${GROUPS_PATH}/${GROUP_A.id}`, () => HttpResponse.json({ error: 'Down' }, { status: 500 }), { once: true }))
    const { user } = renderRoute(GROUP_PAGE_PATH)

    expect(await screen.findByText('We couldn’t load the group.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Group A' })).toBeInTheDocument()
  })

  it('sends a school admin without Courses and groups back to the dashboard', async () => {
    signInAs(buildUser({ memberships: [YLLKA_ADMIN_MEMBERSHIP] }))
    server.use(http.get('*/api/organizations/org-2/*', () => HttpResponse.json({ data: [] })))
    const { router } = renderRoute(GROUP_PAGE_PATH)

    await vi.waitFor(() => expect(router.state.location.pathname).not.toBe(GROUP_PAGE_PATH))
    expect(screen.queryByRole('heading', { level: 1, name: 'Group A' })).not.toBeInTheDocument()
  })
})

// Monday 9 November 2026, 11:00 in Belgrade
const MONDAY_MORNING = '2026-11-09T10:00:00.000Z'

const MOVED_TO_FRIDAY: LessonReschedule = {
  id: 'r0000000-0000-4000-8000-000000000001',
  original_date: '2026-11-16',
  original_start_time: '17:00',
  original_end_time: '18:30',
  new_date: '2026-11-20',
  new_start_time: '16:00',
  new_end_time: '17:30',
  reason: 'Lecturer at a conference',
  status: 'ACTIVE',
  created_at: '2026-11-09T10:00:00.000Z',
  cancelled_at: null,
}

const reschedulesSection = () => screen.findByRole('region', { name: 'Rescheduled lessons' })

describe('GroupDetailPage: rescheduling a lesson', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(MONDAY_MORNING))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('moves a session to a new date and time, starting from the original’s times', async () => {
    signInAsOwner()
    serveGroup()
    let sent: unknown
    server.use(
      http.post(`${GROUPS_PATH}/${GROUP_A.id}/reschedules`, async ({ request }) => {
        sent = lessonRescheduleSchema.parse(await request.json())
        serveGroup({ reschedules: [MOVED_TO_FRIDAY] })
        return HttpResponse.json({ data: MOVED_TO_FRIDAY }, { status: 201 })
      }),
    )
    const { user } = renderRoute(GROUP_PAGE_PATH)

    await user.click(await within(await reschedulesSection()).findByRole('button', { name: 'Reschedule a lesson' }))
    const dialog = screen.getByRole('dialog', { name: 'Reschedule a lesson' })
    fireEvent.change(within(dialog).getByLabelText('Lesson date'), { target: { value: '2026-11-16' } })
    const lesson = within(dialog).getByLabelText('Lesson')
    expect(within(lesson).getAllByRole('option').map((option) => option.textContent)).toEqual(['Choose a lesson', '17:00–18:30'])
    await user.selectOptions(lesson, '17:00–18:30')
    expect(within(dialog).getByLabelText('New date')).toHaveValue('2026-11-16')
    expect(within(dialog).getByLabelText('Start time')).toHaveValue('17:00')
    expect(within(dialog).getByLabelText('End time')).toHaveValue('18:30')
    fireEvent.change(within(dialog).getByLabelText('New date'), { target: { value: '2026-11-20' } })
    fireEvent.change(within(dialog).getByLabelText('Start time'), { target: { value: '16:00' } })
    fireEvent.change(within(dialog).getByLabelText('End time'), { target: { value: '17:30' } })
    await user.type(within(dialog).getByLabelText('Reason (optional)'), 'Lecturer at a conference')
    await user.click(within(dialog).getByRole('button', { name: 'Reschedule lesson' }))

    await vi.waitFor(() => expect(dialog).not.toHaveAttribute('open'))
    expect(sent).toEqual({ original_date: '2026-11-16', original_start_time: '17:00', new_date: '2026-11-20', new_start_time: '16:00', new_end_time: '17:30', reason: 'Lecturer at a conference' })
    expect(await within(await reschedulesSection()).findByText('Moved to Fri 20 Nov, 16:00')).toBeInTheDocument()
  })

  it('offers no lesson to move on a day the group doesn’t meet', async () => {
    signInAsOwner()
    serveGroup()
    const { user } = renderRoute(GROUP_PAGE_PATH)

    await user.click(await within(await reschedulesSection()).findByRole('button', { name: 'Reschedule a lesson' }))
    const dialog = screen.getByRole('dialog', { name: 'Reschedule a lesson' })
    fireEvent.change(within(dialog).getByLabelText('Lesson date'), { target: { value: '2026-11-17' } })

    expect(within(within(dialog).getByLabelText('Lesson')).getAllByRole('option').map((option) => option.textContent)).toEqual(['Choose a lesson'])
    expect(within(dialog).getByText('The group has no lesson on this day.')).toBeInTheDocument()
  })

  it('shows why the server refuses a new slot under its field, and keeps the dialog open', async () => {
    signInAsOwner()
    serveGroup()
    const message = 'This overlaps the group’s lesson at 17:00–18:30.'
    server.use(
      http.post(`${GROUPS_PATH}/${GROUP_A.id}/reschedules`, () =>
        HttpResponse.json({ error: message, details: { formErrors: [], fieldErrors: { new_start_time: [message] } } }, { status: 400 }),
      ),
    )
    const { user } = renderRoute(GROUP_PAGE_PATH)

    await user.click(await within(await reschedulesSection()).findByRole('button', { name: 'Reschedule a lesson' }))
    const dialog = screen.getByRole('dialog', { name: 'Reschedule a lesson' })
    fireEvent.change(within(dialog).getByLabelText('Lesson date'), { target: { value: '2026-11-16' } })
    await user.selectOptions(within(dialog).getByLabelText('Lesson'), '17:00–18:30')
    fireEvent.change(within(dialog).getByLabelText('New date'), { target: { value: '2026-11-18' } })
    await user.click(within(dialog).getByRole('button', { name: 'Reschedule lesson' }))

    await vi.waitFor(() => expect(within(dialog).getByLabelText('Start time')).toHaveAttribute('aria-invalid', 'true'))
    expect(within(dialog).getByLabelText('Start time')).toHaveAccessibleDescription(message)
    expect(dialog).toHaveAttribute('open')
  })

  it('asks for the lesson to move before sending', async () => {
    signInAsOwner()
    serveGroup()
    const { user } = renderRoute(GROUP_PAGE_PATH)

    await user.click(await within(await reschedulesSection()).findByRole('button', { name: 'Reschedule a lesson' }))
    const dialog = screen.getByRole('dialog', { name: 'Reschedule a lesson' })
    await user.click(within(dialog).getByRole('button', { name: 'Reschedule lesson' }))

    await vi.waitFor(() => expect(within(dialog).getByLabelText('Lesson')).toHaveAccessibleDescription('Choose the lesson to move.'))
    expect(within(dialog).getByLabelText('Lesson date')).toHaveAccessibleDescription('Choose the lesson to move.')
  })

  it('lets an admin with Courses and groups but no Timetable read the moves, without changing them', async () => {
    signInAs(buildUser({ memberships: [{ ...YLLKA_ADMIN_MEMBERSHIP, permissions: ['MANAGE_COURSES'] }] }))
    server.use(
      http.get(`*/api/organizations/org-2/groups/${GROUP_A.id}`, () => HttpResponse.json({ data: GROUP_A })),
      http.get(`*/api/organizations/org-2/groups/${GROUP_A.id}/lecturers`, () => HttpResponse.json({ data: HISTORY })),
      http.get(`*/api/organizations/org-2/groups/${GROUP_A.id}/enrolments`, () => HttpResponse.json({ data: [] })),
      http.get(`*/api/organizations/org-2/groups/${GROUP_A.id}/reschedules`, () => HttpResponse.json({ data: [MOVED_TO_FRIDAY] })),
      http.get('*/api/organizations/org-2/groups/lecturer-options', () => HttpResponse.json({ data: [] })),
      http.get('*/api/organizations/org-2/groups/student-options', () => HttpResponse.json({ data: [] })),
    )
    renderRoute(GROUP_PAGE_PATH)

    const section = await reschedulesSection()
    expect(await within(section).findByText('Moved to Fri 20 Nov, 16:00')).toBeInTheDocument()
    expect(within(section).queryByRole('button')).not.toBeInTheDocument()
  })

  it('opens read-only for an admin with only Timetable, who can still reschedule, without the students and lecturers', async () => {
    signInAs(buildUser({ memberships: [{ ...YLLKA_ADMIN_MEMBERSHIP, permissions: ['MANAGE_SCHEDULES'] }] }))
    server.use(
      http.get(`*/api/organizations/org-2/groups/${GROUP_A.id}`, () => HttpResponse.json({ data: GROUP_A })),
      http.get(`*/api/organizations/org-2/groups/${GROUP_A.id}/reschedules`, () => HttpResponse.json({ data: [MOVED_TO_FRIDAY] })),
      http.get('*/api/organizations/org-2/*', () => HttpResponse.json({ error: 'Forbidden' }, { status: 403 })),
    )
    renderRoute(GROUP_PAGE_PATH)

    const section = await reschedulesSection()
    expect(await within(section).findByText('Moved to Fri 20 Nov, 16:00')).toBeInTheDocument()
    expect(within(section).getByRole('button', { name: 'Reschedule a lesson' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Schedule' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Students' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Lecturers' })).not.toBeInTheDocument()
  })

  it('offers no rescheduling on an archived group', async () => {
    signInAsOwner()
    serveGroup({ group: { ...GROUP_A, status: 'ARCHIVED' }, reschedules: [MOVED_TO_FRIDAY] })
    renderRoute(GROUP_PAGE_PATH)

    const section = await reschedulesSection()
    expect(await within(section).findByText('Moved to Fri 20 Nov, 16:00')).toBeInTheDocument()
    expect(within(section).queryByRole('button')).not.toBeInTheDocument()
  })
})

describe('GroupDetailPage: rescheduled lessons', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(MONDAY_MORNING))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const PAST: LessonReschedule = { ...MOVED_TO_FRIDAY, id: 'r0000000-0000-4000-8000-000000000002', original_date: '2026-11-02', new_date: '2026-11-04', reason: null, status: 'CANCELLED', cancelled_at: '2026-11-01T10:00:00.000Z' }

  it('lists upcoming and past moves with the original and new slots, the reason and the status', async () => {
    signInAsOwner()
    serveGroup({ reschedules: [PAST, MOVED_TO_FRIDAY] })
    renderRoute(GROUP_PAGE_PATH)

    const section = await reschedulesSection()
    const upcoming = await within(section).findByRole('list', { name: 'Upcoming' })
    const past = within(section).getByRole('list', { name: 'Past' })
    const [moved] = within(upcoming).getAllByRole('listitem')
    expect(moved).toHaveTextContent('Mon 16 Nov, 17:00–18:30')
    expect(moved).toHaveTextContent('Moved to Fri 20 Nov, 16:00 · until 17:30')
    expect(moved).toHaveTextContent('Lecturer at a conference')
    expect(moved).toHaveTextContent('Active')
    const [cancelled] = within(past).getAllByRole('listitem')
    expect(cancelled).toHaveTextContent('Mon 2 Nov, 17:00–18:30')
    expect(cancelled).toHaveTextContent('Moved to Wed 4 Nov, 16:00')
    expect(cancelled).toHaveTextContent('Cancelled')
    expect(within(cancelled).queryByRole('button')).not.toBeInTheDocument()
  })

  it('says when no lesson has been moved', async () => {
    signInAsOwner()
    serveGroup()
    renderRoute(GROUP_PAGE_PATH)

    expect(await within(await reschedulesSection()).findByText('No rescheduled lessons')).toBeInTheDocument()
  })

  it('cancels a move after one confirmation', async () => {
    signInAsOwner()
    serveGroup({ reschedules: [MOVED_TO_FRIDAY] })
    let cancelledId = ''
    server.use(
      http.post(`${GROUPS_PATH}/${GROUP_A.id}/reschedules/:rescheduleId/cancel`, ({ params }) => {
        cancelledId = String(params.rescheduleId)
        const cancelled: LessonReschedule = { ...MOVED_TO_FRIDAY, status: 'CANCELLED', cancelled_at: '2026-11-09T10:00:00.000Z' }
        serveGroup({ reschedules: [cancelled] })
        return HttpResponse.json({ data: cancelled })
      }),
    )
    const { user } = renderRoute(GROUP_PAGE_PATH)

    const section = await reschedulesSection()
    await user.click(await within(section).findByRole('button', { name: 'Cancel the move of Mon 16 Nov, 17:00–18:30' }))
    await user.click(within(within(section).getByRole('group', { name: 'Cancel the move of Mon 16 Nov, 17:00–18:30' })).getByRole('button', { name: 'Cancel move' }))

    expect(await within(section).findByText('Cancelled')).toBeInTheDocument()
    expect(cancelledId).toBe(MOVED_TO_FRIDAY.id)
    expect(within(section).queryByRole('button', { name: /Cancel the move/ })).not.toBeInTheDocument()
  })

  it('shows why a cancel is refused', async () => {
    signInAsOwner()
    serveGroup({ reschedules: [MOVED_TO_FRIDAY] })
    const message = 'The moved lesson already has attendance marks, so it can’t be cancelled.'
    server.use(http.post(`${GROUPS_PATH}/${GROUP_A.id}/reschedules/:rescheduleId/cancel`, () => HttpResponse.json({ error: message }, { status: 409 })))
    const { user } = renderRoute(GROUP_PAGE_PATH)

    const section = await reschedulesSection()
    await user.click(await within(section).findByRole('button', { name: 'Cancel the move of Mon 16 Nov, 17:00–18:30' }))
    await user.click(within(within(section).getByRole('group', { name: 'Cancel the move of Mon 16 Nov, 17:00–18:30' })).getByRole('button', { name: 'Cancel move' }))

    expect(await within(section).findByRole('alert')).toHaveTextContent(message)
  })
})

const lessonsSection = () => screen.findByRole('region', { name: 'Lessons' })

const PLANNED: LessonPlan = { group_id: GROUP_A.id, date: '2026-11-16', start_time: '17:00', end_time: '18:30', rescheduled_from: null, topic: 'Fractions', covered: null, can_edit_covered: false }

const COVERED: LessonPlan = { group_id: GROUP_A.id, date: '2026-11-02', start_time: '17:00', end_time: '18:30', rescheduled_from: null, topic: null, covered: 'Covered addition', can_edit_covered: true }

describe('GroupDetailPage: lessons', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(MONDAY_MORNING))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('lists upcoming and past sessions with their topic or covered note, read-only', async () => {
    signInAsOwner()
    serveGroup({ lessonPlans: [COVERED, PLANNED] })
    renderRoute(GROUP_PAGE_PATH)

    const section = await lessonsSection()
    const upcoming = await within(section).findByRole('list', { name: 'Upcoming' })
    const past = within(section).getByRole('list', { name: 'Past' })
    expect(within(upcoming).getByRole('listitem')).toHaveTextContent('Fractions')
    expect(within(past).getByRole('listitem')).toHaveTextContent('Covered addition')
    expect(within(section).queryByRole('button')).not.toBeInTheDocument()
    expect(within(section).queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('says No topic yet and Nothing recorded yet when a session has neither', async () => {
    signInAsOwner()
    const blank: LessonPlan = { ...PLANNED, topic: null, covered: null }
    serveGroup({ lessonPlans: [blank] })
    renderRoute(GROUP_PAGE_PATH)

    const section = await lessonsSection()
    expect(await within(section).findByText('No topic yet')).toBeInTheDocument()
    expect(within(section).getByText('Nothing recorded yet')).toBeInTheDocument()
  })

  it('says when there are no lesson plans yet', async () => {
    signInAsOwner()
    serveGroup()
    renderRoute(GROUP_PAGE_PATH)

    expect(await within(await lessonsSection()).findByText('No lesson plans yet')).toBeInTheDocument()
  })

  it('shows a moved session under its new date, not its original slot', async () => {
    signInAsOwner()
    const moved: LessonPlan = { ...PLANNED, date: '2026-11-20', start_time: '16:00', end_time: '17:30', rescheduled_from: { date: '2026-11-16', start_time: '17:00' } }
    serveGroup({ lessonPlans: [moved] })
    renderRoute(GROUP_PAGE_PATH)

    const section = await lessonsSection()
    const upcoming = await within(section).findByRole('list', { name: 'Upcoming' })
    expect(within(upcoming).getByRole('listitem')).toHaveTextContent('Rescheduled from Mon 16 Nov, 17:00')
  })

  it('offers a retry when the lesson plans fail to load', async () => {
    signInAsOwner()
    serveGroup()
    server.use(http.get(`${GROUPS_PATH}/${GROUP_A.id}/lesson-plans`, () => HttpResponse.json({ error: 'Down' }, { status: 500 })))
    renderRoute(GROUP_PAGE_PATH)

    expect(await within(await lessonsSection()).findByText('We couldn’t load the lesson plans.')).toBeInTheDocument()
  })
})
