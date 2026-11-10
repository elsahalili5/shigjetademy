import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { AcademicYear } from '@shigjetademy/shared/academic-periods'
import type { CourseOption } from '@shigjetademy/shared/courses'
import type { Group, GroupLecturerOption } from '@shigjetademy/shared/groups'
import type { GroupRoomOption } from '@shigjetademy/shared/rooms'
import type { WeeklyScheduleEntry } from '@shigjetademy/shared/schedule'
import { buildUser, OWNER_MEMBERSHIPS, signInAs, YLLKA_ADMIN_MEMBERSHIP } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const MATHEMATICS: CourseOption = { id: '7c1c2f43-0d1e-4c55-9a3e-6b1f0c2a2b01', name: 'Mathematics', status: 'ACTIVE' }

const THIS_YEAR: AcademicYear = { id: '6c3f5d4d-9e4c-4f88-8d6b-3a4bce4f5a01', name: '2026–27', start_date: '2026-09-01', end_date: '2027-06-30', is_current: true, terms: [], holidays: [] }

const ARBEN: GroupLecturerOption = { id: '9e5b7f6f-b06e-4baa-af8d-5c6de06b7c01', first_name: 'Arben', last_name: 'Hoxha', subjects: ['Mathematics'] }

const MAIN_ROOM: GroupRoomOption = { id: '3f0c2a1a-6b1f-4c55-9a3e-0d1e9b1c2f01', name: 'Room 101', location: { id: 'b2c4a1a1-6b1f-4c55-9a3e-0d1e9b1c2f01', name: 'Main campus' } }

const GROUP_A: Group = {
  id: '8d4a6e5e-af5d-4a99-9e7c-4b5cdf5a6b01',
  name: 'Group A',
  capacity: 20,
  status: 'ACTIVE',
  created_at: '2026-10-01T09:00:00.000Z',
  course: MATHEMATICS,
  academic_year: { id: THIS_YEAR.id, name: THIS_YEAR.name },
  academic_term: null,
  room: { id: MAIN_ROOM.id, name: MAIN_ROOM.name },
  lecturer: { id: ARBEN.id, first_name: 'Arben', last_name: 'Hoxha', status: 'ACTIVE' },
  lecturer_change: null,
  schedule: [{ weekday: 'MONDAY', start_time: '10:00', end_time: '11:00' }],
  enrolled_count: 18,
}

const GROUP_B: Group = { ...GROUP_A, id: '8d4a6e5e-af5d-4a99-9e7c-4b5cdf5a6b02', name: 'Group B' }

const MONDAY_10: WeeklyScheduleEntry = {
  group: { id: GROUP_A.id, name: 'Group A' },
  weekday: 'MONDAY',
  start_time: '10:00',
  end_time: '11:00',
  room: { id: MAIN_ROOM.id, name: 'Room 101' },
  teacher: { id: ARBEN.id, first_name: 'Arben', last_name: 'Hoxha' },
  clash: { room: false, teacher: false },
}

const MONDAY_1030_CLASHING: WeeklyScheduleEntry = {
  group: { id: GROUP_B.id, name: 'Group B' },
  weekday: 'MONDAY',
  start_time: '10:30',
  end_time: '11:30',
  room: { id: MAIN_ROOM.id, name: 'Room 101' },
  teacher: null,
  clash: { room: true, teacher: false },
}

const SCHEDULE_PATH = '*/api/organizations/org-1/schedule'

type ServeParams = {
  schedule?: WeeklyScheduleEntry[]
}

const serveSchedule = ({ schedule = [MONDAY_10] }: ServeParams = {}) =>
  server.use(
    http.get(SCHEDULE_PATH, () => HttpResponse.json({ data: schedule })),
    http.get('*/api/organizations/org-1/courses/options', () => HttpResponse.json({ data: [MATHEMATICS] })),
    http.get('*/api/organizations/org-1/academic-periods/years', () => HttpResponse.json({ data: [THIS_YEAR] })),
    http.get('*/api/organizations/org-1/rooms', () => HttpResponse.json({ data: [MAIN_ROOM] })),
    http.get('*/api/organizations/org-1/groups/lecturer-options', () => HttpResponse.json({ data: [ARBEN] })),
    http.get(`*/api/organizations/org-1/groups/${GROUP_A.id}`, () => HttpResponse.json({ data: GROUP_A })),
  )

const signInAsOwner = (params?: ServeParams) => {
  signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
  serveSchedule(params)
}

describe('SchedulePage: the grid', () => {
  it('shows the week’s meetings with their room and teacher', async () => {
    signInAsOwner()
    renderRoute('/dashboard/schedule')

    expect(await screen.findByRole('heading', { level: 1, name: 'Timetable' })).toBeInTheDocument()
    const monday = await screen.findByRole('rowgroup', { name: 'Monday' })
    expect(within(monday).getByText('Group A')).toBeInTheDocument()
    expect(within(monday).getByText('Room 101')).toBeInTheDocument()
    expect(within(monday).getByText('Arben Hoxha')).toBeInTheDocument()
  })

  it('shows “No room assigned” for a group without one', async () => {
    signInAsOwner({ schedule: [{ ...MONDAY_10, room: null }] })
    renderRoute('/dashboard/schedule')

    expect(await screen.findByText('No room assigned')).toBeInTheDocument()
  })

  it('flags a meeting that clashes with another one', async () => {
    signInAsOwner({ schedule: [MONDAY_10, MONDAY_1030_CLASHING] })
    renderRoute('/dashboard/schedule')

    const monday = await screen.findByRole('rowgroup', { name: 'Monday' })
    const clashing = within(monday).getByText('Group B').closest('button')
    expect(clashing).toHaveAttribute('title', expect.stringContaining('room'))
    const clear = within(monday).getByText('Group A').closest('button')
    expect(clear).not.toHaveAttribute('title')
  })

  it('says when there are no meetings yet', async () => {
    signInAsOwner({ schedule: [] })
    renderRoute('/dashboard/schedule')

    expect(await screen.findByText('No meetings yet.')).toBeInTheDocument()
  })

  it('opens the group dialog pre-filled when a meeting is clicked', async () => {
    signInAsOwner()
    const { user } = renderRoute('/dashboard/schedule')

    const monday = await screen.findByRole('rowgroup', { name: 'Monday' })
    await user.click(within(monday).getByText('Group A'))

    const dialog = await screen.findByRole('dialog', { name: 'Edit Group A' })
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Group A')
    expect(within(dialog).getByLabelText(/^Room/)).toHaveValue(MAIN_ROOM.id)
  })
})

describe('SchedulePage: access', () => {
  it('opens from the owner’s sidebar', async () => {
    signInAsOwner()
    renderRoute('/dashboard/schedule')

    await screen.findByRole('heading', { level: 1, name: 'Timetable' })
    expect(within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: 'Timetables' })).toHaveAttribute('href', '/dashboard/schedule')
  })

  it('lets a school admin with MANAGE_SCHEDULES in', async () => {
    signInAs(buildUser({ memberships: [{ ...YLLKA_ADMIN_MEMBERSHIP, permissions: ['MANAGE_SCHEDULES'] }] }))
    serveSchedule()
    renderRoute('/dashboard/schedule')

    await screen.findByRole('heading', { level: 1, name: 'Timetable' })
  })

  it('sends a school admin without MANAGE_SCHEDULES back to the dashboard, and hides it from the sidebar', async () => {
    signInAs(buildUser({ memberships: [YLLKA_ADMIN_MEMBERSHIP] }))
    server.use(http.get('*/api/organizations/org-2/*', () => HttpResponse.json({ data: [] })))
    const { router } = renderRoute('/dashboard/schedule')

    await vi.waitFor(() => expect(router.state.location.pathname).not.toBe('/dashboard/schedule'))
    expect(screen.queryByRole('link', { name: 'Timetables' })).not.toBeInTheDocument()
  })
})
