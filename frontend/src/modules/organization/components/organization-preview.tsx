import { CreditCard, LayoutDashboard, Settings, Users } from 'lucide-react'
import type { OrganizationType } from '@shigjetademy/shared'
import type { CountryCode } from '@shigjetademy/shared/organization'
import { Arcs } from '#/components/Arcs'
import { regionNames } from '../utils/format'

const OWNER_MODULES = [
  { name: 'Overview', icon: LayoutDashboard },
  { name: 'Members & invitations', icon: Users },
  { name: 'Organization settings', icon: Settings },
  { name: 'Subscription & billing', icon: CreditCard },
] as const

interface OrganizationPreviewProps {
  name: string
  type?: OrganizationType
  country: CountryCode
}

/** The dashboard sidebar the owner will land in, filled in live from the form. */
export function OrganizationPreview({ name, type, country }: OrganizationPreviewProps) {
  const displayName = name.trim() || 'Your organization'
  const details = [type ?? 'Organization', regionNames.of(country)].join(' · ')

  return (
    <aside
      className="relative isolate flex flex-col justify-between gap-10 overflow-hidden rounded-panel bg-navy bg-[radial-gradient(70%_60%_at_100%_100%,rgba(31,176,139,0.2),transparent_70%)] p-[clamp(32px,4vw,56px)] max-[960px]:hidden"
      aria-label="Preview of your workspace"
    >
      <Arcs className="-top-[30%] -left-[10%] -z-10 w-[140%] opacity-60" />

      <p className="font-data text-[0.807rem] tracking-[0.06em] text-on-navy-2 uppercase">Your workspace</p>

      <div className="w-[min(100%,320px)] self-center rounded-[20px] bg-navy-2/70 p-3 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.5)] ring-1 ring-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-3 rounded-xl bg-navy px-3 py-2.5">
          <span
            key={displayName.slice(0, 1)}
            className="grid size-10 flex-none animate-[rise_400ms_var(--ease-out)_both] place-items-center rounded-[10px] bg-kraft font-display text-lg font-bold text-navy"
            aria-hidden="true"
          >
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="grid min-w-0 leading-tight">
            <span className="truncate font-semibold text-white">{displayName}</span>
            <span className="truncate text-[0.87rem] text-on-navy-2">{details}</span>
          </span>
        </div>

        <ul className="mt-3 grid gap-0.5" aria-label="Owner modules">
          {OWNER_MODULES.map((module, index) => {
            const Icon = module.icon
            return (
              <li
                key={module.name}
                className={`flex items-center gap-3 rounded-xl px-3.5 py-[9px] font-[550] ${index === 0 ? 'bg-navy text-white [&_svg]:text-green' : 'text-on-navy-2'}`}
              >
                <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
                {module.name}
              </li>
            )
          })}
        </ul>
      </div>

      <p className="max-w-[16ch] font-display text-[clamp(1.8rem,3vw,2.6rem)] leading-none font-bold tracking-[-0.036em] text-white [&_em]:text-kraft [&_em]:not-italic">
        Everything you run, <em>one place.</em>
      </p>
    </aside>
  )
}
