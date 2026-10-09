import { useState } from 'react'
import type { CSSProperties } from 'react'
import { TERM_DAYS, TERM_WEEKS, weekOf } from '../lib/term'

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
      <div className="shell">
      <div className="section-head" data-reveal>
        <h2 id="workflow-title">One term, start to finish.</h2>
        <p>
          Every class moves through the same six steps. Shigjetademy carries the record from one step to the next,
          so nothing is typed twice. Choose a step to see where it sits in the term.
        </p>
      </div>

      {/* The term band: steps in a margin column, their spans laid on one shared week scale */}
      <div
        className="group/band relative grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-x-[clamp(20px,4vw,56px)] max-[860px]:grid-cols-1"
        data-reveal
        style={{ '--marker': marker } as CSSProperties}
      >
        <div className="col-span-full grid grid-cols-subgrid border-b-2 border-ink pb-3 font-data text-[0.64rem] text-ink-3 max-[860px]:hidden" aria-hidden="true">
          <span className="tracking-[0.1em] uppercase">Term</span>
          <ol className="grid grid-cols-12">
            {Array.from({ length: TERM_WEEKS }, (_, i) => (
              <li key={i}>W{i + 1}</li>
            ))}
          </ol>
        </div>

        <ol className="col-span-full grid grid-cols-subgrid">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              data-active={i === active || undefined}
              style={{ '--tone': TONES[i].fill, '--tone-ink': TONES[i].ink, '--n': i } as CSSProperties}
              className="group/step col-span-full grid grid-cols-subgrid items-center border-b border-rule max-[860px]:grid-cols-1 max-[860px]:pb-[18px]"
            >
              <button
                type="button"
                className="group/btn grid grid-cols-[2.6rem_1fr] items-baseline gap-3 py-[18px] text-left text-ink transition-transform duration-150 ease-out active:scale-[0.99] max-[860px]:pb-3"
                aria-pressed={i === active}
                onClick={() => setActive(i)}>
                <span className="tabular font-data text-[0.8rem] text-(--tone-ink,var(--ink-3)) transition-colors duration-300">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <strong className="block font-display text-[1.35rem] leading-[1.2] font-[650] tracking-[-0.02em] group-hover/btn:text-(--tone-ink,var(--green-deep))">
                    {s.title}
                  </strong>
                  <span className="mt-1 block max-w-[44ch] text-[0.92rem] text-ink-2">{s.body}</span>
                </span>
              </button>
              <div
                className="relative h-full min-h-14 bg-[repeating-linear-gradient(90deg,var(--rule)_0_1px,transparent_1px_calc(100%/12))] max-[860px]:ml-[calc(2.6rem+12px)] max-[860px]:min-h-[22px] max-[860px]:group-data-active/step:shadow-[inset_0_-2px_0_color-mix(in_srgb,var(--tone)_25%,transparent)]"
                aria-hidden="true"
              >
                {s.points ? (
                  s.points.map((p) => <i
                      key={p}
                      className="absolute top-1/2 -ml-[7px] size-3.5 -translate-y-1/2 rotate-45 rounded-[3px] bg-[color-mix(in_srgb,var(--tone)_35%,transparent)] transition-[background-color,box-shadow] duration-300 group-data-active/step:bg-(--tone) group-data-active/step:shadow-[0_4px_12px_-4px_color-mix(in_srgb,var(--tone)_70%,transparent)]"
                      style={{ left: pct(p) }}
                    />)
                ) : (
                  <i
                    // Segments draw in along the term when the band arrives, one after another
                    className="absolute top-1/2 h-3.5 origin-left -translate-y-1/2 rounded-[7px] bg-[color-mix(in_srgb,var(--tone)_30%,transparent)] transition-[background-color,box-shadow] duration-300 data-early:rounded-l-none group-data-active/step:bg-(--tone) group-data-active/step:shadow-[0_4px_12px_-4px_color-mix(in_srgb,var(--tone)_70%,transparent)] motion-safe:[.motion_&]:scale-x-0 motion-safe:[.motion_&]:transition-[scale,background-color,box-shadow] motion-safe:[.motion_&]:duration-[900ms,300ms,300ms] motion-safe:[.motion_&]:ease-in-out motion-safe:[.motion_&]:[transition-delay:calc(var(--n)*80ms),0s,0s] motion-safe:[.motion_[data-inview]_&]:scale-x-100"
                    data-early={s.from === 0 || undefined}
                    style={{ left: pct(s.from), width: `calc(${pct(s.to + 1)} - ${pct(s.from)})` }}
                  />
                )}
              </div>
            </li>
          ))}
        </ol>

        {/* The day marker shares the term clock with the hero shelf */}
        <div
          className="pointer-events-none absolute top-0 right-0 bottom-0 left-[calc(5/12*(100%-clamp(20px,4vw,56px))+clamp(20px,4vw,56px))] before:absolute before:top-6 before:bottom-0 before:left-(--marker) before:-ml-px before:w-0.5 before:bg-navy before:transition-[left] before:duration-[420ms] before:ease-in-out before:content-[''] motion-reduce:before:transition-none max-[860px]:hidden"
          aria-hidden="true"
        >
          <span className="tabular absolute -top-1 left-(--marker) -translate-x-1/2 rounded bg-navy px-[7px] pt-[3px] pb-0.5 font-data text-[0.62rem] whitespace-nowrap text-white transition-[left] duration-[420ms] ease-in-out motion-reduce:transition-none">Week {weekOf(day)}</span>
        </div>
      </div>
      </div>
    </section>
  )
}
