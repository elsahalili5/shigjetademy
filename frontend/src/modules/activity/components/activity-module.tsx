import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle, CirclePause, CirclePlay, History, KeyRound, Lock, RotateCw } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ActivityAction, ActivityEntry, ActivityUser } from '@shigjetademy/shared/activity'
import { useClients } from '#/modules/organization/hooks/use-clients'
import { useActivity } from '../hooks/use-activity'
import { formatDateTime } from '../utils/format'
import { ACTIVITY_ACTION_LABELS } from '../utils/labels'

const SKELETON_ROWS = 6

const ACTION_ICONS = {
  ORGANIZATION_SUSPENDED: CirclePause,
  ORGANIZATION_REACTIVATED: CirclePlay,
  PASSWORD_CHANGED: KeyRound,
  ACCOUNT_LOCKED: Lock,
} as const satisfies Record<ActivityAction, LucideIcon>

const isActivityAction = (value: string): value is ActivityAction => value in ACTIVITY_ACTION_LABELS

const fullName = (user: ActivityUser | null) => (user ? `${user.first_name} ${user.last_name}` : 'A deleted user')

export function ActivityModule() {
  const clients = useClients()
  const [organizationId, setOrganizationId] = useState('')
  const [action, setAction] = useState<ActivityAction | ''>('')
  const activity = useActivity({ organizationId: organizationId || undefined, action: action || undefined })

  const hasFilters = !!organizationId || !!action

  const handleActionChange = (value: string) => {
    setAction(isActivityAction(value) ? value : '')
  }

  const handleClearFilters = () => {
    setOrganizationId('')
    setAction('')
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <header className="bg-linear-to-b from-green-wash to-white px-[clamp(20px,3.4vw,44px)] pt-[clamp(24px,3.4vw,40px)] pb-6">
        <div className="flex items-start gap-4">
          <span
            className="grid size-14 flex-none place-items-center rounded-2xl bg-white text-green-deep shadow-[0_1px_2px_rgba(22,34,46,0.06),0_10px_24px_-12px_rgba(22,34,46,0.3)]"
            aria-hidden="true"
          >
            <History size={26} strokeWidth={1.7} />
          </span>
          <div>
            <h1 className="font-display text-[clamp(1.7rem,2.6vw,2.3rem)] leading-[1.05] font-[680] tracking-[-0.03em]">Activity</h1>
            <p className="mt-1.5 text-ink-2">Who did what on Shigjetademy, and when</p>
          </div>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <FilterSelect label="Filter by client" value={organizationId} onChange={setOrganizationId}>
            <option value="">All clients</option>
            {(clients.data ?? []).map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </FilterSelect>

          <FilterSelect label="Filter by action" value={action} onChange={handleActionChange}>
            <option value="">All actions</option>
            {Object.entries(ACTIVITY_ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </FilterSelect>
        </div>
      </header>

      <div className="px-[clamp(20px,3.4vw,44px)] pb-8">
        <ActivityList
          status={activity.status}
          entries={activity.data ?? []}
          hasFilters={hasFilters}
          hasNextPage={activity.hasNextPage}
          isLoadingMore={activity.isFetchingNextPage}
          onRetry={() => void activity.refetch()}
          onLoadMore={() => void activity.fetchNextPage()}
          onClearFilters={handleClearFilters}
        />
      </div>
    </div>
  )
}

interface FilterSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}

function FilterSelect({ label, value, onChange, children }: FilterSelectProps) {
  return (
    <label className="flex items-center">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 cursor-pointer rounded-full border border-rule-strong bg-white px-4 text-[0.98rem] font-medium transition-[border-color,box-shadow] duration-200 hover:border-ink-3 focus:border-green-deep focus:shadow-[0_0_0_3px_var(--green-wash)] focus:outline-none"
      >
        {children}
      </select>
    </label>
  )
}

interface ActivityListProps {
  status: 'pending' | 'error' | 'success'
  entries: ActivityEntry[]
  hasFilters: boolean
  hasNextPage: boolean
  isLoadingMore: boolean
  onRetry: () => void
  onLoadMore: () => void
  onClearFilters: () => void
}

function ActivityList({ status, entries, hasFilters, hasNextPage, isLoadingMore, onRetry, onLoadMore, onClearFilters }: ActivityListProps) {
  if (status === 'error') {
    return (
      <div className="grid justify-items-center gap-3 py-16 text-center" role="alert">
        <AlertCircle className="text-coral-deep" size={28} strokeWidth={1.8} aria-hidden="true" />
        <p className="font-semibold">We couldn’t load the activity.</p>
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onRetry}>
          <RotateCw size={16} strokeWidth={2} aria-hidden="true" />
          Try again
        </button>
      </div>
    )
  }

  if (status === 'success' && entries.length === 0) {
    return (
      <div className="grid justify-items-center gap-3 py-16 text-center">
        <History className="text-ink-3" size={28} strokeWidth={1.6} aria-hidden="true" />
        <p className="font-semibold">{hasFilters ? 'No activity matches these filters.' : 'No activity yet.'}</p>
        {hasFilters ? (
          <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onClearFilters}>
            Clear filters
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="grid justify-items-center gap-6">
      <ol className="w-full" aria-label="Activity" aria-busy={status === 'pending'}>
        {status === 'pending'
          ? Array.from({ length: SKELETON_ROWS }, (_, index) => <SkeletonRow key={index} />)
          : entries.map((entry) => <ActivityRow key={entry.id} entry={entry} />)}
      </ol>
      {hasNextPage ? (
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onLoadMore} disabled={isLoadingMore}>
          {isLoadingMore ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </div>
  )
}

interface ActivityRowProps {
  entry: ActivityEntry
}

function ActivityRow({ entry }: ActivityRowProps) {
  const Icon = ACTION_ICONS[entry.action]
  return (
    <li className="flex items-center gap-3 border-b border-rule py-3">
      <span className="grid size-10 flex-none place-items-center rounded-[10px] bg-kraft-wash text-kraft-ink" aria-hidden="true">
        <Icon size={18} strokeWidth={1.9} />
      </span>
      <p className="min-w-0 flex-1 text-ink">
        <ActivitySentence entry={entry} />
      </p>
      <time className="tabular text-[0.95rem] whitespace-nowrap text-ink-2" dateTime={entry.created_at}>
        {formatDateTime(entry.created_at)}
      </time>
    </li>
  )
}

interface ActivitySentenceProps {
  entry: ActivityEntry
}

/** "Platform Admin suspended Oxford Academy", with the client's name linking to its page */
function ActivitySentence({ entry }: ActivitySentenceProps) {
  switch (entry.action) {
    case 'ORGANIZATION_SUSPENDED':
      return (
        <>
          {fullName(entry.actor)} suspended <OrganizationLink organization={entry.organization} />
        </>
      )
    case 'ORGANIZATION_REACTIVATED':
      return (
        <>
          {fullName(entry.actor)} reactivated <OrganizationLink organization={entry.organization} />
        </>
      )
    case 'PASSWORD_CHANGED':
      return <>{fullName(entry.actor)} changed their password</>
    case 'ACCOUNT_LOCKED':
      return (
        <>
          {fullName(entry.target_user)}’s account was locked after too many failed logins
        </>
      )
    default: {
      const unknown: never = entry.action
      throw new Error(`Unknown activity action: ${String(unknown)}`)
    }
  }
}

interface OrganizationLinkProps {
  organization: ActivityEntry['organization']
}

function OrganizationLink({ organization }: OrganizationLinkProps) {
  if (!organization) return <>a deleted client</>
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

function SkeletonRow() {
  return (
    <li className="flex items-center gap-3 border-b border-rule py-3" aria-hidden="true">
      <span className="size-10 flex-none animate-pulse rounded-[10px] bg-mist" />
      <span className="h-3.5 w-72 max-w-full flex-1 animate-pulse rounded bg-mist" />
      <span className="h-3.5 w-28 animate-pulse rounded bg-mist" />
    </li>
  )
}
