import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { AcademicYear, AcademicYearInput } from '@shigjetademy/shared/academic-periods'
import { academicYearsApi } from '../api/academic-years-api'
import { withSavedYear } from '../utils/academic-year-cache'
import { academicYearsQueryKey } from './use-academic-years'

type SaveAcademicYearParams = {
  /** Absent when adding a new year */
  yearId?: string
  input: AcademicYearInput
}

// Adds or edits a year; the saved one goes into the cached list, so it shows without a refetch
export function useSaveAcademicYear(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ yearId, input }: SaveAcademicYearParams) =>
      yearId ? academicYearsApi.update({ organizationId, yearId, ...input }) : academicYearsApi.create({ organizationId, ...input }),
    onSuccess: (saved) => queryClient.setQueryData<AcademicYear[]>(academicYearsQueryKey(organizationId), (years) => withSavedYear({ years: years ?? [], saved })),
  })
}
