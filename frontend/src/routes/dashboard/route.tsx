import { LogOut } from 'lucide-react'
import { Link, Outlet, createFileRoute } from '@tanstack/react-router'
import wordmark from '#/assets/brand/shigjetademy-wordmark.png'
import { initials } from '#/lib/initials'
import { MODULES } from '#/lib/modules'
import { SAMPLE_ORG, SAMPLE_USER } from '#/lib/sampleStudents'

export const Route = createFileRoute('/dashboard')({
  component: DashboardLayout,
})

/** The signed-in app: navy frame, module sidebar, and the active module on a white panel. */
function DashboardLayout() {
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
              {SAMPLE_ORG.name.slice(0, 1)}
            </span>
            <span className="grid min-w-0 leading-tight">
              <span className="truncate font-semibold text-white">{SAMPLE_ORG.name}</span>
              <span className="truncate text-[0.87rem] text-on-navy-2">{SAMPLE_ORG.term}</span>
            </span>
          </div>

          <nav
            className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1 [scrollbar-width:none] max-[860px]:flex-row max-[860px]:gap-1.5 max-[860px]:overflow-x-auto [&::-webkit-scrollbar]:hidden"
            aria-label="Modules"
          >
            <span className="px-3.5 pb-2.5 font-data text-[0.807rem] tracking-[0.06em] text-on-navy-2 uppercase max-[860px]:hidden" aria-hidden="true">
              Dashboard
            </span>
            {MODULES.map((m) => {
              const Icon = m.icon
              return (
                <Link
                  key={m.slug}
                  to="/dashboard/$module"
                  params={{ module: m.slug }}
                  activeOptions={{ exact: true }}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-[10px] font-[550] text-on-navy-2 no-underline transition-colors duration-[180ms] ease-out hover:text-white aria-[current=page]:bg-navy-2 aria-[current=page]:text-white max-[860px]:flex-none max-[860px]:whitespace-nowrap [&_svg]:flex-none aria-[current=page]:[&_svg]:text-green"
                >
                  <Icon size={18} strokeWidth={1.9} aria-hidden="true" />
                  {m.name}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-3 border-t border-white/10 px-2 pt-4 max-[860px]:hidden">
            <span className="grid size-9 flex-none place-items-center rounded-full bg-green-wash text-[0.9rem] font-bold text-green-deep" aria-hidden="true">
              {initials(SAMPLE_USER.name)}
            </span>
            <span className="grid min-w-0 flex-1 leading-tight">
              <span className="truncate font-semibold text-white">{SAMPLE_USER.name}</span>
              <span className="text-[0.87rem] text-on-navy-2">{SAMPLE_USER.role}</span>
            </span>
            <Link
              to="/login"
              className="grid size-9 place-items-center rounded-full text-on-navy-2 transition-colors duration-200 hover:bg-navy-2 hover:text-white"
              aria-label="Log out"
            >
              <LogOut size={17} strokeWidth={1.9} aria-hidden="true" />
            </Link>
          </div>
        </aside>

        <main className="relative min-h-0 overflow-hidden rounded-l-[24px] bg-white max-[860px]:min-h-[70svh] max-[860px]:rounded-l-none max-[860px]:rounded-t-[24px]">
          {/* data-flush-end opts out of the marketing pages' bottom padding on main's last child */}
          <div className="h-full" data-flush-end>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
