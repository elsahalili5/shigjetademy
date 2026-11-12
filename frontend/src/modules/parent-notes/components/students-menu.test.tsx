import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it } from 'vitest'
import type { AuthUser } from '@shigjetademy/shared/auth'
import { buildUser, DEFAULT_SETTINGS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const LECTURER_MEMBERSHIPS: AuthUser['memberships'] = [
  { id: 'membership-8', role: 'LECTURER', permissions: [], organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS } },
]

const serve = () =>
  server.use(
    http.get('*/api/organizations/org-1/my-students', () => HttpResponse.json({ data: [] })),
    http.get('*/api/organizations/org-1/my-students/student-1', () => HttpResponse.json({ error: 'Student not found' }, { status: 404 })),
    http.get('*/api/organizations/org-1/parent-notes/groups', () => HttpResponse.json({ data: [] })),
    http.get('*/api/organizations/org-1/parent-notes/conversations', () => HttpResponse.json({ data: [] })),
    http.get('*/api/organizations/org-1/me/lecturer', () => HttpResponse.json({ data: { groups: [] } })),
  )

const signInAsLecturer = () => signInAs(buildUser({ memberships: LECTURER_MEMBERSHIPS }))

afterEach(() => {
  server.resetHandlers()
})

describe('the lecturer’s Students menu', () => {
  it('is closed away from its pages, and opens to Students List and Student Notes', async () => {
    signInAsLecturer()
    serve()
    const { user } = renderRoute('/dashboard/my-teaching')

    const toggle = await screen.findByRole('button', { name: 'Students' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Students List' })).not.toBeInTheDocument()

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Students List' })).toHaveAttribute('href', '/dashboard/my-students')
    expect(screen.getByRole('link', { name: 'Student Notes' })).toHaveAttribute('href', '/dashboard/student-notes')
  })

  it('opens on the existing students page, with Students List the only active item', async () => {
    signInAsLecturer()
    serve()
    renderRoute('/dashboard/my-students')

    const menu = within(await screen.findByRole('navigation', { name: 'Modules' }))
    expect(menu.getByRole('button', { name: 'Students' })).toHaveAttribute('aria-expanded', 'true')
    expect(menu.getByRole('link', { name: 'Students List' })).toHaveAttribute('aria-current', 'page')
    expect(menu.getByRole('link', { name: 'Student Notes' })).not.toHaveAttribute('aria-current')
    expect(await screen.findByRole('heading', { level: 1, name: 'Students' })).toBeInTheDocument()
  })

  it('opens on the notes page, with Student Notes the only active item', async () => {
    signInAsLecturer()
    serve()
    renderRoute('/dashboard/student-notes')

    const menu = within(await screen.findByRole('navigation', { name: 'Modules' }))
    expect(menu.getByRole('button', { name: 'Students' })).toHaveAttribute('aria-expanded', 'true')
    expect(menu.getByRole('link', { name: 'Student Notes' })).toHaveAttribute('aria-current', 'page')
    expect(menu.getByRole('link', { name: 'Students List' })).not.toHaveAttribute('aria-current')
  })

  it('keeps Students List active on a student’s page', async () => {
    signInAsLecturer()
    serve()
    renderRoute('/dashboard/my-students/student-1')

    const menu = within(await screen.findByRole('navigation', { name: 'Modules' }))
    expect(menu.getByRole('link', { name: 'Students List' })).toHaveAttribute('aria-current', 'page')
    expect(menu.getByRole('link', { name: 'Student Notes' })).not.toHaveAttribute('aria-current')
  })

  it('switches between the two pages from the menu', async () => {
    signInAsLecturer()
    serve()
    const { router, user } = renderRoute('/dashboard/my-students')

    await user.click(await screen.findByRole('link', { name: 'Student Notes' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Student notes' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard/student-notes')

    await user.click(screen.getByRole('link', { name: 'Students List' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Students' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard/my-students')
  })

  it('can be closed while on one of its pages', async () => {
    signInAsLecturer()
    serve()
    const { user } = renderRoute('/dashboard/my-students')

    const toggle = await screen.findByRole('button', { name: 'Students' })
    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Students List' })).not.toBeInTheDocument()
  })
})
