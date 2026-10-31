import { useState } from 'react'
import { Archive, ArchiveRestore, MailPlus, MailX, Pencil, Send } from 'lucide-react'
import { getStudentName } from '@shigjetademy/shared/students'
import type { Student, StudentStatus } from '@shigjetademy/shared/students'
import type { StudentInvitationAction } from '../hooks/use-student-invitation-action'

export type StudentStatusChange = {
  student: Student
  status: StudentStatus
}

export type StudentInvitationChange = {
  student: Student
  action: StudentInvitationAction
}

const ACTION_CLASS =
  'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[0.93rem] font-semibold text-ink-2 transition-colors duration-150 hover:bg-mist hover:text-ink disabled:opacity-50'

/** Which change waits for its one confirmation */
type Confirming = 'NONE' | 'STATUS' | 'REVOKE'

interface StudentActionsProps {
  student: Student
  /** A resend or revoke is on its way; the login buttons wait for it */
  isChangingInvitation: boolean
  onEdit: (student: Student) => void
  onSetStatus: (change: StudentStatusChange) => void
  onInvite: (student: Student) => void
  onChangeInvitation: (change: StudentInvitationChange) => void
}

/** Edit, the login invitation while the student is active, and archive or restore; archiving and revoking ask once first */
export function StudentActions({ student, isChangingInvitation, onEdit, onSetStatus, onInvite, onChangeInvitation }: StudentActionsProps) {
  const [confirming, setConfirming] = useState<Confirming>('NONE')
  const name = getStudentName(student)
  const isArchived = student.status === 'ARCHIVED'
  const nextStatus: StudentStatus = isArchived ? 'ACTIVE' : 'ARCHIVED'
  const verb = isArchived ? 'Restore' : 'Archive'

  const handleConfirmStatus = () => {
    setConfirming('NONE')
    onSetStatus({ student, status: nextStatus })
  }

  const handleConfirmRevoke = () => {
    setConfirming('NONE')
    onChangeInvitation({ student, action: 'REVOKE' })
  }

  switch (confirming) {
    case 'STATUS':
      return (
        <ConfirmGroup label={`${verb} ${name}`} question={isArchived ? 'Back to the active list?' : 'Their record stays.'} confirmLabel={verb} onConfirm={handleConfirmStatus} onCancel={() => setConfirming('NONE')} />
      )
    case 'REVOKE':
      return <ConfirmGroup label={`Revoke invitation to ${name}`} question="The link stops working." confirmLabel="Revoke" onConfirm={handleConfirmRevoke} onCancel={() => setConfirming('NONE')} />
    case 'NONE':
      return (
        <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
          <button type="button" className={ACTION_CLASS} aria-label={`Edit ${name}`} onClick={() => onEdit(student)}>
            <Pencil size={15} strokeWidth={2} aria-hidden="true" />
            <span className="max-[640px]:sr-only">Edit</span>
          </button>
          {isArchived ? null : <LoginActions student={student} name={name} isDisabled={isChangingInvitation} onInvite={onInvite} onChangeInvitation={onChangeInvitation} onRevoke={() => setConfirming('REVOKE')} />}
          <button type="button" className={ACTION_CLASS} aria-label={`${verb} ${name}`} onClick={() => setConfirming('STATUS')}>
            {isArchived ? <ArchiveRestore size={15} strokeWidth={2} aria-hidden="true" /> : <Archive size={15} strokeWidth={2} aria-hidden="true" />}
            <span className="max-[640px]:sr-only">{verb}</span>
          </button>
        </span>
      )
    default: {
      const unknown: never = confirming
      throw new Error(`Unknown confirmation: ${String(unknown)}`)
    }
  }
}

interface LoginActionsProps {
  student: Student
  name: string
  isDisabled: boolean
  onInvite: (student: Student) => void
  onChangeInvitation: (change: StudentInvitationChange) => void
  onRevoke: () => void
}

function LoginActions({ student, name, isDisabled, onInvite, onChangeInvitation, onRevoke }: LoginActionsProps) {
  switch (student.login_status) {
    case 'NONE':
      return (
        <button type="button" className={ACTION_CLASS} aria-label={`Invite ${name} to log in`} disabled={isDisabled} onClick={() => onInvite(student)}>
          <MailPlus size={15} strokeWidth={2} aria-hidden="true" />
          <span className="max-[640px]:sr-only">Invite to log in</span>
        </button>
      )
    case 'INVITED':
      return (
        <>
          <button type="button" className={ACTION_CLASS} aria-label={`Resend invitation to ${name}`} disabled={isDisabled} onClick={() => onChangeInvitation({ student, action: 'RESEND' })}>
            <Send size={15} strokeWidth={2} aria-hidden="true" />
            <span className="max-[640px]:sr-only">Resend</span>
          </button>
          <button type="button" className={ACTION_CLASS} aria-label={`Revoke invitation to ${name}`} disabled={isDisabled} onClick={onRevoke}>
            <MailX size={15} strokeWidth={2} aria-hidden="true" />
            <span className="max-[640px]:sr-only">Revoke</span>
          </button>
        </>
      )
    case 'LINKED':
      return null
    default: {
      const unknown: never = student.login_status
      throw new Error(`Unknown login status: ${String(unknown)}`)
    }
  }
}

interface ConfirmGroupProps {
  label: string
  question: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmGroup({ label, question, confirmLabel, onConfirm, onCancel }: ConfirmGroupProps) {
  return (
    <span className="inline-flex flex-wrap items-center justify-end gap-2" role="group" aria-label={label}>
      <span className="text-[0.93rem] text-ink-2">{question}</span>
      <button type="button" className="button button--primary min-h-9 px-3.5 text-[0.95rem]" onClick={onConfirm}>
        {confirmLabel}
      </button>
      <button type="button" className="button button--ghost min-h-9 px-3.5 text-[0.95rem]" onClick={onCancel}>
        Cancel
      </button>
    </span>
  )
}
