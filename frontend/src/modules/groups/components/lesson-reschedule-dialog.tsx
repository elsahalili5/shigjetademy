import { useId } from 'react'
import type { ChangeEvent, RefObject } from 'react'
import type { Group, LessonRescheduleInput } from '@shigjetademy/shared/groups'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { SelectField } from '#/components/SelectField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useLessonRescheduleForm } from '../hooks/use-lesson-reschedule-form'
import { useRescheduleLesson } from '../hooks/use-reschedule-lesson'
import { getScheduleOnDay } from '../utils/schedule-on-day'

export type LessonRescheduleDialogMode = {
  openCount: number
}

interface LessonRescheduleDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  group: Group
  mode: LessonRescheduleDialogMode
}

/** Moves one lesson of the group to another date and time; the weekly schedule stays as it is */
export function LessonRescheduleDialog({ dialogRef, organizationId, group, mode }: LessonRescheduleDialogProps) {
  const handleClose = () => dialogRef.current?.close()

  return (
    <FormDialog dialogRef={dialogRef} title="Reschedule a lesson" subtitle="Move one lesson to another date and time. The weekly schedule stays as it is." onClose={handleClose}>
      {/* A new key per opening remounts the form, so an old choice and error don't come back */}
      <LessonRescheduleForm key={mode.openCount} organizationId={organizationId} group={group} onDone={handleClose} />
    </FormDialog>
  )
}

interface LessonRescheduleFormProps {
  organizationId: string
  group: Group
  onDone: () => void
}

function LessonRescheduleForm({ organizationId, group, onDone }: LessonRescheduleFormProps) {
  const form = useLessonRescheduleForm()
  const rescheduleLesson = useRescheduleLesson({ organizationId, groupId: group.id })
  const ids = { originalDate: useId(), lesson: useId(), newDate: useId(), start: useId(), end: useId(), reason: useId() }
  const originalDate = form.watch('original_date')
  const lessons = getScheduleOnDay({ schedule: group.schedule, day: originalDate })
  const isPending = rescheduleLesson.isPending
  const fieldError = (fieldName: keyof LessonRescheduleInput) => getFieldError<LessonRescheduleInput>({ fieldName, formErrors: form.formState.errors, backendError: rescheduleLesson.error })

  // Another day has other lessons, so the choice starts over
  const handleDateChange = () => form.setValue('original_start_time', '')

  // The new slot starts as the lesson's own day and times
  const handleLessonChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const lesson = lessons.find((entry) => entry.start_time === event.target.value)
    if (!lesson) return
    form.setValue('new_date', originalDate)
    form.setValue('new_start_time', lesson.start_time)
    form.setValue('new_end_time', lesson.end_time)
  }

  const handleSubmit = form.handleSubmit((input: LessonRescheduleInput) => rescheduleLesson.mutate(input, { onSuccess: onDone }))

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <AuthField id={ids.originalDate} label="Lesson date" type="date" disabled={isPending} error={fieldError('original_date')} {...form.register('original_date', { onChange: handleDateChange })} />
          <SelectField id={ids.lesson} label="Lesson" disabled={isPending} error={fieldError('original_start_time')} {...form.register('original_start_time', { onChange: handleLessonChange })}>
            <option value="">Choose a lesson</option>
            {lessons.map((lesson) => (
              <option key={lesson.start_time} value={lesson.start_time}>
                {lesson.start_time}–{lesson.end_time}
              </option>
            ))}
          </SelectField>
        </div>
        {originalDate && lessons.length === 0 ? <p className="text-ink-2">The group has no lesson on this day.</p> : null}
        <AuthField id={ids.newDate} label="New date" type="date" disabled={isPending} error={fieldError('new_date')} {...form.register('new_date')} />
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <AuthField id={ids.start} label="Start time" type="time" disabled={isPending} error={fieldError('new_start_time')} {...form.register('new_start_time')} />
          <AuthField id={ids.end} label="End time" type="time" disabled={isPending} error={fieldError('new_end_time')} {...form.register('new_end_time')} />
        </div>
        <AuthField id={ids.reason} label="Reason (optional)" autoComplete="off" disabled={isPending} error={fieldError('reason')} {...form.register('reason')} />
        {rescheduleLesson.isError ? <FormAlert>{getErrorMessage(rescheduleLesson.error)}</FormAlert> : null}
      </div>
      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
          Reschedule lesson
        </button>
      </footer>
    </form>
  )
}
