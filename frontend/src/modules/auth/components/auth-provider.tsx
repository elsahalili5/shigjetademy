import { useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { AuthUser, LoginUserResponse, RoleType } from '@shigjetademy/shared/auth'
import { AuthContext, ME_QUERY_KEY } from './auth-context'
import type { AuthContextValue } from './auth-context'
import { isApiError } from '#/api/client'
import { authApi } from '../api/auth-api'
import { clearStoredTokens, readStoredTokens, storeTokens } from '../utils/auth-storage'
import { LoadingUser } from './loading-user'

// A rejected token means the stored session is over; anything else (offline, 500) is a real error
const fetchCurrentUser = async (): Promise<AuthUser | null> => {
  try {
    return await authApi.me()
  } catch (error) {
    if (isApiError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
      clearStoredTokens()
      return null
    }
    throw error
  }
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()
  const [hasStoredTokens, setHasStoredTokens] = useState(() => readStoredTokens() !== null)
  const meQuery = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchCurrentUser,
    enabled: hasStoredTokens,
    retry: false,
    staleTime: Infinity,
  })

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

  if (hasStoredTokens && meQuery.isPending) {
    return <LoadingUser />
  }

  const user = hasStoredTokens ? (meQuery.data ?? null) : null
  const hasRole = (role: RoleType) => user?.user_roles.some((userRole) => userRole.role.name === role) ?? false
  const value: AuthContextValue = user
    ? { status: 'authenticated', user, setSession, logout, hasRole }
    : { status: 'anonymous', user: null, setSession, logout, hasRole }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
