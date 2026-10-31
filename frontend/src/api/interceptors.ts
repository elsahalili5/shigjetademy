import axios from 'axios'
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import type { RefreshTokenResponse } from '@shigjetademy/shared/auth'
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

// Plain axios, so a failing refresh never loops back through these interceptors
const requestNewTokens = async (refreshToken: string) => {
  const response = await axios.post<{ data: RefreshTokenResponse }>(`${API_BASE_URL}/auth/refresh-token`, { refreshToken })
  return response.data.data
}

// While one refresh runs, other 401s wait for it instead of refreshing again
let pendingRefresh: Promise<RefreshTokenResponse> | null = null

const refreshOnce = (refreshToken: string) => {
  pendingRefresh ??= requestNewTokens(refreshToken).finally(() => {
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
  let newTokens: RefreshTokenResponse
  try {
    newTokens = await refreshOnce(tokens.refreshToken)
  } catch (refreshError) {
    // The session is over; only a protected page needs to start again from login
    clearStoredTokens()
    if (isOnProtectedPage()) {
      window.location.assign(LOGIN_PATH)
    }
    throw refreshError
  }
  storeTokens(newTokens)
  originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`
  return client(originalRequest)
}
