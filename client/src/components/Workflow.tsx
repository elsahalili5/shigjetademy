import { useState } from 'react'
import type { CSSProperties } from 'react'
import { TERM_DAYS, TERM_WEEKS, weekOf } from '../lib/term'
import './Workflow.css'

type Step = {
  title: string
  body: string
  /** Segment on the term band, in term days (0 = before term). */
  from: number
  to: number
  points?: number[]
  jumpTo: number
}

const STEPS: Step[] = [
  {
    title: 'Enrol',
    body: 'Students join classes and groups. Their details and family contacts are captured once.',
    from: 0,
    to: 7,
    jumpTo: 1,
  },
  {
    title: 'Schedule',
    body: 'Each class gets its teacher, room and times, and the timetable goes out to everyone.',
    from: 0,
    to: 4,
    jumpTo: 3,
  },
  {
    title: 'Attend',
    body: 'Every session opens a register. Absences are recorded as they happen and families can be told.',
    from: 1,
    to: 70,
    jumpTo: 30,
  },
  {
    title: 'Invoice',
    body: 'Tuition is invoiced per student, and payments and balances stay visible all term.',
    from: 1,
    to: 84,
    points: [1, 29, 57],
    jumpTo: 29,
  },
  {
    title: 'Assess',
    body: 'Tests and assignments are graded straight into the class gradebook.',
    from: 71,
    to: 80,
    jumpTo: 74,
  },
  {
    title: 'Report',
    body: 'Progress reports are built from grades and attendance, then sent to students and parents.',
    from: 81,
    to: 84,
    jumpTo: 82,
  },
]

// Each step keeps its own colour from the brand palette: fill for the bar, ink for its number
const TONES = [
  { fill: 'var(--kraft)', ink: 'var(--kraft-ink)' },
  { fill: 'var(--ink-2)', ink: 'var(--ink-2)' },
  { fill: 'var(--green)', ink: 'var(--green-deep)' },
  { fill: 'var(--coral)', ink: 'var(--coral-deep)' },
  { fill: 'var(--green-deep)', ink: 'var(--green-deep)' },
  { fill: 'var(--navy)', ink: 'var(--navy)' },
]

const pct = (d: number) => `${(Math.max(0, d - 1) / TERM_DAYS) * 100}%`

export function Workflow() {
  const [active, setActive] = useState(2)
  const day = STEPS[active].jumpTo
  const marker = `${((day - 0.5) / TERM_DAYS) * 100}%`


  return (
    <section className="section" id="workflow" aria-labelledby="workflow-title">
      <div className="container">
      <div className="section-head" data-reveal>
        <h2 id="workflow-title">One term, start to finish.</h2>
        <p>
          Every class moves through the same six steps. Shigjetademy carries the record from one step to the next,
          so nothing is typed twice. Choose a step to see where it sits in the term.
        </p>
      </div>

      <div className="band" data-reveal style={{ '--marker': marker } as CSSProperties}>
        <div className="band__scale" aria-hidden="true">
          <span className="band__label">Term</span>
          <ol>
            {Array.from({ length: TERM_WEEKS }, (_, i) => (
              <li key={i}>W{i + 1}</li>
            ))}
          </ol>
        </div>

        <ol className="band__steps">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              data-active={i === active || undefined}
              style={{ '--tone': TONES[i].fill, '--tone-ink': TONES[i].ink } as CSSProperties}
            >
              <button type="button" className="band__step" aria-pressed={i === active}
                onClick={() => setActive(i)}>
                <span className="band__num tabular">{String(i + 1).padStart(2, '0')}</span>
                <span className="band__text">
                  <strong>{s.title}</strong>
                  <span>{s.body}</span>
                </span>
              </button>
              <div className="band__track" aria-hidden="true">
                {s.points ? (
                  s.points.map((p) => <i key={p} className="band__point" style={{ left: pct(p) }} />)
                ) : (
                  <i
                    className="band__seg"
                    data-early={s.from === 0 || undefined}
                    style={{ left: pct(s.from), width: `calc(${pct(s.to + 1)} - ${pct(s.from)})` }}
                  />
                )}
              </div>
            </li>
          ))}
        </ol>

        <div className="band__marker" aria-hidden="true">
          <span className="tabular">Week {weekOf(day)}</span>
        </div>
      </div>
      </div>
    </section>
  )
}
