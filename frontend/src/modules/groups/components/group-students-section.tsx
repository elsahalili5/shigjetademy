import { useId, useRef, useState } from 'react'
import type { Group, GroupEnrolment } from '@shigjetademy/shared/groups'
import { getStudentName } from '@shigjetademy/shared/students'
import { ConfirmGroup } from '#/components/ConfirmGroup'
import { FormAlert } from '#/components/FormAlert'
import { LoadError } from '#/components/LoadError'
import { NoticeBar } from '#/components/NoticeBar'
import type { Notice } from '#/components/NoticeBar'
import { SelectField } from '#/components/SelectField'
import { SkeletonRows } from '#/components/SkeletonRows'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { useFormatDay } from '#/lib/use-format-date'
import { useEnrolStudent } from '../hooks/use-enrol-student'
import { useGroupEnrolmentForm } from '../hooks/use-group-enrolment-form'
import { useGroupEnrolments } from '../hooks/use-group-enrolments'
import { useGroupStudentOptions } from '../hooks/use-group-student-options'
import { useWithdrawStudent } from '../hooks/use-withdraw-student'
import { isGroupFull } from '../utils/enrolment-count'
import { getStudentOptionLabel } from '../utils/student-label'
import { GroupMoveDialog } from './group-move-dialog'
import type { GroupMoveDialogMode } from './group-move-dialog'

const ROW_ACTION_CLASS = 'inline-flex min-h-9 items-center rounded-full px-3 text-[0.93rem] font-semibold text-ink-2 transition-colors duration-150 hover:bg-mist hover:text-ink disabled:opacity-50'

interface GroupStudentsSectionProps {
  organizationId: string
  group: Group
}

/** The group's students, enrolling, withdrawing and moving them, and who has left; an archived group is read-only */
export function GroupStudentsSection({ organizationId, group }: GroupStudentsSectionProps) {
  const moveDialogRef = useRef<HTMLDialogElement>(null)
  const enrolments = useGroupEnrolments({ organizationId, groupId: group.id })
  const [notice, setNotice] = useState<Notice | null>(null)
  const [moveMode, setMoveMode] = useState<GroupMoveDialogMode>({ enrolment: null, openCount: 0 })
  const isReadOnly = group.status === 'ARCHIVED'

  const handleMove = (enrolment: GroupEnrolment) => {
    setMoveMode((current) => ({ enrolment, openCount: current.openCount + 1 }))
    moveDialogRef.current?.showModal()
  }

  const handleNotice = (text: string) => setNotice({ tone: 'success', text })

  if (enrolments.status === 'error') return <LoadError what="students" onRetry={() => void enrolments.refetch()} />
  if (!enrolments.data) return <SkeletonRows />

  const active = enrolments.data.filter((enrolment) => !enrolment.withdrawn_on)
  const withdrawn = enrolments.data.filter((enrolment) => !!enrolment.withdrawn_on)

  return (
    <div className="grid gap-5 px-5 py-4">
      {notice ? <NoticeBar notice={notice} onDismiss={() => setNotice(null)} /> : null}
      <ActiveStudents organizationId={organizationId} groupId={group.id} enrolments={active} isReadOnly={isReadOnly} onWithdrawn={handleNotice} onMove={handleMove} />
      {isReadOnly ? null : <EnrolStudent organizationId={organizationId} group={group} activeStudentIds={active.map((enrolment) => enrolment.student.id)} onEnrolled={(name) => handleNotice(`Enrolled ${name}.`)} />}
      {withdrawn.length > 0 ? <WithdrawnStudents enrolments={withdrawn} /> : null}
      <GroupMoveDialog dialogRef={moveDialogRef} organizationId={organizationId} group={group} mode={moveMode} onMoved={handleNotice} />
    </div>
  )
}

interface ActiveStudentsProps {
  organizationId: string
  groupId: string
  enrolments: GroupEnrolment[]
  /** Nothing can change, as on an archived group */
  isReadOnly: boolean
  onWithdrawn: (message: string) => void
  onMove: (enrolment: GroupEnrolment) => void
}

function ActiveStudents({ enrolments, ...rowProps }: ActiveStudentsProps) {
  if (enrolments.length === 0) return <p className="text-ink-2">No students yet.</p>
  return (
    <ul className="grid" aria-label="Active students">
      {enrolments.map((enrolment) => (
        <ActiveStudentRow key={enrolment.id} enrolment={enrolment} {...rowProps} />
      ))}
    </ul>
  )
}

interface ActiveStudentRowProps extends Omit<ActiveStudentsProps, 'enrolments'> {
  enrolment: GroupEnrolment
}

function ActiveStudentRow({ organizationId, groupId, enrolment, isReadOnly, onWithdrawn, onMove }: ActiveStudentRowProps) {
  const formatDay = useFormatDay()
  const withdrawStudent = useWithdrawStudent({ organizationId, groupId })
  const [isConfirming, setIsConfirming] = useState(false)
  const name = getStudentName(enrolment.student)
  // Every group refuses an archived student, so only withdrawing is offered
  const canMove = enrolment.student.status === 'ACTIVE'

  const handleWithdraw = () => {
    setIsConfirming(false)
    withdrawStudent.mutate(enrolment.id, { onSuccess: () => onWithdrawn(`Withdrew ${name}.`) })
  }

  return (
    <li className="grid gap-1 border-b border-rule py-2.5 last:border-b-0">
      <span className="flex flex-wrap items-center justify-between gap-x-3">
        <span className="grid gap-0.5">
          <span className="font-semibold">
            {name}
            {enrolment.student.status === 'ARCHIVED' ? ' (archived)' : null}
          </span>
          <span className="tabular text-[0.93rem] text-ink-2">{enrolment.student.student_number}</span>
        </span>
        <span className="tabular text-[0.93rem] text-ink-2">Since {formatDay(enrolment.enrolled_on)}</span>
      </span>
      {!isReadOnly && isConfirming ? <ConfirmGroup label={`Withdraw ${name}`} question="They stay in the history." confirmLabel="Withdraw" onConfirm={handleWithdraw} onCancel={() => setIsConfirming(false)} /> : null}
      {!isReadOnly && !isConfirming ? (
        <span className="flex flex-wrap items-center gap-1.5">
          {canMove ? (
            <button type="button" className={ROW_ACTION_CLASS} aria-label={`Move ${name}`} disabled={withdrawStudent.isPending} onClick={() => onMove(enrolment)}>
              Move
            </button>
          ) : null}
          <button type="button" className={ROW_ACTION_CLASS} aria-label={`Withdraw ${name}`} disabled={withdrawStudent.isPending} onClick={() => setIsConfirming(true)}>
            Withdraw
          </button>
        </span>
      ) : null}
      {withdrawStudent.isError ? <FormAlert>{getErrorMessage(withdrawStudent.error)}</FormAlert> : null}
    </li>
  )
}

interface WithdrawnStudentsProps {
  enrolments: GroupEnrolment[]
}

/** Who has left the group, newest first, with the days they were in it */
function WithdrawnStudents({ enrolments }: WithdrawnStudentsProps) {
  const titleId = useId()
  const formatDay = useFormatDay()
  return (
    <section className="grid gap-2 border-t border-rule pt-4">
      <h3 id={titleId} className="text-[1.05rem] font-[650]">
        Withdrawn students
      </h3>
      <ul className="grid" aria-labelledby={titleId}>
        {enrolments.map((enrolment) => (
          <li key={enrolment.id} className="flex flex-wrap items-center justify-between gap-x-3 border-b border-rule py-2.5 last:border-b-0">
            <span className="font-semibold">{getStudentName(enrolment.student)}</span>
            <span className="tabular text-[0.93rem] text-ink-2">
              {formatDay(enrolment.enrolled_on)} – {enrolment.withdrawn_on ? formatDay(enrolment.withdrawn_on) : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

interface EnrolStudentProps {
  organizationId: string
  group: Group
  /** Students already in the group, whom the picker leaves out */
  activeStudentIds: string[]
  onEnrolled: (name: string) => void
}

function EnrolStudent({ organizationId, group, activeStudentIds, onEnrolled }: EnrolStudentProps) {
  const students = useGroupStudentOptions(organizationId)
  const enrolStudent = useEnrolStudent({ organizationId, groupId: group.id })
  const form = useGroupEnrolmentForm()
  const pickerId = useId()
  const choices = (students.data ?? []).filter((student) => !activeStudentIds.includes(student.id))

  const handleSubmit = form.handleSubmit(({ student_id: studentId }) => {
    enrolStudent.mutate(studentId, {
      onSuccess: (enrolment) => {
        form.reset()
        onEnrolled(getStudentName(enrolment.student))
      },
    })
  })

  if (isGroupFull(group)) return <p className="text-ink-2">This group is full.</p>
  if (students.status === 'error') return <LoadError what="students to enrol" onRetry={() => void students.refetch()} />

  return (
    <form className="grid gap-3 border-t border-rule pt-4" noValidate onSubmit={handleSubmit}>
      <SelectField
        id={pickerId}
        label="Student"
        disabled={enrolStudent.isPending}
        error={getFieldError({ fieldName: 'student_id', formErrors: form.formState.errors, backendError: enrolStudent.error })}
        {...form.register('student_id')}
      >
        <option value="">Choose a student</option>
        {choices.map((student) => (
          <option key={student.id} value={student.id}>
            {getStudentOptionLabel(student)}
          </option>
        ))}
      </SelectField>
      {enrolStudent.isError ? <FormAlert>{getErrorMessage(enrolStudent.error)}</FormAlert> : null}
      <button type="submit" className="button button--primary min-h-11 justify-self-end px-5 text-base" disabled={enrolStudent.isPending}>
        Enrol
      </button>
    </form>
  )
}
