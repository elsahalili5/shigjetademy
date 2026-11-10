import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { CourseDetail } from '@shigjetademy/shared/courses'
import type { Group } from '@shigjetademy/shared/groups'
import { buildUser, OWNER_MEMBERSHIPS, signInAs, YLLKA_ADMIN_MEMBERSHIP } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const GROUP_A: Group = {
  id: '8d4a6e5e-af5d-4a99-9e7c-4b5cdf5a6b01',
  name: 'Group A',
  capacity: 20,
  status: 'ACTIVE',
  created_at: '2026-10-01T09:00:00.000Z',
  course: { id: '7c1c2f43-0d1e-4c55-9a3e-6b1f0c2a2b01', name: 'Mathematics', status: 'ACTIVE' },
  academic_year: { id: '6c3f5d4d-9e4c-4f88-8d6b-3a4bce4f5a01', name: '2026–27' },
  academic_term: null,
  room: null,
  lecturer: { id: '9e5b7f6f-b06e-4baa-af8d-5c6de06b7c01', first_name: 'Arben', last_name: 'Hoxha', status: 'ACTIVE' },
  lecturer_change: null,
  schedule: [{ weekday: 'MONDAY', start_time: '17:00', end_time: '18:30' }],
  enrolled_count: 18,
}

const MATHEMATICS: CourseDetail = {
  id: GROUP_A.course.id,
  name: 'Mathematics',
  code: 'MATH-1',
  description: 'Algebra and geometry',
  level: 'B2',
  status: 'ACTIVE',
  created_at: '2026-10-01T09:00:00.000Z',
  department: { id: '4a1d3b2b-7c2a-4d66-8b4f-1e2fac2d3e01', name: 'Sciences' },
  groups: [GROUP_A, { ...GROUP_A, id: '8d4a6e5e-af5d-4a99-9e7c-4b5cdf5a6b02', name: 'Old group', status: 'ARCHIVED', academic_year: { id: 'year-0', name: '2025–26' }, lecturer: null, schedule: [], enrolled_count: 0 }],
}

const COURSE_PATH = `*/api/organizations/org-1/courses/${MATHEMATICS.id}`

const COURSE_PAGE_PATH = `/dashboard/courses/${MATHEMATICS.id}`

const serveCourse = (course: CourseDetail = MATHEMATICS) => server.use(http.get(COURSE_PATH, () => HttpResponse.json({ data: course })))

const signInAsOwner = () => signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))

describe('CourseDetailPage', () => {
  it('shows the name, code, level, department, description and status', async () => {
    signInAsOwner()
    serveCourse()
    renderRoute(COURSE_PAGE_PATH)

    expect(await screen.findByRole('heading', { level: 1, name: 'Mathematics' })).toBeInTheDocument()
    const details = screen.getByRole('region', { name: 'Details' })
    expect(within(details).getByText('MATH-1')).toBeInTheDocument()
    expect(within(details).getByText('B2')).toBeInTheDocument()
    expect(within(details).getByText('Sciences')).toBeInTheDocument()
    expect(within(details).getByText('Algebra and geometry')).toBeInTheDocument()
    expect(within(details).getByText('Active')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Courses' })).toHaveAttribute('href', '/dashboard/courses')
    expect(screen.queryByRole('button', { name: /Edit|Archive/ })).not.toBeInTheDocument()
  })

  it('says what isn’t set, and marks an archived course', async () => {
    signInAsOwner()
    serveCourse({ ...MATHEMATICS, code: null, description: null, status: 'ARCHIVED' })
    renderRoute(COURSE_PAGE_PATH)

    const details = await screen.findByRole('region', { name: 'Details' })
    expect(within(details).getByText('No code')).toBeInTheDocument()
    expect(within(details).getByText('No description')).toBeInTheDocument()
    expect(within(details).getByText('Archived')).toBeInTheDocument()
  })

  it('lists its groups with school year, lecturer, schedule and students, marking archived ones', async () => {
    signInAsOwner()
    serveCourse()
    renderRoute(COURSE_PAGE_PATH)

    const table = await screen.findByRole('table', { name: 'Groups' })
    const [groupA, old] = within(table).getAllByRole('row').slice(1)
    expect(groupA).toHaveTextContent('2026–27')
    expect(groupA).toHaveTextContent('Arben Hoxha')
    expect(groupA).toHaveTextContent('Mon 17:00–18:30')
    expect(groupA).toHaveTextContent('18/20')
    expect(within(groupA).getByRole('link', { name: 'Group A' })).toHaveAttribute('href', `/dashboard/groups/${GROUP_A.id}`)
    expect(old).toHaveTextContent('Archived')
    expect(groupA).not.toHaveTextContent('Mathematics')
    expect(groupA).not.toHaveTextContent('Archived')
    expect(within(table).queryByRole('button')).not.toBeInTheDocument()
  })

  it('opens a group’s page from anywhere on its row', async () => {
    signInAsOwner()
    serveCourse()
    server.use(http.get(`*/api/organizations/org-1/groups/${GROUP_A.id}`, () => new Promise<never>(() => {})))
    const { router, user } = renderRoute(COURSE_PAGE_PATH)

    const table = await screen.findByRole('table', { name: 'Groups' })
    await user.click(within(table).getByText('18/20'))

    await vi.waitFor(() => expect(router.state.location.pathname).toBe(`/dashboard/groups/${GROUP_A.id}`))
  })

  it('says when the course has no groups yet', async () => {
    signInAsOwner()
    serveCourse({ ...MATHEMATICS, groups: [] })
    renderRoute(COURSE_PAGE_PATH)

    const groups = await screen.findByRole('region', { name: 'Groups' })
    expect(within(groups).getByText('No groups yet.')).toBeInTheDocument()
  })

  it('says the course isn’t found when the server doesn’t know it', async () => {
    signInAsOwner()
    server.use(http.get(COURSE_PATH, () => HttpResponse.json({ error: 'Course not found' }, { status: 404 })))
    renderRoute(COURSE_PAGE_PATH)

    expect(await screen.findByText('Course not found.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument()
  })

  it('says a malformed id isn’t found', async () => {
    signInAsOwner()
    server.use(http.get('*/api/organizations/org-1/courses/not-a-course', () => HttpResponse.json({ error: 'Validation failed' }, { status: 400 })))
    renderRoute('/dashboard/courses/not-a-course')

    expect(await screen.findByText('Course not found.')).toBeInTheDocument()
  })

  it('shows a skeleton while loading', async () => {
    signInAsOwner()
    server.use(http.get(COURSE_PATH, () => new Promise<never>(() => {})))
    renderRoute(COURSE_PAGE_PATH)

    expect(await screen.findByRole('list', { name: 'Loading' })).toBeInTheDocument()
  })

  it('offers a retry when the course fails to load', async () => {
    signInAsOwner()
    serveCourse()
    // Added last, so it answers first, once
    server.use(http.get(COURSE_PATH, () => HttpResponse.json({ error: 'Down' }, { status: 500 }), { once: true }))
    const { user } = renderRoute(COURSE_PAGE_PATH)

    expect(await screen.findByText('We couldn’t load the course.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Mathematics' })).toBeInTheDocument()
  })

  it('sends a school admin without Courses and groups back to the dashboard', async () => {
    signInAs(buildUser({ memberships: [YLLKA_ADMIN_MEMBERSHIP] }))
    server.use(http.get('*/api/organizations/org-2/*', () => HttpResponse.json({ data: [] })))
    const { router } = renderRoute(COURSE_PAGE_PATH)

    await vi.waitFor(() => expect(router.state.location.pathname).not.toBe(COURSE_PAGE_PATH))
    expect(screen.queryByRole('heading', { level: 1, name: 'Mathematics' })).not.toBeInTheDocument()
  })
})
