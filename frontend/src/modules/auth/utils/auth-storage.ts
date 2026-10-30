import type { AuthTokens } from '@shigjetademy/shared/auth'

export const AUTH_STORAGE_KEY = 'shigjetademy-auth'

const isAuthTokens = (value: unknown): value is AuthTokens =>
  typeof value === 'object' &&
  value !== null &&
  'accessToken' in value &&
  typeof value.accessToken === 'string' &&
  'refreshToken' in value &&
  typeof value.refreshToken === 'string'

export const readStoredTokens = (): AuthTokens | null => {
  try {
    const rawValue = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!rawValue) return null
    const parsed: unknown = JSON.parse(rawValue)
    return isAuthTokens(parsed) ? parsed : null
  } catch {
    // Unreadable storage counts as signed out
    return null
  }
}

export const storeTokens = (tokens: AuthTokens) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }))
}

export const clearStoredTokens = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}
