import { useRef, useState } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { Award, BookOpen, ChevronDown, ClipboardCheck, FileQuestion, GraduationCap, List, LogOut, Menu, MessageSquareText, NotebookPen, PanelLeftClose, PanelLeftOpen, Presentation, School, Users, UsersRound, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { hasOrganizationPermission } from '@shigjetademy/shared/auth'
import type { Permission } from '@shigjetademy/shared/auth'
import type { OrganizationStatus } from '@shigjetademy/shared/organization'
import { Link, Outlet, createFileRoute, useMatchRoute, useNavigate, useRouterState } from '@tanstack/react-router'
import wordmark from '#/assets/brand/shigjetademy-wordmark-light.png'
import { ADMIN_MODULES } from '#/lib/admin-modules'
import { UserAvatar } from '#/components/UserAvatar'
import { useMediaQuery } from '#/hooks/useMediaQuery'
import { MODULES, moduleBySlug } from '#/lib/modules'
import { NARROW_SIDEBAR_QUERY, SidebarRailContext, readSidebarCollapsed, storeSidebarCollapsed, useSidebarRail } from '#/lib/sidebar-rail'
import type { ModuleSlug } from '#/lib/modules'
import { OWNER_NAV_SECTIONS } from '#/lib/owner-navigation'
import type { OwnerNavItem } from '#/lib/owner-navigation'
import { requireOrganization } from '#/lib/route-guard'
import { useActiveMembership } from '#/modules/auth/hooks/use-active-membership'
import { useAuth } from '#/modules/auth/hooks/use-auth'
import { isOrganizationGuardian, isOrganizationLecturer, isOrganizationOwner, isOrganizationStudent, isPlatformAdmin } from '#/modules/auth/utils/session-user'
import type { SessionMembership } from '#/modules/auth/utils/session-user'
import { ROLE_LABELS } from '#/modules/auth/utils/role-labels'
import { CommunicationNavGroup } from '#/modules/communication/components/communication-nav-group'
import { FocusNavLink } from '#/modules/focus/components/focus-nav-link'
import { OrganizationSuspended } from '#/modules/organization/components/organization-suspended'
import { OrganizationDeactivated } from '#/modules/organization-settings/components/organization-deactivated'
import { OrganizationMark } from '#/modules/organization/components/organization-mark'
import { OrganizationSwitcher } from '#/modules/organization/components/organization-switcher'

const SIDEBAR_LINK_CLASS =
  'flex items-center gap-3 rounded-xl px-3.5 py-[10px] font-[550] text-on-navy-2 no-underline transition-colors duration-[180ms] ease-out hover:text-white aria-[current=page]:bg-navy-2 aria-[current=page]:text-white rail:justify-center rail:px-0 [&_svg]:flex-none aria-[current=page]:[&_svg]:text-green'

// School modules that are built have their own page instead of the "not built yet" one
const BUILT_MODULE_PAGES = {
  'organization-profile': '/dashboard/organization-profile',
  locations: '/dashboard/locations',
  'academic-periods': '/dashboard/academic-periods',
  students: '/dashboard/students',
  lecturers: '/dashboard/lecturers',
  courses: '/dashboard/courses',
  groups: '/dashboard/groups',
  schedule: '/dashboard/schedule',
  attendance: '/dashboard/attendance',
  lessons: '/dashboard/lessons',
  materials: '/dashboard/materials',
  assignments: '/dashboard/assignments',
  grades: '/dashboard/grades',
  tests: '/dashboard/tests',
} as const

const isBuiltModule = (slug: string): slug is keyof typeof BUILT_MODULE_PAGES => slug in BUILT_MODULE_PAGES

// Modules a school admin sees only with one of their permissions; the next gated module adds one entry
const MODULE_PERMISSIONS = {
  students: ['MANAGE_STUDENTS'],
  lecturers: ['MANAGE_LECTURERS'],
  courses: ['MANAGE_COURSES'],
  // Timetable admins read groups to move their lessons
  groups: ['MANAGE_COURSES', 'MANAGE_SCHEDULES'],
  schedule: ['MANAGE_SCHEDULES'],
  attendance: ['MANAGE_ATTENDANCE'],
  lessons: ['MANAGE_COURSES'],
  materials: ['MANAGE_MATERIALS'],
  assignments: ['MANAGE_GRADES'],
  grades: ['MANAGE_GRADES'],
  tests: ['MANAGE_TESTS'],
} as const satisfies Partial<Record<ModuleSlug, readonly Permission[]>>

const isGatedModule = (slug: ModuleSlug): slug is keyof typeof MODULE_PERMISSIONS => slug in MODULE_PERMISSIONS

/** The gated modules this membership may not use, so the sidebar leaves them out */
const getHiddenModuleSlugs = (membership: SessionMembership | undefined) =>
  new Set(
    MODULES.map((m) => m.slug).filter((slug) => isGatedModule(slug) && !(membership && MODULE_PERMISSIONS[slug].some((permission) => hasOrganizationPermission({ membership, permission })))),
  )

const SIDEBAR_SUBLINK_CLASS =
  'flex items-center gap-2.5 rounded-xl py-[8px] pr-3.5 pl-[42px] text-[0.95rem] font-[550] text-on-navy-2 no-underline transition-colors duration-[180ms] ease-out hover:text-white aria-[current=page]:bg-navy-2 aria-[current=page]:text-white [&_svg]:flex-none aria-[current=page]:[&_svg]:text-green'

// The pages under a lecturer's Students menu: the existing students page (and each student's page under it) and the notes to parents
const STUDENTS_MENU_PATHS = ['/dashboard/my-students', '/dashboard/student-notes'] as const

const SIDEBAR_HEADING_CLASS = 'px-3.5 pb-2.5 font-data text-[0.807rem] tracking-[0.06em] text-on-navy-2 uppercase rail:hidden'

export const Route = createFileRoute('/dashboard')({
  beforeLoad: ({ context }) => requireOrganization(context.queryClient),
  component: DashboardLayout,
})

/** The signed-in app: navy frame, module sidebar, and the active module on a white panel. On narrow screens the sidebar opens as a drawer from a top bar. */
function DashboardLayout() {
  const auth = useAuth()
  const membership = useActiveMembership()
  // The platform admin runs the platform, so their sidebar lists clients and statistics instead of school modules
  const isAdmin = auth.user ? isPlatformAdmin(auth.user) : false
  const organizationStatus = isAdmin ? 'ACTIVE' : (membership?.organization.status ?? 'ACTIVE')
  const organizationName = membership?.organization.name ?? 'Shigjetademy'
  const isOwner = isOrganizationOwner(membership)
  const [isCollapsed, setIsCollapsed] = useState(readSidebarCollapsed)
  const isNarrow = useMediaQuery(NARROW_SIDEBAR_QUERY)
  const isRail = isCollapsed && !isNarrow

  const handleCollapsedChange = (nextIsCollapsed: boolean) => {
    setIsCollapsed(nextIsCollapsed)
    storeSidebarCollapsed(nextIsCollapsed)
  }

  const panel = (
    // data-flush-end opts out of the marketing pages' bottom padding on main's last child
    <div className="h-full" data-flush-end>
      <DashboardPanel organizationStatus={organizationStatus} organizationName={organizationName} isOwner={isOwner} />
    </div>
  )

  if (isNarrow) {
    return (
      <div className="flex min-h-svh flex-col bg-navy">
        <MobileSidebar />
        <main className="relative min-h-[70svh] flex-1 overflow-hidden rounded-t-[24px] bg-white">{panel}</main>
      </div>
    )
  }

  return (
    <div className="h-svh bg-navy">
      <div
        className={`grid h-full transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none ${isRail ? 'grid-cols-[76px_minmax(0,1fr)]' : 'grid-cols-[minmax(248px,288px)_minmax(0,1fr)]'}`}
      >
        <aside data-sidebar={isRail ? 'rail' : 'full'} className="flex min-h-0 min-w-0 flex-col gap-5 px-3 py-4">
          <SidebarRailContext value={{ isRail, expand: () => handleCollapsedChange(false) }}>
            <SidebarBody
              headerAction={
                <button
                  type="button"
                  onClick={() => handleCollapsedChange(!isRail)}
                  className={SIDEBAR_ICON_BUTTON_CLASS}
                  aria-label={isRail ? 'Expand sidebar' : 'Collapse sidebar'}
                  title={isRail ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {isRail ? <PanelLeftOpen size={19} strokeWidth={1.9} aria-hidden="true" /> : <PanelLeftClose size={19} strokeWidth={1.9} aria-hidden="true" />}
                </button>
              }
            />
          </SidebarRailContext>
        </aside>

        <main className="relative min-h-0 overflow-hidden rounded-l-[24px] bg-white">{panel}</main>
      </div>
    </div>
  )
}

const SIDEBAR_ICON_BUTTON_CLASS =
  'grid size-9 flex-none place-items-center rounded-lg text-on-navy-2 transition-colors duration-200 hover:bg-navy-2 hover:text-white focus-visible:outline-2 focus-visible:outline-green'

/** The top bar on narrow screens, and the sidebar it opens as a drawer from the left. The drawer closes on a link, the close button, Escape or a tap outside it. */
function MobileSidebar() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  const handleOpen = () => {
    dialogRef.current?.showModal()
    setIsOpen(true)
  }

  const handleClose = () => {
    dialogRef.current?.close()
    setIsOpen(false)
  }

  // A tap on the backdrop lands on the dialog itself; a tap on a link leaves for its page
  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (!(event.target instanceof Element)) return
    if (event.target === event.currentTarget || event.target.closest('a')) handleClose()
  }

  return (
    <>
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <SidebarWordmark />
        <button type="button" onClick={handleOpen} className={`${SIDEBAR_ICON_BUTTON_CLASS} size-11`} aria-label="Open menu" aria-expanded={isOpen} aria-haspopup="dialog">
          <Menu size={22} strokeWidth={1.9} aria-hidden="true" />
        </button>
      </header>

      <dialog
        ref={dialogRef}
        aria-label="Menu"
        onClose={() => setIsOpen(false)}
        onClick={handleDialogClick}
        className="fixed inset-y-0 left-0 m-0 h-svh max-h-none w-[min(300px,86vw)] max-w-none bg-navy p-0 text-white transition-transform duration-250 ease-out backdrop:bg-black/50 motion-reduce:transition-none starting:open:-translate-x-full"
      >
        {isOpen ? (
          <div className="flex h-full flex-col gap-5 px-3 py-4">
            <SidebarBody
              headerAction={
                <button type="button" onClick={handleClose} className={`${SIDEBAR_ICON_BUTTON_CLASS} size-11`} aria-label="Close menu">
                  <X size={20} strokeWidth={1.9} aria-hidden="true" />
                </button>
              }
            />
          </div>
        ) : null}
      </dialog>
    </>
  )
}

function SidebarWordmark() {
  return (
    <Link
      to="/home"
      className="rounded-lg no-underline opacity-95 transition-opacity duration-200 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green rail:hidden"
      aria-label="Shigjetademy website"
    >
      <img className="block h-7.5 w-auto" src={wordmark} alt="Shigjetademy" width={120} height={30} />
    </Link>
  )
}

interface SidebarBodyProps {
  /** The button at the top right: collapse on desktop, close in the drawer */
  headerAction: ReactNode
}

/** What the sidebar holds wherever it is shown: the wordmark, the organization, the modules, and the signed-in user */
function SidebarBody({ headerAction }: SidebarBodyProps) {
  const auth = useAuth()
  const navigate = useNavigate()
  const sidebar = useSidebarRail()
  const membership = useActiveMembership()
  const fullName = auth.user ? `${auth.user.first_name} ${auth.user.last_name}` : ''
  const organizationName = membership?.organization.name ?? 'Shigjetademy'
  const roleLabel = membership ? ROLE_LABELS[membership.role] : 'Platform admin'
  const isAdmin = auth.user ? isPlatformAdmin(auth.user) : false

  const handleLogout = async () => {
    await auth.logout()
    await navigate({ to: '/login' })
  }

  return (
    <>
      <div className="flex min-h-11 items-center justify-between gap-3 pl-2.5 rail:justify-center rail:pl-0">
        <SidebarWordmark />
        {headerAction}
      </div>

      {sidebar.isRail ? (
        <button
          type="button"
          onClick={sidebar.expand}
          className="mx-auto grid place-items-center rounded-xl p-1.5 transition-colors duration-200 hover:bg-navy-2"
          aria-label={`${organizationName}, expand sidebar`}
          title={organizationName}
        >
          <OrganizationMark name={organizationName} />
        </button>
      ) : auth.user && membership && !isAdmin ? (
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

      <nav className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Modules">
        <SidebarNavigation membership={membership} isAdmin={isAdmin} />
      </nav>

      <div className="flex items-center gap-2 border-t border-white/10 px-1 pt-4 rail:flex-col rail:px-0">
        <Link
          to="/dashboard/profile"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1.5 py-1.5 no-underline transition-colors duration-200 hover:bg-navy-2 aria-[current=page]:bg-navy-2 rail:flex-none"
          aria-label="Your profile"
          title={sidebar.isRail ? fullName : undefined}
        >
          <UserAvatar
            name={fullName}
            avatarUrl={auth.user?.avatar_url ?? null}
            className="grid size-9 flex-none place-items-center rounded-full bg-green-wash text-[0.9rem] font-bold text-green-deep"
          />
          <span className="grid min-w-0 flex-1 leading-tight rail:hidden">
            <span className="truncate font-semibold text-white">{fullName}</span>
            <span className="truncate text-[0.87rem] text-on-navy-2">{auth.user?.email}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="grid size-9 place-items-center rounded-full text-on-navy-2 transition-colors duration-200 hover:bg-navy-2 hover:text-white"
          aria-label="Log out"
          title={sidebar.isRail ? 'Log out' : undefined}
        >
          <LogOut size={17} strokeWidth={1.9} aria-hidden="true" />
        </button>
      </div>
    </>
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

/** The owner's areas, a student's My school, a lecturer's My teaching, a guardian's My children, or the module list for everyone else */
function SidebarNavigation({ membership, isAdmin }: SidebarNavigationProps) {
  if (isOrganizationOwner(membership)) return <OwnerNavigation />
  if (isOrganizationStudent(membership)) return <StudentNavigation />
  if (isOrganizationLecturer(membership)) return <LecturerNavigation />
  if (isOrganizationGuardian(membership)) return <GuardianNavigation />
  return <ModuleNavigation isAdmin={isAdmin} hiddenSlugs={getHiddenModuleSlugs(membership)} />
}

/** Students have My school, Learning materials, Assignments, Tests, Grades, Focus and Communication; their profile is at the bottom of the sidebar like everyone's */
function StudentNavigation() {
  const sidebar = useSidebarRail()
  return (
    <>
      <span className={SIDEBAR_HEADING_CLASS} aria-hidden="true">
        Dashboard
      </span>
      <Link to="/dashboard/my-school" className={SIDEBAR_LINK_CLASS} title={sidebar.isRail ? 'My school' : undefined}>
        <SidebarLinkContent icon={School} label="My school" />
      </Link>
      <Link to="/dashboard/materials" className={SIDEBAR_LINK_CLASS} title={sidebar.isRail ? 'Learning materials' : undefined}>
        <SidebarLinkContent icon={BookOpen} label="Learning materials" />
      </Link>
      <AssignmentsLink />
      <TestsLink />
      <GradesLink />
      <FocusNavLink className={SIDEBAR_LINK_CLASS} />
      <CommunicationNavGroup linkClassName={SIDEBAR_LINK_CLASS} />
    </>
  )
}

function AssignmentsLink() {
  const sidebar = useSidebarRail()
  return (
    <Link to="/dashboard/assignments" className={SIDEBAR_LINK_CLASS} title={sidebar.isRail ? 'Assignments' : undefined}>
      <SidebarLinkContent icon={NotebookPen} label="Assignments" />
    </Link>
  )
}

function TestsLink() {
  const sidebar = useSidebarRail()
  return (
    <Link to="/dashboard/tests" className={SIDEBAR_LINK_CLASS} title={sidebar.isRail ? 'Tests' : undefined}>
      <SidebarLinkContent icon={FileQuestion} label="Tests" />
    </Link>
  )
}

function GradesLink() {
  const sidebar = useSidebarRail()
  return (
    <Link to="/dashboard/grades" className={SIDEBAR_LINK_CLASS} title={sidebar.isRail ? 'Grades' : undefined}>
      <SidebarLinkContent icon={Award} label="Grades" />
    </Link>
  )
}

/** Guardians have My children, Notes and Communication; their profile is at the bottom of the sidebar like everyone's */
function GuardianNavigation() {
  const sidebar = useSidebarRail()
  return (
    <>
      <span className={SIDEBAR_HEADING_CLASS} aria-hidden="true">
        Dashboard
      </span>
      <Link to="/dashboard/my-children" className={SIDEBAR_LINK_CLASS} title={sidebar.isRail ? 'My children' : undefined}>
        <SidebarLinkContent icon={UsersRound} label="My children" />
      </Link>
      <Link to="/dashboard/my-notes" className={SIDEBAR_LINK_CLASS} title={sidebar.isRail ? 'Notes' : undefined}>
        <SidebarLinkContent icon={MessageSquareText} label="Notes" />
      </Link>
      <CommunicationNavGroup linkClassName={SIDEBAR_LINK_CLASS} />
    </>
  )
}

/** Lecturers have My teaching, Students, Attendance, Lessons, Learning materials, Assignments, Tests, Grades and Communication; their profile is at the bottom of the sidebar like everyone's */
function LecturerNavigation() {
  const sidebar = useSidebarRail()
  return (
    <>
      <span className={SIDEBAR_HEADING_CLASS} aria-hidden="true">
        Dashboard
      </span>
      <Link to="/dashboard/my-teaching" className={SIDEBAR_LINK_CLASS} title={sidebar.isRail ? 'My teaching' : undefined}>
        <SidebarLinkContent icon={GraduationCap} label="My teaching" />
      </Link>
      <StudentsMenu />
      <Link to="/dashboard/attendance" className={SIDEBAR_LINK_CLASS} title={sidebar.isRail ? 'Attendance' : undefined}>
        <SidebarLinkContent icon={ClipboardCheck} label="Attendance" />
      </Link>
      <Link to="/dashboard/lessons" className={SIDEBAR_LINK_CLASS} title={sidebar.isRail ? 'Lessons' : undefined}>
        <SidebarLinkContent icon={Presentation} label="Lessons" />
      </Link>
      <Link to="/dashboard/materials" className={SIDEBAR_LINK_CLASS} title={sidebar.isRail ? 'Learning materials' : undefined}>
        <SidebarLinkContent icon={BookOpen} label="Learning materials" />
      </Link>
      <AssignmentsLink />
      <TestsLink />
      <GradesLink />
      <CommunicationNavGroup linkClassName={SIDEBAR_LINK_CLASS} />
    </>
  )
}

/** The lecturer's Students menu: the existing students page, and the notes they write to students' parents. Open whenever the current page is under either. */
function StudentsMenu() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const isInside = STUDENTS_MENU_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
  const [isOpen, setIsOpen] = useState(isInside)
  const [wasInside, setWasInside] = useState(isInside)
  // Arriving on one of its pages opens the menu; the lecturer can still close it there
  if (isInside !== wasInside) {
    setWasInside(isInside)
    if (isInside) setIsOpen(true)
  }
  const sidebar = useSidebarRail()
  const menuId = 'students-menu'
  // Its links only show in the full sidebar, so on the rail the menu opens the sidebar
  const isExpanded = isOpen && !sidebar.isRail

  const handleToggle = () => {
    if (sidebar.isRail) {
      sidebar.expand()
      setIsOpen(true)
      return
    }
    setIsOpen(!isOpen)
  }

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        className={`${SIDEBAR_LINK_CLASS} w-full cursor-pointer text-left ${isInside ? 'text-white' : ''}`}
        aria-expanded={isExpanded}
        aria-controls={isExpanded ? menuId : undefined}
        title={sidebar.isRail ? 'Students' : undefined}
        onClick={handleToggle}
      >
        <Users size={18} strokeWidth={1.9} aria-hidden="true" />
        <span className="flex-1 rail:sr-only">Students</span>
        <ChevronDown className={`transition-transform duration-[180ms] ease-out rail:hidden ${isOpen ? 'rotate-180' : ''}`} size={16} strokeWidth={2} aria-hidden="true" />
      </button>
      {isExpanded ? (
        <div id={menuId} className="flex flex-col gap-0.5">
          <Link to="/dashboard/my-students" className={SIDEBAR_SUBLINK_CLASS}>
            <List size={16} strokeWidth={1.9} aria-hidden="true" />
            Students List
          </Link>
          <Link to="/dashboard/student-notes" className={SIDEBAR_SUBLINK_CLASS}>
            <MessageSquareText size={16} strokeWidth={1.9} aria-hidden="true" />
            Student Notes
          </Link>
        </div>
      ) : null}
    </div>
  )
}

/** The owner's sidebar, grouped by area */
function OwnerNavigation() {
  return OWNER_NAV_SECTIONS.map((section) => (
    <div key={section.title} role="group" aria-label={section.title} className="flex flex-col gap-0.5 pb-3">
      <span className={SIDEBAR_HEADING_CLASS} aria-hidden="true">
        {section.title}
      </span>
      {section.items.map((item) => (
        <OwnerNavLink key={getOwnerNavKey(item)} item={item} />
      ))}
    </div>
  ))
}

const getOwnerNavKey = (item: OwnerNavItem) => {
  switch (item.kind) {
    case 'page':
      return item.to
    case 'module':
      return item.slug
    case 'communication':
      return item.kind
    default: {
      const unknown: never = item
      throw new Error(`Unknown sidebar item: ${String(unknown)}`)
    }
  }
}

interface OwnerNavLinkProps {
  item: OwnerNavItem
}

function OwnerNavLink({ item }: OwnerNavLinkProps) {
  const sidebar = useSidebarRail()
  switch (item.kind) {
    case 'page':
      return (
        <Link to={item.to} className={SIDEBAR_LINK_CLASS} title={sidebar.isRail ? item.label : undefined}>
          <SidebarLinkContent icon={item.icon} label={item.label} />
        </Link>
      )
    case 'communication':
      return <CommunicationNavGroup linkClassName={SIDEBAR_LINK_CLASS} />
    case 'module': {
      const mod = moduleBySlug(item.slug)
      if (!mod) return null
      return (
        <Link to="/dashboard/$module" params={{ module: item.slug }} activeOptions={{ exact: true }} className={SIDEBAR_LINK_CLASS} title={sidebar.isRail ? (item.label ?? mod.name) : undefined}>
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
      <span className="rail:sr-only">{label}</span>
    </>
  )
}

interface ModuleNavigationProps {
  isAdmin: boolean
  hiddenSlugs: Set<ModuleSlug>
}

/** The platform admin's modules, or the flat school module list for everyone else in an organization */
function ModuleNavigation({ isAdmin, hiddenSlugs }: ModuleNavigationProps) {
  const sidebar = useSidebarRail()
  // The school admin's Messages module is the Communication group below
  const modules = isAdmin ? ADMIN_MODULES : MODULES.filter((m) => !hiddenSlugs.has(m.slug) && m.slug !== 'messages')
  return (
    <>
      <span className={SIDEBAR_HEADING_CLASS} aria-hidden="true">
        {isAdmin ? 'Platform' : 'Dashboard'}
      </span>
      {modules.map((m) =>
        isBuiltModule(m.slug) ? (
          <Link key={m.slug} to={BUILT_MODULE_PAGES[m.slug]} className={SIDEBAR_LINK_CLASS} title={sidebar.isRail ? m.name : undefined}>
            <SidebarLinkContent icon={m.icon} label={m.name} />
          </Link>
        ) : (
          <Link key={m.slug} to="/dashboard/$module" params={{ module: m.slug }} activeOptions={{ exact: true }} className={SIDEBAR_LINK_CLASS} title={sidebar.isRail ? m.name : undefined}>
            <SidebarLinkContent icon={m.icon} label={m.name} />
          </Link>
        ),
      )}
      {isAdmin ? null : <CommunicationNavGroup linkClassName={SIDEBAR_LINK_CLASS} />}
    </>
  )
}
