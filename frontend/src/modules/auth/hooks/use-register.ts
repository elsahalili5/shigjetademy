import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth-api'
import { useAuth } from './use-auth'

// Sign-up returns a session straight away, so the new owner is logged in
export function useRegister() {
  const auth = useAuth()
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (session) => auth.setSession(session),
  })
}
