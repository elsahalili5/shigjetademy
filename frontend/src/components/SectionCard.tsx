import { useId } from 'react'
import type { ReactNode } from 'react'

interface SectionCardProps {
  title: string
  /** The section's own action, like an Add button, on the right of its title */
  action?: ReactNode
  children: ReactNode
}

/** A bordered dashboard section with its title on top; the section is named by that title */
export function SectionCard({ title, action, children }: SectionCardProps) {
  const titleId = useId()
  return (
    <section className="rounded-card border border-rule" aria-labelledby={titleId}>
      <div className="flex min-h-[61px] flex-wrap items-center justify-between gap-3 border-b border-rule px-5 py-3">
        <h2 id={titleId} className="text-[1.15rem] font-[650]">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}
