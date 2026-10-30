import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { OrganizationMember } from '@shigjetademy/shared/organization'
import { buildUser, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const OWNER: OrganizationMember = {
  membership_id: 'membership-1',
  id: 'user-1',
  first_name: 'Elsa',
  last_name: 'Halili',
  email: 'owner@oxford.test',
  role: 'OWNER',
  permissions: [],
  joined_at: '2026-10-01T09:00:00.000Z',
}

const ADMIN: OrganizationMember = {
  membership_id: 'membership-2',
  id: 'user-2',
  first_name: 'Admin',
  last_name: 'One',
  email: 'admin1@oxford.com',
  role: 'ADMIN',
  permissions: ['MANAGE_STUDENTS', 'VIEW_REPORTS'],
  joined_at: '2026-10-31T09:00:00.000Z',
}

const signInAsOwnerWithMembers = () => {
  signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
  server.use(
    http.get('*/api/organizations/org-1/members', () => HttpResponse.json({ data: [OWNER, ADMIN] })),
    http.get('*/api/organizations/org-1/invitations', () => HttpResponse.json({ data: [] })),
  )
}

describe('MembersPage', () => {
  it('lists the people with access from the server', async () => {
    signInAsOwnerWithMembers()
    renderRoute('/dashboard/members')

    const people = await screen.findByRole('region', { name: 'People with access' })
    expect(await within(people).findByText('Admin One')).toBeInTheDocument()
    expect(within(people).getByText('admin1@oxford.com · joined', { exact: false })).toBeInTheDocument()
    expect(within(people).getAllByRole('button', { name: 'Edit' })).toHaveLength(1)
    expect(screen.getByText('No open invitations.')).toBeInTheDocument()
  })

  it('saves an admin’s new name', async () => {
    signInAsOwnerWithMembers()
    server.use(
      http.patch('*/api/organizations/org-1/members/membership-2', () => HttpResponse.json({ data: { ...ADMIN, first_name: 'Drita', last_name: 'Berisha' } })),
    )
    const { user } = renderRoute('/dashboard/members')

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    const firstName = screen.getByLabelText('First name')
    await user.clear(firstName)
    await user.type(firstName, 'Drita')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Saved changes for Drita Berisha.')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'People with access' })).getByText('Drita Berisha')).toBeInTheDocument()
  })

  it('asks for a name when editing', async () => {
    signInAsOwnerWithMembers()
    const { user } = renderRoute('/dashboard/members')

    await user.click(await screen.findByRole('button', { name: 'Edit' }))
    await user.clear(screen.getByLabelText('Last name'))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(screen.getByText('Enter their last name.')).toBeInTheDocument()
  })

  it('removes an admin after confirming', async () => {
    signInAsOwnerWithMembers()
    server.use(http.delete('*/api/organizations/org-1/members/membership-2', () => HttpResponse.json({ message: 'Member removed' })))
    const { user } = renderRoute('/dashboard/members')

    await user.click(await screen.findByRole('button', { name: 'Remove' }))
    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(await screen.findByText('Admin One no longer has access.')).toBeInTheDocument()
    expect(screen.queryByText('admin1@oxford.com · joined', { exact: false })).not.toBeInTheDocument()
  })

  it('says sending invitations is not connected yet', async () => {
    signInAsOwnerWithMembers()
    const { user } = renderRoute('/dashboard/members')

    await user.click(await screen.findByRole('button', { name: 'Invite admin' }))
    await user.type(screen.getByLabelText('Email'), 'new@oxford.com')
    await user.click(screen.getByRole('button', { name: 'Send invitation' }))

    expect(screen.getByRole('status')).toHaveTextContent('nothing was sent to new@oxford.com')
  })

  it('keeps non-owners out', async () => {
    const [membership] = OWNER_MEMBERSHIPS
    signInAs(buildUser({ memberships: [{ ...membership, role: 'ADMIN' }] }))
    const { router } = renderRoute('/dashboard/members')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/students'))
  })
})
