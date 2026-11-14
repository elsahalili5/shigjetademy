import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '@shigjetademy/shared/auth'
import { buildUser, DEFAULT_SETTINGS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'shigjetademy-sidebar-collapsed'

const LECTURER_MEMBERSHIPS: AuthUser['memberships'] = [
  { id: 'membership-8', role: 'LECTURER', permissions: [], organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS } },
]

const serve = () =>
  server.use(
    http.get('*/api/organizations/org-1/me/lecturer', () => HttpResponse.json({ data: { groups: [] } })),
    http.get('*/api/organizations/org-1/my-students', () => HttpResponse.json({ data: [] })),
    http.get('*/api/organizations/org-1/attendance/groups', () => HttpResponse.json({ data: [] })),
  )

const showNarrowScreen = () => {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: query === '(max-width: 860px)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }))
}

afterEach(() => {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }))
  server.resetHandlers()
  localStorage.removeItem(SIDEBAR_COLLAPSED_STORAGE_KEY)
})

describe('the collapsible sidebar', () => {
  it('collapses to its icons, keeps every link reachable, and remembers the choice', async () => {
    signInAs(buildUser({ memberships: LECTURER_MEMBERSHIPS }))
    serve()
    const { user } = renderRoute('/dashboard/my-teaching')

    await user.click(await screen.findByRole('button', { name: 'Collapse sidebar' }))

    const menu = within(screen.getByRole('navigation', { name: 'Modules' }))
    expect(menu.getByRole('link', { name: 'Attendance' })).toHaveAttribute('title', 'Attendance')
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('true')

    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }))

    expect(menu.getByRole('link', { name: 'Attendance' })).not.toHaveAttribute('title')
    expect(localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)).toBe('false')
  })

  it('starts collapsed when the member collapsed it before', async () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, 'true')
    signInAs(buildUser({ memberships: LECTURER_MEMBERSHIPS }))
    serve()
    renderRoute('/dashboard/my-teaching')

    expect(await screen.findByRole('button', { name: 'Expand sidebar' })).toBeInTheDocument()
  })

  it('opens the full sidebar with the Students menu open from the collapsed sidebar', async () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, 'true')
    signInAs(buildUser({ memberships: LECTURER_MEMBERSHIPS }))
    serve()
    const { user } = renderRoute('/dashboard/my-students')

    const toggle = await screen.findByRole('button', { name: 'Students' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Students List' })).not.toBeInTheDocument()

    await user.click(toggle)

    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Students List' })).toHaveAttribute('aria-current', 'page')
  })

  it('opens the full sidebar with Communication open from the collapsed sidebar', async () => {
    localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, 'true')
    signInAs(buildUser({ memberships: LECTURER_MEMBERSHIPS }))
    serve()
    const { user } = renderRoute('/dashboard/my-teaching')

    await user.click(await screen.findByRole('button', { name: 'Communication' }))

    expect(screen.getByRole('button', { name: 'Collapse sidebar' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Inbox' })).toHaveAttribute('href', '/dashboard/inbox')
  })

  it('opens the full sidebar as a drawer from the menu button on a narrow screen, and closes it on a link', async () => {
    showNarrowScreen()
    signInAs(buildUser({ memberships: LECTURER_MEMBERSHIPS }))
    serve()
    const { router, user } = renderRoute('/dashboard/my-teaching')

    const menuButton = await screen.findByRole('button', { name: 'Open menu' })
    expect(menuButton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('navigation', { name: 'Modules' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Collapse sidebar' })).not.toBeInTheDocument()

    await user.click(menuButton)

    const drawer = within(screen.getByRole('dialog', { name: 'Menu' }))
    expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    expect(drawer.getByRole('link', { name: 'Your profile' })).toHaveAttribute('href', '/dashboard/profile')
    expect(drawer.getByRole('button', { name: 'Log out' })).toBeInTheDocument()

    await user.click(drawer.getByRole('link', { name: 'Attendance' }))

    expect(router.state.location.pathname).toBe('/dashboard/attendance')
    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
  })
})
