import { useRef, useState } from 'react'
import { Mail, Pencil, UserMinus, UserPlus, Users } from 'lucide-react'
import { PERMISSIONS } from '@shigjetademy/shared/auth'
import type { Permission } from '@shigjetademy/shared/auth'
import type { InviteMemberInput, OrganizationInvitation, OrganizationMember } from '@shigjetademy/shared/organization'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { LoadError } from '#/components/LoadError'
import { NoticeBar } from '#/components/NoticeBar'
import type { Notice } from '#/components/NoticeBar'
import { showErrorToast } from '#/lib/error-toast'
import { fullName } from '#/lib/full-name'
import { initials } from '#/lib/initials'
import { useFormatDate } from '#/lib/use-format-date'
import { ROLE_LABELS } from '#/modules/auth/utils/role-labels'
import { useOrganizationMembers } from '../hooks/use-organization-members'
import { usePendingInvitations } from '../hooks/use-pending-invitations'
import { useRemoveMember } from '../hooks/use-remove-member'
import { PERMISSION_LABELS } from '../utils/permission-labels'
import { AdminAccessDialog } from './admin-access-dialog'
import type { AdminAccessDialogMode } from './admin-access-dialog'

const SHOWN_PERMISSIONS = 3
const SKELETON_ROWS = 2

interface MembersPageProps {
  organizationId: string
  organizationName: string
}

/** The owner's Members page: who has access to the organization, open invitations, and inviting School Admins. */
export function MembersPage({ organizationId, organizationName }: MembersPageProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const members = useOrganizationMembers(organizationId)
  const invitations = usePendingInvitations(organizationId)
  const removeMember = useRemoveMember(organizationId)
  const [dialogMode, setDialogMode] = useState<AdminAccessDialogMode>({ kind: 'invite' })
  const [dialogFormKey, setDialogFormKey] = useState(0)
  const [notice, setNotice] = useState<Notice | null>(null)

  const handleOpenDialog = (mode: AdminAccessDialogMode) => {
    setDialogMode(mode)
    setDialogFormKey((key) => key + 1)
    dialogRef.current?.showModal()
  }

  const handleOpenInvite = () => handleOpenDialog({ kind: 'invite' })

  const handleOpenEdit = (member: OrganizationMember) => handleOpenDialog({ kind: 'edit', member })

  // Sending invitations comes with the email step; until then the dialog says so instead of pretending
  const handleInvite = ({ email }: InviteMemberInput) => {
    setNotice({ tone: 'info', text: `Sending invitations isn’t connected yet, so nothing was sent to ${email}.` })
  }

  const handleSaved = (saved: OrganizationMember) => {
    setNotice({ tone: 'success', text: `Saved changes for ${fullName(saved)}.` })
  }

  const handleRemove = (member: OrganizationMember) => {
    removeMember.mutate(
      { organizationId, membershipId: member.membership_id },
      { onSuccess: () => setNotice({ tone: 'success', text: `${fullName(member)} no longer has access.` }), onError: showErrorToast },
    )
  }

  const adminCount = members.data?.filter((member) => member.role === 'ADMIN').length ?? 0
  const pendingCount = invitations.data?.length ?? 0

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader
        icon={Users}
        title="Members"
        subtitle={`${organizationName} · ${adminCount} ${adminCount === 1 ? 'school admin' : 'school admins'} · ${pendingCount} pending`}
      >
        <button type="button" className="button button--primary min-h-11 px-4 text-base" onClick={handleOpenInvite}>
          <UserPlus size={17} strokeWidth={2} aria-hidden="true" />
          Invite admin
        </button>
      </DashboardPageHeader>

      <div className="grid max-w-[1040px] gap-6 px-[clamp(20px,3.4vw,44px)] pb-10">
        {notice ? <NoticeBar notice={notice} onDismiss={() => setNotice(null)} /> : null}

        <section className="rounded-card border border-rule" aria-labelledby="pending-title">
          <div className="flex items-center justify-between gap-3 border-b border-rule px-5 py-4">
            <h2 id="pending-title" className="text-[1.15rem] font-[650]">
              Pending invitations
            </h2>
            <span className="tabular text-[0.93rem] text-ink-3">{pendingCount}</span>
          </div>
          <InvitationList query={invitations} onInvite={handleOpenInvite} />
        </section>

        <section className="rounded-card border border-rule" aria-labelledby="members-title">
          <div className="flex items-center justify-between gap-3 border-b border-rule px-5 py-4">
            <h2 id="members-title" className="text-[1.15rem] font-[650]">
              People with access
            </h2>
            <span className="tabular text-[0.93rem] text-ink-3">{members.data?.length ?? ''}</span>
          </div>
          <MemberList query={members} isRemoving={removeMember.isPending} onEdit={handleOpenEdit} onRemove={handleRemove} />
        </section>
      </div>

      <AdminAccessDialog
        dialogRef={dialogRef}
        mode={dialogMode}
        formKey={dialogFormKey}
        organizationId={organizationId}
        onInvite={handleInvite}
        onSaved={handleSaved}
      />
    </div>
  )
}

interface ListQuery<TItem> {
  status: 'pending' | 'error' | 'success'
  data?: TItem[]
  refetch: () => Promise<unknown>
}

function SkeletonRows() {
  return (
    <ul aria-busy="true" aria-label="Loading">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <li key={index} className="flex items-center gap-4 border-b border-rule px-5 py-4 last:border-b-0" aria-hidden="true">
          <span className="size-10 flex-none animate-pulse rounded-full bg-mist" />
          <span className="grid flex-1 gap-1.5">
            <span className="h-3.5 w-48 animate-pulse rounded bg-mist" />
            <span className="h-3 w-72 max-w-full animate-pulse rounded bg-mist" />
          </span>
        </li>
      ))}
    </ul>
  )
}

interface PermissionSummaryProps {
  permissions: Permission[]
}

function PermissionSummary({ permissions }: PermissionSummaryProps) {
  if (permissions.length === PERMISSIONS.length) {
    return <span className="text-[0.9rem] text-ink-2">Everything a school admin can do</span>
  }
  const shown = permissions.slice(0, SHOWN_PERMISSIONS).map((permission) => PERMISSION_LABELS[permission])
  const hidden = permissions.length - shown.length
  return (
    <span className="text-[0.9rem] text-ink-2">
      {shown.join(', ')}
      {hidden > 0 ? <span className="text-ink-3"> and {hidden} more</span> : null}
    </span>
  )
}

interface InvitationListProps {
  query: ListQuery<OrganizationInvitation>
  onInvite: () => void
}

function InvitationList({ query, onInvite }: InvitationListProps) {
  const formatDate = useFormatDate()

  if (query.status === 'pending') return <SkeletonRows />
  if (query.status === 'error') return <LoadError what="invitations" onRetry={() => void query.refetch()} />

  const invitations = query.data ?? []
  if (invitations.length === 0) {
    return (
      <div className="grid justify-items-center gap-2 px-5 py-10 text-center">
        <Mail className="text-ink-3" size={24} strokeWidth={1.7} aria-hidden="true" />
        <p className="text-ink-2">No open invitations.</p>
        <button type="button" className="text-[0.95rem] font-semibold text-green-deep hover:underline" onClick={onInvite}>
          Invite a school admin
        </button>
      </div>
    )
  }

  return (
    <ul>
      {invitations.map((invitation) => (
        <li key={invitation.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-rule px-5 py-4 last:border-b-0">
          <span className="grid size-10 flex-none place-items-center rounded-full bg-kraft-wash text-kraft-ink" aria-hidden="true">
            <Mail size={18} strokeWidth={1.8} />
          </span>
          <span className="grid min-w-[220px] flex-1 gap-0.5 leading-tight">
            <span className="font-semibold">{invitation.email}</span>
            <span className="text-[0.88rem] text-ink-3">
              {ROLE_LABELS[invitation.role]} · sent {formatDate(invitation.created_at)} · expires {formatDate(invitation.expires_at)}
            </span>
            <PermissionSummary permissions={invitation.permissions} />
          </span>
        </li>
      ))}
    </ul>
  )
}

interface MemberListProps {
  query: ListQuery<OrganizationMember>
  isRemoving: boolean
  onEdit: (member: OrganizationMember) => void
  onRemove: (member: OrganizationMember) => void
}

function MemberList({ query, isRemoving, onEdit, onRemove }: MemberListProps) {
  if (query.status === 'pending') return <SkeletonRows />
  if (query.status === 'error') return <LoadError what="members" onRetry={() => void query.refetch()} />

  return (
    <ul>
      {(query.data ?? []).map((member) => (
        <MemberRow key={member.membership_id} member={member} isRemoving={isRemoving} onEdit={onEdit} onRemove={onRemove} />
      ))}
    </ul>
  )
}

interface MemberRowProps {
  member: OrganizationMember
  isRemoving: boolean
  onEdit: (member: OrganizationMember) => void
  onRemove: (member: OrganizationMember) => void
}

function MemberRow({ member, isRemoving, onEdit, onRemove }: MemberRowProps) {
  const formatDate = useFormatDate()
  const isOwner = member.role === 'OWNER'
  const name = fullName(member)

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-rule px-5 py-4 last:border-b-0">
      <span className="grid size-10 flex-none place-items-center rounded-full bg-green-wash text-[0.9rem] font-bold text-green-deep" aria-hidden="true">
        {initials(name)}
      </span>
      <span className="grid min-w-[220px] flex-1 gap-0.5 leading-tight">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{name}</span>
          <span className={`chip ${isOwner ? 'chip--kraft' : 'chip--navy'}`}>{ROLE_LABELS[member.role]}</span>
        </span>
        <span className="text-[0.88rem] text-ink-3">
          {member.email} · joined {formatDate(member.joined_at)}
        </span>
        {isOwner ? <span className="text-[0.9rem] text-ink-2">Full access, including billing and members</span> : <PermissionSummary permissions={member.permissions} />}
      </span>
      {member.role === 'ADMIN' ? <MemberActions member={member} isRemoving={isRemoving} onEdit={onEdit} onRemove={onRemove} /> : null}
    </li>
  )
}

/** Edit and remove for a School Admin; removing asks once */
function MemberActions({ member, isRemoving, onEdit, onRemove }: MemberRowProps) {
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)

  if (isConfirmingRemove) {
    return (
      <span className="flex items-center gap-2" role="group" aria-label={`Remove ${fullName(member)}`}>
        <span className="text-[0.93rem] text-ink-2">They lose access right away.</span>
        <button type="button" className="button min-h-9 bg-coral-deep px-3.5 text-[0.95rem] text-white" onClick={() => onRemove(member)} disabled={isRemoving}>
          Remove
        </button>
        <button type="button" className="button button--ghost min-h-9 px-3.5 text-[0.95rem]" onClick={() => setIsConfirmingRemove(false)}>
          Keep
        </button>
      </span>
    )
  }

  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <RowAction icon={Pencil} label="Edit" onClick={() => onEdit(member)} />
      <RowAction icon={UserMinus} label="Remove" tone="danger" onClick={() => setIsConfirmingRemove(true)} />
    </span>
  )
}

interface RowActionProps {
  icon: typeof Mail
  label: string
  onClick: () => void
  tone?: 'default' | 'danger'
}

function RowAction({ icon: Icon, label, onClick, tone = 'default' }: RowActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[0.93rem] font-semibold transition-colors duration-150 ${
        tone === 'danger' ? 'text-coral-deep hover:bg-coral-wash' : 'text-ink-2 hover:bg-mist hover:text-ink'
      }`}
    >
      <Icon size={15} strokeWidth={2} aria-hidden="true" />
      {label}
    </button>
  )
}
