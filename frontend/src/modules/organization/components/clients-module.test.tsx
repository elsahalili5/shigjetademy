import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { ClientOrganization } from '@shigjetademy/shared/organization'
import { buildUser, OWNER_MEMBERSHIPS, PLATFORM_ADMIN_ROLES, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const buildClient = (overrides: Partial<ClientOrganization>): ClientOrganization => ({
  id: 'org-1',
  name: 'Oxford Academy',
  type: 'ACADEMY',
  country: 'XK',
  status: 'ACTIVE',
  created_at: '2026-10-01T09:00:00.000Z',
  owner: { id: 'user-2', first_name: 'Arben', last_name: 'Krasniqi', email: 'owner@oxford.test' },
  member_counts: { OWNER: 1, ADMIN: 0, LECTURER: 2, STUDENT: 40, GUARDIAN: 0 },
  ...overrides,
})

const CLIENTS = [
  buildClient({}),
  buildClient({
    id: 'org-2',
    name: 'Yllka Kindergarten',
    type: 'KINDERGARTEN',
    status: 'SUSPENDED',
    owner: null,
    member_counts: { OWNER: 0, ADMIN: 0, LECTURER: 0, STUDENT: 12, GUARDIAN: 9 },
  }),
]

describe('platform admin dashboard', () => {
  it('shows Clients and Statistics instead of the school modules', async () => {
    signInAs(buildUser({ user_roles: PLATFORM_ADMIN_ROLES }))
    server.use(http.get('*/api/organizations', () => HttpResponse.json({ data: CLIENTS })))
    const { router } = renderRoute('/dashboard')

    const sidebar = await screen.findByRole('navigation', { name: 'Modules' })
    expect(within(sidebar).getByRole('link', { name: 'Clients' })).toBeInTheDocument()
    expect(within(sidebar).getByRole('link', { name: 'Statistics' })).toBeInTheDocument()
    expect(within(sidebar).queryByRole('link', { name: 'Students & enrolment' })).not.toBeInTheDocument()
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/clients'))
  })

  it('lists every client and filters by status and search', async () => {
    signInAs(buildUser({ user_roles: PLATFORM_ADMIN_ROLES }))
    server.use(http.get('*/api/organizations', () => HttpResponse.json({ data: CLIENTS })))
    const { user } = renderRoute('/dashboard/clients')

    expect(await screen.findByText('Oxford Academy')).toBeInTheDocument()
    expect(screen.getByText('1 owner · 2 lecturers · 40 students')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Suspended/ }))
    expect(screen.queryByText('Oxford Academy')).not.toBeInTheDocument()
    expect(screen.getByText('Yllka Kindergarten')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /All/ }))
    await user.type(screen.getByRole('searchbox', { name: 'Search clients' }), 'owner@oxford')
    expect(screen.getByText('Oxford Academy')).toBeInTheDocument()
    expect(screen.queryByText('Yllka Kindergarten')).not.toBeInTheDocument()
  })

  it('keeps owners on their own dashboard', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    server.use(
      http.get('*/api/organizations/org-1/overview', () =>
        HttpResponse.json({ data: { counts: { members: 1, admins: 0, pending_invitations: 0 }, pending_invitations: [], activity: [] } }),
      ),
    )
    const { router } = renderRoute('/dashboard/clients')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/overview'))
    const sidebar = await screen.findByRole('navigation', { name: 'Modules' })
    expect(within(sidebar).queryByRole('link', { name: 'Clients' })).not.toBeInTheDocument()
  })
})
