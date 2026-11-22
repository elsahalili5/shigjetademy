import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import type { TestSheetRow } from '@shigjetademy/shared/tests'
import { createResultsFormSchema, toResultsFormValues } from '../utils/results-form'
import type { ResultsFormValues } from '../utils/results-form'

type UseResultsFormParams = {
  maxPoints: number
  rows: TestSheetRow[]
}

export function useResultsForm({ maxPoints, rows }: UseResultsFormParams) {
  return useForm<ResultsFormValues>({ resolver: zodResolver(createResultsFormSchema(maxPoints)), defaultValues: toResultsFormValues(rows) })
}
