import { useId } from 'react'
import type { RefObject } from 'react'
import { Controller } from 'react-hook-form'
import type { Course, CourseInput } from '@shigjetademy/shared/courses'
import type { OrganizationDepartment } from '@shigjetademy/shared/location'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { SelectField } from '#/components/SelectField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useCourseForm } from '../hooks/use-course-form'
import { useSaveCourse } from '../hooks/use-save-course'

export type CourseDialogMode = { kind: 'add'; openCount: number } | { kind: 'edit'; course: Course; openCount: number }

interface CourseDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  mode: CourseDialogMode
  departments: OrganizationDepartment[]
  onSaved: (saved: Course) => void
}

export function CourseDialog({ dialogRef, organizationId, mode, departments, onSaved }: CourseDialogProps) {
  const course = mode.kind === 'edit' ? mode.course : undefined
  const handleClose = () => dialogRef.current?.close()

  const handleSaved = (saved: Course) => {
    handleClose()
    onSaved(saved)
  }

  return (
    <FormDialog dialogRef={dialogRef} title={course ? `Edit ${course.name}` : 'Add a course'} subtitle="Something your organization teaches. Groups are opened from it." onClose={handleClose}>
      {/* A new key per opening remounts the form, so cancelled edits and old server errors don't come back */}
      <CourseForm key={mode.openCount} organizationId={organizationId} course={course} departments={departments} onSaved={handleSaved} onCancel={handleClose} />
    </FormDialog>
  )
}

interface CourseFormProps {
  organizationId: string
  course?: Course
  departments: OrganizationDepartment[]
  onSaved: (saved: Course) => void
  onCancel: () => void
}

function CourseForm({ organizationId, course, departments, onSaved, onCancel }: CourseFormProps) {
  const form = useCourseForm(course)
  const saveCourse = useSaveCourse(organizationId)
  const ids = { name: useId(), code: useId(), level: useId(), description: useId(), department: useId() }
  const { errors } = form.formState
  const isPending = saveCourse.isPending
  const fieldError = (fieldName: keyof CourseInput) => getFieldError<CourseInput>({ fieldName, formErrors: errors, backendError: saveCourse.error })

  const handleSubmit = form.handleSubmit((input: CourseInput) => {
    const params = course ? { kind: 'edit' as const, courseId: course.id, input } : { kind: 'add' as const, input }
    saveCourse.mutate(params, { onSuccess: onSaved })
  })

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 overflow-y-auto px-6 py-5">
        <AuthField id={ids.name} label="Name" required autoComplete="off" disabled={isPending} error={fieldError('name')} {...form.register('name')} />
        <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
          <AuthField id={ids.code} label="Code (optional)" autoComplete="off" disabled={isPending} error={fieldError('code')} {...form.register('code')} />
          <AuthField id={ids.level} label="Level" required autoComplete="off" disabled={isPending} error={fieldError('level')} {...form.register('level')} />
        </div>
        <Controller
          control={form.control}
          name="department_id"
          render={({ field }) => (
            <SelectField
              id={ids.department}
              label="Department"
              required
              disabled={isPending}
              error={fieldError('department_id')}
              name={field.name}
              value={field.value}
              onBlur={field.onBlur}
              onChange={field.onChange}
            >
              <option value="">Choose a department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </SelectField>
          )}
        />
        <AuthField id={ids.description} label="Description (optional)" autoComplete="off" disabled={isPending} error={fieldError('description')} {...form.register('description')} />

        {saveCourse.isError ? <FormAlert>{getErrorMessage(saveCourse.error)}</FormAlert> : null}
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
          {course ? 'Save changes' : 'Add course'}
        </button>
      </footer>
    </form>
  )
}
