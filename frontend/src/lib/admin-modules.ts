import { BarChart3, Building2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// The platform admin's dashboard sidebar, in place of the school modules

export type AdminModule = {
  slug: 'clients' | 'statistics'
  icon: LucideIcon
  name: string
}

export const ADMIN_MODULES: AdminModule[] = [
  { slug: 'clients', icon: Building2, name: 'Clients' },
  { slug: 'statistics', icon: BarChart3, name: 'Statistics' },
]

export const adminModuleBySlug = (slug: string) => ADMIN_MODULES.find((module) => module.slug === slug)
