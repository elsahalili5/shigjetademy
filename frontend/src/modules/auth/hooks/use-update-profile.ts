import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth-api'
import { ME_QUERY_KEY } from './use-me-query'

// The saved user replaces the cached one, so the sidebar shows the new name at once
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (user) => queryClient.setQueryData(ME_QUERY_KEY, user),
  })
}
