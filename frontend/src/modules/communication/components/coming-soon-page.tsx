import { Construction } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface ComingSoonPageProps {
  icon: LucideIcon
  title: string
  text: string
}

/** A communication page that is on the sidebar but not built yet */
export function ComingSoonPage({ icon: Icon, title, text }: ComingSoonPageProps) {
  return (
    <div className="grid h-full place-items-center bg-linear-to-b from-green-wash to-white to-40% p-8 text-center">
      <div className="grid max-w-[40ch] justify-items-center gap-4">
        <span className="grid size-16 place-items-center rounded-[18px] bg-white text-green-deep shadow-card" aria-hidden="true">
          <Icon size={28} strokeWidth={1.6} />
        </span>
        <h1 className="font-display text-[1.9rem] leading-tight font-[680] tracking-[-0.03em]">{title}</h1>
        <p className="text-ink-2">{text}</p>
        <p className="inline-flex items-center gap-2 text-[0.95rem] text-ink-3">
          <Construction size={16} strokeWidth={1.9} aria-hidden="true" />
          Coming soon.
        </p>
      </div>
    </div>
  )
}
