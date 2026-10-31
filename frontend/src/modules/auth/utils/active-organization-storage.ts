export const ACTIVE_ORGANIZATION_STORAGE_KEY = 'shigjetademy-active-organization'

const listeners = new Set<() => void>()

const notifyListeners = () => {
  listeners.forEach((listener) => listener())
}

export const readActiveOrganizationId = (): string | null => {
  try {
    return localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY)
  } catch {
    // Unreadable storage means no choice was made; the user's memberships pick the organization
    return null
  }
}

export const storeActiveOrganizationId = (organizationId: string) => {
  try {
    localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, organizationId)
  } catch {
    // Blocked or full storage keeps the previous choice; the memberships still validate it
  }
  notifyListeners()
}

export const clearActiveOrganizationId = () => {
  try {
    localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY)
  } catch {
    // Blocked storage has nothing of ours to clear
  }
  notifyListeners()
}

// A switch in another tab writes the same key; this tab follows it
const handleStorage = (event: StorageEvent) => {
  if (event.key === ACTIVE_ORGANIZATION_STORAGE_KEY || event.key === null) notifyListeners()
}

/** Lets React re-render when the active organization changes, in this tab or another one */
export const subscribeToActiveOrganization = (listener: () => void) => {
  if (listeners.size === 0) window.addEventListener('storage', handleStorage)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) window.removeEventListener('storage', handleStorage)
  }
}
