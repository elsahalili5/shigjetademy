import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Bell, Check, FileText, Send, UserPlus } from 'lucide-react'

const TABS = [
  {
    id: 'students',
    title: 'Students & enrolment',
    body: 'One record per student, from the first enquiry onward. Enrol them into courses, classes and groups, and see who holds every seat.',
    points: ['Student profiles and family contacts', 'Enrolment into courses, classes and groups', 'Seat limits and class lists'],
  },
  {
    id: 'schedule',
    title: 'Scheduling & attendance',
    body: 'Build the timetable once, with rooms and teachers, and every session gets a register that takes seconds to fill in.',
    points: ['Timetables by class, teacher and room', 'Session registers: present, absent, late', 'Attendance history per student'],
  },
  {
    id: 'payments',
    title: 'Payments & invoicing',
    body: 'Set tuition once per class, invoice every student from the same record, and always know who has paid, who is due and who is late.',
    points: ['Tuition plans per course or class', 'Invoices per student, month or term', 'Payment status for every student'],
  },
  {
    id: 'grades',
    title: 'Grades, reports & messaging',
    body: 'Record assessments as they happen. Progress reports come from those grades and go to students and parents from the same place.',
    points: ['Assessments and gradebooks', 'Progress reports from recorded grades', 'Messages to students, parents and staff'],
  },
]

// Per-tab colours: the vignette wash, and the tab's rule and ticks (kraft, green, coral, slate)
const TONE = {
  students: { wash: 'bg-kraft-wash', tab: '[--tab-tone:var(--kraft-deep)]' },
  schedule: { wash: 'bg-green-wash', tab: '[--tab-tone:var(--green-deep)]' },
  payments: { wash: 'bg-coral-wash', tab: '[--tab-tone:var(--coral-deep)]' },
  grades: { wash: 'bg-[#dfe6ee]', tab: '[--tab-tone:var(--ink-2)]' },
} as Record<string, { wash: string; tab: string }>

const sheet = 'rounded-2xl bg-white px-5 py-[18px] shadow-card'
const action =
  'mt-3.5 inline-flex w-max! items-center gap-1.5 rounded-full border border-rule-strong bg-white px-3.5 py-2 text-[0.8rem] font-semibold'
const pill = 'ml-auto rounded-full px-2 py-0.5 text-[0.72rem] font-semibold not-italic'
const status = 'min-w-[5.6rem] rounded-full px-2 py-0.5 text-center text-[0.7rem] font-semibold not-italic'
const block =
  'flex min-w-0 flex-col justify-between overflow-hidden rounded-lg px-2 py-1.5 text-[0.74rem] leading-[1.2] font-[650] [&_small]:flex [&_small]:items-center [&_small]:gap-[3px] [&_small]:text-[0.64rem] [&_small]:font-medium [&_small]:opacity-85 max-[480px]:[&_small]:hidden'
const blockTone = { a: 'bg-green-wash text-[#0e5a45]', b: 'bg-[#dfe6ee] text-ink', c: 'bg-amber-wash text-[#7a4f10]' }
const avatar = 'grid size-7 place-items-center rounded-full bg-mist text-[0.66rem] font-bold text-ink-2'
const invoiceRow =
  'grid grid-cols-[auto_auto_1fr_auto_auto] items-center gap-2.5 border-t border-rule py-[11px] first:border-t-0 max-[480px]:grid-cols-[auto_1fr_auto] [&_svg]:text-ink-3 max-[480px]:[&_svg]:hidden [&>span]:font-data [&>span]:text-[0.64rem] [&>span]:text-ink-3 max-[480px]:[&>span]:hidden [&_b]:font-[650]'

const PANELS = [
    <>
      <div className={sheet}>
        <div className="flex justify-between gap-3 font-[650]">
          <span>Grade 9 Mathematics</span>
          <strong className="tabular font-data text-[0.72rem] font-medium text-ink-2">26 / 28 seats</strong>
        </div>
        {/* Seats as an even 14 × 2 grid, so the open seats read as the end of the class */}
        <div className="mt-4 mb-3 grid grid-cols-[repeat(14,12px)] justify-between gap-y-1.5 max-[480px]:grid-cols-[repeat(14,10px)]">
          {Array.from({ length: 28 }, (_, i) => (
            <i
              key={i}
              className={`size-3 rounded-full max-[480px]:size-2.5 ${i >= 26 ? 'border-[1.5px] border-dashed border-rule-strong bg-transparent' : 'bg-green'}`}
            />
          ))}
        </div>
        <ul className="[&_li]:flex [&_li]:items-center [&_li]:gap-2.5 [&_li]:border-t [&_li]:border-rule [&_li]:py-[9px]">
          <li>
            <span className={avatar}>DM</span>Dea Morina<em className={`${pill} bg-green-wash text-green-deep`}>Enrolled</em>
          </li>
          <li>
            <span className={avatar}>EG</span>Elion Gashi<em className={`${pill} bg-green-wash text-green-deep`}>Enrolled</em>
          </li>
          <li>
            <span className={avatar}>RB</span>Rina Bajrami<em className={`${pill} bg-amber-wash text-[#7a4f10]`}>Pending</em>
          </li>
        </ul>
        <span className={action}>
          <UserPlus size={14} strokeWidth={2} /> Enrol student
        </span>
      </div>
    </>,
    <>
      <div className={`${sheet} grid grid-cols-5 grid-rows-[auto_repeat(4,40px)] gap-1.5 max-[480px]:gap-1 max-[480px]:p-3`}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => (
          <span key={d} className="border-b border-rule pb-1.5 font-data text-[0.62rem] tracking-[0.06em] text-ink-3 uppercase">
            {d}
          </span>
        ))}
        <span className={`${block} ${blockTone.a}`} style={{ gridColumn: 1, gridRow: '2 / span 2' }}>
          Grade 9 Maths
          <small>09:00 · Room 204</small>
        </span>
        <span className={`${block} ${blockTone.a}`} style={{ gridColumn: 3, gridRow: '2 / span 2' }}>
          Grade 9 Maths
          <small>
            <Check size={11} strokeWidth={3} /> 24 of 26 present
          </small>
        </span>
        <span className={`${block} ${blockTone.a}`} style={{ gridColumn: 5, gridRow: '2 / span 2' }}>
          Grade 9 Maths
          <small>09:00 · Room 204</small>
        </span>
        <span className={`${block} ${blockTone.b}`} style={{ gridColumn: 2, gridRow: '4 / span 2' }}>
          IELTS Prep
          <small>18:30 · Room B2</small>
        </span>
        <span className={`${block} ${blockTone.b}`} style={{ gridColumn: 4, gridRow: '4 / span 2' }}>
          IELTS Prep
          <small>18:30 · Room B2</small>
        </span>
        <span className={`${block} ${blockTone.c}`} style={{ gridColumn: 5, gridRow: '5 / span 1' }}>
          Piano
          <small>16:00</small>
        </span>
      </div>
    </>,
    <>
      <ul className="rounded-2xl bg-white px-[18px] py-1.5 shadow-card">
        <li className={invoiceRow}>
          <FileText size={15} strokeWidth={1.75} />
          <span className="tabular">INV-0412</span>
          Dea Morina
          <b className="tabular">€60</b>
          <em className={`${status} bg-green-wash text-green-deep`}>Paid</em>
        </li>
        <li className={invoiceRow}>
          <FileText size={15} strokeWidth={1.75} />
          <span className="tabular">INV-0413</span>
          Gent Leka
          <b className="tabular">€60</b>
          <em className={`${status} bg-amber-wash text-[#7a4f10]`}>Due Fri</em>
        </li>
        <li className={invoiceRow}>
          <FileText size={15} strokeWidth={1.75} />
          <span className="tabular">INV-0414</span>
          Jon Dervishi
          <b className="tabular">€60</b>
          <em className={`${status} bg-red-wash text-red`}>6 days late</em>
        </li>
        <li className={invoiceRow}>
          <FileText size={15} strokeWidth={1.75} />
          <span className="tabular">INV-0415</span>
          Ilira Shala
          <b className="tabular">€60</b>
          <em className={`${status} bg-green-wash text-green-deep`}>Paid</em>
        </li>
      </ul>
      <span className={action}>
        <Bell size={14} strokeWidth={2} /> Remind 2 families
      </span>
    </>,
    <>
      <div className={sheet}>
        <div className="flex justify-between gap-3 border-b-2 border-ink pb-2.5">
          <strong>Progress report</strong>
          <span className="text-[0.78rem] text-ink-3">Arta Krasniqi · Term 1</span>
        </div>
        <dl className="[&_div]:flex [&_div]:justify-between [&_div]:border-b [&_div]:border-rule [&_div]:py-[9px] [&_dd]:font-data [&_dd]:text-[0.8rem]">
          <div>
            <dt>Unit 1 · Algebra</dt>
            <dd className="tabular">8.4</dd>
          </div>
          <div>
            <dt>Unit 2 · Geometry</dt>
            <dd className="tabular">7.9</dd>
          </div>
          <div>
            <dt>Unit 3 · Statistics</dt>
            <dd className="tabular">9.1</dd>
          </div>
          <div>
            <dt>Attendance</dt>
            <dd className="tabular">94%</dd>
          </div>
        </dl>
        <p className="mt-3 text-ink-2 italic">“Confident with proofs; keep practising data questions.”</p>
        <span className={`${action} border-green-deep bg-green-deep text-white`}>
          <Send size={14} strokeWidth={2} /> Send to family
        </span>
      </div>
    </>
]

export function Features() {
  const [active, setActive] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = (active + step + TABS.length) % TABS.length
    setActive(next)
    tabs.current[next]?.focus()
  }

  return (
    <section className="section shell pb-[clamp(96px,13vw,160px)]" id="platform" aria-labelledby="features-title">
      <div className="section-head" data-reveal>
        <h2 id="features-title">Everything a teaching organization runs on, in one system.</h2>
        <p>
          Four jobs that usually live in four tools, or in a spreadsheet nobody trusts. In Shigjetademy they share the
          same students, the same classes and the same term.
        </p>
      </div>

      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-stretch gap-[clamp(24px,4vw,64px)] max-[900px]:grid-cols-1" data-reveal>
        <div className="grid" role="tablist" aria-label="Platform features" aria-orientation="vertical" onKeyDown={onKeyDown}>
          {TABS.map((t, n) => (
            <button
              key={t.id}
              ref={(el) => {
                tabs.current[n] = el
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={n === active}
              aria-controls={`panel-${t.id}`}
              tabIndex={n === active ? 0 : -1}
              // The active tab opens to show its detail, and claims its top rule in its colour
              className={`group relative grid border-t border-rule px-1 py-[22px] text-left text-ink-3 transition-colors duration-200 before:absolute before:inset-x-0 before:-top-px before:h-0.5 before:origin-left before:scale-x-0 before:bg-(--tab-tone) before:transition-transform before:duration-[420ms] before:ease-out before:content-[''] last:border-b hover:text-ink aria-selected:text-ink aria-selected:before:scale-x-100 ${TONE[t.id].tab}`}
              onClick={() => setActive(n)}
            >
              <span className="font-display text-[clamp(1.35rem,2.1vw,1.75rem)] leading-[1.15] font-[650] tracking-[-0.025em]">{t.title}</span>
              <span className="grid grid-rows-[0fr] opacity-0 transition-[grid-template-rows,opacity] duration-[280ms,200ms] ease-out group-aria-selected:grid-rows-[1fr] group-aria-selected:opacity-100">
                <span className="grid gap-4 overflow-hidden">
                  <span className="max-w-[46ch] pt-3 text-ink-2">{t.body}</span>
                  <span className="grid gap-2 text-[0.95rem] font-medium text-ink [&>span]:flex [&>span]:items-center [&>span]:gap-2.5 [&_svg]:flex-none [&_svg]:text-(--tab-tone)">
                    {t.points.map((p) => (
                      <span key={p}>
                        <Check size={15} strokeWidth={2.5} aria-hidden="true" />
                        {p}
                      </span>
                    ))}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Stage: fills the full height of the tab list; panels stack in one cell and crossfade with a touch of blur */}
        <div className="grid max-[900px]:-order-1">
          {TABS.map((t, n) => (
            <div
              key={t.id}
              id={`panel-${t.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${t.id}`}
              className="grid scale-[0.985] opacity-0 blur-[6px] [grid-area:1/1] transition-[opacity,filter,scale] duration-[260ms] ease-out data-active:scale-100 data-active:opacity-100 data-active:blur-none motion-reduce:scale-100 motion-reduce:blur-none"
              data-active={n === active || undefined}
              inert={n !== active}
            >
              {/* Arcs echo the logo inside each vignette */}
              <div
                className={`relative grid h-full min-h-[460px] place-items-center overflow-hidden rounded-3xl p-[clamp(24px,5vw,64px)] text-[0.92rem] before:pointer-events-none before:absolute before:-right-[140px] before:-bottom-[160px] before:size-[360px] before:rounded-full before:border-[34px] before:border-white/55 before:content-[''] *:relative *:w-[min(100%,480px)] max-[900px]:h-auto max-[900px]:min-h-[360px] ${TONE[t.id].wash}`}
                aria-hidden="true"
              >
                {PANELS[n]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
