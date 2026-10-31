import { Building2, LayoutDashboard, MapPin, UserCog } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleSlug } from './modules'

// The organization owner's dashboard sidebar, grouped by area. Built pages have their own route;
// a module opens /dashboard/$module (the "not built yet" page for now) with its icon and name from MODULES.

export type OwnerNavItem =
  | { kind: 'page'; to: '/dashboard/overview' | '/dashboard/organization-profile' | '/dashboard/locations' | '/dashboard/members'; label: string; icon: LucideIcon }
  | { kind: 'module'; slug: ModuleSlug; label?: string }

type OwnerNavSection = {
  title: string
  items: OwnerNavItem[]
}

export const OWNER_NAV_SECTIONS: OwnerNavSection[] = [
  {
    title: 'Organization',
    items: [
      { kind: 'page', to: '/dashboard/overview', label: 'Overview', icon: LayoutDashboard },
      { kind: 'page', to: '/dashboard/organization-profile', label: 'Organization profile', icon: Building2 },
      { kind: 'page', to: '/dashboard/locations', label: 'Locations and departments', icon: MapPin },
      { kind: 'module', slug: 'academic-periods' },
      { kind: 'page', to: '/dashboard/members', label: 'Members and permissions', icon: UserCog },
      { kind: 'module', slug: 'messages' },
    ],
  },
  {
    title: 'Academic management',
    items: [
      { kind: 'module', slug: 'students', label: 'Students' },
      { kind: 'module', slug: 'lecturers' },
      { kind: 'module', slug: 'courses' },
      { kind: 'module', slug: 'groups' },
      { kind: 'module', slug: 'schedule', label: 'Timetables' },
    ],
  },
  {
    title: 'Learning',
    items: [
      { kind: 'module', slug: 'lessons' },
      { kind: 'module', slug: 'materials' },
      { kind: 'module', slug: 'assignments' },
      { kind: 'module', slug: 'tests', label: 'Tests and assessments' },
      { kind: 'module', slug: 'attendance' },
      { kind: 'module', slug: 'grades' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { kind: 'module', slug: 'payments', label: 'Payments' },
      { kind: 'module', slug: 'financial-records' },
      { kind: 'module', slug: 'performance', label: 'Reports' },
    ],
  },
]
