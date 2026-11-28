import { useCallback, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { LoginUserResponse } from '@shigjetademy/shared/auth'
import { AuthContext } from './auth-context'
import type { AuthContextValue } from './auth-context'
import { authApi } from '../api/auth-api'
import { ME_QUERY_KEY, useMeQuery } from '../hooks/use-me-query'
import { clearActiveOrganizationId } from '../utils/active-organization-storage'
import { clearStoredTokens, hasStoredTokensSnapshot, readStoredTokens, storeTokens, subscribeToStoredTokens } from '../utils/auth-storage'
import { LoadingUser } from './loading-user'
import { LoadUserError } from './load-user-error'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()
  // Whatever signs this tab out (another tab, the interceptor, logout) must also drop the previous user's data
  // Stable per query client, so useSyncExternalStore does not resubscribe on every render
  const subscribeToTokenChanges = useCallback(
    (onChange: () => void) =>
      subscribeToStoredTokens(() => {
        if (!hasStoredTokensSnapshot()) {
          queryClient.clear()
          clearActiveOrganizationId()
        }
        onChange()
      }),
    [queryClient],
  )
  const hasStoredTokens = useSyncExternalStore(subscribeToTokenChanges, hasStoredTokensSnapshot)
  const meQuery = useMeQuery(hasStoredTokens)

  const setSession = (session: LoginUserResponse) => {
    // The user goes in first so the tokens showing up never triggers a fetch of `me`
    queryClient.setQueryData(ME_QUERY_KEY, session.user)
    storeTokens(session)
  }

  const logout = async () => {
    const tokens = readStoredTokens()
    // The subscriber clears the cached data and the active organization once the tokens are gone
    clearStoredTokens()
    if (!tokens) return
    try {
      await authApi.logout(tokens.refreshToken)
    } catch {
      // The tokens are already gone from this browser; a failed revoke only leaves a token that expires on its own
    }
  }

  const handleRetry = () => {
    void meQuery.refetch()
  }

  if (hasStoredTokens && meQuery.isPending) {
    return <LoadingUser />
  }

  if (hasStoredTokens && meQuery.isError) {
    return <LoadUserError onRetry={handleRetry} />
  }

  const user = hasStoredTokens ? (meQuery.data ?? null) : null
  const value: AuthContextValue = user ? { status: 'authenticated', user, setSession, logout } : { status: 'anonymous', user: null, setSession, logout }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
