import { useMutation, useQueryClient } from '@tanstack/react-query'
import { attendanceApi } from '../api/attendance-api'
import type { RegisterParams } from '../api/attendance-api'
import { registerQueryKey } from './use-attendance-register'

/** Marks every unmarked student present, keeps the register the server answers with, and asks for it again once settled */
export function useMarkAllPresent(params: RegisterParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => attendanceApi.markAllPresent(params),
    onSuccess: (register) => queryClient.setQueryData(registerQueryKey(params), register),
    onSettled: () => queryClient.invalidateQueries({ queryKey: registerQueryKey(params) }),
  })
}
