import { useRef, useState } from 'react'
import { AlertCircle, Check, Mail, Pencil, RotateCw, UserMinus, UserPlus, Users, X } from 'lucide-react'
import { PERMISSIONS } from '@shigjetademy/shared/auth'
import type { Permission } from '@shigjetademy/shared/auth'
import type { OrganizationInvitation, OrganizationMember } from '@shigjetademy/shared/organization'
import { initials } from '#/lib/initials'
import { ROLE_LABELS } from '#/modules/auth/utils/role-labels'
import { useOrganizationMembers } from '../hooks/use-organization-members'
import { usePendingInvitations } from '../hooks/use-pending-invitations'
import { useRemoveMember } from '../hooks/use-remove-member'
import { useUpdateMember } from '../hooks/use-update-member'
import { PERMISSION_LABELS } from '../utils/permission-labels'
import { AdminAccessDialog } from './admin-access-dialog'
import type { AdminAccessDialogMode, AdminAccessInput } from './admin-access-dialog'

const SHOWN_PERMISSIONS = 3
const SKELETON_ROWS = 2

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
const formatDate = (iso: string) => dateFormat.format(new Date(iso))

const fullName = (member: OrganizationMember) => `${member.first_name} ${member.last_name}`

type Notice = { tone: 'success' | 'info'; text: string }

interface MembersPageProps {
  organizationId: string
  organizationName: string
}

/** The owner's Members page: who has access to the organization, open invitations, and inviting School Admins. */
export function MembersPage({ organizationId, organizationName }: MembersPageProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const members = useOrganizationMembers(organizationId)
  const invitations = usePendingInvitations(organizationId)
  const updateMember = useUpdateMember(organizationId)
  const removeMember = useRemoveMember(organizationId)
  const [dialogMode, setDialogMode] = useState<AdminAccessDialogMode>({ kind: 'invite' })
  const [notice, setNotice] = useState<Notice | null>(null)

  const handleOpenInvite = () => {
    setDialogMode({ kind: 'invite' })
    dialogRef.current?.showModal()
  }

  const handleOpenEdit = (member: OrganizationMember) => {
    setDialogMode({
      kind: 'edit',
      membershipId: member.membership_id,
      firstName: member.first_name,
      lastName: member.last_name,
      email: member.email,
      permissions: member.permissions,
    })
    dialogRef.current?.showModal()
  }

  // Sending invitations comes with the email step; until then the form says so instead of pretending
  const handleSubmitAccess = ({ email, firstName, lastName, permissions }: AdminAccessInput) => {
    if (dialogMode.kind === 'invite') {
      setNotice({ tone: 'info', text: `Sending invitations isn’t connected yet, so nothing was sent to ${email}.` })
      return
    }
    updateMember.mutate(
      { organizationId, membershipId: dialogMode.membershipId, first_name: firstName, last_name: lastName, permissions },
      { onSuccess: (saved) => setNotice({ tone: 'success', text: `Saved changes for ${saved.first_name} ${saved.last_name}.` }) },
    )
  }

  const handleRemove = (member: OrganizationMember) => {
    removeMember.mutate(
      { organizationId, membershipId: member.membership_id },
      { onSuccess: () => setNotice({ tone: 'success', text: `${fullName(member)} no longer has access.` }) },
    )
  }

  const adminCount = members.data?.filter((member) => member.role === 'ADMIN').length ?? 0
  const pendingCount = invitations.data?.length ?? 0

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <header className="bg-linear-to-b from-green-wash to-white px-[clamp(20px,3.4vw,44px)] pt-[clamp(24px,3.4vw,40px)] pb-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <span
              className="grid size-14 flex-none place-items-center rounded-2xl bg-white text-green-deep shadow-[0_1px_2px_rgba(22,34,46,0.06),0_10px_24px_-12px_rgba(22,34,46,0.3)]"
              aria-hidden="true"
            >
              <Users size={26} strokeWidth={1.7} />
            </span>
            <div>
              <h1 className="font-display text-[clamp(1.7rem,2.6vw,2.3rem)] leading-[1.05] font-[680] tracking-[-0.03em]">Members</h1>
              <p className="mt-1.5 text-ink-2">
                {organizationName} · {adminCount} {adminCount === 1 ? 'school admin' : 'school admins'} · {pendingCount} pending
              </p>
            </div>
          </div>
          <button type="button" className="button button--primary min-h-11 px-4 text-base" onClick={handleOpenInvite}>
            <UserPlus size={17} strokeWidth={2} aria-hidden="true" />
            Invite admin
          </button>
        </div>
      </header>

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
          <MemberList query={members} onEdit={handleOpenEdit} onRemove={handleRemove} />
        </section>
      </div>

      <AdminAccessDialog dialogRef={dialogRef} mode={dialogMode} onSubmit={handleSubmitAccess} />
    </div>
  )
}

interface NoticeBarProps {
  notice: Notice
  onDismiss: () => void
}

function NoticeBar({ notice, onDismiss }: NoticeBarProps) {
  const isSuccess = notice.tone === 'success'
  return (
    <p className={`flex items-center gap-2 rounded-xl px-4 py-3 font-[550] ${isSuccess ? 'bg-green-wash text-green-deep' : 'bg-kraft-wash text-kraft-ink'}`} role="status">
      {isSuccess ? <Check size={17} strokeWidth={2.2} aria-hidden="true" /> : <AlertCircle size={17} strokeWidth={2} aria-hidden="true" />}
      <span className="min-w-0 flex-1">{notice.text}</span>
      <button type="button" className="grid size-8 place-items-center rounded-full hover:bg-white/70" onClick={onDismiss} aria-label="Dismiss">
        <X size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </p>
  )
}

interface ListQuery<TItem> {
  status: 'pending' | 'error' | 'success'
  data?: TItem[]
  refetch: () => Promise<unknown>
}

interface LoadErrorProps {
  what: string
  onRetry: () => void
}

function LoadError({ what, onRetry }: LoadErrorProps) {
  return (
    <div className="grid justify-items-center gap-3 px-5 py-10 text-center" role="alert">
      <AlertCircle className="text-coral-deep" size={24} strokeWidth={1.8} aria-hidden="true" />
      <p className="font-semibold">We couldn’t load the {what}.</p>
      <button type="button" className="button button--ghost min-h-10 px-4 text-base" onClick={onRetry}>
        <RotateCw size={16} strokeWidth={2} aria-hidden="true" />
        Try again
      </button>
    </div>
  )
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
  onEdit: (member: OrganizationMember) => void
  onRemove: (member: OrganizationMember) => void
}

function MemberList({ query, onEdit, onRemove }: MemberListProps) {
  if (query.status === 'pending') return <SkeletonRows />
  if (query.status === 'error') return <LoadError what="members" onRetry={() => void query.refetch()} />

  return (
    <ul>
      {(query.data ?? []).map((member) => (
        <MemberRow key={member.membership_id} member={member} onEdit={onEdit} onRemove={onRemove} />
      ))}
    </ul>
  )
}

interface MemberRowProps {
  member: OrganizationMember
  onEdit: (member: OrganizationMember) => void
  onRemove: (member: OrganizationMember) => void
}

function MemberRow({ member, onEdit, onRemove }: MemberRowProps) {
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
      {member.role === 'ADMIN' ? <MemberActions member={member} onEdit={onEdit} onRemove={onRemove} /> : null}
    </li>
  )
}

/** Edit and remove for a School Admin; removing asks once */
function MemberActions({ member, onEdit, onRemove }: MemberRowProps) {
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)

  if (isConfirmingRemove) {
    return (
      <span className="flex items-center gap-2" role="group" aria-label={`Remove ${fullName(member)}`}>
        <span className="text-[0.93rem] text-ink-2">They lose access right away.</span>
        <button type="button" className="button min-h-9 bg-coral-deep px-3.5 text-[0.95rem] text-white" onClick={() => onRemove(member)}>
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
