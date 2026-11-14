import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { AlertCircle, Circle, CircleCheck, History, LayoutDashboard, Mail, RotateCw, ShieldCheck } from 'lucide-react'
import { MEMBER_ROLES } from '@shigjetademy/shared/auth'
import type { OrganizationOverview as Overview, OverviewInvitation } from '@shigjetademy/shared/organization'
import type { ModuleSlug } from '#/lib/modules'
import { useFormatDate } from '#/lib/use-format-date'
import { ActivityRow, ActivityRowSkeleton } from '#/modules/activity/components/activity-row'
import { useOrganizationOverview } from '../hooks/use-organization-overview'
import { MEMBER_ROLE_NOUNS } from '../utils/labels'
import { BreakdownList } from './breakdown-list'
import { StatTile } from './stat-tile'
import { WeeklyChart } from './weekly-chart'
import { NotificationBell } from '#/components/NotificationBell'

const SKELETON_ROWS = 3

const STEP_LINK_CLASS = 'flex items-center gap-3 px-5 py-4 text-ink no-underline transition-colors duration-150 hover:bg-mist'

// Modules that are not built yet link to their page and are never done
const UNBUILT_STEPS = [
  { label: 'Add students', module: 'students' },
  { label: 'Plan the timetable', module: 'schedule' },
  { label: 'Set up payments', module: 'payments' },
] as const satisfies readonly { label: string; module: ModuleSlug }[]

interface OrganizationOverviewProps {
  organizationId: string
  organizationName: string
}

/** The owner's landing page: real numbers about the organization, what needs attention, recent activity and first steps. */
export function OrganizationOverview({ organizationId, organizationName }: OrganizationOverviewProps) {
  const overview = useOrganizationOverview(organizationId)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <header className="bg-linear-to-b from-green-wash to-white px-[clamp(20px,3.4vw,44px)] pt-[clamp(24px,3.4vw,40px)] pb-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <span
              className="grid size-14 flex-none place-items-center rounded-2xl bg-white text-green-deep shadow-[0_1px_2px_rgba(22,34,46,0.06),0_10px_24px_-12px_rgba(22,34,46,0.3)]"
              aria-hidden="true"
            >
              <LayoutDashboard size={26} strokeWidth={1.7} />
            </span>
            <div>
              <h1 className="font-display text-[clamp(1.7rem,2.6vw,2.3rem)] leading-[1.05] font-[680] tracking-[-0.03em]">Overview</h1>
              <p className="mt-1.5 text-ink-2">{organizationName}</p>
            </div>
          </div>
          <div className="self-center">
            <NotificationBell />
          </div>
        </div>
      </header>

      <div className="max-w-[1180px] px-[clamp(20px,3.4vw,44px)] pb-10">
        <OverviewContent status={overview.status} overview={overview.data} onRetry={() => void overview.refetch()} />
      </div>
    </div>
  )
}

interface OverviewContentProps {
  status: 'pending' | 'error' | 'success'
  overview?: Overview
  onRetry: () => void
}

function OverviewContent({ status, overview, onRetry }: OverviewContentProps) {
  if (status === 'error') {
    return (
      <div className="grid justify-items-center gap-3 py-16 text-center" role="alert">
        <AlertCircle className="text-coral-deep" size={28} strokeWidth={1.8} aria-hidden="true" />
        <p className="font-semibold">We couldn’t load the overview.</p>
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onRetry}>
          <RotateCw size={16} strokeWidth={2} aria-hidden="true" />
          Try again
        </button>
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      {overview ? <OrganizationCounts counts={overview.counts} /> : <StatTilesSkeleton />}

      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-5 max-[1100px]:grid-cols-1">
        <section className="rounded-card border border-rule p-5" aria-labelledby="overview-growth">
          <h2 id="overview-growth" className="text-[1.15rem] font-[650]">
            Growth
          </h2>
          <p className="mt-1 text-[0.93rem] text-ink-3">Members who joined, last 12 weeks</p>
          {overview ? <WeeklyChart metricLabel="New members" weeks={overview.members_per_week} /> : <ChartSkeleton />}
        </section>

        <section className="rounded-card border border-rule p-5" aria-labelledby="overview-roles">
          <h2 id="overview-roles" className="text-[1.15rem] font-[650]">
            Team by role
          </h2>
          {overview ? (
            <BreakdownList rows={MEMBER_ROLES.map((role) => ({ key: role, label: MEMBER_ROLE_NOUNS[role].other, count: overview.members_by_role[role] }))} />
          ) : (
            <ChartSkeleton />
          )}
        </section>
      </div>

      <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] items-start gap-6 max-[1100px]:grid-cols-1">
        <div className="grid gap-6">
          <OverviewCard id="overview-attention" title="Needs attention">
            {overview ? <AttentionList invitations={overview.pending_invitations} /> : <SkeletonRows />}
          </OverviewCard>
          <OverviewCard id="overview-activity" title="Recent activity">
            {overview ? <RecentActivity activity={overview.activity} /> : <SkeletonRows />}
          </OverviewCard>
        </div>
        <OverviewCard id="overview-getting-started" title="Getting started">
          {overview ? <GettingStarted hasAdmin={overview.counts.admins > 0} /> : <SkeletonRows />}
        </OverviewCard>
      </div>
    </div>
  )
}

interface OverviewCardProps {
  id: string
  title: string
  children: ReactNode
}

function OverviewCard({ id, title, children }: OverviewCardProps) {
  return (
    <section className="min-w-0 rounded-card border border-rule" aria-labelledby={id}>
      <h2 id={id} className="border-b border-rule px-5 py-4 text-[1.15rem] font-[650]">
        {title}
      </h2>
      {children}
    </section>
  )
}

interface OrganizationCountsProps {
  counts: Overview['counts']
}

function OrganizationCounts({ counts }: OrganizationCountsProps) {
  return (
    <dl className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-1">
      <StatTile label="Members" value={counts.members} detail="Active across every role" />
      <StatTile label="School admins" value={counts.admins} detail="Can manage the organization" />
      <StatTile label="Pending invitations" value={counts.pending_invitations} detail="School admins not accepted yet" />
    </dl>
  )
}

interface AttentionListProps {
  invitations: OverviewInvitation[]
}

function AttentionList({ invitations }: AttentionListProps) {
  const formatDate = useFormatDate()

  if (invitations.length === 0) {
    return (
      <div className="grid justify-items-center gap-2 px-5 py-10 text-center">
        <ShieldCheck className="text-green-deep" size={24} strokeWidth={1.7} aria-hidden="true" />
        <p className="text-ink-2">Nothing needs your attention</p>
      </div>
    )
  }

  return (
    <ul>
      {invitations.map((invitation) => (
        <li key={invitation.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-rule px-5 py-4 last:border-b-0">
          <span className="grid size-10 flex-none place-items-center rounded-full bg-kraft-wash text-kraft-ink" aria-hidden="true">
            <Mail size={18} strokeWidth={1.8} />
          </span>
          <span className="grid min-w-[200px] flex-1 gap-0.5 leading-tight">
            <span className="font-semibold break-all">{invitation.email}</span>
            <span className="text-[0.88rem] text-ink-3">School admin invitation not accepted yet · expires {formatDate(invitation.expires_at)}</span>
          </span>
          {invitation.is_expiring_soon ? <span className="chip chip--kraft">Expires within 48 hours</span> : null}
        </li>
      ))}
    </ul>
  )
}

interface RecentActivityProps {
  activity: Overview['activity']
}

function RecentActivity({ activity }: RecentActivityProps) {
  if (activity.length === 0) {
    return (
      <div className="grid justify-items-center gap-2 px-5 py-10 text-center">
        <History className="text-ink-3" size={24} strokeWidth={1.6} aria-hidden="true" />
        <p className="text-ink-2">No activity yet.</p>
      </div>
    )
  }

  return (
    <ol className="px-5" aria-label="Recent activity">
      {activity.map((entry) => (
        <ActivityRow key={entry.id} entry={entry} shouldLinkOrganization={false} />
      ))}
    </ol>
  )
}

interface GettingStartedProps {
  hasAdmin: boolean
}

function GettingStarted({ hasAdmin }: GettingStartedProps) {
  return (
    <ol>
      <li className="border-b border-rule">
        <Link to="/dashboard/members" className={STEP_LINK_CLASS}>
          <StepContent label="Invite your first admin" isDone={hasAdmin} />
        </Link>
      </li>
      {UNBUILT_STEPS.map((step) => (
        <li key={step.module} className="border-b border-rule last:border-b-0">
          <Link to="/dashboard/$module" params={{ module: step.module }} className={STEP_LINK_CLASS}>
            <StepContent label={step.label} isDone={false} />
          </Link>
        </li>
      ))}
    </ol>
  )
}

interface StepContentProps {
  label: string
  isDone: boolean
}

function StepContent({ label, isDone }: StepContentProps) {
  const Icon = isDone ? CircleCheck : Circle
  return (
    <>
      <Icon className={isDone ? 'flex-none text-green-deep' : 'flex-none text-ink-3'} size={20} strokeWidth={1.9} aria-hidden="true" />
      <span className={isDone ? 'text-ink-3 line-through' : 'font-[550]'}>{label}</span>
      <span className="sr-only">{isDone ? ', done' : ', to do'}</span>
    </>
  )
}

function SkeletonRows() {
  return (
    <ul className="px-5" aria-busy="true" aria-label="Loading">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <ActivityRowSkeleton key={index} />
      ))}
    </ul>
  )
}

function StatTilesSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3 max-[640px]:grid-cols-1" aria-busy="true" aria-label="Loading">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="h-[124px] animate-pulse rounded-card bg-mist" />
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return <div className="mt-4 h-[200px] animate-pulse rounded-xl bg-mist" aria-busy="true" aria-label="Loading" />
}
