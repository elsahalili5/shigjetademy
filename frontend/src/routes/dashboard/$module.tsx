import { Construction } from 'lucide-react'
import { Link, createFileRoute, redirect } from '@tanstack/react-router'
import { StudentsModule } from '#/components/StudentsModule'
import { adminModuleBySlug } from '#/lib/admin-modules'
import type { AdminModule } from '#/lib/admin-modules'
import { getSessionUser } from '#/lib/route-guard'
import { useTitle } from '#/lib/use-title'
import { MODULES, moduleBySlug } from '#/lib/modules'
import type { Module } from '#/lib/modules'
import { useAuth } from '#/modules/auth/hooks/use-auth'
import { isPlatformAdmin } from '#/modules/auth/utils/get-home-path'
import { ClientsModule } from '#/modules/organization/components/clients-module'
import { StatisticsModule } from '#/modules/organization/components/statistics-module'

export const Route = createFileRoute('/dashboard/$module')({
  // The platform admin only has the platform modules, and organization members only the school ones
  beforeLoad: ({ context, params }) => {
    const user = getSessionUser(context.queryClient)
    const isAdmin = !!user && isPlatformAdmin(user)
    if (isAdmin && !adminModuleBySlug(params.module)) {
      throw redirect({ to: '/dashboard/$module', params: { module: 'clients' } })
    }
    if (!isAdmin && adminModuleBySlug(params.module)) {
      throw redirect({ to: '/dashboard/$module', params: { module: 'students' } })
    }
  },
  component: DashboardModulePage,
})

/** One module on the dashboard's white panel */
function DashboardModulePage() {
  const auth = useAuth()
  const { module: slug } = Route.useParams()
  const adminModule = auth.user && isPlatformAdmin(auth.user) ? adminModuleBySlug(slug) : undefined

  if (adminModule) return <AdminModulePage module={adminModule} />
  return <SchoolModulePage mod={moduleBySlug(slug) ?? MODULES[0]} />
}

interface AdminModulePageProps {
  module: AdminModule
}

function AdminModulePage({ module }: AdminModulePageProps) {
  useTitle(`${module.name} · Shigjetademy`)
  switch (module.slug) {
    case 'clients':
      return <ClientsModule />
    case 'statistics':
      return <StatisticsModule />
    default: {
      const unknown: never = module.slug
      throw new Error(`Unknown admin module: ${String(unknown)}`)
    }
  }
}

interface SchoolModulePageProps {
  mod: Module
}

/** Only Students & enrolment is built so far */
function SchoolModulePage({ mod }: SchoolModulePageProps) {
  useTitle(`${mod.name} · Shigjetademy`)
  if (mod.slug === 'students') return <StudentsModule mod={mod} />
  return <NotBuilt mod={mod} />
}

interface NotBuiltProps {
  mod: Module
}

/** Modules that only exist on the sidebar so far. */
function NotBuilt({ mod }: NotBuiltProps) {
  const Icon = mod.icon
  return (
    <div className="grid h-full place-items-center bg-linear-to-b from-green-wash to-white to-40% p-8 text-center">
      <div className="grid max-w-[40ch] justify-items-center gap-4">
        <span className="grid size-16 place-items-center rounded-[18px] bg-white text-green-deep shadow-card" aria-hidden="true">
          <Icon size={28} strokeWidth={1.6} />
        </span>
        <h1 className="font-display text-[1.9rem] leading-tight font-[680] tracking-[-0.03em]">{mod.name}</h1>
        <p className="text-ink-2">{mod.tagline}</p>
        <p className="inline-flex items-center gap-2 text-[0.95rem] text-ink-3">
          <Construction size={16} strokeWidth={1.9} aria-hidden="true" />
          This module isn’t built yet. Students & enrolment is ready to try.
        </p>
        <Link className="button button--primary" to="/dashboard/$module" params={{ module: 'students' }}>
          Open Students & enrolment
        </Link>
      </div>
    </div>
  )
}
