import axios from 'axios'
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type { AuthTokens, RefreshTokenResponse } from '@shigjetademy/shared/auth'
import { clearStoredTokens, readStoredTokens, storeTokens } from '#/modules/auth/utils/auth-storage'
import { API_BASE_URL } from './config'

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean }

const LOGIN_PATH = '/login'
// Pages that need a session; anywhere else a dead session just turns the user into a visitor
const PROTECTED_PATH_PREFIXES = ['/dashboard', '/onboarding']

const isOnProtectedPage = () => {
  const { pathname } = window.location
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

// A 401 from these means wrong credentials or a dead token, not an expired access token
const NO_REFRESH_ENDPOINTS = ['/auth/login', '/auth/register', '/auth/refresh-token', '/auth/logout']

export const appendAccessTokenInterceptor = (config: InternalAxiosRequestConfig) => {
  const tokens = readStoredTokens()
  if (tokens) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`
  }
  return config
}

// A hung refresh would hold the lock for every tab, so it gives up
const REFRESH_TIMEOUT_MS = 15_000

// Plain axios, so a failing refresh never loops back through these interceptors
const requestNewTokens = async (refreshToken: string) => {
  const response = await axios.post<{ data: RefreshTokenResponse }>(`${API_BASE_URL}/auth/refresh-token`, { refreshToken }, { timeout: REFRESH_TIMEOUT_MS })
  return response.data.data
}

type RefreshParams = { startedWith: string; expiredError: AxiosError }

const REFRESH_LOCK_NAME = 'shigjetademy-refresh'
const SESSION_ENDED_STATUSES = [401, 403]

// Only the server saying the refresh token is dead ends the session; network errors, timeouts and 5xx do not
const isSessionEndedError = (error: unknown) =>
  axios.isAxiosError(error) && error.response !== undefined && SESSION_ENDED_STATUSES.includes(error.response.status)

const endSession = () => {
  clearStoredTokens()
  // Only a protected page needs to start again from login
  if (isOnProtectedPage()) {
    window.location.assign(LOGIN_PATH)
  }
}

// Returns the pair to retry with. Runs inside the lock so tabs refresh one after another
const refreshTokens = async ({ startedWith, expiredError }: RefreshParams): Promise<AuthTokens> => {
  const storedBefore = readStoredTokens()
  // Another tab signed out meanwhile; refreshing now would bring the session back
  if (!storedBefore) throw expiredError
  if (storedBefore.refreshToken !== startedWith) {
    // Another tab already refreshed
    return storedBefore
  }
  let newTokens: AuthTokens
  try {
    newTokens = await requestNewTokens(startedWith)
  } catch (refreshError) {
    if (!isSessionEndedError(refreshError)) throw refreshError
    const storedAfter = readStoredTokens()
    if (storedAfter && storedAfter.refreshToken !== startedWith) {
      // Another tab refreshed while this request was in flight, so our token was already spent
      return storedAfter
    }
    endSession()
    throw refreshError
  }

  // Storage may have changed while the request was in flight
  const storedNow = readStoredTokens()
  // Another tab signed out; storing now would sign it back in
  if (!storedNow) throw expiredError
  // Another tab already stored a newer pair, which is the one to keep
  if (storedNow.refreshToken !== startedWith) return storedNow
  storeTokens(newTokens)
  return newTokens
}

const refreshWithLock = (params: RefreshParams) => {
  if (!('locks' in navigator) || !navigator.locks) return refreshTokens(params)
  return navigator.locks.request(REFRESH_LOCK_NAME, () => refreshTokens(params))
}

// While one refresh runs, other 401s in this tab wait for it instead of refreshing again
let pendingRefresh: Promise<AuthTokens> | null = null

const refreshOnce = (params: RefreshParams) => {
  pendingRefresh ??= refreshWithLock(params).finally(() => {
    pendingRefresh = null
  })
  return pendingRefresh
}

export const createRefreshTokenInterceptor = (client: AxiosInstance) => async (error: AxiosError) => {
  const originalRequest: RetriableRequestConfig | undefined = error.config
  const tokens = readStoredTokens()
  const isAuthEndpoint = NO_REFRESH_ENDPOINTS.includes(originalRequest?.url ?? '')

  if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || !tokens || isAuthEndpoint) {
    throw error
  }

  originalRequest._retry = true
  const newTokens = await refreshOnce({ startedWith: tokens.refreshToken, expiredError: error })
  originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`
  return client(originalRequest)
}
