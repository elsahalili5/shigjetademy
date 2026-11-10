import { SlidersHorizontal } from 'lucide-react'
import type { PlatformSettings } from '@shigjetademy/shared/platform-settings'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { LoadError } from '#/components/LoadError'
import { usePlatformSettings } from '../hooks/use-platform-settings'
import { PlatformSettingsForm } from './platform-settings-form'

const SKELETON_ROWS = 3

/** The platform admin's settings for the whole platform: its name and logo, maintenance mode and new organizations' defaults */
export function PlatformSettingsPage() {
  const settings = usePlatformSettings()
  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={SlidersHorizontal} title="Platform settings" subtitle="Name, logo, maintenance mode and new organization defaults" />
      <div className="grid max-w-[1040px] gap-6 px-[clamp(20px,3.4vw,44px)] pb-10">
        <SettingsContent status={settings.status} settings={settings.data} onRetry={() => void settings.refetch()} />
      </div>
    </div>
  )
}

interface SettingsContentProps {
  status: 'pending' | 'error' | 'success'
  settings?: PlatformSettings
  onRetry: () => void
}

function SettingsContent({ status, settings, onRetry }: SettingsContentProps) {
  if (status === 'error') return <LoadError what="platform settings" onRetry={onRetry} />
  if (!settings) return <SettingsSkeleton />
  return <PlatformSettingsForm settings={settings} />
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
