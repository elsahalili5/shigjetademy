import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AcademicYear } from '@shigjetademy/shared/academic-periods'
import { yearPeriodsApi } from '../api/year-periods-api'
import { withoutYearPeriod } from '../utils/year-period-cache'
import { academicYearsQueryKey } from './use-academic-years'

export function useRemoveYearPeriod(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: yearPeriodsApi.remove,
    onSuccess: (_, { yearId, periodKind, periodId }) =>
      queryClient.setQueryData<AcademicYear[]>(academicYearsQueryKey(organizationId), (years) =>
        years ? withoutYearPeriod({ years, yearId, periodKind, periodId }) : years,
      ),
  })
}
