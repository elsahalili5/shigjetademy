import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { LoginUserResponse } from '@shigjetademy/shared/auth'
import { AuthContext } from './auth-context'
import type { AuthContextValue } from './auth-context'
import { authApi } from '../api/auth-api'
import { ME_QUERY_KEY, useMeQuery } from '../hooks/use-me-query'
import { clearStoredTokens, readStoredTokens, storeTokens } from '../utils/auth-storage'
import { LoadingUser } from './loading-user'
import { LoadUserError } from './load-user-error'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()
  const [hasStoredTokens, setHasStoredTokens] = useState(() => readStoredTokens() !== null)
  const meQuery = useMeQuery(hasStoredTokens)

  const setSession = (session: LoginUserResponse) => {
    storeTokens(session)
    queryClient.setQueryData(ME_QUERY_KEY, session.user)
    setHasStoredTokens(true)
  }

  const logout = async () => {
    const tokens = readStoredTokens()
    clearStoredTokens()
    setHasStoredTokens(false)
    queryClient.clear()
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
