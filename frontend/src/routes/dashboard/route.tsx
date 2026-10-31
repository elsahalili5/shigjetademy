import { LogOut } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import wordmark from '#/assets/brand/shigjetademy-wordmark.png'
import { initials } from '#/lib/initials'
import { ADMIN_MODULES } from '#/lib/admin-modules'
import { MODULES, moduleBySlug } from '#/lib/modules'
import { OWNER_NAV_SECTIONS } from '#/lib/owner-navigation'
import type { OwnerNavItem } from '#/lib/owner-navigation'
import { requireOrganization } from '#/lib/route-guard'
import { useAuth } from '#/modules/auth/hooks/use-auth'
import { getOwnedOrganization, isPlatformAdmin } from '#/modules/auth/utils/get-home-path'
import { ROLE_LABELS } from '#/modules/auth/utils/role-labels'
import { OrganizationSuspended } from '#/modules/organization/components/organization-suspended'

const SIDEBAR_LINK_CLASS =
  'flex items-center gap-3 rounded-xl px-3.5 py-[10px] font-[550] text-on-navy-2 no-underline transition-colors duration-[180ms] ease-out hover:text-white aria-[current=page]:bg-navy-2 aria-[current=page]:text-white max-[860px]:flex-none max-[860px]:whitespace-nowrap [&_svg]:flex-none aria-[current=page]:[&_svg]:text-green'

const SIDEBAR_HEADING_CLASS = 'px-3.5 pb-2.5 font-data text-[0.807rem] tracking-[0.06em] text-on-navy-2 uppercase max-[860px]:hidden'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => requireOrganization(context.queryClient),
  component: DashboardLayout,
})

/** The signed-in app: navy frame, module sidebar, and the active module on a white panel. */
function DashboardLayout() {
  const auth = useAuth()
  const navigate = useNavigate()

  const membership = auth.user?.memberships[0]
  const fullName = auth.user ? `${auth.user.first_name} ${auth.user.last_name}` : ''
  const organizationName = membership?.organization.name ?? 'Shigjetademy'
  const roleLabel = membership ? ROLE_LABELS[membership.role] : 'Platform admin'
  // The platform admin runs the platform, so their sidebar lists clients and statistics instead of school modules
  const isAdmin = auth.user ? isPlatformAdmin(auth.user) : false
  const isSuspended = !isAdmin && membership?.organization.status === 'SUSPENDED'
  const isOwner = !!auth.user && !!getOwnedOrganization(auth.user)

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

          <div className="flex items-center gap-3 rounded-xl bg-navy-2 px-3 py-2.5 max-[860px]:hidden">
            <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-kraft font-display font-bold text-navy" aria-hidden="true">
              {organizationName.slice(0, 1)}
            </span>
            <span className="grid min-w-0 leading-tight">
              <span className="truncate font-semibold text-white">{organizationName}</span>
              <span className="truncate text-[0.87rem] text-on-navy-2">{roleLabel}</span>
            </span>
          </div>

          <nav
            className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1 [scrollbar-width:none] max-[860px]:flex-row max-[860px]:gap-1.5 max-[860px]:overflow-x-auto [&::-webkit-scrollbar]:hidden"
            aria-label="Modules"
          >
            {isOwner ? <OwnerNavigation /> : <ModuleNavigation isAdmin={isAdmin} />}
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
            {isSuspended ? <OrganizationSuspended organizationName={organizationName} /> : <Outlet />}
          </div>
        </main>
      </div>
    </div>
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
}

/** The platform admin's modules, or the flat school module list for everyone else in an organization */
function ModuleNavigation({ isAdmin }: ModuleNavigationProps) {
  const modules = isAdmin ? ADMIN_MODULES : MODULES
  return (
    <>
      <span className={SIDEBAR_HEADING_CLASS} aria-hidden="true">
        {isAdmin ? 'Platform' : 'Dashboard'}
      </span>
      {modules.map((m) => (
        <Link key={m.slug} to="/dashboard/$module" params={{ module: m.slug }} activeOptions={{ exact: true }} className={SIDEBAR_LINK_CLASS}>
          <SidebarLinkContent icon={m.icon} label={m.name} />
        </Link>
      ))}
    </>
  )
}
