import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '@shigjetademy/shared/auth'
import type { MySchool } from '@shigjetademy/shared/students'
import { buildUser, DEFAULT_SETTINGS, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const membershipOf = (role: AuthUser['memberships'][number]['role']): AuthUser['memberships'] => [
  { id: 'membership-5', role, permissions: [], organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS } },
]

const MY_SCHOOL: MySchool = {
  organization: { id: 'org-1', name: 'Oxford Academy' },
  student: { first_name: 'Alba', last_name: 'Gashi', student_number: 'STU-0001' },
  academic_year: null,
  term: null,
  groups: [],
  rescheduled_lessons: [],
}

const serveHomes = () =>
  server.use(
    http.get('*/api/organizations/org-1/me/children', () => HttpResponse.json({ data: [] })),
    http.get('*/api/organizations/org-1/me/student', () => HttpResponse.json({ data: MY_SCHOOL })),
    http.get('*/api/organizations/org-1/*', () => HttpResponse.json({ data: [] })),
  )

const signInAsGuardian = () => {
  signInAs(buildUser({ memberships: membershipOf('GUARDIAN') }))
  serveHomes()
}

describe('guardian access', () => {
  it('lands a guardian on My children, with it in the sidebar and no staff pages', async () => {
    signInAsGuardian()
    const { router } = renderRoute('/dashboard')

    expect(await screen.findByRole('heading', { level: 1, name: 'My children' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard/my-children')
    const sidebar = screen.getByRole('navigation', { name: 'Modules' })
    expect(within(sidebar).getByRole('link', { name: 'My children' })).toBeInTheDocument()
    expect(within(sidebar).queryByRole('link', { name: 'Students' })).not.toBeInTheDocument()
    expect(within(sidebar).queryByRole('link', { name: 'Courses' })).not.toBeInTheDocument()
  })

  it.each(['/dashboard/students', '/dashboard/lecturers', '/dashboard/groups', '/dashboard/attendance', '/dashboard/locations', '/dashboard/overview', '/dashboard/courses', '/dashboard/schedule', '/dashboard/lessons'])(
    'sends a guardian opening %s back to My children',
    async (path) => {
      signInAsGuardian()
      const { router } = renderRoute(path)

      await vi.waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/my-children'))
    },
  )

  it('keeps a guardian out of the school modules that are only a sidebar entry', async () => {
    signInAsGuardian()
    const { router } = renderRoute('/dashboard/payments')

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/my-children'))
  })

  it('sends someone who isn’t a guardian away from My children', async () => {
    signInAs(buildUser({ memberships: membershipOf('STUDENT') }))
    serveHomes()
    const { router } = renderRoute('/dashboard/my-children')

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/my-school'))
  })

  it('leaves the other roles’ homes as they were', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serveHomes()
    const { router } = renderRoute('/dashboard')

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/overview'))
  })

  it('still lands a student on My school', async () => {
    signInAs(buildUser({ memberships: membershipOf('STUDENT') }))
    serveHomes()
    const { router } = renderRoute('/dashboard')

    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/my-school'))
  })
})
