import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { buildUser, OWNER_MEMBERSHIPS } from '#/test/fixtures'
import { renderRoute } from '#/test/render-route'
import { server } from '#/test/server'
import { readStoredTokens, storeTokens } from '../utils/auth-storage'

describe('AuthProvider', () => {
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

    expect(await screen.findByRole('heading', { name: 'Your profile' })).toBeInTheDocument()
    expect(readStoredTokens()).not.toBeNull()
  })
})
