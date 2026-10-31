import { apiClient } from '#/api/client'
import { YEAR_PERIOD_KINDS } from '../utils/year-periods'
import type { YearPeriod, YearPeriodInput, YearPeriodKind } from '../utils/year-periods'

type YearPeriodScope = {
  organizationId: string
  yearId: string
  periodKind: YearPeriodKind
}

const periodsPath = ({ organizationId, yearId, periodKind }: YearPeriodScope) =>
  `/organizations/${organizationId}/academic-periods/years/${yearId}/${YEAR_PERIOD_KINDS[periodKind].path}`

type CreateYearPeriodParams = YearPeriodScope & {
  input: YearPeriodInput
}

type UpdateYearPeriodParams = CreateYearPeriodParams & {
  periodId: string
}

type RemoveYearPeriodParams = YearPeriodScope & {
  periodId: string
}

// Terms and holidays take the same fields at parallel paths under their year
export const yearPeriodsApi = {
  create: ({ input, ...scope }: CreateYearPeriodParams) => apiClient.post<YearPeriod, YearPeriodInput>(periodsPath(scope), input),
  update: ({ input, periodId, ...scope }: UpdateYearPeriodParams) => apiClient.put<YearPeriod, YearPeriodInput>(`${periodsPath(scope)}/${periodId}`, input),
  remove: ({ periodId, ...scope }: RemoveYearPeriodParams) => apiClient.delete<unknown>(`${periodsPath(scope)}/${periodId}`),
}
