import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { buildUser, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'

const fillAndSubmit = async (user: ReturnType<typeof renderRoute>['user']) => {
  await user.type(await screen.findByLabelText('Organization name'), 'Oxford Academy')
  await user.click(screen.getByRole('radio', { name: /Academy/ }))
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
