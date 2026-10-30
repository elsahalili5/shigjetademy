import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { ClientOrganization, ClientOrganizationDetail } from '@shigjetademy/shared/organization'
import { buildUser, OWNER_MEMBERSHIPS, PLATFORM_ADMIN_ROLES, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const CLIENT: ClientOrganizationDetail = {
  id: 'org-1',
  name: 'Oxford Academy',
  type: 'ACADEMY',
  country: 'XK',
  currency: 'EUR',
  size: '50–250 students',
  status: 'ACTIVE',
  created_at: '2026-10-01T09:00:00.000Z',
  member_counts: { OWNER: 1, ADMIN: 0, LECTURER: 1, STUDENT: 0, GUARDIAN: 0 },
  members: [
    { membership_id: 'm-1', id: 'u-1', first_name: 'Arben', last_name: 'Krasniqi', email: 'owner@oxford.test', role: 'OWNER', joined_at: '2026-10-01T09:00:00.000Z' },
    { membership_id: 'm-2', id: 'u-2', first_name: 'Leon', last_name: 'Hoxha', email: 'lecturer@oxford.test', role: 'LECTURER', joined_at: '2026-10-02T09:00:00.000Z' },
  ],
  pending_invitations: [],
}

const LIST_ITEM: ClientOrganization = {
  id: CLIENT.id,
  name: CLIENT.name,
  type: CLIENT.type,
  country: CLIENT.country,
  status: CLIENT.status,
  created_at: CLIENT.created_at,
  owner: { id: 'u-1', first_name: 'Arben', last_name: 'Krasniqi', email: 'owner@oxford.test' },
  member_counts: CLIENT.member_counts,
}

const signInAsAdmin = () => signInAs(buildUser({ user_roles: PLATFORM_ADMIN_ROLES }))

describe('ClientDetail', () => {
  it('opens from the clients list and shows the members with their roles', async () => {
    signInAsAdmin()
    server.use(
      http.get('*/api/organizations', () => HttpResponse.json({ data: [LIST_ITEM] })),
      http.get('*/api/organizations/org-1', () => HttpResponse.json({ data: CLIENT })),
    )
    const { user } = renderRoute('/dashboard/clients')

    await user.click(await screen.findByRole('link', { name: 'Oxford Academy' }))

    expect(await screen.findByRole('heading', { name: 'Oxford Academy' })).toBeInTheDocument()
    const members = screen.getByRole('region', { name: 'Members' })
    expect(within(members).getByText('owner@oxford.test')).toBeInTheDocument()
    expect(within(members).getByText('Lecturer')).toBeInTheDocument()
  })

  it('suspends the client only after confirming', async () => {
    signInAsAdmin()
    server.use(
      http.get('*/api/organizations/org-1', () => HttpResponse.json({ data: CLIENT })),
      http.patch('*/api/organizations/org-1/status', () => HttpResponse.json({ data: { id: 'org-1', status: 'SUSPENDED' } })),
    )
    const { user } = renderRoute('/dashboard/clients/org-1')

    await user.click(await screen.findByRole('button', { name: 'Suspend client' }))
    expect(screen.getByText(/Its members lose access until you reactivate it/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Suspend' }))

    expect(await screen.findByRole('button', { name: 'Reactivate' })).toBeInTheDocument()
    expect(screen.getByText('Suspended')).toBeInTheDocument()
  })

  it('shows a toast when suspending fails', async () => {
    signInAsAdmin()
    server.use(
      http.get('*/api/organizations/org-1', () => HttpResponse.json({ data: CLIENT })),
      http.patch('*/api/organizations/org-1/status', () => HttpResponse.json({ error: 'The owner deactivated this organization' }, { status: 409 })),
    )
    const { user } = renderRoute('/dashboard/clients/org-1')

    await user.click(await screen.findByRole('button', { name: 'Suspend client' }))
    await user.click(screen.getByRole('button', { name: 'Suspend' }))

    expect(await screen.findByText('The owner deactivated this organization')).toBeInTheDocument()
  })

  it('says when the client does not exist', async () => {
    signInAsAdmin()
    server.use(http.get('*/api/organizations/missing', () => HttpResponse.json({ error: 'Client not found' }, { status: 404 })))
    renderRoute('/dashboard/clients/missing')

    expect(await screen.findByText('Client not found.')).toBeInTheDocument()
  })
})

describe('suspended organization', () => {
  it('shows its owner a notice instead of the modules', async () => {
    const [membership] = OWNER_MEMBERSHIPS
    signInAs(buildUser({ memberships: [{ ...membership, organization: { ...membership.organization, status: 'SUSPENDED' } }] }))
    renderRoute('/dashboard/students')

    expect(await screen.findByRole('heading', { name: 'This organization is suspended' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Students & enrolment' })).not.toBeInTheDocument()
  })
})
