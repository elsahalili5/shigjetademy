import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth-api'
import { storeTokens } from '../utils/auth-storage'

// The server revokes every old session and sends this one a fresh pair of tokens
export function useChangePassword() {
  return useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: (tokens) => storeTokens(tokens),
  })
}
