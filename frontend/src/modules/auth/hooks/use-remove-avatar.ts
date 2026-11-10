import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth-api'
import { ME_QUERY_KEY } from './use-me-query'

// The saved user replaces the cached one, so the avatar disappears everywhere at once
export function useRemoveAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authApi.removeAvatar,
    onSuccess: (user) => queryClient.setQueryData(ME_QUERY_KEY, user),
  })
}
