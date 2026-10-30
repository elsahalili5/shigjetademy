import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth-api'
import { useAuth } from './use-auth'

export function useLogin() {
  const auth = useAuth()
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (session) => auth.setSession(session),
  })
}
