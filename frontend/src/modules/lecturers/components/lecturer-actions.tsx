import { useState } from 'react'
import { Archive, ArchiveRestore, MailPlus, MailX, Pencil, Send } from 'lucide-react'
import { getLecturerName } from '@shigjetademy/shared/lecturers'
import type { Lecturer, LecturerStatus } from '@shigjetademy/shared/lecturers'
import { ConfirmGroup } from '#/components/ConfirmGroup'
import type { LecturerInvitationAction } from '../hooks/use-lecturer-invitation-action'

export type LecturerStatusChange = {
  lecturer: Lecturer
  status: LecturerStatus
}

export type LecturerInvitationChange = {
  lecturer: Lecturer
  action: LecturerInvitationAction
}

const ACTION_CLASS =
  'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[0.93rem] font-semibold text-ink-2 transition-colors duration-150 hover:bg-mist hover:text-ink disabled:opacity-50'

/** Which change waits for its one confirmation */
type Confirming = 'NONE' | 'STATUS' | 'REVOKE'

interface LecturerActionsProps {
  lecturer: Lecturer
  /** A resend or revoke is on its way; the login buttons wait for it */
  isChangingInvitation: boolean
  onEdit: (lecturer: Lecturer) => void
  onSetStatus: (change: LecturerStatusChange) => void
  onInvite: (lecturer: Lecturer) => void
  onChangeInvitation: (change: LecturerInvitationChange) => void
}

/** Edit, the login invitation while the lecturer is active, and archive or restore; archiving and revoking ask once first */
export function LecturerActions({ lecturer, isChangingInvitation, onEdit, onSetStatus, onInvite, onChangeInvitation }: LecturerActionsProps) {
  const [confirming, setConfirming] = useState<Confirming>('NONE')
  const name = getLecturerName(lecturer)
  const isArchived = lecturer.status === 'ARCHIVED'
  const nextStatus: LecturerStatus = isArchived ? 'ACTIVE' : 'ARCHIVED'
  const verb = isArchived ? 'Restore' : 'Archive'

  const handleConfirmStatus = () => {
    setConfirming('NONE')
    onSetStatus({ lecturer, status: nextStatus })
  }

  const handleConfirmRevoke = () => {
    setConfirming('NONE')
    onChangeInvitation({ lecturer, action: 'REVOKE' })
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
        <span className="inline-flex flex-nowrap items-center justify-end gap-1.5 whitespace-nowrap" role="group" aria-label={`Actions for ${name}`}>
          <button type="button" className={ACTION_CLASS} aria-label={`Edit ${name}`} onClick={() => onEdit(lecturer)}>
            <Pencil size={15} strokeWidth={2} aria-hidden="true" />
            <span className="max-[640px]:sr-only">Edit</span>
          </button>
          {isArchived ? null : (
            <LoginActions lecturer={lecturer} name={name} isDisabled={isChangingInvitation} onInvite={onInvite} onChangeInvitation={onChangeInvitation} onRevoke={() => setConfirming('REVOKE')} />
          )}
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
  lecturer: Lecturer
  name: string
  isDisabled: boolean
  onInvite: (lecturer: Lecturer) => void
  onChangeInvitation: (change: LecturerInvitationChange) => void
  onRevoke: () => void
}

function LoginActions({ lecturer, name, isDisabled, onInvite, onChangeInvitation, onRevoke }: LoginActionsProps) {
  switch (lecturer.login_status) {
    case 'NONE':
      return (
        <button type="button" className={ACTION_CLASS} aria-label={`Invite ${name} to log in`} disabled={isDisabled} onClick={() => onInvite(lecturer)}>
          <MailPlus size={15} strokeWidth={2} aria-hidden="true" />
          <span className="max-[640px]:sr-only">Invite to log in</span>
        </button>
      )
    case 'INVITED':
      return (
        <>
          <button type="button" className={ACTION_CLASS} aria-label={`Resend invitation to ${name}`} disabled={isDisabled} onClick={() => onChangeInvitation({ lecturer, action: 'RESEND' })}>
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
      const unknown: never = lecturer.login_status
      throw new Error(`Unknown login status: ${String(unknown)}`)
    }
  }
}
