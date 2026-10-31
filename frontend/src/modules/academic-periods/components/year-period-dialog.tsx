import { useId } from 'react'
import type { RefObject } from 'react'
import type { AcademicYear } from '@shigjetademy/shared/academic-periods'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { useFormatDay } from '#/lib/use-format-date'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useSaveYearPeriod } from '../hooks/use-save-year-period'
import { useYearPeriodForm } from '../hooks/use-year-period-form'
import { formatDayRange } from '../utils/format'
import type { YearPeriod, YearPeriodInput, YearPeriodKind } from '../utils/year-periods'

const COPY = {
  term: { addTitle: 'Add a term to', addButton: 'Add term', placeholder: 'Autumn term', hint: '' },
  holiday: { addTitle: 'Add a holiday to', addButton: 'Add holiday', placeholder: 'Winter break', hint: ' For one day, end it on the day it starts.' },
} as const satisfies Record<YearPeriodKind, { addTitle: string; addButton: string; placeholder: string; hint: string }>

export type YearPeriodDialogMode = { periodKind: YearPeriodKind; year: AcademicYear } & ({ action: 'add' } | { action: 'edit'; period: YearPeriod })

interface YearPeriodDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  /** Null until a term or holiday is first added or edited */
  mode: YearPeriodDialogMode | null
  /** Changes on every open, so the form starts over */
  formSession: number
  onSaved: (saved: YearPeriod) => void
}

const getTitle = (mode: YearPeriodDialogMode) => (mode.action === 'edit' ? `Edit ${mode.period.name}` : `${COPY[mode.periodKind].addTitle} ${mode.year.name}`)

type GetSubtitleParams = {
  mode: YearPeriodDialogMode
  formatDay: (day: string) => string
}

const getSubtitle = ({ mode, formatDay }: GetSubtitleParams) => `Inside ${mode.year.name}: ${formatDayRange({ range: mode.year, formatDay })}.${COPY[mode.periodKind].hint}`

/** Adds or edits a term or a holiday inside its year */
export function YearPeriodDialog({ dialogRef, organizationId, mode, formSession, onSaved }: YearPeriodDialogProps) {
  const formatDay = useFormatDay()
  const handleClose = () => dialogRef.current?.close()

  const handleSaved = (saved: YearPeriod) => {
    handleClose()
    onSaved(saved)
  }

  // The key changes on every open, so the form remounts from that mode's values
  return (
    <FormDialog dialogRef={dialogRef} title={mode ? getTitle(mode) : ''} subtitle={mode ? getSubtitle({ mode, formatDay }) : ''} onClose={handleClose}>
      {mode ? <YearPeriodForm key={formSession} organizationId={organizationId} mode={mode} onSaved={handleSaved} onCancel={handleClose} /> : null}
    </FormDialog>
  )
}

interface YearPeriodFormProps {
  organizationId: string
  mode: YearPeriodDialogMode
  onSaved: (saved: YearPeriod) => void
  onCancel: () => void
}

function YearPeriodForm({ organizationId, mode, onSaved, onCancel }: YearPeriodFormProps) {
  const period = mode.action === 'edit' ? mode.period : undefined
  const form = useYearPeriodForm({ periodKind: mode.periodKind, period })
  const savePeriod = useSaveYearPeriod({ organizationId, yearId: mode.year.id, periodKind: mode.periodKind })
  const ids = { name: useId(), start: useId(), end: useId() }
  const { errors } = form.formState
  const isPending = savePeriod.isPending
  const copy = COPY[mode.periodKind]
  const fieldError = (fieldName: keyof YearPeriodInput) => getFieldError<YearPeriodInput>({ fieldName, formErrors: errors, backendError: savePeriod.error })

  const handleSubmit = form.handleSubmit((input: YearPeriodInput) => {
    savePeriod.mutate({ periodId: period?.id, input }, { onSuccess: onSaved })
  })

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 overflow-y-auto px-6 py-5">
        <AuthField id={ids.name} label="Name" autoComplete="off" placeholder={copy.placeholder} disabled={isPending} error={fieldError('name')} {...form.register('name')} />
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <AuthField
            id={ids.start}
            label="Starts"
            type="date"
            min={mode.year.start_date}
            max={mode.year.end_date}
            disabled={isPending}
            error={fieldError('start_date')}
            {...form.register('start_date')}
          />
          <AuthField
            id={ids.end}
            label="Ends"
            type="date"
            min={mode.year.start_date}
            max={mode.year.end_date}
            disabled={isPending}
            error={fieldError('end_date')}
            {...form.register('end_date')}
          />
        </div>

        {savePeriod.isError ? <FormAlert>{getErrorMessage(savePeriod.error)}</FormAlert> : null}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
          {period ? 'Save changes' : copy.addButton}
        </button>
      </footer>
    </form>
  )
}
