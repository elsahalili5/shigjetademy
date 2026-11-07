import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyMessageProps {
  icon: LucideIcon
  title: string
  text: string
  children?: ReactNode
}

/** What a list shows instead of rows; children hold its next step */
export function EmptyMessage({ icon: Icon, title, text, children }: EmptyMessageProps) {
  return (
    <div className="grid justify-items-center gap-2 px-5 py-12 text-center">
      <Icon className="text-ink-3" size={24} strokeWidth={1.7} aria-hidden="true" />
      <p className="font-semibold">{title}</p>
      <p className="text-ink-2">{text}</p>
      {children}
    </div>
  )
}
