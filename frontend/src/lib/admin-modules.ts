import { BarChart3, Building2, History, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// The platform admin's dashboard sidebar, in place of the school modules

export type AdminModule = {
  slug: 'clients' | 'statistics' | 'activity' | 'settings'
  icon: LucideIcon
  name: string
}

export const ADMIN_MODULES: AdminModule[] = [
  { slug: 'clients', icon: Building2, name: 'Clients' },
  { slug: 'statistics', icon: BarChart3, name: 'Statistics' },
  { slug: 'activity', icon: History, name: 'Activity' },
  // Their own account: the same page everyone reaches from the avatar at the bottom of the sidebar
  { slug: 'settings', icon: UserRound, name: 'Settings' },
]

export const adminModuleBySlug = (slug: string) => ADMIN_MODULES.find((module) => module.slug === slug)
