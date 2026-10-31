import { http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readStoredTokens, storeTokens } from '#/modules/auth/utils/auth-storage'
import { server } from '#/test/server'
import { apiClient } from './client'

const NEW_TOKENS = { accessToken: 'new-access-token', refreshToken: 'new-refresh-token' }

const openPage = (pathname: string) => {
  const assign = vi.fn()
  vi.stubGlobal('location', { ...window.location, pathname, assign })
  return assign
}

// The first call answers 401 so the client refreshes, then the retry gets the second answer
const answerExpiredThen = (retryStatus: number) => {
  let calls = 0
  server.use(
    http.get('*/api/things', () => {
      calls += 1
      return calls === 1 ? HttpResponse.json({ error: 'Token expired' }, { status: 401 }) : HttpResponse.json({ error: 'Broken' }, { status: retryStatus })
    }),
  )
}

const answerRefresh = (status: number) => {
  server.use(
    http.post('*/api/auth/refresh-token', () =>
      status === 200 ? HttpResponse.json({ data: NEW_TOKENS }) : HttpResponse.json({ error: 'Token revoked' }, { status }),
    ),
  )
}

describe('refresh on 401', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps the new session when only the retried request fails', async () => {
    const assign = openPage('/dashboard')
    storeTokens({ accessToken: 'access-token', refreshToken: 'refresh-token' })
    answerExpiredThen(500)
    answerRefresh(200)

    await expect(apiClient.get('/things')).rejects.toMatchObject({ response: { status: 500 } })

    expect(readStoredTokens()).toEqual(NEW_TOKENS)
    expect(assign).not.toHaveBeenCalled()
  })

  it('sends the user to login when the refresh fails on a protected page', async () => {
    const assign = openPage('/dashboard/members')
    storeTokens({ accessToken: 'access-token', refreshToken: 'refresh-token' })
    answerExpiredThen(200)
    answerRefresh(401)

    await expect(apiClient.get('/things')).rejects.toMatchObject({ response: { status: 401 } })

    expect(readStoredTokens()).toBeNull()
    expect(assign).toHaveBeenCalledWith('/login')
  })

  it('lets a visitor stay on a public page when the refresh fails', async () => {
    const assign = openPage('/features')
    storeTokens({ accessToken: 'access-token', refreshToken: 'refresh-token' })
    answerExpiredThen(200)
    answerRefresh(401)

    await expect(apiClient.get('/things')).rejects.toMatchObject({ response: { status: 401 } })

    expect(readStoredTokens()).toBeNull()
    expect(assign).not.toHaveBeenCalled()
  })
})
