import { act, cleanup, screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { OrganizationOverview } from '@shigjetademy/shared/organization'
import { buildUser, OWNER_MEMBERSHIPS, signInAs, YLLKA_ADMIN_MEMBERSHIP } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'
import { ACTIVE_ORGANIZATION_STORAGE_KEY, readActiveOrganizationId, storeActiveOrganizationId } from '#/modules/auth/utils/active-organization-storage'

const EMPTY_OVERVIEW: OrganizationOverview = {
  counts: { members: 1, admins: 0, pending_invitations: 0 },
  pending_invitations: [],
  activity: [],
}

const signInToBoth = () => {
  signInAs(buildUser({ memberships: [...OWNER_MEMBERSHIPS, YLLKA_ADMIN_MEMBERSHIP] }))
  server.use(http.get('*/api/organizations/org-1/overview', () => HttpResponse.json({ data: EMPTY_OVERVIEW })))
}

const switcherButton = () => screen.findByRole('button', { name: /Switch organization/ })

const sidebar = () => screen.findByRole('complementary')

describe('organization switcher', () => {
  it('lists every organization with the user’s role in it', async () => {
    signInToBoth()
    const { user } = renderRoute('/dashboard/overview')

    const button = await switcherButton()
    expect(button).toHaveAttribute('aria-expanded', 'false')
    await user.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'true')
    const options = within(screen.getByRole('menu', { name: 'Organizations' })).getAllByRole('menuitemradio')
    expect(options.map((option) => option.textContent)).toEqual(['Oxford AcademyOwner', 'Yllka KindergartenSchool admin'])
    expect(options[0]).toHaveAttribute('aria-checked', 'true')
    expect(options[0]).toHaveFocus()
  })

  it('switches to a school admin organization and opens its module list', async () => {
    signInToBoth()
    const { router, user } = renderRoute('/dashboard/overview')

    await user.click(await switcherButton())
    await user.click(screen.getByRole('menuitemradio', { name: /Yllka Kindergarten/ }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/academic-periods'))
    const aside = await sidebar()
    expect(within(aside).getByText('Yllka Kindergarten')).toBeInTheDocument()
    expect(within(aside).getByText('School admin')).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('switches back to an owned organization and opens its Overview', async () => {
    signInToBoth()
    storeActiveOrganizationId('org-2')
    const { router, user } = renderRoute('/dashboard')

    await user.click(await switcherButton())
    await user.click(screen.getByRole('menuitemradio', { name: /Oxford Academy/ }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/overview'))
    expect(within(await sidebar()).getByText('Owner')).toBeInTheDocument()
  })

  it('works from the keyboard and closes on Escape', async () => {
    signInToBoth()
    const { router, user } = renderRoute('/dashboard/overview')

    const button = await switcherButton()
    await user.click(button)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(button).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitemradio', { name: /Oxford Academy/ })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('menuitemradio', { name: /Yllka Kindergarten/ })).toHaveFocus()
    await user.keyboard('{Enter}')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/academic-periods'))
  })

  it('remembers the choice after a reload', async () => {
    signInToBoth()
    const first = renderRoute('/dashboard/overview')
    await first.user.click(await switcherButton())
    await first.user.click(screen.getByRole('menuitemradio', { name: /Yllka Kindergarten/ }))
    await waitFor(() => expect(first.router.state.location.pathname).toBe('/dashboard/academic-periods'))

    cleanup()
    const { router } = renderRoute('/dashboard')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/academic-periods'))
    expect(within(await sidebar()).getByText('Yllka Kindergarten')).toBeInTheDocument()
  })

  it('falls back to another organization when the chosen one was left', async () => {
    signInAs(buildUser({ memberships: OWNER_MEMBERSHIPS }))
    server.use(http.get('*/api/organizations/org-1/overview', () => HttpResponse.json({ data: EMPTY_OVERVIEW })))
    storeActiveOrganizationId('org-2')
    const { router } = renderRoute('/dashboard')

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/overview'))
    expect(within(await sidebar()).getByText('Oxford Academy')).toBeInTheDocument()
  })

  it('opens on the last item with ArrowUp, and Space follows the create link', async () => {
    signInToBoth()
    const { router, user } = renderRoute('/dashboard/overview')

    const button = await switcherButton()
    button.focus()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('menuitem', { name: 'Create organization' })).toHaveFocus()
    await user.keyboard(' ')

    await waitFor(() => expect(router.state.location.pathname).toBe('/organizations/new'))
  })

  it('closes when the user presses outside it', async () => {
    signInToBoth()
    const { user } = renderRoute('/dashboard/overview')

    await user.click(await switcherButton())
    await user.click(await screen.findByRole('heading', { level: 1, name: 'Overview' }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('follows a switch made in another tab', async () => {
    signInToBoth()
    renderRoute('/dashboard/overview')
    expect(within(await sidebar()).getByText('Oxford Academy')).toBeInTheDocument()

    act(() => {
      localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, 'org-2')
      window.dispatchEvent(new StorageEvent('storage', { key: ACTIVE_ORGANIZATION_STORAGE_KEY, newValue: 'org-2' }))
    })

    expect(await within(await sidebar()).findByText('Yllka Kindergarten')).toBeInTheDocument()
  })

  it('forgets the active organization on logout', async () => {
    signInToBoth()
    storeActiveOrganizationId('org-2')
    server.use(http.post('*/api/auth/logout', () => HttpResponse.json({ data: null })))
    const { router, user } = renderRoute('/dashboard')

    await user.click(await screen.findByRole('button', { name: 'Log out' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(readActiveOrganizationId()).toBeNull()
  })
})
