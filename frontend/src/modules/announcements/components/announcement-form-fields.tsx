import { useId } from 'react'
import type { FormEventHandler } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { ANNOUNCEMENT_BODY_MAX_LENGTH, ANNOUNCEMENT_TITLE_MAX_LENGTH } from '@shigjetademy/shared/announcements'
import type { AnnouncementAudienceKind, AnnouncementAudienceOptions, AnnouncementPublishMode } from '@shigjetademy/shared/announcements'
import { FormAlert } from '#/components/FormAlert'
import { SelectField } from '#/components/SelectField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { FieldError, INPUT_CLASS } from '#/modules/auth/components/auth-field'
import type { AnnouncementFormValues } from '../utils/announcement-form'
import { AUDIENCE_ROLE_LABELS } from '../utils/audience-label'

const AUDIENCE_KIND_LABELS = {
  SCHOOL: 'Whole school',
  ROLE: 'A role',
  COURSE: 'A course',
  GROUP: 'A group',
} as const satisfies Record<AnnouncementAudienceKind, string>

const PUBLISH_MODE_LABELS = {
  DRAFT: 'Save as draft',
  NOW: 'Publish now',
  SCHEDULED: 'Schedule',
} as const satisfies Record<AnnouncementPublishMode, string>

const SUBMIT_LABELS = {
  DRAFT: 'Save draft',
  NOW: 'Publish',
  SCHEDULED: 'Schedule',
} as const satisfies Record<AnnouncementPublishMode, string>

const PUBLISH_MODES = ['DRAFT', 'NOW', 'SCHEDULED'] as const satisfies readonly AnnouncementPublishMode[]

/** The audience kinds the member can pick: only those with something to pick */
const getAudienceKinds = (options: AnnouncementAudienceOptions) =>
  [
    ...(options.can_address_school ? (['SCHOOL'] as const) : []),
    ...(options.roles.length > 0 ? (['ROLE'] as const) : []),
    ...(options.courses.length > 0 ? (['COURSE'] as const) : []),
    ...(options.groups.length > 0 ? (['GROUP'] as const) : []),
  ] satisfies AnnouncementAudienceKind[]

interface AnnouncementFormFieldsProps {
  form: UseFormReturn<AnnouncementFormValues>
  options: AnnouncementAudienceOptions
  /** Who it is for in words, when that can't change: it is shown instead of the pickers */
  lockedAudienceLabel: string | null
  /** The announcement is already out, so it has no publishing choice */
  isPublishingLocked: boolean
  isPending: boolean
  error: unknown
  timeZone: string
  onSubmit: FormEventHandler<HTMLFormElement>
  onCancel: () => void
}

/** The announcement form: title, message, audience, and when it goes out */
export function AnnouncementFormFields({ form, options, lockedAudienceLabel, isPublishingLocked, isPending, error, timeZone, onSubmit, onCancel }: AnnouncementFormFieldsProps) {
  const ids = { title: useId(), body: useId(), kind: useId(), role: useId(), course: useId(), group: useId(), day: useId(), time: useId() }
  const { errors } = form.formState
  const kind = form.watch('audience_kind')
  const mode = form.watch('publish_mode')
  const fieldError = (fieldName: keyof AnnouncementFormValues) => getFieldError<AnnouncementFormValues>({ fieldName, formErrors: errors, backendError: error })
  const titleError = fieldError('title')
  const bodyError = fieldError('body')
  const kinds = getAudienceKinds(options)
  const submitLabel = isPublishingLocked ? 'Save changes' : SUBMIT_LABELS[mode]

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={onSubmit}>
      <div className="grid gap-5 overflow-y-auto px-6 py-5">
        <div className="grid gap-1.5">
          <label className="text-[0.987rem] font-[650]" htmlFor={ids.title}>
            Title
          </label>
          <input id={ids.title} className={INPUT_CLASS} maxLength={ANNOUNCEMENT_TITLE_MAX_LENGTH} aria-invalid={!!titleError} aria-describedby={titleError ? `${ids.title}-error` : undefined} disabled={isPending} {...form.register('title')} />
          {titleError ? <FieldError id={`${ids.title}-error`}>{titleError}</FieldError> : null}
        </div>

        <div className="grid gap-1.5">
          <label className="text-[0.987rem] font-[650]" htmlFor={ids.body}>
            Message
          </label>
          <textarea
            id={ids.body}
            className={`${INPUT_CLASS} min-h-[140px] resize-y py-3`}
            maxLength={ANNOUNCEMENT_BODY_MAX_LENGTH}
            aria-invalid={!!bodyError}
            aria-describedby={bodyError ? `${ids.body}-error` : undefined}
            disabled={isPending}
            {...form.register('body')}
          />
          {bodyError ? <FieldError id={`${ids.body}-error`}>{bodyError}</FieldError> : null}
        </div>

        {lockedAudienceLabel ? (
          <div className="grid gap-1">
            <p className="text-[0.987rem] font-[650]">Sent to</p>
            <p>{lockedAudienceLabel}</p>
            <p className="text-[0.9rem] text-ink-3">Only school staff can change who an announcement is for once it is out.</p>
          </div>
        ) : (
        <fieldset className="grid gap-4 sm:grid-cols-2" disabled={isPending}>
          <legend className="sr-only">Who it is for</legend>
          <SelectField id={ids.kind} label="Send to" error={fieldError('audience_kind')} {...form.register('audience_kind')}>
            {kinds.map((item) => (
              <option key={item} value={item}>
                {AUDIENCE_KIND_LABELS[item]}
              </option>
            ))}
          </SelectField>
          {kind === 'ROLE' ? (
            <SelectField id={ids.role} label="Role" error={fieldError('audience_role')} {...form.register('audience_role')}>
              <option value="">Choose a role</option>
              {options.roles.map((role) => (
                <option key={role} value={role}>
                  {AUDIENCE_ROLE_LABELS[role]}
                </option>
              ))}
            </SelectField>
          ) : null}
          {kind === 'COURSE' ? (
            <SelectField id={ids.course} label="Course" error={fieldError('course_id')} {...form.register('course_id')}>
              <option value="">Choose a course</option>
              {options.courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </SelectField>
          ) : null}
          {kind === 'GROUP' ? (
            <SelectField id={ids.group} label="Group" error={fieldError('group_id')} {...form.register('group_id')}>
              <option value="">Choose a group</option>
              {options.groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.course_name} · {group.name}
                </option>
              ))}
            </SelectField>
          ) : null}
        </fieldset>
        )}

        {isPublishingLocked ? null : (
          <fieldset className="grid gap-2" disabled={isPending}>
            <legend className="mb-1 text-[0.987rem] font-[650]">When</legend>
            {PUBLISH_MODES.map((item) => (
              <label key={item} className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2 hover:bg-mist has-checked:border-green-deep has-checked:bg-green-wash">
                <input type="radio" className="size-4 accent-green-deep" value={item} {...form.register('publish_mode')} />
                <span className="font-semibold">{PUBLISH_MODE_LABELS[item]}</span>
              </label>
            ))}
            {mode === 'SCHEDULED' ? (
              <div className="grid gap-3 pl-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label className="text-[0.987rem] font-[650]" htmlFor={ids.day}>
                    Day
                  </label>
                  <input id={ids.day} type="date" className={INPUT_CLASS} aria-invalid={!!fieldError('schedule_day')} {...form.register('schedule_day')} />
                  {fieldError('schedule_day') ? <FieldError id={`${ids.day}-error`}>{fieldError('schedule_day')}</FieldError> : null}
                </div>
                <div className="grid gap-1.5">
                  <label className="text-[0.987rem] font-[650]" htmlFor={ids.time}>
                    Time
                  </label>
                  <input id={ids.time} type="time" className={INPUT_CLASS} aria-invalid={!!fieldError('schedule_time')} {...form.register('schedule_time')} />
                  {fieldError('schedule_time') ? <FieldError id={`${ids.time}-error`}>{fieldError('schedule_time')}</FieldError> : null}
                </div>
                <p className="text-[0.9rem] text-ink-3 sm:col-span-2">Times are in the school’s time zone, {timeZone}.</p>
              </div>
            ) : null}
          </fieldset>
        )}

        {error ? <FormAlert>{getErrorMessage(error)}</FormAlert> : null}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
          {isPending ? 'Saving…' : submitLabel}
        </button>
      </footer>
    </form>
  )
}
