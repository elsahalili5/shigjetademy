import { Building2, CalendarClock, CalendarRange, ClipboardCheck, GraduationCap, Layers, LayoutDashboard, MapPin, Presentation, Settings, UserCog, Users, UsersRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ModuleSlug } from './modules'

// The organization owner's dashboard sidebar, grouped by area. Built pages have their own route;
// a module opens /dashboard/$module (the "not built yet" page for now) with its icon and name from MODULES.

export type OwnerNavItem =
  | {
      kind: 'page'
      to:
        | '/dashboard/overview'
        | '/dashboard/organization-profile'
        | '/dashboard/locations'
        | '/dashboard/academic-periods'
        | '/dashboard/members'
        | '/dashboard/organization-settings'
        | '/dashboard/students'
        | '/dashboard/lecturers'
        | '/dashboard/courses'
        | '/dashboard/groups'
        | '/dashboard/attendance'
        | '/dashboard/lessons'
        | '/dashboard/schedule'
      label: string
      icon: LucideIcon
    }
  | { kind: 'module'; slug: ModuleSlug; label?: string }
  /** The expandable Communication group, which every role's sidebar has */
  | { kind: 'communication' }

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
      { kind: 'page', to: '/dashboard/academic-periods', label: 'Academic periods', icon: CalendarRange },
      { kind: 'page', to: '/dashboard/members', label: 'Members and permissions', icon: UserCog },
      { kind: 'communication' },
      { kind: 'page', to: '/dashboard/organization-settings', label: 'Organization settings', icon: Settings },
    ],
  },
  {
    title: 'Academic management',
    items: [
      { kind: 'page', to: '/dashboard/students', label: 'Students', icon: Users },
      { kind: 'page', to: '/dashboard/lecturers', label: 'Lecturers', icon: GraduationCap },
      { kind: 'page', to: '/dashboard/courses', label: 'Courses', icon: Layers },
      { kind: 'page', to: '/dashboard/groups', label: 'Groups', icon: UsersRound },
      { kind: 'page', to: '/dashboard/schedule', label: 'Timetables', icon: CalendarClock },
    ],
  },
  {
    title: 'Learning',
    items: [
      { kind: 'page', to: '/dashboard/lessons', label: 'Lessons', icon: Presentation },
      { kind: 'module', slug: 'materials' },
      { kind: 'module', slug: 'assignments' },
      { kind: 'module', slug: 'tests', label: 'Tests and assessments' },
      { kind: 'page', to: '/dashboard/attendance', label: 'Attendance', icon: ClipboardCheck },
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
