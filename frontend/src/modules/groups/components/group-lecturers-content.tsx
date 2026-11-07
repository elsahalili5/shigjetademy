import { useId, useState } from 'react'
import { todayIn } from '@shigjetademy/shared/calendar-day'
import type { Group, GroupLecturerAssignment, GroupLecturerOption, GroupSubstitution } from '@shigjetademy/shared/groups'
import { ConfirmGroup } from '#/components/ConfirmGroup'
import { FormAlert } from '#/components/FormAlert'
import { LoadError } from '#/components/LoadError'
import { SkeletonRows } from '#/components/SkeletonRows'
import { getErrorMessage } from '#/lib/error-message'
import { useFormatDay } from '#/lib/use-format-date'
import { useCancelGroupSubstitution } from '../hooks/use-cancel-group-substitution'
import { useGroupLecturers } from '../hooks/use-group-lecturers'
import { getGroupLecturerName } from '../utils/lecturer-label'
import { GroupSubstitutionForm } from './group-substitution-form'

const ROW_ACTION_CLASS = 'inline-flex min-h-9 items-center rounded-full px-3 text-[0.93rem] font-semibold text-ink-2 transition-colors duration-150 hover:bg-mist hover:text-ink disabled:opacity-50'

type SubstitutionFormState = {
  /** The substitution being edited, or none when adding */
  substitution?: GroupSubstitution
  openCount: number
}

interface GroupLecturersContentProps {
  organizationId: string
  group: Group
  lecturers: GroupLecturerOption[]
  timeZone: string
}

/** The history, the substitutions and the form to add one; the dialog and the group's page both show it */
export function GroupLecturersContent({ organizationId, group, lecturers: lecturerOptions, timeZone }: GroupLecturersContentProps) {
  const lecturers = useGroupLecturers({ organizationId, groupId: group.id })
  const [substitutionForm, setSubstitutionForm] = useState<SubstitutionFormState>({ substitution: undefined, openCount: 0 })
  const isReadOnly = group.status === 'ARCHIVED'

  const handleOpenForm = (substitution?: GroupSubstitution) => {
    setSubstitutionForm((current) => ({ substitution, openCount: current.openCount + 1 }))
  }

  const handleCancelled = (substitutionId: string) => {
    setSubstitutionForm((current) => (current.substitution?.id === substitutionId ? { substitution: undefined, openCount: current.openCount + 1 } : current))
  }

  if (lecturers.status === 'error') return <LoadError what="lecturers" onRetry={() => void lecturers.refetch()} />
  if (!lecturers.data) return <SkeletonRows />

  return (
    <div className="grid gap-6 overflow-y-auto px-6 py-5">
      <AssignmentHistory assignments={lecturers.data.assignments} />
      <SubstitutionList
        organizationId={organizationId}
        groupId={group.id}
        substitutions={lecturers.data.substitutions}
        today={todayIn(timeZone)}
        isReadOnly={isReadOnly}
        onEdit={handleOpenForm}
        onCancelled={handleCancelled}
      />
      {isReadOnly ? null : (
        // A new key per save or edit fills the form from what it's now for
        <GroupSubstitutionForm
          key={substitutionForm.openCount}
          organizationId={organizationId}
          groupId={group.id}
          substitution={substitutionForm.substitution}
          lecturers={lecturerOptions}
          timeZone={timeZone}
          onSaved={() => handleOpenForm()}
          onStopEditing={() => handleOpenForm()}
        />
      )}
    </div>
  )
}

interface AssignmentHistoryProps {
  assignments: GroupLecturerAssignment[]
}

function AssignmentHistory({ assignments }: AssignmentHistoryProps) {
  const titleId = useId()
  const formatDay = useFormatDay()

  return (
    <section className="grid gap-2">
      <h3 id={titleId} className="text-[1.05rem] font-[650]">
        Permanent lecturers
      </h3>
      {assignments.length === 0 ? (
        <p className="text-ink-2">No lecturer so far.</p>
      ) : (
        <ul className="grid" aria-labelledby={titleId}>
          {assignments.map((assignment) => (
            <li key={assignment.id} className="flex flex-wrap items-center justify-between gap-x-3 border-b border-rule py-2.5 last:border-b-0">
              <span className="font-semibold">{getGroupLecturerName(assignment.lecturer)}</span>
              <span className="tabular text-[0.93rem] text-ink-2">
                {assignment.end_date ? `${formatDay(assignment.start_date)} – ${formatDay(assignment.end_date)}` : `From ${formatDay(assignment.start_date)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface SubstitutionListProps {
  organizationId: string
  groupId: string
  substitutions: GroupSubstitution[]
  /** The organization's day */
  today: string
  /** Nothing can change, as on an archived group */
  isReadOnly: boolean
  onEdit: (substitution: GroupSubstitution) => void
  onCancelled: (substitutionId: string) => void
}

function SubstitutionList({ organizationId, groupId, substitutions, today, isReadOnly, onEdit, onCancelled }: SubstitutionListProps) {
  const titleId = useId()

  return (
    <section className="grid gap-2">
      <h3 id={titleId} className="text-[1.05rem] font-[650]">
        Substitutions
      </h3>
      {substitutions.length === 0 ? (
        <p className="text-ink-2">No substitutions yet.</p>
      ) : (
        <ul className="grid" aria-labelledby={titleId}>
          {substitutions.map((substitution) => (
            <SubstitutionRow key={substitution.id} organizationId={organizationId} groupId={groupId} substitution={substitution} today={today} isReadOnly={isReadOnly} onEdit={onEdit} onCancelled={onCancelled} />
          ))}
        </ul>
      )}
    </section>
  )
}

interface SubstitutionRowProps extends Omit<SubstitutionListProps, 'substitutions'> {
  substitution: GroupSubstitution
}

function SubstitutionRow({ organizationId, groupId, substitution, today, isReadOnly, onEdit, onCancelled }: SubstitutionRowProps) {
  const formatDay = useFormatDay()
  const cancelSubstitution = useCancelGroupSubstitution({ organizationId, groupId })
  const [isConfirming, setIsConfirming] = useState(false)
  const name = getGroupLecturerName(substitution.lecturer)
  const canChange = !isReadOnly && !substitution.cancelled_at && substitution.end_date >= today
  const start = formatDay(substitution.start_date)
  const days = substitution.start_date === substitution.end_date ? start : `${start} – ${formatDay(substitution.end_date)}`

  const handleCancel = () => {
    setIsConfirming(false)
    cancelSubstitution.mutate(substitution.id, { onSuccess: () => onCancelled(substitution.id) })
  }

  return (
    <li className="grid gap-0.5 border-b border-rule py-2.5 last:border-b-0">
      <span className="flex flex-wrap items-center justify-between gap-x-3">
        <span className="font-semibold">{name}</span>
        <span className="tabular text-[0.93rem] text-ink-2">
          {days}
          {substitution.cancelled_at ? ' · Cancelled' : null}
        </span>
      </span>
      {substitution.note ? <span className="text-[0.93rem] text-ink-2">{substitution.note}</span> : null}
      {canChange && isConfirming ? (
        <ConfirmGroup label={`Cancel the substitution by ${name}`} question={substitution.start_date < today ? 'It ends yesterday; the days covered stay.' : 'It stays on record.'} confirmLabel="Cancel substitution" onConfirm={handleCancel} onCancel={() => setIsConfirming(false)} />
      ) : null}
      {canChange && !isConfirming ? (
        <span className="mt-1 flex flex-wrap items-center gap-1.5">
          <button type="button" className={ROW_ACTION_CLASS} aria-label={`Edit the substitution by ${name}`} onClick={() => onEdit(substitution)}>
            Edit
          </button>
          <button type="button" className={ROW_ACTION_CLASS} aria-label={`Cancel the substitution by ${name}`} disabled={cancelSubstitution.isPending} onClick={() => setIsConfirming(true)}>
            Cancel
          </button>
        </span>
      ) : null}
      {cancelSubstitution.isError ? <FormAlert>{getErrorMessage(cancelSubstitution.error)}</FormAlert> : null}
    </li>
  )
}
