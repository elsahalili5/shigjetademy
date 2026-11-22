import { Timer } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { useSidebarRail } from '#/lib/sidebar-rail'
import { useFocusSession } from '../hooks/use-focus-session'
import { formatCountdown } from '../utils/focus-session'

interface FocusNavLinkProps {
  className: string
}

/** The student's Focus link; while the timer runs or is paused it shows the time left, so it stays in sight on every page */
export function FocusNavLink({ className }: FocusNavLinkProps) {
  const sidebar = useSidebarRail()
  const focus = useFocusSession()
  const isActive = focus.session.status !== 'idle'
  const countdown = focus.isFinished ? 'Done' : formatCountdown(focus.remainingMs)
  const title = isActive ? `Focus, ${countdown}` : 'Focus'

  return (
    <Link to="/dashboard/focus" className={className} title={sidebar.isRail ? title : undefined}>
      <Timer size={18} strokeWidth={1.9} aria-hidden="true" className={isActive ? 'text-green' : undefined} />
      <span className="flex-1 rail:sr-only">Focus</span>
      {isActive ? (
        <span className={`rounded-full bg-navy-2 px-2 py-0.5 font-data text-[0.78rem] tabular-nums rail:sr-only ${focus.session.status === 'paused' ? 'text-on-navy-2' : 'text-green'}`}>{countdown}</span>
      ) : null}
    </Link>
  )
}
