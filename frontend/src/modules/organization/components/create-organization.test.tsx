import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { OrganizationOverview } from '@shigjetademy/shared/organization'
import { buildUser, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

type FillAndSubmitParams = {
  name?: string
  type?: RegExp
}

const fillAndSubmit = async (user: ReturnType<typeof renderRoute>['user'], { name = 'Oxford Academy', type = /Academy/ }: FillAndSubmitParams = {}) => {
  await user.type(await screen.findByLabelText('Organization name'), name)
  await user.click(screen.getByRole('radio', { name: type }))
  await user.click(screen.getByRole('button', { name: /Create organization/ }))
}

describe('CreateOrganization', () => {
  it('takes the new owner to their dashboard once the organization is created', async () => {
    signInAs(buildUser())
    server.use(
      http.post('*/api/organizations', () => {
        server.use(http.get('*/api/auth/me', () => HttpResponse.json({ data: buildUser({ memberships: OWNER_MEMBERSHIPS }) })))
        return HttpResponse.json({ data: { id: 'org-1' } }, { status: 201 })
      }),
      http.get('*/api/organizations/org-1/overview', () =>
        HttpResponse.json({ data: { counts: { members: 1, admins: 0, pending_invitations: 0 }, pending_invitations: [], activity: [] } }),
      ),
    )
    const { router, user } = renderRoute('/onboarding')

    await fillAndSubmit(user)

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/overview'))
  })

  it('shows the server’s message, and clears it once the user edits the form', async () => {
    signInAs(buildUser())
    server.use(http.post('*/api/organizations', () => HttpResponse.json({ error: 'We couldn’t save the organization' }, { status: 500 })))
    const { user } = renderRoute('/onboarding')

    await fillAndSubmit(user)
    expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t save the organization')
    await user.type(screen.getByLabelText('Organization name'), ' 2')

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

const EMPTY_OVERVIEW: OrganizationOverview = {
  counts: { members: 1, admins: 0, pending_invitations: 0 },
  pending_invitations: [],
  activity: [],
}

const [OXFORD_MEMBERSHIP] = OWNER_MEMBERSHIPS
const YLLKA_OWNER_MEMBERSHIP: (typeof OWNER_MEMBERSHIPS)[number] = {
  id: 'membership-3',
  role: 'OWNER',
  permissions: [],
  organization: { id: 'org-3', name: 'Yllka Kindergarten', type: 'KINDERGARTEN', status: 'ACTIVE' },
}

describe('creating another organization', () => {
  it('opens from the organization switcher', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    server.use(http.get('*/api/organizations/org-1/overview', () => HttpResponse.json({ data: EMPTY_OVERVIEW })))
    const { router, user } = renderRoute('/dashboard/overview')

    await user.click(await screen.findByRole('button', { name: /Switch organization/ }))
    await user.click(screen.getByRole('menuitem', { name: 'Create organization' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/organizations/new'))
    expect(await screen.findByRole('heading', { level: 1, name: 'Create another organization' })).toBeInTheDocument()
  })

  it('makes the new organization active and lands on its Overview', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    server.use(
      http.post('*/api/organizations', () => {
        server.use(http.get('*/api/auth/me', () => HttpResponse.json({ data: buildUser({ memberships: [OXFORD_MEMBERSHIP, YLLKA_OWNER_MEMBERSHIP] }) })))
        return HttpResponse.json({ data: { id: 'org-3', name: 'Yllka Kindergarten' } }, { status: 201 })
      }),
      http.get('*/api/organizations/org-3/overview', () => HttpResponse.json({ data: EMPTY_OVERVIEW })),
    )
    const { router, user } = renderRoute('/organizations/new')

    await fillAndSubmit(user, { name: 'Yllka Kindergarten', type: /Kindergarten/ })

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/overview'))
    const aside = await screen.findByRole('complementary')
    expect(within(aside).getByText('Yllka Kindergarten')).toBeInTheDocument()
    expect(within(aside).getByText('Owner')).toBeInTheDocument()
  })

  it('sends someone without an organization to onboarding instead', async () => {
    signInAs(buildUser())
    const { router } = renderRoute('/organizations/new')

    await waitFor(() => expect(router.state.location.pathname).toBe('/onboarding'))
  })
})
