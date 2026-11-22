import type { FormEvent } from 'react'
import type { TestSheet } from '@shigjetademy/shared/tests'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage } from '#/lib/error-message'
import type { useRecordResults } from '../hooks/use-record-results'
import { useResultsForm } from '../hooks/use-results-form'
import { toRecordInput } from '../utils/results-form'
import type { ResultsFormValues } from '../utils/results-form'
import { ResultRow } from './result-row'

const HEADER_CELL_CLASS = 'px-4 py-3 text-left text-[0.87rem] font-[650] text-ink-3'

interface ResultsSheetProps {
  sheet: TestSheet
  /** Owned by the page, so its saved line outlives this form, which starts again from each saved sheet */
  recordResults: ReturnType<typeof useRecordResults>
}

/** Every enrolled student's points, absence and note, saved together; read-only once the group is archived */
export function ResultsSheet({ sheet, recordResults }: ResultsSheetProps) {
  const form = useResultsForm({ maxPoints: sheet.max_points, rows: sheet.rows })
  const isReadOnly = !sheet.can_edit
  const isPending = recordResults.isPending

  // The saved sheet replaces this form through its key, so saving only sends the values
  const handleValid = (values: ResultsFormValues) => recordResults.mutate(toRecordInput(values))

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => void form.handleSubmit(handleValid)(event)

  // Editing again after a save takes the saved line away
  const handleChange = () => {
    if (recordResults.isSuccess) recordResults.reset()
  }

  return (
    <form noValidate onSubmit={handleSubmit} onChange={handleChange}>
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse" aria-label={`Results for ${sheet.title}`}>
          <thead className="border-b border-rule">
            <tr>
              <th scope="col" className={HEADER_CELL_CLASS}>
                Student
              </th>
              <th scope="col" className={HEADER_CELL_CLASS}>
                Points / {sheet.max_points}
              </th>
              <th scope="col" className={HEADER_CELL_CLASS}>
                Absent
              </th>
              <th scope="col" className={HEADER_CELL_CLASS}>
                Note
              </th>
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, index) => (
              <ResultRow key={row.student.id} form={form} index={index} student={row.student} isDisabled={isReadOnly || isPending} />
            ))}
          </tbody>
        </table>
      </div>
      {isReadOnly ? null : (
        <div className="grid gap-3 border-t border-rule px-5 py-4">
          {recordResults.error ? <FormAlert>{getErrorMessage(recordResults.error)}</FormAlert> : null}
          {recordResults.isSuccess ? (
            <p className="text-[0.93rem] font-[550] text-green-deep" role="status">
              Results saved. Students see them now.
            </p>
          ) : null}
          <button type="submit" className="button button--primary min-h-10 w-fit px-4 text-base" disabled={isPending}>
            {isPending ? 'Saving…' : 'Save results'}
          </button>
        </div>
      )}
    </form>
  )
}
