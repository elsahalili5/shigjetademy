import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AcademicYear } from '@shigjetademy/shared/academic-periods'
import { academicYearsApi } from '../api/academic-years-api'
import { withoutYear } from '../utils/academic-year-cache'
import { academicYearsQueryKey } from './use-academic-years'

// Its terms and holidays leave the cache with it, as they do on the server
export function useRemoveAcademicYear(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: academicYearsApi.remove,
    onSuccess: (_, { yearId, newCurrentId }) =>
      queryClient.setQueryData<AcademicYear[]>(academicYearsQueryKey(organizationId), (years) => (years ? withoutYear({ years, yearId, newCurrentId }) : years)),
  })
}
