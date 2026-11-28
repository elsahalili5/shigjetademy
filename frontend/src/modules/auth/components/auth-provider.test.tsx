import { act, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '#/api/client'
import { buildUser, OWNER_MEMBERSHIPS, signInAs } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'
import { readActiveOrganizationId, storeActiveOrganizationId } from '../utils/active-organization-storage'
import { AUTH_STORAGE_KEY, clearStoredTokens, readStoredTokens, storeTokens } from '../utils/auth-storage'

const owner = buildUser({ memberships: OWNER_MEMBERSHIPS })
const OWNER_NAME = 'Elsa Halili'

// The sidebar's profile link is where the signed-in name shows
const findProfileLink = () => screen.findByRole('link', { name: 'Your profile' })

// Another tab wrote to storage; the browser tells this tab with a storage event
const writeFromAnotherTab = (tokens: { accessToken: string; refreshToken: string } | null) => {
  act(() => {
    if (tokens) {
      storeTokens(tokens)
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY)
    }
    window.dispatchEvent(new StorageEvent('storage', { key: AUTH_STORAGE_KEY, newValue: tokens ? JSON.stringify(tokens) : null }))
  })
}

describe('AuthProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('offers to try again when the account can’t be loaded, keeping the session', async () => {
    storeTokens({ accessToken: 'access-token', refreshToken: 'refresh-token' })
    let calls = 0
    server.use(
      http.get('*/api/auth/me', () => {
        calls += 1
        return calls === 1 ? HttpResponse.json({ error: 'Broken' }, { status: 500 }) : HttpResponse.json({ data: buildUser({ memberships: OWNER_MEMBERSHIPS }) })
      }),
    )
    const { user } = renderRoute('/dashboard/profile')

    await user.click(await screen.findByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Elsa Halili' })).toBeInTheDocument()
    expect(readStoredTokens()).not.toBeNull()
  })

  it('signs this tab out when another tab logs out', async () => {
    signInAs(owner)
    renderRoute('/dashboard/profile')
    expect(await findProfileLink()).toHaveTextContent(OWNER_NAME)

    writeFromAnotherTab(null)

    await waitFor(() => expect(screen.getByRole('link', { name: 'Your profile' })).not.toHaveTextContent(OWNER_NAME))
  })

  it('stays signed in on the new tokens when another tab changes the password', async () => {
    signInAs(owner)
    storeActiveOrganizationId('org-1')
    let meCalls = 0
    server.use(
      http.get('*/api/auth/me', () => {
        meCalls += 1
        return HttpResponse.json({ data: owner })
      }),
    )
    renderRoute('/dashboard/profile')
    expect(await findProfileLink()).toHaveTextContent(OWNER_NAME)
    const callsBefore = meCalls

    writeFromAnotherTab({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' })

    expect(screen.getByRole('link', { name: 'Your profile' })).toHaveTextContent(OWNER_NAME)
    expect(readStoredTokens()).toEqual({ accessToken: 'new-access-token', refreshToken: 'new-refresh-token' })
    expect(meCalls).toBe(callsBefore)
    expect(readActiveOrganizationId()).toBe('org-1')
  })

  it('signs this tab out when the tokens are cleared here, as a dead session does', async () => {
    signInAs(owner)
    renderRoute('/dashboard/profile')
    expect(await findProfileLink()).toHaveTextContent(OWNER_NAME)

    act(() => {
      clearStoredTokens()
    })

    await waitFor(() => expect(screen.getByRole('link', { name: 'Your profile' })).not.toHaveTextContent(OWNER_NAME))
  })

  it('signs this tab out on logout and tells the other tabs through storage', async () => {
    signInAs(owner)
    server.use(http.post('*/api/auth/logout', () => HttpResponse.json({ data: null })))
    const { router, user } = renderRoute('/dashboard/profile')
    await findProfileLink()

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it('forgets the previous user when another tab logs out, so the next sign-in there shows the new user', async () => {
    signInAs(owner)
    storeActiveOrganizationId('org-1')
    renderRoute('/dashboard/profile')
    expect(await findProfileLink()).toHaveTextContent(OWNER_NAME)

    writeFromAnotherTab(null)

    expect(readActiveOrganizationId()).toBeNull()
    server.use(http.get('*/api/auth/me', () => HttpResponse.json({ data: buildUser({ first_name: 'Drita', last_name: 'Berisha', memberships: OWNER_MEMBERSHIPS }) })))
    writeFromAnotherTab({ accessToken: 'drita-access-token', refreshToken: 'drita-refresh-token' })

    await waitFor(() => expect(screen.getByRole('link', { name: 'Your profile' })).toHaveTextContent('Drita Berisha'))
    expect(screen.queryByText(OWNER_NAME)).not.toBeInTheDocument()
  })

  it('forgets the user and the active organization when the interceptor ends the session', async () => {
    vi.stubGlobal('location', { ...window.location, pathname: '/features', assign: vi.fn() })
    signInAs(owner)
    storeActiveOrganizationId('org-1')
    server.use(
      http.get('*/api/things', () => HttpResponse.json({ error: 'Token expired' }, { status: 401 })),
      http.post('*/api/auth/refresh-token', () => HttpResponse.json({ error: 'Token revoked' }, { status: 401 })),
    )
    renderRoute('/dashboard/profile')
    expect(await findProfileLink()).toHaveTextContent(OWNER_NAME)

    await expect(apiClient.get('/things')).rejects.toMatchObject({ response: { status: 401 } })

    await waitFor(() => expect(screen.getByRole('link', { name: 'Your profile' })).not.toHaveTextContent(OWNER_NAME))
    expect(readActiveOrganizationId()).toBeNull()
  })
})
