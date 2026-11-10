import { useState } from 'react'
import { MailPlus, MailX, Pencil, Send, Unlink } from 'lucide-react'
import { getGuardianName } from '@shigjetademy/shared/guardians'
import type { StudentGuardian } from '@shigjetademy/shared/guardians'
import { ConfirmGroup } from '#/components/ConfirmGroup'
import type { GuardianInvitationAction } from '../hooks/use-guardian-invitation-action'

const ACTION_CLASS =
  'inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[0.93rem] font-semibold text-ink-2 transition-colors duration-150 hover:bg-mist hover:text-ink disabled:opacity-50'

/** Which change waits for its one confirmation */
type Confirming = 'NONE' | 'UNLINK' | 'REVOKE'

export type GuardianInvitationChange = {
  guardian: StudentGuardian
  action: GuardianInvitationAction
}

interface GuardianActionsProps {
  guardian: StudentGuardian
  /** An invite, resend or revoke is on its way; the login buttons wait for it */
  isChangingInvitation: boolean
  onEdit: (guardian: StudentGuardian) => void
  onUnlink: (guardian: StudentGuardian) => void
  onChangeInvitation: (change: GuardianInvitationChange) => void
}

/** Edit, the login invitation, and unlink from this student; unlinking and revoking ask once first */
export function GuardianActions({ guardian, isChangingInvitation, onEdit, onUnlink, onChangeInvitation }: GuardianActionsProps) {
  const [confirming, setConfirming] = useState<Confirming>('NONE')
  const name = getGuardianName(guardian)

  const handleConfirmUnlink = () => {
    setConfirming('NONE')
    onUnlink(guardian)
  }

  const handleConfirmRevoke = () => {
    setConfirming('NONE')
    onChangeInvitation({ guardian, action: 'REVOKE' })
  }

  switch (confirming) {
    case 'REVOKE':
      return <ConfirmGroup label={`Revoke invitation to ${name}`} question="The link stops working." confirmLabel="Revoke" onConfirm={handleConfirmRevoke} onCancel={() => setConfirming('NONE')} />
    case 'UNLINK':
      return <ConfirmGroup label={`Unlink ${name}`} question="Their record and other children stay." confirmLabel="Unlink" onConfirm={handleConfirmUnlink} onCancel={() => setConfirming('NONE')} />
    case 'NONE':
      return (
        <span className="inline-flex flex-wrap items-center justify-end gap-1.5" role="group" aria-label={`Actions for ${name}`}>
          <button type="button" className={ACTION_CLASS} aria-label={`Edit ${name}`} onClick={() => onEdit(guardian)}>
            <Pencil size={15} strokeWidth={2} aria-hidden="true" />
            <span className="max-[640px]:sr-only">Edit</span>
          </button>
          <LoginActions guardian={guardian} name={name} isDisabled={isChangingInvitation} onChangeInvitation={onChangeInvitation} onRevoke={() => setConfirming('REVOKE')} />
          <button type="button" className={ACTION_CLASS} aria-label={`Unlink ${name}`} onClick={() => setConfirming('UNLINK')}>
            <Unlink size={15} strokeWidth={2} aria-hidden="true" />
            <span className="max-[640px]:sr-only">Unlink</span>
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
  guardian: StudentGuardian
  name: string
  isDisabled: boolean
  onChangeInvitation: (change: GuardianInvitationChange) => void
  onRevoke: () => void
}

function LoginActions({ guardian, name, isDisabled, onChangeInvitation, onRevoke }: LoginActionsProps) {
  switch (guardian.login_status) {
    case 'NONE':
      return (
        <button
          type="button"
          className={ACTION_CLASS}
          aria-label={`Invite ${name} to log in`}
          disabled={isDisabled || !guardian.email}
          onClick={() => onChangeInvitation({ guardian, action: 'INVITE' })}
        >
          <MailPlus size={15} strokeWidth={2} aria-hidden="true" />
          <span className="max-[640px]:sr-only">Invite to log in</span>
        </button>
      )
    case 'INVITED':
      return (
        <>
          <button type="button" className={ACTION_CLASS} aria-label={`Resend invitation to ${name}`} disabled={isDisabled} onClick={() => onChangeInvitation({ guardian, action: 'RESEND' })}>
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
      const unknown: never = guardian.login_status
      throw new Error(`Unknown login status: ${String(unknown)}`)
    }
  }
}
