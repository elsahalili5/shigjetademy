import { LogOut, School } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { OrganizationStatus } from '@shigjetademy/shared/organization'
import { Link, Outlet, createFileRoute, useMatchRoute, useNavigate } from '@tanstack/react-router'
import wordmark from '#/assets/brand/shigjetademy-wordmark.png'
import { initials } from '#/lib/initials'
import { ADMIN_MODULES } from '#/lib/admin-modules'
import { MODULES, moduleBySlug } from '#/lib/modules'
import { OWNER_NAV_SECTIONS } from '#/lib/owner-navigation'
import type { OwnerNavItem } from '#/lib/owner-navigation'
import { requireOrganization } from '#/lib/route-guard'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { useAuth } from '#/modules/auth/hooks/use-auth'
import { isOrganizationOwner, isOrganizationStudent, isPlatformAdmin } from '#/modules/auth/utils/session-user'
import type { SessionMembership } from '#/modules/auth/utils/session-user'
import { ROLE_LABELS } from '#/modules/auth/utils/role-labels'
import { OrganizationSuspended } from '#/modules/organization/components/organization-suspended'
import { OrganizationDeactivated } from '#/modules/organization-settings/components/organization-deactivated'
import { OrganizationMark } from '#/modules/organization/components/organization-mark'
import { OrganizationSwitcher } from '#/modules/organization/components/organization-switcher'
import { isStudentsManager } from '#/modules/students/utils/permissions'

const SIDEBAR_LINK_CLASS =
  'flex items-center gap-3 rounded-xl px-3.5 py-[10px] font-[550] text-on-navy-2 no-underline transition-colors duration-[180ms] ease-out hover:text-white aria-[current=page]:bg-navy-2 aria-[current=page]:text-white max-[860px]:flex-none max-[860px]:whitespace-nowrap [&_svg]:flex-none aria-[current=page]:[&_svg]:text-green'

// School modules that are built have their own page instead of the "not built yet" one
const BUILT_MODULE_PAGES = {
  'organization-profile': '/dashboard/organization-profile',
  locations: '/dashboard/locations',
  'academic-periods': '/dashboard/academic-periods',
  students: '/dashboard/students',
} as const

const isBuiltModule = (slug: string): slug is keyof typeof BUILT_MODULE_PAGES => slug in BUILT_MODULE_PAGES

const SIDEBAR_HEADING_CLASS = 'px-3.5 pb-2.5 font-data text-[0.807rem] tracking-[0.06em] text-on-navy-2 uppercase max-[860px]:hidden'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => requireOrganization(context.queryClient),
  component: DashboardLayout,
})

/** The signed-in app: navy frame, module sidebar, and the active module on a white panel. */
function DashboardLayout() {
  const auth = useAuth()
  const navigate = useNavigate()

  const membership = useActiveMembership()
  const fullName = auth.user ? `${auth.user.first_name} ${auth.user.last_name}` : ''
  const organizationName = membership?.organization.name ?? 'Shigjetademy'
  const roleLabel = membership ? ROLE_LABELS[membership.role] : 'Platform admin'
  // The platform admin runs the platform, so their sidebar lists clients and statistics instead of school modules
  const isAdmin = auth.user ? isPlatformAdmin(auth.user) : false
  const organizationStatus = isAdmin ? 'ACTIVE' : (membership?.organization.status ?? 'ACTIVE')
  const isOwner = isOrganizationOwner(membership)

  const handleLogout = async () => {
    await auth.logout()
    await navigate({ to: '/login' })
  }

  return (
    <div className="h-svh bg-navy max-[860px]:h-auto max-[860px]:min-h-svh">
      <div className="grid h-full grid-cols-[minmax(248px,288px)_minmax(0,1fr)] max-[860px]:grid-cols-1">
        <aside className="flex min-h-0 flex-col gap-5 px-3 py-4 max-[860px]:gap-3 max-[860px]:pb-3">
          <div className="flex items-center justify-between gap-3">
            <Link
              to="/"
              className="rounded-[14px] bg-haze px-3.5 py-2.5 no-underline transition-colors duration-200 hover:bg-white"
              aria-label="Shigjetademy website"
            >
              <img className="block h-7 w-auto" src={wordmark} alt="Shigjetademy" width={112} height={28} />
            </Link>
          </div>

          {auth.user && membership && !isAdmin ? (
            <OrganizationSwitcher memberships={auth.user.memberships} activeMembership={membership} />
          ) : (
            <div className="flex items-center gap-3 rounded-xl bg-navy-2 px-3 py-2.5">
              <OrganizationMark name={organizationName} />
              <span className="grid min-w-0 leading-tight">
                <span className="truncate font-semibold text-white">{organizationName}</span>
                <span className="truncate text-[0.87rem] text-on-navy-2">{roleLabel}</span>
              </span>
            </div>
          )}

          <nav
            className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1 [scrollbar-width:none] max-[860px]:flex-row max-[860px]:gap-1.5 max-[860px]:overflow-x-auto [&::-webkit-scrollbar]:hidden"
            aria-label="Modules"
          >
            <SidebarNavigation membership={membership} isAdmin={isAdmin} />
          </nav>

          <div className="flex items-center gap-2 border-t border-white/10 px-1 pt-4 max-[860px]:hidden">
            <Link
              to="/dashboard/profile"
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 py-1.5 no-underline transition-colors duration-200 hover:bg-navy-2 aria-[current=page]:bg-navy-2"
              aria-label="Your profile"
            >
              <span className="grid size-9 flex-none place-items-center rounded-full bg-green-wash text-[0.9rem] font-bold text-green-deep" aria-hidden="true">
                {initials(fullName)}
              </span>
              <span className="grid min-w-0 flex-1 leading-tight">
                <span className="truncate font-semibold text-white">{fullName}</span>
                <span className="truncate text-[0.87rem] text-on-navy-2">{auth.user?.email}</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="grid size-9 place-items-center rounded-full text-on-navy-2 transition-colors duration-200 hover:bg-navy-2 hover:text-white"
              aria-label="Log out"
            >
              <LogOut size={17} strokeWidth={1.9} aria-hidden="true" />
            </button>
          </div>
        </aside>

        <main className="relative min-h-0 overflow-hidden rounded-l-[24px] bg-white max-[860px]:min-h-[70svh] max-[860px]:rounded-l-none max-[860px]:rounded-t-[24px]">
          {/* data-flush-end opts out of the marketing pages' bottom padding on main's last child */}
          <div className="h-full" data-flush-end>
            <DashboardPanel organizationStatus={organizationStatus} organizationName={organizationName} isOwner={isOwner} />
          </div>
        </main>
      </div>
    </div>
  )
}

interface DashboardPanelProps {
  organizationStatus: OrganizationStatus
  organizationName: string
  isOwner: boolean
}

/** The active page, or a notice in its place while the organization can't be used */
function DashboardPanel({ organizationStatus, organizationName, isOwner }: DashboardPanelProps) {
  const matchRoute = useMatchRoute()
  switch (organizationStatus) {
    case 'ACTIVE':
      return <Outlet />
    case 'SUSPENDED':
      return <OrganizationSuspended organizationName={organizationName} />
    case 'DEACTIVATED':
      // The owner still reaches Organization settings, where they reactivate it
      if (isOwner && matchRoute({ to: '/dashboard/organization-settings' })) return <Outlet />
      return <OrganizationDeactivated organizationName={organizationName} isOwner={isOwner} />
    default: {
      const unknown: never = organizationStatus
      throw new Error(`Unknown organization status: ${String(unknown)}`)
    }
  }
}

interface SidebarNavigationProps {
  membership: SessionMembership | undefined
  isAdmin: boolean
}

/** The owner's areas, a student's My school, or the module list for everyone else */
function SidebarNavigation({ membership, isAdmin }: SidebarNavigationProps) {
  if (isOrganizationOwner(membership)) return <OwnerNavigation />
  if (isOrganizationStudent(membership)) return <StudentNavigation />
  return <ModuleNavigation isAdmin={isAdmin} shouldShowStudents={isStudentsManager(membership)} />
}

/** Students only have My school for now; their profile is at the bottom of the sidebar like everyone's */
function StudentNavigation() {
  return (
    <>
      <span className={SIDEBAR_HEADING_CLASS} aria-hidden="true">
        Dashboard
      </span>
      <Link to="/dashboard/my-school" className={SIDEBAR_LINK_CLASS}>
        <SidebarLinkContent icon={School} label="My school" />
      </Link>
    </>
  )
}

/** The owner's sidebar, grouped by area */
function OwnerNavigation() {
  return OWNER_NAV_SECTIONS.map((section) => (
    <div key={section.title} role="group" aria-label={section.title} className="flex flex-col gap-0.5 pb-3 max-[860px]:flex-none max-[860px]:flex-row max-[860px]:gap-1.5 max-[860px]:pb-0">
      <span className={SIDEBAR_HEADING_CLASS} aria-hidden="true">
        {section.title}
      </span>
      {section.items.map((item) => (
        <OwnerNavLink key={item.kind === 'page' ? item.to : item.slug} item={item} />
      ))}
    </div>
  ))
}

interface OwnerNavLinkProps {
  item: OwnerNavItem
}

function OwnerNavLink({ item }: OwnerNavLinkProps) {
  switch (item.kind) {
    case 'page':
      return (
        <Link to={item.to} className={SIDEBAR_LINK_CLASS}>
          <SidebarLinkContent icon={item.icon} label={item.label} />
        </Link>
      )
    case 'module': {
      const mod = moduleBySlug(item.slug)
      if (!mod) return null
      return (
        <Link to="/dashboard/$module" params={{ module: item.slug }} activeOptions={{ exact: true }} className={SIDEBAR_LINK_CLASS}>
          <SidebarLinkContent icon={mod.icon} label={item.label ?? mod.name} />
        </Link>
      )
    }
    default: {
      const unknown: never = item
      throw new Error(`Unknown sidebar item: ${String(unknown)}`)
    }
  }
}

interface SidebarLinkContentProps {
  icon: LucideIcon
  label: string
}

function SidebarLinkContent({ icon: Icon, label }: SidebarLinkContentProps) {
  return (
    <>
      <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
      {label}
    </>
  )
}

interface ModuleNavigationProps {
  isAdmin: boolean
  shouldShowStudents: boolean
}

/** The platform admin's modules, or the flat school module list for everyone else in an organization */
function ModuleNavigation({ isAdmin, shouldShowStudents }: ModuleNavigationProps) {
  const modules = isAdmin ? ADMIN_MODULES : MODULES.filter((m) => m.slug !== 'students' || shouldShowStudents)
  return (
    <>
      <span className={SIDEBAR_HEADING_CLASS} aria-hidden="true">
        {isAdmin ? 'Platform' : 'Dashboard'}
      </span>
      {modules.map((m) =>
        isBuiltModule(m.slug) ? (
          <Link key={m.slug} to={BUILT_MODULE_PAGES[m.slug]} className={SIDEBAR_LINK_CLASS}>
            <SidebarLinkContent icon={m.icon} label={m.name} />
          </Link>
        ) : (
          <Link key={m.slug} to="/dashboard/$module" params={{ module: m.slug }} activeOptions={{ exact: true }} className={SIDEBAR_LINK_CLASS}>
            <SidebarLinkContent icon={m.icon} label={m.name} />
          </Link>
        ),
      )}
    </>
  )
}
