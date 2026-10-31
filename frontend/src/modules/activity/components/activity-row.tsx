import { Link } from '@tanstack/react-router'
import { CirclePause, CirclePlay, KeyRound, Lock, UserMinus, UserPen } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ActivityAction, ActivityEntry, ActivityUser } from '@shigjetademy/shared/activity'
import { formatDateTime } from '../utils/format'

const ACTION_ICONS = {
  ORGANIZATION_SUSPENDED: CirclePause,
  ORGANIZATION_REACTIVATED: CirclePlay,
  PASSWORD_CHANGED: KeyRound,
  ACCOUNT_LOCKED: Lock,
  MEMBER_UPDATED: UserPen,
  MEMBER_REMOVED: UserMinus,
} as const satisfies Record<ActivityAction, LucideIcon>

type FullNameParams = {
  user: ActivityUser | null
  fallback: string
}

const fullName = ({ user, fallback }: FullNameParams) => (user ? `${user.first_name} ${user.last_name}` : fallback)

const DELETED_ACTOR = 'A deleted user'
const DELETED_TARGET = 'a deleted user'

interface ActivityRowProps {
  entry: ActivityEntry
  /** The platform admin opens a client from its name; an owner reads their own organization's name as text */
  shouldLinkOrganization: boolean
}

export function ActivityRow({ entry, shouldLinkOrganization }: ActivityRowProps) {
  const Icon = ACTION_ICONS[entry.action]
  return (
    <li className="flex items-center gap-3 border-b border-rule py-3">
      <span className="grid size-10 flex-none place-items-center rounded-[10px] bg-kraft-wash text-kraft-ink" aria-hidden="true">
        <Icon size={18} strokeWidth={1.9} />
      </span>
      <p className="min-w-0 flex-1 text-ink">
        <ActivitySentence entry={entry} shouldLinkOrganization={shouldLinkOrganization} />
      </p>
      <time className="tabular text-[0.95rem] whitespace-nowrap text-ink-2" dateTime={entry.created_at}>
        {formatDateTime(entry.created_at)}
      </time>
    </li>
  )
}

/** "Platform Admin suspended Oxford Academy" */
function ActivitySentence({ entry, shouldLinkOrganization }: ActivityRowProps) {
  const organization = <OrganizationName organization={entry.organization} shouldLink={shouldLinkOrganization} />
  switch (entry.action) {
    case 'ORGANIZATION_SUSPENDED':
      return (
        <>
          {fullName({ user: entry.actor, fallback: DELETED_ACTOR })} suspended {organization}
        </>
      )
    case 'ORGANIZATION_REACTIVATED':
      return (
        <>
          {fullName({ user: entry.actor, fallback: DELETED_ACTOR })} reactivated {organization}
        </>
      )
    case 'PASSWORD_CHANGED':
      return <>{fullName({ user: entry.actor, fallback: DELETED_ACTOR })} changed their password</>
    case 'ACCOUNT_LOCKED':
      return <>{fullName({ user: entry.target_user, fallback: DELETED_ACTOR })}’s account was locked after too many failed logins</>
    case 'MEMBER_UPDATED':
      return (
        <>
          {fullName({ user: entry.actor, fallback: DELETED_ACTOR })} changed {fullName({ user: entry.target_user, fallback: DELETED_TARGET })}’s name and access
        </>
      )
    case 'MEMBER_REMOVED':
      return (
        <>
          {fullName({ user: entry.actor, fallback: DELETED_ACTOR })} removed {fullName({ user: entry.target_user, fallback: DELETED_TARGET })} from {organization}
        </>
      )
    default: {
      const unknown: never = entry.action
      throw new Error(`Unknown activity action: ${String(unknown)}`)
    }
  }
}

interface OrganizationNameProps {
  organization: ActivityEntry['organization']
  shouldLink: boolean
}

function OrganizationName({ organization, shouldLink }: OrganizationNameProps) {
  if (!organization) return <>a deleted client</>
  if (!shouldLink) return <>{organization.name}</>
  return (
    <Link
      to="/dashboard/clients/$organizationId"
      params={{ organizationId: organization.id }}
      className="font-semibold text-ink no-underline hover:underline"
    >
      {organization.name}
    </Link>
  )
}

export function ActivityRowSkeleton() {
  return (
    <li className="flex items-center gap-3 border-b border-rule py-3" aria-hidden="true">
      <span className="size-10 flex-none animate-pulse rounded-[10px] bg-mist" />
      <span className="h-3.5 w-72 max-w-full flex-1 animate-pulse rounded bg-mist" />
      <span className="h-3.5 w-28 animate-pulse rounded bg-mist" />
    </li>
  )
}
