import { delay, http, HttpResponse } from 'msw'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearStoredTokens, readStoredTokens, storeTokens } from '#/modules/auth/utils/auth-storage'
import { server } from '#/test/server'
import { apiClient } from './client'

const STARTING_TOKENS = { accessToken: 'access-token', refreshToken: 'refresh-token' }
const OTHER_TAB_TOKENS = { accessToken: 'other-tab-access-token', refreshToken: 'other-tab-refresh-token' }
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

// Stands in for the browser's Web Locks: one holder at a time, the next waits in line
const stubLocks = (onGranted?: () => void) => {
  let queue: Promise<unknown> = Promise.resolve()
  const request = vi.fn((_name: string, callback: () => Promise<unknown>) => {
    const run = queue.then(() => {
      onGranted?.()
      return callback()
    })
    queue = run.catch(() => undefined)
    return run
  })
  vi.stubGlobal('navigator', { ...navigator, locks: { request } })
  return request
}

// Only the access token the tab holds when it is expired gets a 401
const expireAccessToken = (expired: string) => {
  const seenTokens: Array<string | null> = []
  server.use(
    http.get('*/api/things', ({ request }) => {
      const authorization = request.headers.get('Authorization')
      seenTokens.push(authorization)
      return authorization === `Bearer ${expired}` ? HttpResponse.json({ error: 'Token expired' }, { status: 401 }) : HttpResponse.json({ data: 'ok' })
    }),
  )
  return seenTokens
}

const countRefreshes = (respond: () => Response) => {
  const refresh = vi.fn(respond)
  server.use(http.post('*/api/auth/refresh-token', refresh))
  return refresh
}

describe('refresh across tabs', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the pair another tab stored while waiting for the lock, without refreshing', async () => {
    const assign = openPage('/dashboard')
    storeTokens(STARTING_TOKENS)
    stubLocks(() => storeTokens(OTHER_TAB_TOKENS))
    const seenTokens = expireAccessToken(STARTING_TOKENS.accessToken)
    const refresh = countRefreshes(() => HttpResponse.json({ data: NEW_TOKENS }))

    await expect(apiClient.get('/things')).resolves.toBe('ok')

    expect(refresh).not.toHaveBeenCalled()
    expect(seenTokens.at(-1)).toBe(`Bearer ${OTHER_TAB_TOKENS.accessToken}`)
    expect(readStoredTokens()).toEqual(OTHER_TAB_TOKENS)
    expect(assign).not.toHaveBeenCalled()
  })

  it('takes the lock by name and refreshes inside it when no other tab did', async () => {
    openPage('/dashboard')
    storeTokens(STARTING_TOKENS)
    const request = stubLocks()
    expireAccessToken(STARTING_TOKENS.accessToken)
    const refresh = countRefreshes(() => HttpResponse.json({ data: NEW_TOKENS }))

    await apiClient.get('/things')

    expect(request).toHaveBeenCalledWith('shigjetademy-refresh', expect.any(Function))
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(readStoredTokens()).toEqual(NEW_TOKENS)
  })

  it('retries with the pair another tab stored when the refresh is rejected and there is no lock', async () => {
    const assign = openPage('/dashboard')
    storeTokens(STARTING_TOKENS)
    vi.stubGlobal('navigator', { ...navigator, locks: undefined })
    const seenTokens = expireAccessToken(STARTING_TOKENS.accessToken)
    // The other tab's refresh lands first, so this tab's token is already spent
    const refresh = countRefreshes(() => {
      storeTokens(OTHER_TAB_TOKENS)
      return HttpResponse.json({ error: 'Token revoked' }, { status: 401 })
    })

    await expect(apiClient.get('/things')).resolves.toBe('ok')

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(seenTokens.at(-1)).toBe(`Bearer ${OTHER_TAB_TOKENS.accessToken}`)
    expect(readStoredTokens()).toEqual(OTHER_TAB_TOKENS)
    expect(assign).not.toHaveBeenCalled()
  })

  it.each([401, 403])('ends the session on a protected page when the refresh answers %i and storage is unchanged', async (status) => {
    const assign = openPage('/dashboard')
    storeTokens(STARTING_TOKENS)
    stubLocks()
    expireAccessToken(STARTING_TOKENS.accessToken)
    countRefreshes(() => HttpResponse.json({ error: 'Token revoked' }, { status }))

    await expect(apiClient.get('/things')).rejects.toMatchObject({ response: { status } })

    expect(readStoredTokens()).toBeNull()
    expect(assign).toHaveBeenCalledWith('/login')
  })

  it.each([401, 403])('clears the tokens without redirecting on a public page when the refresh answers %i', async (status) => {
    const assign = openPage('/features')
    storeTokens(STARTING_TOKENS)
    stubLocks()
    expireAccessToken(STARTING_TOKENS.accessToken)
    countRefreshes(() => HttpResponse.json({ error: 'Token revoked' }, { status }))

    await expect(apiClient.get('/things')).rejects.toMatchObject({ response: { status } })

    expect(readStoredTokens()).toBeNull()
    expect(assign).not.toHaveBeenCalled()
  })

  it.each([
    { name: 'a network error', respond: () => HttpResponse.error() },
    { name: 'a server error', respond: () => HttpResponse.json({ error: 'Broken' }, { status: 500 }) },
  ])('keeps the session when the refresh fails with $name', async ({ respond }) => {
    const assign = openPage('/dashboard')
    storeTokens(STARTING_TOKENS)
    stubLocks()
    expireAccessToken(STARTING_TOKENS.accessToken)
    countRefreshes(respond)

    await expect(apiClient.get('/things')).rejects.toBeDefined()

    expect(readStoredTokens()).toEqual(STARTING_TOKENS)
    expect(assign).not.toHaveBeenCalled()
  })

  it('gives up on a hung refresh, keeps the session and frees the lock for the next request', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const assign = openPage('/dashboard')
      storeTokens(STARTING_TOKENS)
      stubLocks()
      expireAccessToken(STARTING_TOKENS.accessToken)
      server.use(http.post('*/api/auth/refresh-token', async () => {
        await delay('infinite')
        return HttpResponse.json({ data: NEW_TOKENS })
      }))

      const hungRequest = expect(apiClient.get('/things')).rejects.toMatchObject({ code: 'ECONNABORTED' })
      await vi.advanceTimersByTimeAsync(15_000)
      await hungRequest

      expect(readStoredTokens()).toEqual(STARTING_TOKENS)
      expect(assign).not.toHaveBeenCalled()

      countRefreshes(() => HttpResponse.json({ data: NEW_TOKENS }))
      await expect(apiClient.get('/things')).resolves.toBe('ok')
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not bring the session back when another tab logged out while waiting for the lock', async () => {
    openPage('/dashboard')
    storeTokens(STARTING_TOKENS)
    stubLocks(() => clearStoredTokens())
    expireAccessToken(STARTING_TOKENS.accessToken)
    const refresh = countRefreshes(() => HttpResponse.json({ data: NEW_TOKENS }))

    await expect(apiClient.get('/things')).rejects.toMatchObject({ response: { status: 401 } })

    expect(refresh).not.toHaveBeenCalled()
    expect(readStoredTokens()).toBeNull()
  })

  it('does not write the new pair back when another tab logged out while the refresh was in flight', async () => {
    const assign = openPage('/dashboard')
    storeTokens(STARTING_TOKENS)
    stubLocks()
    expireAccessToken(STARTING_TOKENS.accessToken)
    const refresh = countRefreshes(() => {
      clearStoredTokens()
      return HttpResponse.json({ data: NEW_TOKENS })
    })

    await expect(apiClient.get('/things')).rejects.toMatchObject({ response: { status: 401 } })

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(readStoredTokens()).toBeNull()
    expect(assign).not.toHaveBeenCalled()
  })

  it('does not write the new pair back on a logout during the refresh when there is no lock', async () => {
    openPage('/dashboard')
    storeTokens(STARTING_TOKENS)
    vi.stubGlobal('navigator', { ...navigator, locks: undefined })
    expireAccessToken(STARTING_TOKENS.accessToken)
    countRefreshes(() => {
      clearStoredTokens()
      return HttpResponse.json({ data: NEW_TOKENS })
    })

    await expect(apiClient.get('/things')).rejects.toMatchObject({ response: { status: 401 } })

    expect(readStoredTokens()).toBeNull()
  })

  it('drops its own new pair and uses the stored one when another tab stored a newer pair during the refresh', async () => {
    openPage('/dashboard')
    storeTokens(STARTING_TOKENS)
    stubLocks()
    const seenTokens = expireAccessToken(STARTING_TOKENS.accessToken)
    countRefreshes(() => {
      storeTokens(OTHER_TAB_TOKENS)
      return HttpResponse.json({ data: NEW_TOKENS })
    })

    await expect(apiClient.get('/things')).resolves.toBe('ok')

    expect(seenTokens.at(-1)).toBe(`Bearer ${OTHER_TAB_TOKENS.accessToken}`)
    expect(readStoredTokens()).toEqual(OTHER_TAB_TOKENS)
  })

  it('sends one refresh for many requests that expire together in one tab', async () => {
    openPage('/dashboard')
    storeTokens(STARTING_TOKENS)
    stubLocks()
    expireAccessToken(STARTING_TOKENS.accessToken)
    const refresh = countRefreshes(() => HttpResponse.json({ data: NEW_TOKENS }))

    const responses = await Promise.all([apiClient.get('/things'), apiClient.get('/things'), apiClient.get('/things')])

    expect(responses).toHaveLength(3)
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(readStoredTokens()).toEqual(NEW_TOKENS)
  })
})
