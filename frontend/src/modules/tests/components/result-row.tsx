import { useWatch } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { TEST_FEEDBACK_MAX_LENGTH } from '@shigjetademy/shared/tests'
import type { TestStudent } from '@shigjetademy/shared/tests'
import { FieldError, INPUT_CLASS } from '#/modules/auth/components/auth-field'
import { fullName } from '#/lib/full-name'
import type { ResultsFormValues } from '../utils/results-form'

const CELL_CLASS = 'px-4 py-3 align-top'

interface ResultRowProps {
  form: UseFormReturn<ResultsFormValues>
  index: number
  student: TestStudent
  isDisabled: boolean
}

/** One student's line on the sheet: points, unless they were absent, and a note */
export function ResultRow({ form, index, student, isDisabled }: ResultRowProps) {
  const isAbsent = useWatch({ control: form.control, name: `rows.${index}.is_absent` })
  const name = fullName(student)
  const pointsError = form.formState.errors.rows?.[index]?.points?.message
  const pointsErrorId = `results-${student.id}-points-error`

  return (
    <tr className="border-b border-rule last:border-b-0">
      <th scope="row" className={`${CELL_CLASS} text-left`}>
        <span className="block font-semibold">{name}</span>
        <span className="block text-[0.9rem] font-normal text-ink-3">{student.student_number}</span>
      </th>
      <td className={CELL_CLASS}>
        <input
          inputMode="numeric"
          className={`${INPUT_CLASS} w-24`}
          aria-label={`Points for ${name}`}
          aria-invalid={!!pointsError}
          aria-describedby={pointsError ? pointsErrorId : undefined}
          disabled={isDisabled || isAbsent}
          {...form.register(`rows.${index}.points`)}
        />
        {pointsError ? <FieldError id={pointsErrorId}>{pointsError}</FieldError> : null}
      </td>
      <td className={CELL_CLASS}>
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" className="size-4 accent-green-deep" disabled={isDisabled} {...form.register(`rows.${index}.is_absent`)} />
          <span className="sr-only">{name} was absent</span>
          <span aria-hidden="true">Absent</span>
        </label>
      </td>
      <td className={CELL_CLASS}>
        <input className={`${INPUT_CLASS} min-w-48`} maxLength={TEST_FEEDBACK_MAX_LENGTH} aria-label={`Note for ${name}`} disabled={isDisabled} {...form.register(`rows.${index}.feedback`)} />
      </td>
    </tr>
  )
}
