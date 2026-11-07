import { useId } from 'react'
import type { RefObject } from 'react'
import type { Group, GroupEnrolment } from '@shigjetademy/shared/groups'
import { getStudentName } from '@shigjetademy/shared/students'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { LoadError } from '#/components/LoadError'
import { SelectField } from '#/components/SelectField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { useGroupMoveForm } from '../hooks/use-group-move-form'
import { useGroups } from '../hooks/use-groups'
import { useMoveStudent } from '../hooks/use-move-student'
import { getEnrolmentCountLabel, isGroupFull } from '../utils/enrolment-count'

export type GroupMoveDialogMode = {
  /** Null until a student's Move action opens the dialog */
  enrolment: GroupEnrolment | null
  openCount: number
}

/** "Group B · Physics · 2026–27 · 3/20" */
const getTargetLabel = (group: Group) => [group.name, group.course.name, group.academic_year.name, getEnrolmentCountLabel(group)].join(' · ')

interface GroupMoveDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  group: Group
  mode: GroupMoveDialogMode
  onMoved: (message: string) => void
}

/** Moves a student to another active group, of any course, in one step */
export function GroupMoveDialog({ dialogRef, organizationId, group, mode, onMoved }: GroupMoveDialogProps) {
  const { enrolment } = mode
  const handleClose = () => dialogRef.current?.close()

  const handleMoved = (message: string) => {
    handleClose()
    onMoved(message)
  }

  return (
    <FormDialog dialogRef={dialogRef} title={enrolment ? `Move ${getStudentName(enrolment.student)}` : 'Move a student'} subtitle="They leave this group and join the other one today." onClose={handleClose}>
      {/* A new key per opening remounts the form, so an old choice and error don't come back */}
      {enrolment ? <GroupMoveForm key={mode.openCount} organizationId={organizationId} group={group} enrolment={enrolment} onMoved={handleMoved} onCancel={handleClose} /> : null}
    </FormDialog>
  )
}

interface GroupMoveFormProps {
  organizationId: string
  group: Group
  enrolment: GroupEnrolment
  onMoved: (message: string) => void
  onCancel: () => void
}

function GroupMoveForm({ organizationId, group, enrolment, onMoved, onCancel }: GroupMoveFormProps) {
  const groups = useGroups({ organizationId, status: 'ACTIVE', courseId: '', yearId: '' })
  const moveStudent = useMoveStudent({ organizationId, groupId: group.id, enrolmentId: enrolment.id })
  const form = useGroupMoveForm()
  const targetId = useId()
  const targets = (groups.data?.groups ?? []).filter((target) => target.id !== group.id)

  const handleSubmit = form.handleSubmit(({ group_id: chosenId }) => {
    const targetName = targets.find((target) => target.id === chosenId)?.name ?? 'the other group'
    moveStudent.mutate(chosenId, { onSuccess: () => onMoved(`Moved ${getStudentName(enrolment.student)} to ${targetName}.`) })
  })

  if (groups.status === 'error') return <LoadError what="groups" onRetry={() => void groups.refetch()} />

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-4 overflow-y-auto px-6 py-5">
        <SelectField
          id={targetId}
          label="Group"
          disabled={moveStudent.isPending}
          error={getFieldError({ fieldName: 'group_id', formErrors: form.formState.errors, backendError: moveStudent.error })}
          {...form.register('group_id')}
        >
          <option value="">Choose a group</option>
          {targets.map((target) => (
            // A full group would refuse the student, so it shows but can't be chosen
            <option key={target.id} value={target.id} disabled={isGroupFull(target)}>
              {getTargetLabel(target)}
            </option>
          ))}
        </SelectField>
        {groups.hasNextPage ? (
          <button type="button" className="button button--ghost min-h-10 justify-self-start px-4 text-base" disabled={groups.isFetchingNextPage} onClick={() => void groups.fetchNextPage()}>
            {groups.isFetchingNextPage ? 'Loading…' : 'Load more groups'}
          </button>
        ) : null}
        {moveStudent.isError ? <FormAlert>{getErrorMessage(moveStudent.error)}</FormAlert> : null}
      </div>
      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={moveStudent.isPending}>
          Move student
        </button>
      </footer>
    </form>
  )
}
