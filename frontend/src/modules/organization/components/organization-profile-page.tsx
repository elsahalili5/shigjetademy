import { Building2, Lock } from 'lucide-react'
import type { OrganizationProfile } from '@shigjetademy/shared/organization'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { LoadError } from '#/components/LoadError'
import { useOrganizationProfile } from '../hooks/use-organization-profile'
import { formatDate } from '../utils/format'
import { ORGANIZATION_STATUS_CHIPS, ORGANIZATION_STATUS_LABELS } from '../utils/labels'
import { OrganizationProfileDetails } from './organization-profile-details'
import { OrganizationProfileForm } from './organization-profile-form'

const SKELETON_ROWS = 4

interface OrganizationProfilePageProps {
  organizationId: string
  organizationName: string
  /** School admins see the same profile without anything to change */
  isOwner: boolean
}

/** The organization's profile: the owner edits it, school admins read it */
export function OrganizationProfilePage({ organizationId, organizationName, isOwner }: OrganizationProfilePageProps) {
  const profile = useOrganizationProfile(organizationId)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader
        icon={Building2}
        title="Organization profile"
        subtitle={isOwner ? organizationName : `${organizationName} · only the owner can change these details`}
      />
      <div className="grid max-w-[1040px] gap-6 px-[clamp(20px,3.4vw,44px)] pb-10">
        <ProfileContent status={profile.status} profile={profile.data} isOwner={isOwner} onRetry={() => void profile.refetch()} />
      </div>
    </div>
  )
}

interface ProfileContentProps {
  status: 'pending' | 'error' | 'success'
  profile?: OrganizationProfile
  isOwner: boolean
  onRetry: () => void
}

function ProfileContent({ status, profile, isOwner, onRetry }: ProfileContentProps) {
  if (status === 'error') return <LoadError what="organization profile" onRetry={onRetry} />
  if (!profile) return <ProfileSkeleton />

  return (
    <>
      <ProfileStatus profile={profile} />
      {isOwner ? <OrganizationProfileForm organizationId={profile.id} profile={profile} /> : <OrganizationProfileDetails profile={profile} />}
    </>
  )
}

interface ProfileStatusProps {
  profile: OrganizationProfile
}

/** Status and join date are shown but belong to Shigjetademy, not the owner */
function ProfileStatus({ profile }: ProfileStatusProps) {
  return (
    <section className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card border border-rule px-5 py-4" aria-labelledby="profile-status-title">
      <h2 id="profile-status-title" className="text-[1.15rem] font-[650]">
        Status
      </h2>
      <span className={`chip ${ORGANIZATION_STATUS_CHIPS[profile.status]}`}>{ORGANIZATION_STATUS_LABELS[profile.status]}</span>
      <span className="text-ink-2">Joined {formatDate(profile.created_at)}</span>
      <span className="flex items-center gap-1.5 text-[0.93rem] text-ink-3 min-[700px]:ml-auto">
        <Lock size={14} strokeWidth={2} aria-hidden="true" />
        Only Shigjetademy can change these
      </span>
    </section>
  )
}

function ProfileSkeleton() {
  return (
    <div className="grid gap-4 rounded-card border border-rule px-5 py-5" aria-busy="true" aria-label="Loading">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <span key={index} className="grid gap-2" aria-hidden="true">
          <span className="h-3.5 w-32 animate-pulse rounded bg-mist" />
          <span className="h-[50px] w-full animate-pulse rounded-xl bg-mist" />
        </span>
      ))}
    </div>
  )
}
