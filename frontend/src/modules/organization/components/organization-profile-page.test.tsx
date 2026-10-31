import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { updateOrganizationProfileSchema } from '@shigjetademy/shared/organization'
import type { OrganizationProfile, UpdateOrganizationProfileInput } from '@shigjetademy/shared/organization'
import { buildUser, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const PROFILE: OrganizationProfile = {
  id: 'org-1',
  name: 'Oxford Academy',
  type: 'ACADEMY',
  country: 'XK',
  currency: 'EUR',
  size: null,
  email: 'hello@oxford.test',
  phone: null,
  website: 'https://oxford.test',
  status: 'ACTIVE',
  created_at: '2026-10-01T09:00:00.000Z',
}

const [OWNER_MEMBERSHIP] = OWNER_MEMBERSHIPS

const serveProfile = () => server.use(http.get('*/api/organizations/org-1/profile', () => HttpResponse.json({ data: PROFILE })))

describe('OrganizationProfilePage', () => {
  it('saves a new name and shows it in the sidebar right away', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serveProfile()
    let sent: UpdateOrganizationProfileInput | undefined
    server.use(
      http.put('*/api/organizations/org-1/profile', async ({ request }) => {
        const body = updateOrganizationProfileSchema.parse(await request.json())
        sent = body
        return HttpResponse.json({ data: { ...PROFILE, name: body.name } })
      }),
    )
    const { user } = renderRoute('/dashboard/organization-profile')

    const name = await screen.findByLabelText('Organization name')
    await user.clear(name)
    await user.type(name, 'Oxford Academy Prishtina')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('The profile is saved.')).toBeInTheDocument()
    expect(sent).toMatchObject({ name: 'Oxford Academy Prishtina', type: 'Academy', country: 'XK', email: 'hello@oxford.test', website: 'https://oxford.test' })
    expect(within(screen.getByRole('complementary')).getByText('Oxford Academy Prishtina')).toBeInTheDocument()
  })

  it('has no address or city on the profile; those belong to locations', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serveProfile()
    renderRoute('/dashboard/organization-profile')

    expect(await screen.findByLabelText('Website')).toBeInTheDocument()
    expect(screen.queryByLabelText('Street address')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('City')).not.toBeInTheDocument()
  })

  it('shows the status and join date without letting the owner change them', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serveProfile()
    renderRoute('/dashboard/organization-profile')

    const status = await screen.findByRole('region', { name: 'Status' })
    expect(within(status).getByText('Active')).toBeInTheDocument()
    expect(within(status).getByText('1 Oct 2026', { exact: false })).toBeInTheDocument()
    expect(within(status).queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('shows the server’s message when saving fails', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    serveProfile()
    server.use(http.put('*/api/organizations/org-1/profile', () => HttpResponse.json({ error: 'This organization is suspended' }, { status: 403 })))
    const { user } = renderRoute('/dashboard/organization-profile')

    await user.type(await screen.findByLabelText('Phone'), '+383 44 123 456')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('This organization is suspended')
  })

  it('shows a school admin the profile without anything to change', async () => {
    signInAs(buildUser({ memberships: [{ ...OWNER_MEMBERSHIP, role: 'ADMIN' }] }))
    serveProfile()
    renderRoute('/dashboard/organization-profile')

    expect(await screen.findByText('hello@oxford.test')).toBeInTheDocument()
    expect(screen.getByText('https://oxford.test')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })

  it('keeps lecturers out', async () => {
    signInAs(buildUser({ memberships: [{ ...OWNER_MEMBERSHIP, role: 'LECTURER' }] }))
    const { router } = renderRoute('/dashboard/organization-profile')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/students'))
  })
})

describe('school admin sidebar', () => {
  it('opens the real read-only profile and locations pages', async () => {
    signInAs(buildUser({ memberships: [{ ...OWNER_MEMBERSHIP, role: 'ADMIN' }] }))
    serveProfile()
    server.use(
      http.get('*/api/organizations/org-1/locations', () => HttpResponse.json({ data: [] })),
      http.get('*/api/organizations/org-1/departments', () => HttpResponse.json({ data: [] })),
    )
    const { user, router } = renderRoute('/dashboard/students')

    const sidebar = await screen.findByRole('navigation', { name: 'Modules' })
    expect(within(sidebar).getByRole('link', { name: 'Organization profile' })).toHaveAttribute('href', '/dashboard/organization-profile')
    expect(within(sidebar).getByRole('link', { name: 'Locations and departments' })).toHaveAttribute('href', '/dashboard/locations')
    await user.click(within(sidebar).getByRole('link', { name: 'Organization profile' }))
    expect(await screen.findByText('hello@oxford.test')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/dashboard/organization-profile')

    await user.click(within(sidebar).getByRole('link', { name: 'Locations and departments' }))
    expect(await screen.findByRole('region', { name: 'Locations' })).toBeInTheDocument()
    expect(screen.queryByText('This module isn’t built yet.')).not.toBeInTheDocument()
  })
})
