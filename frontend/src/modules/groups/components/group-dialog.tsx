import { useId } from 'react'
import type { RefObject } from 'react'
import { Controller } from 'react-hook-form'
import type { AcademicYear } from '@shigjetademy/shared/academic-periods'
import type { CourseOption } from '@shigjetademy/shared/courses'
import type { Group, GroupInput } from '@shigjetademy/shared/groups'
import type { OrganizationLocation } from '@shigjetademy/shared/location'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { SelectField } from '#/components/SelectField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useGroupForm } from '../hooks/use-group-form'
import { useSaveGroup } from '../hooks/use-save-group'
import { getCourseOptionLabel } from '../utils/course-option-label'

export type GroupDialogMode = { kind: 'add'; openCount: number } | { kind: 'edit'; group: Group; openCount: number }

/** The organization's courses, years and locations the form offers */
export type GroupFormOptions = {
  courses: CourseOption[]
  years: AcademicYear[]
  locations: OrganizationLocation[]
}

interface GroupDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  mode: GroupDialogMode
  options: GroupFormOptions
  onSaved: (saved: Group) => void
}

export function GroupDialog({ dialogRef, organizationId, mode, options, onSaved }: GroupDialogProps) {
  const group = mode.kind === 'edit' ? mode.group : undefined
  const handleClose = () => dialogRef.current?.close()

  const handleSaved = (saved: Group) => {
    handleClose()
    onSaved(saved)
  }

  return (
    <FormDialog dialogRef={dialogRef} title={group ? `Edit ${group.name}` : 'Add a group'} subtitle="A class you run: one course in one school year." onClose={handleClose}>
      {/* A new key per opening remounts the form, so cancelled edits and old server errors don't come back */}
      <GroupForm key={mode.openCount} organizationId={organizationId} group={group} options={options} onSaved={handleSaved} onCancel={handleClose} />
    </FormDialog>
  )
}

interface GroupFormProps {
  organizationId: string
  group?: Group
  options: GroupFormOptions
  onSaved: (saved: Group) => void
  onCancel: () => void
}

function GroupForm({ organizationId, group, options, onSaved, onCancel }: GroupFormProps) {
  const form = useGroupForm({ group, defaultYearId: options.years.find((year) => year.is_current)?.id ?? '' })
  const saveGroup = useSaveGroup(organizationId)
  const ids = { course: useId(), name: useId(), year: useId(), term: useId(), location: useId(), capacity: useId() }
  const { errors } = form.formState
  const isPending = saveGroup.isPending
  const yearId = form.watch('academic_year_id')
  const terms = options.years.find((year) => year.id === yearId)?.terms ?? []
  // An archived course takes no new groups, but a group already on one stays there
  const courseChoices = options.courses.filter((course) => course.status === 'ACTIVE' || course.id === group?.course.id)
  const fieldError = (fieldName: keyof GroupInput) => getFieldError<GroupInput>({ fieldName, formErrors: errors, backendError: saveGroup.error })

  const handleSubmit = form.handleSubmit((input: GroupInput) => {
    const params = group ? { kind: 'edit' as const, groupId: group.id, input } : { kind: 'add' as const, input }
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
