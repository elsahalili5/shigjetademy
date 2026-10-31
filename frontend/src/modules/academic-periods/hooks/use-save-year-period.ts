import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AcademicYear } from '@shigjetademy/shared/academic-periods'
import { yearPeriodsApi } from '../api/year-periods-api'
import { withSavedYearPeriod } from '../utils/year-period-cache'
import type { YearPeriodInput, YearPeriodKind } from '../utils/year-periods'
import { academicYearsQueryKey } from './use-academic-years'

type UseSaveYearPeriodParams = {
  organizationId: string
  yearId: string
  periodKind: YearPeriodKind
}

type SaveYearPeriodParams = {
  /** Absent when adding */
  periodId?: string
  input: YearPeriodInput
}

// Adds or edits a term or holiday; the saved one goes into its year in the cache, so it shows without a refetch
export function useSaveYearPeriod({ organizationId, yearId, periodKind }: UseSaveYearPeriodParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ periodId, input }: SaveYearPeriodParams) =>
      periodId
        ? yearPeriodsApi.update({ organizationId, yearId, periodKind, periodId, input })
        : yearPeriodsApi.create({ organizationId, yearId, periodKind, input }),
    onSuccess: (saved) =>
      queryClient.setQueryData<AcademicYear[]>(academicYearsQueryKey(organizationId), (years) =>
        years ? withSavedYearPeriod({ years, yearId, periodKind, saved }) : years,
      ),
  })
}
