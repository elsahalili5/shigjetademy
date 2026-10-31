import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { academicHolidaySchema, academicTermSchema } from '@shigjetademy/shared/academic-periods'
import type { YearPeriod, YearPeriodInput, YearPeriodKind } from '../utils/year-periods'

const SCHEMAS = { term: academicTermSchema, holiday: academicHolidaySchema } as const

type UseYearPeriodFormParams = {
  periodKind: YearPeriodKind
  /** The term or holiday being edited, or none when adding */
  period?: YearPeriod
}

export function useYearPeriodForm({ periodKind, period }: UseYearPeriodFormParams) {
  return useForm<YearPeriodInput>({
    resolver: zodResolver(SCHEMAS[periodKind]),
    defaultValues: { name: period?.name ?? '', start_date: period?.start_date ?? '', end_date: period?.end_date ?? '' },
  })
}
