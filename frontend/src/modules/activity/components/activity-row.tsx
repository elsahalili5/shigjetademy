import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Building2, CirclePause, CirclePlay, Crown, KeyRound, Lock, MapPin, MapPinOff, MapPinPen, Network, Power, PowerOff, Settings, SquarePen, Trash2, UserMinus, UserPen } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ActivityAction, ActivityEntry, ActivityUser } from '@shigjetademy/shared/activity'
import { useFormatDateTime } from '#/lib/use-format-date'

const ACTION_ICONS = {
  ORGANIZATION_SUSPENDED: CirclePause,
  ORGANIZATION_REACTIVATED: CirclePlay,
  PASSWORD_CHANGED: KeyRound,
  ACCOUNT_LOCKED: Lock,
  MEMBER_UPDATED: UserPen,
  MEMBER_REMOVED: UserMinus,
  ORGANIZATION_PROFILE_UPDATED: Building2,
  LOCATION_CREATED: MapPin,
  LOCATION_UPDATED: MapPinPen,
  LOCATION_REMOVED: MapPinOff,
  DEPARTMENT_CREATED: Network,
  DEPARTMENT_UPDATED: SquarePen,
  DEPARTMENT_REMOVED: Trash2,
  ORGANIZATION_SETTINGS_UPDATED: Settings,
  OWNERSHIP_TRANSFERRED: Crown,
  ORGANIZATION_DEACTIVATED_BY_OWNER: PowerOff,
  ORGANIZATION_REACTIVATED_BY_OWNER: Power,
} as const satisfies Record<ActivityAction, LucideIcon>

type FullNameParams = {
  user: ActivityUser | null
  fallback: string
}

const fullName = ({ user, fallback }: FullNameParams) => (user ? `${user.first_name} ${user.last_name}` : fallback)

const DELETED_ACTOR = 'A deleted user'
const DELETED_TARGET = 'a deleted user'
// The service always stores the name for these actions; this only covers a null column
const UNNAMED_SUBJECT = 'with no name'

interface ActivityRowProps {
  entry: ActivityEntry
  /** The platform admin opens a client from its name; an owner reads their own organization's name as text */
  shouldLinkOrganization: boolean
}

export function ActivityRow({ entry, shouldLinkOrganization }: ActivityRowProps) {
  const formatDateTime = useFormatDateTime()
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
  // The platform admin reads every client's entries, so location and department sentences say which client; an owner's own feed doesn't
  const subjectOrganization = shouldLinkOrganization ? organization : null
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
    case 'ORGANIZATION_PROFILE_UPDATED':
      return (
        <>
          {fullName({ user: entry.actor, fallback: DELETED_ACTOR })} updated the profile of {organization}
        </>
      )
    case 'LOCATION_CREATED':
      return <SubjectSentence entry={entry} verb="added" noun="location" organization={subjectOrganization} />
    case 'LOCATION_UPDATED':
      return <SubjectSentence entry={entry} verb="changed" noun="location" organization={subjectOrganization} />
    case 'LOCATION_REMOVED':
      return <SubjectSentence entry={entry} verb="removed" noun="location" organization={subjectOrganization} />
    case 'DEPARTMENT_CREATED':
      return <SubjectSentence entry={entry} verb="added" noun="department" organization={subjectOrganization} />
    case 'DEPARTMENT_UPDATED':
      return <SubjectSentence entry={entry} verb="changed" noun="department" organization={subjectOrganization} />
    case 'DEPARTMENT_REMOVED':
      return <SubjectSentence entry={entry} verb="removed" noun="department" organization={subjectOrganization} />
    case 'ORGANIZATION_SETTINGS_UPDATED':
      return (
        <>
          {fullName({ user: entry.actor, fallback: DELETED_ACTOR })} updated the settings of {organization}
        </>
      )
    case 'OWNERSHIP_TRANSFERRED':
      return (
        <>
          {fullName({ user: entry.actor, fallback: DELETED_ACTOR })} made {fullName({ user: entry.target_user, fallback: DELETED_TARGET })} the owner of {organization}
        </>
      )
    case 'ORGANIZATION_DEACTIVATED_BY_OWNER':
      return (
        <>
          {fullName({ user: entry.actor, fallback: DELETED_ACTOR })} deactivated {organization}
        </>
      )
    case 'ORGANIZATION_REACTIVATED_BY_OWNER':
      return (
        <>
          {fullName({ user: entry.actor, fallback: DELETED_ACTOR })} reactivated {organization}
        </>
      )
    default: {
      const unknown: never = entry.action
      throw new Error(`Unknown activity action: ${String(unknown)}`)
    }
  }
}

interface SubjectSentenceProps {
  entry: ActivityEntry
  verb: 'added' | 'changed' | 'removed'
  noun: 'location' | 'department'
  organization: ReactNode
}

/** "Elsa Halili added the location Main campus", plus "at Oxford Academy" when the organization is given */
function SubjectSentence({ entry, verb, noun, organization }: SubjectSentenceProps) {
  return (
    <>
      {fullName({ user: entry.actor, fallback: DELETED_ACTOR })} {verb} the {noun} {entry.subject_name ?? UNNAMED_SUBJECT}
      {organization ? <> at {organization}</> : null}
    </>
  )
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
