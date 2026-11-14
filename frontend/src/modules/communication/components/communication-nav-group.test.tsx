import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { MemberRole } from '@shigjetademy/shared/auth'
import { buildUser, DEFAULT_SETTINGS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const signInWithRole = (role: MemberRole) =>
  signInAs(buildUser({ memberships: [{ id: 'membership-1', role, permissions: [], organization: { id: 'org-1', name: 'Oxford Academy', type: 'ACADEMY', status: 'ACTIVE', ...DEFAULT_SETTINGS } }] }))

const serveDiscussions = () => {
  server.use(http.get('*/api/organizations/org-1/discussions', () => HttpResponse.json({ data: [] })), http.get('*/api/organizations/org-1/discussions/spaces', () => HttpResponse.json({ data: [] })))
}

const serveAnnouncements = () => server.use(http.get('*/api/organizations/org-1/announcements', () => HttpResponse.json({ data: [] })))

const serveUnreadCount = (count: number) => server.use(http.get('*/api/organizations/org-1/inbox/unread-count', () => HttpResponse.json({ data: { unread_count: count } })))

const ROLES: [string, MemberRole][] = [
  ['an owner', 'OWNER'],
  ['a school admin', 'ADMIN'],
  ['a lecturer', 'LECTURER'],
  ['a student', 'STUDENT'],
  ['a guardian', 'GUARDIAN'],
]

describe('the sidebar’s Communication group', () => {
  it.each(ROLES)('has an expandable Communication group for %s, closed away from its pages', async (_name, role) => {
    signInWithRole(role)
    // An owner's overview is the page they land on; everyone else's pages need data, so start on a page that needs none of it
    const { user } = renderRoute('/dashboard/profile')

    const button = await screen.findByRole('button', { name: 'Communication' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Inbox' })).not.toBeInTheDocument()

    await user.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'true')
    const group = screen.getByRole('group', { name: 'Communication' })
    expect(within(group).getByRole('link', { name: 'Inbox' })).toHaveAttribute('href', '/dashboard/inbox')
    expect(within(group).getByRole('link', { name: 'Announcements' })).toHaveAttribute('href', '/dashboard/announcements')
    const discussions = within(group).queryByRole('link', { name: 'Groups & Discussions' })
    // Guardians take no part in discussions
    if (role === 'GUARDIAN') expect(discussions).not.toBeInTheDocument()
    else expect(discussions).toHaveAttribute('href', '/dashboard/discussions')

    await user.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Inbox' })).not.toBeInTheDocument()
  })

  it('opens by itself on a Communication page and marks the page as current', async () => {
    signInWithRole('LECTURER')
    serveAnnouncements()
    renderRoute('/dashboard/announcements')

    expect(await screen.findByRole('button', { name: 'Communication' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('link', { name: 'Announcements' })).toHaveAttribute('aria-current', 'page')
  })

  it('replaces the owner’s old Messages item', async () => {
    signInWithRole('OWNER')
    serveAnnouncements()
    renderRoute('/dashboard/announcements')

    await screen.findByRole('button', { name: 'Communication' })
    expect(screen.queryByRole('link', { name: 'Messages' })).not.toBeInTheDocument()
  })

  it('shows the unread count on Inbox, and on the closed group', async () => {
    signInWithRole('GUARDIAN')
    serveUnreadCount(3)
    const { user } = renderRoute('/dashboard/profile')

    const button = await screen.findByRole('button', { name: /Communication/ })
    expect(await within(button).findByLabelText('3 unread messages')).toBeInTheDocument()
    await user.click(button)

    expect(within(screen.getByRole('link', { name: /Inbox/ })).getByLabelText('3 unread messages')).toBeInTheDocument()
  })

  it('adds the unread announcements and topics to the closed group’s badge', async () => {
    signInWithRole('STUDENT')
    serveUnreadCount(1)
    server.use(
      http.get('*/api/organizations/org-1/announcements/unread-count', () => HttpResponse.json({ data: { unread_count: 2 } })),
      http.get('*/api/organizations/org-1/discussions/unread-count', () => HttpResponse.json({ data: { unread_count: 4 } })),
    )
    const { user } = renderRoute('/dashboard/profile')

    const button = await screen.findByRole('button', { name: /Communication/ })
    expect(await within(button).findByLabelText('7 unread')).toBeInTheDocument()
    await user.click(button)

    expect(within(screen.getByRole('link', { name: /Inbox/ })).getByLabelText('1 unread messages')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /Announcements/ })).getByLabelText('2 unread announcements')).toBeInTheDocument()
    expect(within(screen.getByRole('link', { name: /Groups & Discussions/ })).getByLabelText('4 unread topics')).toBeInTheDocument()
  })

  it('counts unread topics alone on the closed group', async () => {
    signInWithRole('LECTURER')
    server.use(http.get('*/api/organizations/org-1/discussions/unread-count', () => HttpResponse.json({ data: { unread_count: 3 } })))
    renderRoute('/dashboard/profile')

    const button = await screen.findByRole('button', { name: /Communication/ })

    expect(await within(button).findByLabelText('3 unread')).toBeInTheDocument()
  })

  it('counts nothing from discussions for a guardian', async () => {
    signInWithRole('GUARDIAN')
    server.use(http.get('*/api/organizations/org-1/discussions/unread-count', () => HttpResponse.json({ data: { unread_count: 9 } })))
    renderRoute('/dashboard/profile')

    await screen.findByRole('button', { name: 'Communication' })

    expect(screen.queryByLabelText(/unread/)).not.toBeInTheDocument()
  })

  it('shows no badge when nothing is unread', async () => {
    signInWithRole('STUDENT')
    const { user } = renderRoute('/dashboard/profile')

    await user.click(await screen.findByRole('button', { name: 'Communication' }))

    expect(screen.queryByLabelText(/unread messages/)).not.toBeInTheDocument()
  })

  it('opens Inbox from the group', async () => {
    signInWithRole('ADMIN')
    server.use(http.get('*/api/organizations/org-1/inbox/conversations', () => HttpResponse.json({ data: [] })))
    const { user, router } = renderRoute('/dashboard/profile')

    await user.click(await screen.findByRole('button', { name: 'Communication' }))
    await user.click(screen.getByRole('link', { name: 'Inbox' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard/inbox')
  })
})

describe('the communication pages', () => {
  it.each(ROLES.filter(([, role]) => role !== 'GUARDIAN'))('opens Groups & Discussions as a page of its own for %s', async (_name, role) => {
    signInWithRole(role)
    serveDiscussions()
    const { user } = renderRoute('/dashboard/profile')

    await user.click(await screen.findByRole('button', { name: 'Communication' }))
    await user.click(screen.getByRole('link', { name: 'Groups & Discussions' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Groups & Discussions' })).toBeInTheDocument()
    expect(await screen.findByText('You are not in a group or course yet.')).toBeInTheDocument()
    expect(screen.queryByText('Coming soon.')).not.toBeInTheDocument()
  })

  it.each(ROLES)('opens Announcements as a page of its own for %s', async (_name, role) => {
    signInWithRole(role)
    serveAnnouncements()
    renderRoute('/dashboard/announcements')

    expect(await screen.findByRole('heading', { level: 1, name: 'Announcements' })).toBeInTheDocument()
    expect(await screen.findByText('No announcements yet.')).toBeInTheDocument()
    expect(screen.queryByText('Coming soon.')).not.toBeInTheDocument()
  })

  it('sends the old Messages module to the Inbox', async () => {
    signInWithRole('ADMIN')
    server.use(http.get('*/api/organizations/org-1/inbox/conversations', () => HttpResponse.json({ data: [] })))
    const { router } = renderRoute('/dashboard/messages')

    expect(await screen.findByRole('heading', { level: 1, name: 'Inbox' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard/inbox')
  })
})
