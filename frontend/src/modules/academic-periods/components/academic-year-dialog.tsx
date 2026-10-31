import { useId } from 'react'
import type { RefObject } from 'react'
import type { AcademicYear, AcademicYearInput } from '@shigjetademy/shared/academic-periods'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useAcademicYearForm } from '../hooks/use-academic-year-form'
import { useSaveAcademicYear } from '../hooks/use-save-academic-year'

export type AcademicYearDialogMode = { kind: 'add'; isFirst: boolean } | { kind: 'edit'; year: AcademicYear }

interface AcademicYearDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  mode: AcademicYearDialogMode
  /** Changes on every open, so the form starts over */
  formSession: number
  onSaved: (saved: AcademicYear) => void
}

export function AcademicYearDialog({ dialogRef, organizationId, mode, formSession, onSaved }: AcademicYearDialogProps) {
  const isEditing = mode.kind === 'edit'
  // A new key per open remounts the form, so it starts from that mode's values
  const formKey = `${isEditing ? mode.year.id : 'add'}-${formSession}`

  const handleClose = () => dialogRef.current?.close()

  const handleSaved = (saved: AcademicYear) => {
    handleClose()
    onSaved(saved)
  }

  return (
    <FormDialog
      dialogRef={dialogRef}
      title={isEditing ? `Edit ${mode.year.name}` : 'Add a school year'}
      subtitle="The dates your organization teaches between, from the first day to the last."
      onClose={handleClose}
    >
      <AcademicYearForm key={formKey} organizationId={organizationId} mode={mode} onSaved={handleSaved} onCancel={handleClose} />
    </FormDialog>
  )
}

interface AcademicYearFormProps {
  organizationId: string
  mode: AcademicYearDialogMode
  onSaved: (saved: AcademicYear) => void
  onCancel: () => void
}

function AcademicYearForm({ organizationId, mode, onSaved, onCancel }: AcademicYearFormProps) {
  const year = mode.kind === 'edit' ? mode.year : undefined
  const isFirst = mode.kind === 'add' && mode.isFirst
  const yearForm = useAcademicYearForm({ year, isFirst })
  const saveYear = useSaveAcademicYear(organizationId)
  const ids = { name: useId(), start: useId(), end: useId(), isCurrent: useId(), currentHint: useId() }
  const { form } = yearForm
  const { errors } = form.formState
  const isPending = saveYear.isPending
  // The first year is always current, and the current one only changes by making another year current
  const isCurrentLocked = isFirst || !!year?.is_current
  const fieldError = (fieldName: keyof AcademicYearInput) => getFieldError<AcademicYearInput>({ fieldName, formErrors: errors, backendError: saveYear.error })

  const handleSubmit = form.handleSubmit((input: AcademicYearInput) => {
    saveYear.mutate({ yearId: year?.id, input }, { onSuccess: onSaved })
  })

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <AuthField id={ids.start} label="Starts" type="date" disabled={isPending} error={fieldError('start_date')} {...yearForm.startDateField} />
          <AuthField id={ids.end} label="Ends" type="date" disabled={isPending} error={fieldError('end_date')} {...yearForm.endDateField} />
        </div>
        <AuthField id={ids.name} label="Name" autoComplete="off" placeholder="2026–27" disabled={isPending} error={fieldError('name')} {...form.register('name')} />
        <div className="flex items-start gap-3 rounded-xl border border-rule-strong px-3.5 py-3 has-disabled:bg-mist/60">
          {isCurrentLocked ? (
            <input id={ids.isCurrent} type="checkbox" className="mt-1 size-4 accent-green-deep" aria-describedby={ids.currentHint} checked disabled readOnly />
          ) : (
            <input
              id={ids.isCurrent}
              type="checkbox"
              className="mt-1 size-4 accent-green-deep"
              aria-describedby={ids.currentHint}
              disabled={isPending}
              {...form.register('is_current')}
            />
          )}
          <span className="grid gap-0.5">
            <label htmlFor={ids.isCurrent} className="font-semibold">
              Current year
            </label>
            <span id={ids.currentHint} className="text-[0.93rem] text-ink-3">
              <CurrentYearHint isFirst={isFirst} isCurrent={!!year?.is_current} />
            </span>
          </span>
        </div>

        {saveYear.isError ? <FormAlert>{getErrorMessage(saveYear.error)}</FormAlert> : null}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
          {year ? 'Save changes' : 'Add year'}
        </button>
      </footer>
    </form>
  )
}

interface CurrentYearHintProps {
  isFirst: boolean
  isCurrent: boolean
}

function CurrentYearHint({ isFirst, isCurrent }: CurrentYearHintProps) {
  if (isFirst) return <>Your first year is always the current one.</>
  if (isCurrent) return <>To change this, make another year current.</>
  return <>The current year stops being current.</>
}
