import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { academicYearSchema } from '@shigjetademy/shared/academic-periods'
import type { AcademicYear, AcademicYearInput } from '@shigjetademy/shared/academic-periods'
import { suggestYearName } from '../utils/year-name'

type UseAcademicYearFormParams = {
  /** The year being edited, or none when adding */
  year?: AcademicYear
  /** The first year is always the current one */
  isFirst: boolean
}

export function useAcademicYearForm({ year, isFirst }: UseAcademicYearFormParams) {
  const form = useForm<AcademicYearInput>({
    resolver: zodResolver(academicYearSchema),
    defaultValues: {
      name: year?.name ?? '',
      start_date: year?.start_date ?? '',
      end_date: year?.end_date ?? '',
      is_current: year?.is_current ?? isFirst,
    },
  })
  // Reading dirtyFields subscribes to it, so the name field's isDirty is kept up to date
  const { dirtyFields } = form.formState
  // A year named by hand keeps its name when its dates change
  const isNameSuggested = !year || year.name === suggestYearName(year)

  // The name follows the dates ("2026–27") until the user writes their own
  const handleDateChange = () => {
    if (!isNameSuggested || dirtyFields.name) return
    form.setValue('name', suggestYearName(form.getValues()))
  }

  const startDateField = form.register('start_date', { onChange: handleDateChange })
  const endDateField = form.register('end_date', { onChange: handleDateChange })

  return { form, startDateField, endDateField }
}
