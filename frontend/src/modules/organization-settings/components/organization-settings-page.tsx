import { Settings } from 'lucide-react'
import type { OrganizationSettings } from '@shigjetademy/shared/organization-settings'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { LoadError } from '#/components/LoadError'
import type { SessionMembership } from '#/modules/auth/utils/session-user'
import { useOrganizationSettings } from '../hooks/use-organization-settings'
import { DangerZoneSection } from './danger-zone-section'
import { PreferencesForm } from './preferences-form'
import { ReactivateSection } from './reactivate-section'
import { TransferOwnershipSection } from './transfer-ownership-section'

const SKELETON_ROWS = 3

interface OrganizationSettingsPageProps {
  organization: SessionMembership['organization']
}

/** The owner's settings for how the whole organization runs; while it is deactivated, only reactivating it */
export function OrganizationSettingsPage({ organization }: OrganizationSettingsPageProps) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={Settings} title="Organization settings" subtitle={`${organization.name} · how the whole organization runs`} />
      <div className="grid max-w-[1040px] gap-6 px-[clamp(20px,3.4vw,44px)] pb-10">
        {organization.status === 'DEACTIVATED' ? (
          <ReactivateSection organizationId={organization.id} organizationName={organization.name} />
        ) : (
          <ActiveOrganizationSettings organizationId={organization.id} organizationName={organization.name} />
        )}
      </div>
    </div>
  )
}

interface ActiveOrganizationSettingsProps {
  organizationId: string
  organizationName: string
}

function ActiveOrganizationSettings({ organizationId, organizationName }: ActiveOrganizationSettingsProps) {
  const settings = useOrganizationSettings(organizationId)
  return (
    <>
      <SettingsContent organizationId={organizationId} status={settings.status} settings={settings.data} onRetry={() => void settings.refetch()} />
      <TransferOwnershipSection organizationId={organizationId} organizationName={organizationName} />
      <DangerZoneSection organizationId={organizationId} organizationName={organizationName} />
    </>
  )
}

interface SettingsContentProps {
  organizationId: string
  status: 'pending' | 'error' | 'success'
  settings?: OrganizationSettings
  onRetry: () => void
}

function SettingsContent({ organizationId, status, settings, onRetry }: SettingsContentProps) {
  if (status === 'error') return <LoadError what="settings" onRetry={onRetry} />
  if (!settings) return <SettingsSkeleton />
  return <PreferencesForm organizationId={organizationId} settings={settings} />
}

function SettingsSkeleton() {
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
