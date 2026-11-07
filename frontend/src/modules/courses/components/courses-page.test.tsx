import { fireEvent, screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { courseSchema } from '@shigjetademy/shared/courses'
import type { Course, CoursePage, CourseStatus } from '@shigjetademy/shared/courses'
import type { OrganizationDepartment } from '@shigjetademy/shared/location'
import { buildUser, OWNER_MEMBERSHIPS, signInAs, YLLKA_ADMIN_MEMBERSHIP } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const SCIENCES: OrganizationDepartment = { id: '4a1d3b2b-7c2a-4d66-8b4f-1e2fac2d3e01', name: 'Sciences', description: null, location_id: null, created_at: '2026-09-01T09:00:00.000Z' }

const MATHEMATICS: Course = {
  id: '7c1c2f43-0d1e-4c55-9a3e-6b1f0c2a2b01',
  name: 'Mathematics',
  code: 'MATH-1',
  description: 'Algebra and geometry',
  level: 'B2',
  status: 'ACTIVE',
  created_at: '2026-10-01T09:00:00.000Z',
  department: { id: SCIENCES.id, name: 'Sciences' },
}

const ENGLISH: Course = { ...MATHEMATICS, id: '7c1c2f43-0d1e-4c55-9a3e-6b1f0c2a2b02', name: 'English', code: null, description: null, level: 'A1' }

const COURSES_PATH = '*/api/organizations/org-1/courses'

type ServeParams = {
  active?: Course[]
  archived?: Course[]
}

/** Answers the list like the server: by status, narrowed by the search, with both counts */
const serveCourses = ({ active = [MATHEMATICS], archived = [] }: ServeParams = {}) => {
  const requests: URLSearchParams[] = []
  server.use(
    http.get(COURSES_PATH, ({ request }) => {
      const params = new URL(request.url).searchParams
      requests.push(params)
      const search = (params.get('search') ?? '').toLowerCase()
      const matches = (courses: Course[]) => courses.filter((course) => `${course.name} ${course.code ?? ''} ${course.level}`.toLowerCase().includes(search))
      const byStatus: Record<CourseStatus, Course[]> = { ACTIVE: matches(active), ARCHIVED: matches(archived) }
      const status = params.get('status') === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE'
      const page: CoursePage = { courses: byStatus[status], total: byStatus[status].length, counts: { ACTIVE: byStatus.ACTIVE.length, ARCHIVED: byStatus.ARCHIVED.length } }
      return HttpResponse.json({ data: page })
    }),
  )
  return requests
}

const serveDepartments = (organizationId = 'org-1', departments = [SCIENCES]) => server.use(http.get(`*/api/organizations/${organizationId}/departments`, () => HttpResponse.json({ data: departments })))

const signInAsOwner = (params?: ServeParams) => {
  signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
  serveDepartments()
  return serveCourses(params)
}

const rowsOf = async () => within(await screen.findByRole('table', { name: 'Courses' })).getAllByRole('row').slice(1)

describe('CoursesPage: list', () => {
  it('lists courses with their code, level and department', async () => {
    signInAsOwner({ active: [ENGLISH, MATHEMATICS] })
    renderRoute('/dashboard/courses')

    expect(await screen.findByRole('heading', { level: 1, name: 'Courses' })).toBeInTheDocument()
    const [english, mathematics] = await rowsOf()
    expect(english).toHaveTextContent('English')
    expect(mathematics).toHaveTextContent('Mathematics')
    expect(mathematics).toHaveTextContent('MATH-1')
    expect(mathematics).toHaveTextContent('B2')
    expect(mathematics).toHaveTextContent('Sciences')
  })

  it('shows skeleton rows while loading', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serveDepartments()
    server.use(http.get(COURSES_PATH, () => new Promise<never>(() => {})))
    renderRoute('/dashboard/courses')

    expect(await screen.findByRole('list', { name: 'Loading' })).toBeInTheDocument()
  })

  it('says there are no courses yet and offers to add one', async () => {
    signInAsOwner({ active: [] })
    const { user } = renderRoute('/dashboard/courses')

    expect(await screen.findByText('No courses yet.')).toBeInTheDocument()
    const [, addFromEmptyState] = screen.getAllByRole('button', { name: 'Add course' })
    await user.click(addFromEmptyState)
    expect(screen.getByRole('dialog', { name: 'Add a course' })).toBeVisible()
  })

  it('asks for a department first when there are none, and links to them', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serveDepartments('org-1', [])
    serveCourses({ active: [] })
    renderRoute('/dashboard/courses')

    expect(await screen.findByText('Add a department first.')).toBeInTheDocument()
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Go to Locations and departments' })).toHaveAttribute('href', '/dashboard/locations')
    expect(screen.queryByRole('button', { name: 'Add course' })).not.toBeInTheDocument()
  })

  it('tells a school admin to ask the owner when there are no departments, without a link', async () => {
    signInAs(buildUser({ memberships: [{ ...YLLKA_ADMIN_MEMBERSHIP, permissions: ['MANAGE_COURSES'] }] }))
    serveDepartments('org-2', [])
    server.use(http.get('*/api/organizations/org-2/courses', () => HttpResponse.json({ data: { courses: [], total: 0, counts: { ACTIVE: 0, ARCHIVED: 0 } } })))
    renderRoute('/dashboard/courses')

    expect(await screen.findByText('No departments yet.')).toBeInTheDocument()
    expect(screen.getByText('Ask the owner to add one, then you can add courses.')).toBeInTheDocument()
    expect(screen.queryByText('Add a department first.')).not.toBeInTheDocument()
    expect(within(screen.getByRole('main')).queryByRole('link', { name: 'Go to Locations and departments' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add course' })).not.toBeInTheDocument()
  })

  it('offers a retry when the departments fail to load', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serveCourses({ active: [MATHEMATICS] })
    server.use(http.get('*/api/organizations/org-1/departments', () => HttpResponse.json({ error: 'Failed to fetch departments' }, { status: 500 })))
    const { user } = renderRoute('/dashboard/courses')

    expect(await screen.findByText('We couldn’t load the courses.')).toBeInTheDocument()
    serveDepartments()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Mathematics')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add course' })).toBeInTheDocument()
  })

  it('offers a retry when the list fails to load', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serveDepartments()
    server.use(http.get(COURSES_PATH, () => HttpResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })))
    const { user } = renderRoute('/dashboard/courses')

    expect(await screen.findByText('We couldn’t load the courses.')).toBeInTheDocument()
    serveCourses()
    await user.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Mathematics')).toBeInTheDocument()
  })
})

describe('CoursesPage: opening a course', () => {
  it('links the course’s name to its page', async () => {
    signInAsOwner()
    renderRoute('/dashboard/courses')

    const [mathematics] = await rowsOf()
    expect(within(mathematics).getByRole('link', { name: 'Mathematics' })).toHaveAttribute('href', `/dashboard/courses/${MATHEMATICS.id}`)
  })

  it('opens the course’s page from anywhere on its row', async () => {
    signInAsOwner()
    server.use(http.get(`${COURSES_PATH}/${MATHEMATICS.id}`, () => new Promise<never>(() => {})))
    const { router, user } = renderRoute('/dashboard/courses')

    const [mathematics] = await rowsOf()
    await user.click(within(mathematics).getByText('B2'))

    await vi.waitFor(() => expect(router.state.location.pathname).toBe(`/dashboard/courses/${MATHEMATICS.id}`))
  })

  it('leaves a modifier click on the row to the browser, so it doesn’t take over the tab', async () => {
    signInAsOwner()
    const { router, user } = renderRoute('/dashboard/courses')

    const [mathematics] = await rowsOf()
    for (const key of ['Meta', 'Control', 'Shift', 'Alt']) {
      await user.keyboard(`{${key}>}`)
      await user.click(within(mathematics).getByText('B2'))
      await user.keyboard(`{/${key}}`)
    }

    expect(router.state.location.pathname).toBe('/dashboard/courses')
  })

  it('doesn’t open the page when the click ends a text selection', async () => {
    signInAsOwner()
    const { router } = renderRoute('/dashboard/courses')

    const [mathematics] = await rowsOf()
    const level = within(mathematics).getByText('B2')
    window.getSelection()?.selectAllChildren(level)
    fireEvent.click(level)
    window.getSelection()?.removeAllRanges()

    expect(router.state.location.pathname).toBe('/dashboard/courses')
  })

  it('doesn’t open the page from the row’s actions', async () => {
    signInAsOwner()
    const { router, user } = renderRoute('/dashboard/courses')

    const [mathematics] = await rowsOf()
    await user.click(within(mathematics).getByRole('button', { name: 'Edit Mathematics' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(within(mathematics).getByRole('button', { name: 'Archive Mathematics' }))
    await user.click(within(mathematics).getByRole('button', { name: 'Cancel' }))

    expect(router.state.location.pathname).toBe('/dashboard/courses')
  })
})

describe('CoursesPage: add', () => {
  it('adds Mathematics with every field and shows it in the list', async () => {
    signInAsOwner({ active: [ENGLISH] })
    let sent: unknown
    server.use(
      http.post(COURSES_PATH, async ({ request }) => {
        sent = courseSchema.parse(await request.json())
        serveCourses({ active: [ENGLISH, MATHEMATICS] })
        return HttpResponse.json({ data: MATHEMATICS }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/courses')

    await user.click(await screen.findByRole('button', { name: 'Add course' }))
    const dialog = screen.getByRole('dialog', { name: 'Add a course' })
    await user.type(within(dialog).getByLabelText('Name'), 'Mathematics')
    await user.type(within(dialog).getByLabelText('Code (optional)'), 'MATH-1')
    await user.type(within(dialog).getByLabelText('Level'), 'B2')
    await user.type(within(dialog).getByLabelText('Description (optional)'), 'Algebra and geometry')
    await user.selectOptions(within(dialog).getByLabelText('Department'), 'Sciences')
    await user.click(within(dialog).getByRole('button', { name: 'Add course' }))

    expect(await screen.findByText('Added Mathematics.')).toBeInTheDocument()
    expect(sent).toEqual({ name: 'Mathematics', code: 'MATH-1', level: 'B2', description: 'Algebra and geometry', department_id: SCIENCES.id })
    expect(dialog).not.toBeVisible()
    expect(await screen.findByText('Mathematics')).toBeInTheDocument()
  })

  it('asks for the name before sending', async () => {
    signInAsOwner({ active: [] })
    const { user } = renderRoute('/dashboard/courses')

    await user.click((await screen.findAllByRole('button', { name: 'Add course' }))[0])
    const dialog = screen.getByRole('dialog', { name: 'Add a course' })
    await user.click(within(dialog).getByRole('button', { name: 'Add course' }))

    expect(await within(dialog).findByText('Enter the course name.')).toBeInTheDocument()
  })

  it('asks for the level and the department before sending', async () => {
    signInAsOwner({ active: [] })
    let isSent = false
    server.use(
      http.post(COURSES_PATH, () => {
        isSent = true
        return HttpResponse.json({ data: MATHEMATICS }, { status: 201 })
      }),
    )
    const { user } = renderRoute('/dashboard/courses')

    await user.click((await screen.findAllByRole('button', { name: 'Add course' }))[0])
    const dialog = screen.getByRole('dialog', { name: 'Add a course' })
    await user.type(within(dialog).getByLabelText('Name'), 'Mathematics')
    await user.click(within(dialog).getByRole('button', { name: 'Add course' }))

    expect(await within(dialog).findByLabelText('Level')).toHaveAccessibleDescription('Enter the course level.')
    expect(within(dialog).getByLabelText('Department')).toHaveAccessibleDescription('Choose a department.')
    expect(isSent).toBe(false)
  })

  it('marks the name, level and department as required', async () => {
    signInAsOwner({ active: [] })
    const { user } = renderRoute('/dashboard/courses')

    await user.click((await screen.findAllByRole('button', { name: 'Add course' }))[0])
    const dialog = screen.getByRole('dialog', { name: 'Add a course' })

    expect(within(dialog).getByLabelText('Name')).toBeRequired()
    expect(within(dialog).getByLabelText('Level')).toBeRequired()
    expect(within(dialog).getByLabelText('Department')).toBeRequired()
    expect(within(dialog).getByLabelText('Code (optional)')).not.toBeRequired()
    expect(within(dialog).getByLabelText('Description (optional)')).not.toBeRequired()
  })

  it('shows a taken code under its field', async () => {
    signInAsOwner({ active: [] })
    const message = 'There is already a course with this code.'
    server.use(http.post(COURSES_PATH, () => HttpResponse.json({ error: message, details: { formErrors: [], fieldErrors: { code: [message] } } }, { status: 409 })))
    const { user } = renderRoute('/dashboard/courses')

    await user.click((await screen.findAllByRole('button', { name: 'Add course' }))[0])
    const dialog = screen.getByRole('dialog', { name: 'Add a course' })
    await user.type(within(dialog).getByLabelText('Name'), 'Algebra')
    await user.type(within(dialog).getByLabelText('Code (optional)'), 'MATH-1')
    await user.type(within(dialog).getByLabelText('Level'), 'B2')
    await user.selectOptions(within(dialog).getByLabelText('Department'), 'Sciences')
    await user.click(within(dialog).getByRole('button', { name: 'Add course' }))

    expect(await within(dialog).findByLabelText('Code (optional)')).toHaveAccessibleDescription(message)
  })
})

describe('CoursesPage: access', () => {
  it('lets a school admin with Courses and groups in, with Courses in the sidebar', async () => {
    signInAs(buildUser({ memberships: [{ ...YLLKA_ADMIN_MEMBERSHIP, permissions: ['MANAGE_COURSES'] }] }))
    serveDepartments('org-2')
    server.use(http.get('*/api/organizations/org-2/courses', () => HttpResponse.json({ data: { courses: [MATHEMATICS], total: 1, counts: { ACTIVE: 1, ARCHIVED: 0 } } })))
    renderRoute('/dashboard/courses')

    expect(await screen.findByText('Mathematics')).toBeInTheDocument()
    expect(within(screen.getByRole('navigation', { name: 'Modules' })).getByRole('link', { name: 'Courses' })).toHaveAttribute('href', '/dashboard/courses')
  })

  it('sends a school admin without Courses and groups back to the dashboard, and hides it from the sidebar', async () => {
    signInAs(buildUser({ memberships: [YLLKA_ADMIN_MEMBERSHIP] }))
    server.use(http.get('*/api/organizations/org-2/*', () => HttpResponse.json({ data: [] })))
    const { router } = renderRoute('/dashboard/courses')

    await vi.waitFor(() => expect(router.state.location.pathname).not.toBe('/dashboard/courses'))
    expect(screen.queryByRole('link', { name: 'Courses' })).not.toBeInTheDocument()
  })

  it('opens from the owner’s sidebar', async () => {
    signInAsOwner()
    renderRoute('/dashboard/courses')

    const sidebar = await screen.findByRole('navigation', { name: 'Modules' })
    expect(within(sidebar).getByRole('link', { name: 'Courses' })).toHaveAttribute('href', '/dashboard/courses')
  })
})

describe('CoursesPage: search and tabs', () => {
  it('finds a course by searching, and the tab counts follow the search', async () => {
    const requests = signInAsOwner({ active: [ENGLISH, MATHEMATICS], archived: [{ ...ENGLISH, id: '7c1c2f43-0d1e-4c55-9a3e-6b1f0c2a2b03', name: 'Applied mathematics', status: 'ARCHIVED' }] })
    const { user } = renderRoute('/dashboard/courses')
    await screen.findByText('English')
    expect(screen.getByRole('tab', { name: 'Active 2' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Archived 1' })).toBeInTheDocument()

    await user.type(screen.getByRole('searchbox', { name: 'Search courses' }), 'english')

    await vi.waitFor(() => expect(screen.queryByText('Mathematics')).not.toBeInTheDocument())
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(requests.at(-1)?.get('search')).toBe('english')
    expect(screen.getByRole('tab', { name: 'Active 1' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Archived 0' })).toBeInTheDocument()
  })

  it('says when nothing matches the search', async () => {
    signInAsOwner({ active: [MATHEMATICS] })
    const { user } = renderRoute('/dashboard/courses')
    await screen.findByText('Mathematics')

    await user.type(screen.getByRole('searchbox', { name: 'Search courses' }), 'zzz')

    expect(await screen.findByText('No courses match.')).toBeInTheDocument()
  })

  it('shows the archived courses on their own tab, with an empty state when there are none', async () => {
    signInAsOwner({ active: [MATHEMATICS], archived: [] })
    const { user } = renderRoute('/dashboard/courses')
    await screen.findByText('Mathematics')

    await user.click(screen.getByRole('tab', { name: 'Archived 0' }))

    expect(await screen.findByText('No archived courses.')).toBeInTheDocument()
  })
})

describe('CoursesPage: edit', () => {
  it('opens with the course’s values and saves the change', async () => {
    signInAsOwner({ active: [MATHEMATICS] })
    let sent: unknown
    server.use(
      http.put(`${COURSES_PATH}/${MATHEMATICS.id}`, async ({ request }) => {
        sent = courseSchema.parse(await request.json())
        return HttpResponse.json({ data: { ...MATHEMATICS, level: 'C1' } })
      }),
    )
    const { user } = renderRoute('/dashboard/courses')

    await user.click(await screen.findByRole('button', { name: 'Edit Mathematics' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Mathematics' })
    expect(within(dialog).getByLabelText('Name')).toHaveValue('Mathematics')
    expect(within(dialog).getByLabelText('Code (optional)')).toHaveValue('MATH-1')
    expect(within(dialog).getByLabelText('Department')).toHaveValue(SCIENCES.id)
    await user.clear(within(dialog).getByLabelText('Level'))
    await user.type(within(dialog).getByLabelText('Level'), 'C1')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saved Mathematics.')).toBeInTheDocument()
    expect(sent).toEqual({ name: 'Mathematics', code: 'MATH-1', level: 'C1', description: 'Algebra and geometry', department_id: SCIENCES.id })
    expect(dialog).not.toBeVisible()
  })
})

describe('CoursesPage: reopening the edit dialog', () => {
  it('drops unsaved values and an old server error after cancel', async () => {
    signInAsOwner({ active: [MATHEMATICS] })
    const message = 'There is already a course with this name.'
    server.use(http.put(`${COURSES_PATH}/${MATHEMATICS.id}`, () => HttpResponse.json({ error: message, details: { formErrors: [], fieldErrors: { name: [message] } } }, { status: 409 })))
    const { user } = renderRoute('/dashboard/courses')

    await user.click(await screen.findByRole('button', { name: 'Edit Mathematics' }))
    const dialog = screen.getByRole('dialog', { name: 'Edit Mathematics' })
    await user.clear(within(dialog).getByLabelText('Name'))
    await user.type(within(dialog).getByLabelText('Name'), 'Algebra')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    expect(await within(dialog).findByLabelText('Name')).toHaveAccessibleDescription(message)
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await user.click(screen.getByRole('button', { name: 'Edit Mathematics' }))

    const reopened = screen.getByRole('dialog', { name: 'Edit Mathematics' })
    expect(within(reopened).getByLabelText('Name')).toHaveValue('Mathematics')
    expect(within(reopened).getByLabelText('Name')).not.toHaveAccessibleDescription(message)
    expect(within(reopened).queryByText(message)).not.toBeInTheDocument()
  })
})

describe('CoursesPage: archive and restore', () => {
  it('archives after one confirmation', async () => {
    signInAsOwner({ active: [MATHEMATICS] })
    server.use(
      http.post(`${COURSES_PATH}/${MATHEMATICS.id}/archive`, () => {
        serveCourses({ active: [], archived: [{ ...MATHEMATICS, status: 'ARCHIVED' }] })
        return HttpResponse.json({ data: { ...MATHEMATICS, status: 'ARCHIVED' } })
      }),
    )
    const { user } = renderRoute('/dashboard/courses')

    await user.click(await screen.findByRole('button', { name: 'Archive Mathematics' }))
    await user.click(within(screen.getByRole('group', { name: 'Archive Mathematics' })).getByRole('button', { name: 'Archive' }))

    expect(await screen.findByText('Archived Mathematics.')).toBeInTheDocument()
    expect(await screen.findByRole('tab', { name: 'Archived 1' })).toBeInTheDocument()
    expect(screen.getByText('No courses yet.')).toBeInTheDocument()
  })

  it('warns that archiving takes the course’s groups along', async () => {
    signInAsOwner({ active: [MATHEMATICS] })
    const { user } = renderRoute('/dashboard/courses')

    await user.click(await screen.findByRole('button', { name: 'Archive Mathematics' }))

    expect(within(screen.getByRole('group', { name: 'Archive Mathematics' })).getByText('Its active groups are archived too.')).toBeInTheDocument()
  })

  it('warns that restoring leaves the course’s groups archived', async () => {
    signInAsOwner({ active: [], archived: [{ ...MATHEMATICS, status: 'ARCHIVED' }] })
    const { user } = renderRoute('/dashboard/courses')

    await user.click(await screen.findByRole('tab', { name: 'Archived 1' }))
    await user.click(await screen.findByRole('button', { name: 'Restore Mathematics' }))

    expect(within(screen.getByRole('group', { name: 'Restore Mathematics' })).getByText('Its groups stay archived.')).toBeInTheDocument()
  })

  it('restores an archived course', async () => {
    const archived: Course = { ...MATHEMATICS, status: 'ARCHIVED' }
    signInAsOwner({ active: [], archived: [archived] })
    server.use(
      http.post(`${COURSES_PATH}/${MATHEMATICS.id}/restore`, () => {
        serveCourses({ active: [MATHEMATICS], archived: [] })
        return HttpResponse.json({ data: MATHEMATICS })
      }),
    )
    const { user } = renderRoute('/dashboard/courses')

    await user.click(await screen.findByRole('tab', { name: 'Archived 1' }))
    await user.click(await screen.findByRole('button', { name: 'Restore Mathematics' }))
    await user.click(within(screen.getByRole('group', { name: 'Restore Mathematics' })).getByRole('button', { name: 'Restore' }))

    expect(await screen.findByText('Restored Mathematics.')).toBeInTheDocument()
  })

  it('shows the server’s reason when archiving fails', async () => {
    signInAsOwner({ active: [MATHEMATICS] })
    server.use(http.post(`${COURSES_PATH}/${MATHEMATICS.id}/archive`, () => HttpResponse.json({ error: 'This course is already archived.' }, { status: 409 })))
    const { user } = renderRoute('/dashboard/courses')

    await user.click(await screen.findByRole('button', { name: 'Archive Mathematics' }))
    await user.click(within(screen.getByRole('group', { name: 'Archive Mathematics' })).getByRole('button', { name: 'Archive' }))

    expect(await screen.findByText('This course is already archived.')).toBeInTheDocument()
  })
})
