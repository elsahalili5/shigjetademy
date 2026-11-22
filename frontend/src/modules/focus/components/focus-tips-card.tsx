import { Coffee, Smartphone, SquareStack } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type FocusTip = {
  icon: LucideIcon
  text: string
}

const FOCUS_TIPS: readonly FocusTip[] = [
  { icon: Smartphone, text: 'Put your phone face down, out of reach.' },
  { icon: SquareStack, text: 'Keep open only what this goal needs.' },
  { icon: Coffee, text: 'When it rings, take a 5 minute break.' },
]

/** Three short habits for a good session */
export function FocusTipsCard() {
  return (
    <section aria-label="Focus tips" className="rounded-[28px] bg-kraft-wash p-6">
      <h2 className="font-data text-[0.78rem] tracking-[0.06em] text-kraft-ink uppercase">Before you start</h2>
      <ul className="mt-4 grid gap-3">
        {FOCUS_TIPS.map((tip) => (
          <li key={tip.text} className="flex items-center gap-3 text-kraft-ink">
            <span className="grid size-9 flex-none place-items-center rounded-xl bg-white/70" aria-hidden="true">
              <tip.icon size={17} strokeWidth={1.9} />
            </span>
            {tip.text}
          </li>
        ))}
      </ul>
    </section>
  )
}
