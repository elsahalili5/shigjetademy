import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, type LucideIcon } from 'lucide-react'

export interface DashboardPageHeaderBackTo {
  to: string
  label: string
}

interface DashboardPageHeaderProps {
  icon: LucideIcon
  title: string
  subtitle: ReactNode
  /** A link to the page this one drills down from, shown above the title on the left */
  backTo?: DashboardPageHeaderBackTo
  children?: ReactNode
}

/** The top of a dashboard page: an optional back link on the left, then icon, title, one line about it, and the page's main action on the right */
export function DashboardPageHeader({ icon: Icon, title, subtitle, backTo, children }: DashboardPageHeaderProps) {
  return (
    <header className="bg-linear-to-b from-green-wash to-white px-[clamp(20px,3.4vw,44px)] pt-[clamp(24px,3.4vw,40px)] pb-6">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-start gap-4">
          <span
            className="grid size-14 flex-none place-items-center rounded-2xl bg-white text-green-deep shadow-[0_1px_2px_rgba(22,34,46,0.06),0_10px_24px_-12px_rgba(22,34,46,0.3)]"
            aria-hidden="true"
          >
            <Icon size={26} strokeWidth={1.7} />
          </span>
          <div>
            <h1 className="font-display text-[clamp(1.7rem,2.6vw,2.3rem)] leading-[1.05] font-[680] tracking-[-0.03em]">{title}</h1>
            <p className="mt-1.5 text-ink-2">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
      {backTo ? (
        <Link className="button button--ghost mt-4 min-h-11 px-4 text-base" to={backTo.to}>
          <ArrowLeft size={17} strokeWidth={2.2} aria-hidden="true" />
          {backTo.label}
        </Link>
      ) : null}
    </header>
  )
}
