import { useId } from 'react'
import type { RefObject } from 'react'
import { Controller } from 'react-hook-form'
import type { AcademicYear } from '@shigjetademy/shared/academic-periods'
import type { CourseOption } from '@shigjetademy/shared/courses'
import type { Group, GroupInput, GroupLecturerOption } from '@shigjetademy/shared/groups'
import { todayIn } from '@shigjetademy/shared/calendar-day'
import type { OrganizationLocation } from '@shigjetademy/shared/location'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { SelectField } from '#/components/SelectField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { useFormatDay } from '#/lib/use-format-date'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useGroupForm } from '../hooks/use-group-form'
import { useSaveGroup } from '../hooks/use-save-group'
import { getCourseOptionLabel } from '../utils/course-option-label'
import { getGroupLecturerName, getLecturerChoices, getPlannedLecturer } from '../utils/lecturer-label'

export type GroupDialogMode = { kind: 'add'; openCount: number } | { kind: 'edit'; group: Group; openCount: number }

/** The organization's courses, years, locations and lecturers the form offers */
export type GroupFormOptions = {
  courses: CourseOption[]
  years: AcademicYear[]
  locations: OrganizationLocation[]
  lecturers: GroupLecturerOption[]
}

interface GroupDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  mode: GroupDialogMode
  options: GroupFormOptions
  /** The organization's time zone, for the day a change of lecturer starts by default */
  timeZone: string
  onSaved: (saved: Group) => void
}

export function GroupDialog({ dialogRef, organizationId, mode, options, timeZone, onSaved }: GroupDialogProps) {
  const group = mode.kind === 'edit' ? mode.group : undefined
  const handleClose = () => dialogRef.current?.close()

  const handleSaved = (saved: Group) => {
    handleClose()
    onSaved(saved)
  }

  return (
    <FormDialog dialogRef={dialogRef} title={group ? `Edit ${group.name}` : 'Add a group'} subtitle="A class you run: one course in one school year." onClose={handleClose}>
      {/* A new key per opening remounts the form, so cancelled edits and old server errors don't come back */}
      <GroupForm key={mode.openCount} organizationId={organizationId} group={group} options={options} timeZone={timeZone} onSaved={handleSaved} onCancel={handleClose} />
    </FormDialog>
  )
}

interface GroupFormProps {
  organizationId: string
  group?: Group
  options: GroupFormOptions
  timeZone: string
  onSaved: (saved: Group) => void
  onCancel: () => void
}

function GroupForm({ organizationId, group, options, timeZone, onSaved, onCancel }: GroupFormProps) {
  const form = useGroupForm({ group, defaultYearId: options.years.find((year) => year.is_current)?.id ?? '' })
  const saveGroup = useSaveGroup(organizationId)
  const ids = { course: useId(), name: useId(), year: useId(), term: useId(), location: useId(), capacity: useId(), lecturer: useId(), effectiveFrom: useId() }
  const { errors } = form.formState
  const isPending = saveGroup.isPending
  const yearId = form.watch('academic_year_id')
  const terms = options.years.find((year) => year.id === yearId)?.terms ?? []
  // An archived course takes no new groups, but a group already on one stays there
  const courseChoices = options.courses.filter((course) => course.status === 'ACTIVE' || course.id === group?.course.id)
  // The form opens on where the group is heading, so choosing the current lecturer again drops a planned change
  const plannedLecturer = group ? getPlannedLecturer(group) : null
  const lecturerId = form.watch('lecturer_id')
  const isLecturerChanged = !!group && lecturerId !== (plannedLecturer?.id ?? null)
  // Going back to who teaches today only drops the planned change, so no date is asked; the one sent just marks it as a change
  const isDroppingChange = isLecturerChanged && lecturerId === (group.lecturer?.id ?? null)
  // A pending change shows its date, so it can move in the same save
  const isEffectiveFromShown = group?.status === 'ACTIVE' && !isDroppingChange && (isLecturerChanged || !!group.lecturer_change)
  const lecturerChoices = getLecturerChoices({ options: options.lecturers, kept: [group?.lecturer, plannedLecturer] })
  /** Today, or the first day of a chosen year that hasn't started, since an earlier date would be refused */
  const getDefaultEffectiveFrom = () => {
    const today = todayIn(timeZone)
    const yearStart = options.years.find((year) => year.id === form.getValues('academic_year_id'))?.start_date ?? today
    return yearStart > today ? yearStart : today
  }
  const fieldError = (fieldName: keyof GroupInput) => getFieldError<GroupInput>({ fieldName, formErrors: errors, backendError: saveGroup.error })

  const handleSubmit = form.handleSubmit((input: GroupInput) => {
    // No date means no change, so a pending change left as it is isn't sent again over someone else's newer one
    const isChangeKept = !isLecturerChanged && input.lecturer_effective_from === group?.lecturer_change?.start_date
    const lecturerEffectiveFrom = isChangeKept ? null : input.lecturer_effective_from
    const params = group ? { kind: 'edit' as const, groupId: group.id, input: { ...input, lecturer_effective_from: lecturerEffectiveFrom } } : { kind: 'add' as const, input }
    saveGroup.mutate(params, { onSuccess: onSaved })
  })

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 overflow-y-auto px-6 py-5">
        <SelectField id={ids.course} label="Course" disabled={isPending} error={fieldError('course_id')} {...form.register('course_id')}>
          <option value="">Choose a course</option>
          {courseChoices.map((course) => (
            <option key={course.id} value={course.id}>
              {getCourseOptionLabel(course)}
            </option>
          ))}
        </SelectField>
        <AuthField id={ids.name} label="Name" autoComplete="off" disabled={isPending} error={fieldError('name')} {...form.register('name')} />
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <Controller
            control={form.control}
            name="academic_year_id"
            render={({ field }) => (
              <SelectField
                id={ids.year}
                label="School year"
                disabled={isPending}
                error={fieldError('academic_year_id')}
                name={field.name}
                value={field.value}
                onBlur={field.onBlur}
                onChange={(event) => {
                  field.onChange(event.target.value)
                  // Terms belong to one year, so the choice doesn't carry over
                  form.setValue('academic_term_id', null)
                }}
              >
                {options.years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.name}
                  </option>
                ))}
              </SelectField>
            )}
          />
          <Controller
            control={form.control}
            name="academic_term_id"
            render={({ field }) => (
              <SelectField
                id={ids.term}
                label="Term"
                hint="(optional)"
                disabled={isPending}
                error={fieldError('academic_term_id')}
                name={field.name}
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(event.target.value || null)}
              >
                <option value="">No term</option>
                {terms.map((term) => (
                  <option key={term.id} value={term.id}>
                    {term.name}
                  </option>
                ))}
              </SelectField>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <Controller
            control={form.control}
            name="location_id"
            render={({ field }) => (
              <SelectField
                id={ids.location}
                label="Location"
                hint="(optional)"
                disabled={isPending}
                error={fieldError('location_id')}
                name={field.name}
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(event.target.value || null)}
              >
                <option value="">No location</option>
                {options.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </SelectField>
            )}
          />
          <Controller
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <AuthField
                id={ids.capacity}
                label="Capacity (optional)"
                type="number"
                inputMode="numeric"
                min={1}
                autoComplete="off"
                disabled={isPending}
                error={fieldError('capacity')}
                name={field.name}
                value={field.value ?? ''}
                onBlur={field.onBlur}
                onChange={(event) => field.onChange(event.target.value === '' ? null : event.target.valueAsNumber)}
              />
            )}
          />
        </div>
        <Controller
          control={form.control}
          name="lecturer_id"
          render={({ field }) => (
            <SelectField
              id={ids.lecturer}
              label="Lecturer"
              hint="(optional)"
              disabled={isPending || group?.status === 'ARCHIVED'}
              error={fieldError('lecturer_id')}
              name={field.name}
              value={field.value ?? ''}
              onBlur={field.onBlur}
              onChange={(event) => {
                const chosenId = event.target.value || null
                field.onChange(chosenId)
                const isPlanned = chosenId === (plannedLecturer?.id ?? null)
                form.setValue('lecturer_effective_from', group && !isPlanned ? getDefaultEffectiveFrom() : (group?.lecturer_change?.start_date ?? null))
              }}
            >
              <option value="">No lecturer</option>
              {lecturerChoices.map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.label}
                </option>
              ))}
            </SelectField>
          )}
        />
        {group?.lecturer_change ? <LecturerChangeNote group={group} startDate={group.lecturer_change.start_date} /> : null}
        {isEffectiveFromShown ? (
          <AuthField id={ids.effectiveFrom} label="Effective from" type="date" disabled={isPending} error={fieldError('lecturer_effective_from')} {...form.register('lecturer_effective_from')} />
        ) : null}

        {saveGroup.isError ? <FormAlert>{getErrorMessage(saveGroup.error)}</FormAlert> : null}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
          {group ? 'Save changes' : 'Add group'}
        </button>
      </footer>
    </form>
  )
}

interface LecturerChangeNoteProps {
  group: Group
  startDate: string
}

function LecturerChangeNote({ group, startDate }: LecturerChangeNoteProps) {
  const formatDay = useFormatDay()
  return (
    <p className="text-[0.93rem] text-ink-2">
      Changes on {formatDay(startDate)}. Until then: {group.lecturer ? getGroupLecturerName(group.lecturer) : 'no lecturer'}.
    </p>
  )
}
