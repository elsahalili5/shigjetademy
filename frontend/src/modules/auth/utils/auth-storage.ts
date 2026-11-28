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

// The storage event only fires in the other tabs, so writes in this tab notify its own listeners
const listeners = new Set<() => void>()

const notifyListeners = () => {
  listeners.forEach((listener) => listener())
}

export const storeTokens = (tokens: AuthTokens) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }))
  notifyListeners()
}

export const clearStoredTokens = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY)
  notifyListeners()
}

// A null key means the whole storage was cleared
const isAuthStorageEvent = (event: StorageEvent) => event.key === null || event.key === AUTH_STORAGE_KEY

export const subscribeToStoredTokens = (listener: () => void) => {
  const handleStorage = (event: StorageEvent) => {
    if (isAuthStorageEvent(event)) listener()
  }
  listeners.add(listener)
  window.addEventListener('storage', handleStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', handleStorage)
  }
}

export const hasStoredTokensSnapshot = () => readStoredTokens() !== null
