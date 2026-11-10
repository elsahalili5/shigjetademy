import { useRef, useState } from 'react'
import { Plus, UsersRound } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { getGuardianName } from '@shigjetademy/shared/guardians'
import type { StudentGuardian } from '@shigjetademy/shared/guardians'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SkeletonRows } from '#/components/SkeletonRows'
import { showErrorToast } from '#/lib/error-toast'
import { useStudentGuardians } from '../hooks/use-student-guardians'
import type { GuardianInvitationAction } from '../hooks/use-guardian-invitation-action'
import { useGuardianInvitationAction } from '../hooks/use-guardian-invitation-action'
import { useUnlinkGuardian } from '../hooks/use-unlink-guardian'
import { RELATIONSHIP_LABELS } from '../utils/relationship-labels'
import { GuardianActions } from './guardian-actions'
import type { GuardianInvitationChange } from './guardian-actions'
import { GuardianDialog } from './guardian-dialog'
import type { GuardianDialogMode } from './guardian-dialog'
import { GuardianLoginStatus } from './guardian-login-status'

const INVITATION_TOASTS = {
  INVITE: (email) => `Sent an invitation to ${email}.`,
  RESEND: (email) => `Sent a new link to ${email}. The old one no longer works.`,
  REVOKE: (email) => `Withdrew the invitation to ${email}.`,
} as const satisfies Record<GuardianInvitationAction, (email: string) => string>

interface StudentGuardiansSectionProps {
  organizationId: string
  studentId: string
  studentName: string
}

/** The student's parents and guardians: adding, editing and unlinking them */
export function StudentGuardiansSection({ organizationId, studentId, studentName }: StudentGuardiansSectionProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const guardians = useStudentGuardians({ organizationId, studentId })
  const unlinkGuardian = useUnlinkGuardian({ organizationId, studentId })
  const guardianInvitation = useGuardianInvitationAction({ organizationId, studentId })
  const [dialogMode, setDialogMode] = useState<GuardianDialogMode>({ kind: 'add', openCount: 0 })

  const handleAdd = () => {
    setDialogMode((current) => ({ kind: 'add', openCount: current.kind === 'add' ? current.openCount + 1 : 0 }))
    dialogRef.current?.showModal()
  }

  const handleEdit = (guardian: StudentGuardian) => {
    setDialogMode({ kind: 'edit', guardian })
    dialogRef.current?.showModal()
  }

  const handleSaved = (saved: StudentGuardian) => {
    toast.success(dialogMode.kind === 'add' ? `Added ${getGuardianName(saved)}.` : `Saved ${getGuardianName(saved)}.`)
  }

  const handleUnlink = (guardian: StudentGuardian) => {
    unlinkGuardian.mutate(guardian.id, {
      onSuccess: () => toast.success(`Unlinked ${getGuardianName(guardian)} from ${studentName}.`),
      onError: showErrorToast,
    })
  }

  const handleChangeInvitation = ({ guardian, action }: GuardianInvitationChange) => {
    const email = guardian.invitation?.email ?? guardian.email ?? getGuardianName(guardian)
    guardianInvitation.mutate(
      { guardianId: guardian.id, action },
      {
        onSuccess: () => toast.success(INVITATION_TOASTS[action](email)),
        onError: showErrorToast,
      },
    )
  }

  return (
    <SectionCard
      title="Guardians"
      action={
        <button type="button" className="button button--ghost min-h-10 px-3.5 text-[0.95rem]" onClick={handleAdd}>
          <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
          Add guardian
        </button>
      }
    >
      <GuardianList
        status={guardians.status}
        guardians={guardians.data}
        isChangingInvitation={guardianInvitation.isPending}
        onRetry={() => void guardians.refetch()}
        onEdit={handleEdit}
        onUnlink={handleUnlink}
        onChangeInvitation={handleChangeInvitation}
      />
      <GuardianDialog dialogRef={dialogRef} organizationId={organizationId} studentId={studentId} studentName={studentName} mode={dialogMode} onSaved={handleSaved} />
    </SectionCard>
  )
}

interface GuardianListProps {
  status: 'pending' | 'error' | 'success'
  guardians?: StudentGuardian[]
  isChangingInvitation: boolean
  onRetry: () => void
  onEdit: (guardian: StudentGuardian) => void
  onUnlink: (guardian: StudentGuardian) => void
  onChangeInvitation: (change: GuardianInvitationChange) => void
}

function GuardianList({ status, guardians, isChangingInvitation, onRetry, onEdit, onUnlink, onChangeInvitation }: GuardianListProps) {
  if (status === 'error') return <LoadError what="guardians" onRetry={onRetry} />
  if (!guardians) return <SkeletonRows />
  if (guardians.length === 0) return <EmptyMessage icon={UsersRound} title="No guardians yet." text="Add a parent or guardian, then invite them to follow this student." />
  return (
    <ul aria-label="Guardians">
      {guardians.map((guardian) => (
        <li key={guardian.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-3.5 last:border-b-0">
          <span className="grid min-w-0 gap-1 leading-tight">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{getGuardianName(guardian)}</span>
              <span className="chip chip--navy">{RELATIONSHIP_LABELS[guardian.relationship]}</span>
            </span>
            <GuardianContact guardian={guardian} />
            <GuardianLoginStatus guardian={guardian} />
            {guardian.login_status === 'NONE' && !guardian.email ? <span className="text-[0.88rem] text-ink-3">Add an email to invite them.</span> : null}
          </span>
          <GuardianActions guardian={guardian} isChangingInvitation={isChangingInvitation} onEdit={onEdit} onUnlink={onUnlink} onChangeInvitation={onChangeInvitation} />
        </li>
      ))}
    </ul>
  )
}

interface GuardianContactProps {
  guardian: StudentGuardian
}

function GuardianContact({ guardian }: GuardianContactProps) {
  const contact = [guardian.email, guardian.phone].filter((item) => item !== null)
  if (contact.length === 0) return <span className="text-[0.93rem] text-ink-3">No email or phone</span>
  return <span className="text-[0.93rem] break-all text-ink-2">{contact.join(' · ')}</span>
}
