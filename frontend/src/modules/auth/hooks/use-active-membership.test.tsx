import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { OrganizationOverview } from '@shigjetademy/shared/organization'
import { buildUser, OWNER_MEMBERSHIPS, signInAs, YLLKA_ADMIN_MEMBERSHIP } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'
import { storeActiveOrganizationId } from '../utils/active-organization-storage'

const EMPTY_OVERVIEW: OrganizationOverview = {
  counts: { members: 1, admins: 0, pending_invitations: 0 },
  pending_invitations: [],
  activity: [],
}

// Owner of Oxford and school admin of Yllka; the admin membership comes first so the owner fallback is visible
const signInToBoth = () => {
  signInAs(buildUser({ memberships: [YLLKA_ADMIN_MEMBERSHIP, ...OWNER_MEMBERSHIPS] }))
  server.use(
    http.get('*/api/organizations/org-1/overview', () => HttpResponse.json({ data: EMPTY_OVERVIEW })),
    http.get('*/api/organizations/:organizationId/locations', () => HttpResponse.json({ data: [] })),
    http.get('*/api/organizations/:organizationId/departments', () => HttpResponse.json({ data: [] })),
  )
}

const sidebar = () => screen.findByRole('complementary')

describe('active organization', () => {
  it('shows the school admin view of Yllka when Yllka is active', async () => {
    signInToBoth()
    storeActiveOrganizationId('org-2')
    const { router } = renderRoute('/dashboard')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/academic-periods'))
    const aside = await sidebar()
    expect(within(aside).getByText('Yllka Kindergarten')).toBeInTheDocument()
    expect(within(aside).getByText('School admin')).toBeInTheDocument()
    expect(within(aside).queryByRole('group', { name: 'Organization' })).not.toBeInTheDocument()
  })

  it('keeps an admin of the active organization off the owner pages', async () => {
    signInToBoth()
    storeActiveOrganizationId('org-2')
    const { router } = renderRoute('/dashboard/overview')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/academic-periods'))
  })

  it('opens Yllka’s locations, read-only, when Yllka is active', async () => {
    signInToBoth()
    storeActiveOrganizationId('org-2')
    renderRoute('/dashboard/locations')

    expect(await within(await screen.findByRole('main')).findByText('Yllka Kindergarten · only the owner can change these')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add location/ })).not.toBeInTheDocument()
  })

  it('shows the owner Overview of Oxford when Oxford is active', async () => {
    signInToBoth()
    storeActiveOrganizationId('org-1')
    const { router } = renderRoute('/dashboard')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/overview'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()
    const aside = await sidebar()
    expect(within(aside).getByText('Oxford Academy')).toBeInTheDocument()
    expect(within(aside).getByText('Owner')).toBeInTheDocument()
  })

  it('falls back to the organization the user owns when none was chosen', async () => {
    signInToBoth()
    const { router } = renderRoute('/dashboard')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/overview'))
    expect(within(await sidebar()).getByText('Oxford Academy')).toBeInTheDocument()
  })
})
