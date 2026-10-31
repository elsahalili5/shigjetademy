import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { OrganizationOverview } from '@shigjetademy/shared/organization'
import { buildUser, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const OWNER = { id: 'user-1', first_name: 'Elsa', last_name: 'Halili', email: 'elsa@oxford.test' }
const ADMIN = { id: 'user-2', first_name: 'Drita', last_name: 'Berisha', email: 'drita@oxford.test' }
const OXFORD = { id: 'org-1', name: 'Oxford Academy' }

const EMPTY_OVERVIEW: OrganizationOverview = {
  counts: { members: 1, admins: 0, pending_invitations: 0 },
  pending_invitations: [],
  activity: [],
}

const BUSY_OVERVIEW: OrganizationOverview = {
  counts: { members: 4, admins: 2, pending_invitations: 3 },
  pending_invitations: [
    { id: 'inv-1', email: 'soon@oxford.test', expires_at: '2026-11-01T09:00:00.000Z', is_expiring_soon: true },
    { id: 'inv-2', email: 'later@oxford.test', expires_at: '2026-11-06T09:00:00.000Z', is_expiring_soon: false },
  ],
  activity: [
    { id: 'a-2', action: 'MEMBER_REMOVED', created_at: '2026-10-31T10:00:00.000Z', actor: OWNER, organization: OXFORD, target_user: ADMIN },
    { id: 'a-1', action: 'MEMBER_UPDATED', created_at: '2026-10-31T09:00:00.000Z', actor: OWNER, organization: OXFORD, target_user: ADMIN },
  ],
}

const signInAsOwnerWithOverview = (overview: OrganizationOverview) => {
  signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
  server.use(http.get('*/api/organizations/org-1/overview', () => HttpResponse.json({ data: overview })))
}

const signInAsSchoolAdmin = () => {
  const [membership] = OWNER_MEMBERSHIPS
  signInAs(buildUser({ memberships: [{ ...membership, role: 'ADMIN' }] }))
}

describe('owner Overview', () => {
  it('is where an owner lands on the dashboard', async () => {
    signInAsOwnerWithOverview(EMPTY_OVERVIEW)
    const { router } = renderRoute('/dashboard')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/overview'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
  })

  it('shows the organization’s counts from the server', async () => {
    signInAsOwnerWithOverview(BUSY_OVERVIEW)
    renderRoute('/dashboard/overview')

    const organization = await screen.findByRole('region', { name: 'Organization' })
    const labels = await within(organization).findAllByRole('term')
    expect(labels.map((label) => label.textContent)).toEqual(['Members', 'School admins', 'Pending invitations'])
    expect(within(organization).getAllByRole('definition').map((value) => value.textContent)).toEqual(['4', '2', '3'])
  })

  it('lists open admin invitations and marks the ones about to expire', async () => {
    signInAsOwnerWithOverview(BUSY_OVERVIEW)
    renderRoute('/dashboard/overview')

    const attention = await screen.findByRole('region', { name: 'Needs attention' })
    const [soon, later] = await within(attention).findAllByRole('listitem')
    expect(soon).toHaveTextContent('soon@oxford.test')
    expect(soon).toHaveTextContent('Expires within 48 hours')
    expect(later).toHaveTextContent('later@oxford.test')
    expect(later).not.toHaveTextContent('Expires within 48 hours')
  })

  it('says when nothing needs attention', async () => {
    signInAsOwnerWithOverview(EMPTY_OVERVIEW)
    renderRoute('/dashboard/overview')

    const attention = await screen.findByRole('region', { name: 'Needs attention' })
    expect(await within(attention).findByText('Nothing needs your attention')).toBeInTheDocument()
  })

  it('shows recent member changes as sentences', async () => {
    signInAsOwnerWithOverview(BUSY_OVERVIEW)
    renderRoute('/dashboard/overview')

    const activity = await screen.findByRole('region', { name: 'Recent activity' })
    const [removed, updated] = await within(activity).findAllByRole('listitem')
    expect(removed).toHaveTextContent('Elsa Halili removed Drita Berisha from Oxford Academy')
    expect(updated).toHaveTextContent('Elsa Halili changed Drita Berisha’s name and access')
  })

  it('ticks off inviting an admin once there is one, and links the rest to their modules', async () => {
    signInAsOwnerWithOverview(BUSY_OVERVIEW)
    renderRoute('/dashboard/overview')

    const checklist = await screen.findByRole('region', { name: 'Getting started' })
    expect(await within(checklist).findByRole('link', { name: /Invite your first admin, done/ })).toHaveAttribute('href', '/dashboard/members')
    expect(within(checklist).getByRole('link', { name: /Add students, to do/ })).toHaveAttribute('href', '/dashboard/students')
    expect(within(checklist).getByRole('link', { name: /Plan the timetable, to do/ })).toHaveAttribute('href', '/dashboard/schedule')
    expect(within(checklist).getByRole('link', { name: /Set up payments, to do/ })).toHaveAttribute('href', '/dashboard/payments')
  })

  it('leaves inviting an admin to do while the organization has none', async () => {
    signInAsOwnerWithOverview(EMPTY_OVERVIEW)
    renderRoute('/dashboard/overview')

    const checklist = await screen.findByRole('region', { name: 'Getting started' })
    expect(await within(checklist).findByRole('link', { name: /Invite your first admin, to do/ })).toBeInTheDocument()
  })

  it('offers to try again when the overview fails to load', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    server.use(http.get('*/api/organizations/org-1/overview', () => HttpResponse.json({ error: 'Boom' }, { status: 500 })))
    renderRoute('/dashboard/overview')

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('keeps school admins on their modules', async () => {
    signInAsSchoolAdmin()
    const { router } = renderRoute('/dashboard/overview')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/students'))
  })
})

describe('dashboard sidebar', () => {
  it('groups the owner’s modules into sections', async () => {
    signInAsOwnerWithOverview(EMPTY_OVERVIEW)
    renderRoute('/dashboard/overview')

    const sidebar = await screen.findByRole('navigation', { name: 'Modules' })
    const sections = within(sidebar).getAllByRole('group')
    expect(sections.map((section) => section.getAttribute('aria-label'))).toEqual(['Organization', 'Academic management', 'Learning', 'Finance'])
    const organization = within(sidebar).getByRole('group', { name: 'Organization' })
    expect(within(organization).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Overview',
      'Organization profile',
      'Locations and departments',
      'Academic periods',
      'Members and permissions',
      'Messages',
    ])
    expect(within(organization).getByRole('link', { name: 'Messages' })).toHaveAttribute('href', '/dashboard/messages')
    expect(within(organization).getByRole('link', { name: 'Members and permissions' })).toHaveAttribute('href', '/dashboard/members')
    expect(within(sidebar).getByRole('group', { name: 'Finance' })).toHaveTextContent('PaymentsFinancial recordsReports')
  })

  it('keeps the flat module list for a school admin, without members', async () => {
    signInAsSchoolAdmin()
    renderRoute('/dashboard/students')

    const sidebar = await screen.findByRole('navigation', { name: 'Modules' })
    expect(within(sidebar).getByRole('link', { name: 'Students & enrolment' })).toBeInTheDocument()
    expect(within(sidebar).queryByRole('group')).not.toBeInTheDocument()
    expect(within(sidebar).queryByRole('link', { name: /Members/ })).not.toBeInTheDocument()
  })
})

describe('modules that are not built yet', () => {
  it.each([
    ['students', 'Students & enrolment'],
    ['lecturers', 'Lecturers'],
    ['financial-records', 'Financial records'],
  ])('shows /dashboard/%s as not built yet', async (slug, name) => {
    signInAsOwnerWithOverview(EMPTY_OVERVIEW)
    renderRoute(`/dashboard/${slug}`)

    expect(await screen.findByRole('heading', { level: 1, name })).toBeInTheDocument()
    expect(screen.getByText('This module isn’t built yet.')).toBeInTheDocument()
  })
})
