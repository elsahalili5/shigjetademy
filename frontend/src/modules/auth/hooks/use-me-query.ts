import { useQuery } from '@tanstack/react-query'
import type { AuthUser } from '@shigjetademy/shared/auth'
import { isApiError } from '#/api/client'
import { authApi } from '../api/auth-api'
import { clearStoredTokens } from '../utils/auth-storage'

export const ME_QUERY_KEY = ['auth', 'me'] as const

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

/** The signed-in user behind the stored tokens; the route guards read the same cache entry */
export function useMeQuery(hasStoredTokens: boolean) {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: fetchCurrentUser,
    enabled: hasStoredTokens,
    retry: false,
    staleTime: Infinity,
  })
}
