import type { CSSProperties } from 'react'
import { Building2, Presentation, School, UserRound } from 'lucide-react'
import './BuiltFor.css'

const i = (n: number) => ({ '--i': n }) as CSSProperties

// Each audience carries its own colour from the palette, so green is one voice among four
const BUILT_FOR = [
  { icon: School, label: 'Schools', tone: 'var(--green)' },
  { icon: Building2, label: 'Academies', tone: 'var(--kraft)' },
  { icon: Presentation, label: 'Training centres', tone: 'var(--coral)' },
  { icon: UserRound, label: 'Independent educators', tone: 'var(--on-navy-2)' },
]

/** The four organization types, as one divided strip on a navy field. */
export function BuiltFor({ labelId = 'built-for-label' }: { labelId?: string }) {
  return (
    <div className="built-for">
      <p className="built-for__label" id={labelId}>
        Built for
      </p>
      <ul aria-labelledby={labelId}>
        {BUILT_FOR.map(({ icon: Icon, label, tone }, n) => (
          <li key={label} style={{ ...i(n), '--tone': tone } as CSSProperties}>
            <span className="built-for__icon" aria-hidden="true">
              <Icon size={18} strokeWidth={1.8} />
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}
