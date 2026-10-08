import { useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowRight, Check, X } from 'lucide-react'
import './Patchwork.css'

const PAIRS = [
  { before: 'Enrolments kept in a spreadsheet', after: 'One record per student, from enquiry to report' },
  { before: 'Registers on paper, typed up later', after: 'Registers tied to the timetable, taken in class' },
  { before: 'Fees tracked from bank statements', after: 'Invoices tied to each enrolment, status at a glance' },
  { before: 'Reports written from scratch each term', after: 'Reports built from grades already recorded' },
  { before: 'Parents reached through group chats', after: 'Messages sent from the same place as everything else' },
]

export function Patchwork() {
  const [hover, setHover] = useState<number | null>(null)

  return (
    <section className="section band-white patchwork" aria-labelledby="patchwork-title">
      <div className="container">
        <div className="section-head" data-reveal>
          <h2 id="patchwork-title">Replace the patchwork your term runs on.</h2>
          <p>
            Most teaching organizations run on five tools that don’t talk to each other. Shigjetademy puts the same
            work in one place, so each step feeds the next.
          </p>
        </div>

        <div className="patchwork__grid" onMouseLeave={() => setHover(null)}>
          <div className="patchwork__col patchwork__col--before" data-reveal>
            <h3>Today</h3>
            <ul>
              {PAIRS.map((p, n) => (
                <li
                  key={p.before}
                  data-hover={hover === n || undefined}
                  onMouseEnter={() => setHover(n)}
                  style={{ '--i': n } as CSSProperties}
                >
                  <span className="patchwork__icon">
                    <X size={14} strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  {p.before}
                </li>
              ))}
            </ul>
          </div>

          <div className="patchwork__arrow" aria-hidden="true">
            <ArrowRight size={22} strokeWidth={2} />
          </div>

          <div className="patchwork__col patchwork__col--after" data-reveal style={{ '--i': 2 } as CSSProperties}>
            <h3>With Shigjetademy</h3>
            <ul>
              {PAIRS.map((p, n) => (
                <li key={p.after} data-hover={hover === n || undefined} onMouseEnter={() => setHover(n)}>
                  <span className="patchwork__icon">
                    <Check size={14} strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  {p.after}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
