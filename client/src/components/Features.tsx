import { useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Bell, Check, FileText, Send, UserPlus } from 'lucide-react'
import './Features.css'

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

const PANELS = [
    <>
      <div className="enrol">
        <div className="enrol__head">
          <span>Grade 9 Mathematics</span>
          <strong className="tabular">26 / 28 seats</strong>
        </div>
        <div className="enrol__seats">
          {Array.from({ length: 28 }, (_, i) => (
            <i key={i} data-open={i >= 26 || undefined} />
          ))}
        </div>
        <ul className="enrol__list">
          <li>
            <span className="avatar">DM</span>Dea Morina<em>Enrolled</em>
          </li>
          <li>
            <span className="avatar">EG</span>Elion Gashi<em>Enrolled</em>
          </li>
          <li>
            <span className="avatar">RB</span>Rina Bajrami<em data-wait>Pending</em>
          </li>
        </ul>
        <span className="vignette__action">
          <UserPlus size={14} strokeWidth={2} /> Enrol student
        </span>
      </div>
    </>,
    <>
      <div className="week">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((d) => (
          <span key={d} className="week__day">
            {d}
          </span>
        ))}
        <span className="week__block" style={{ gridColumn: 1, gridRow: '2 / span 2' }} data-c="a">
          Grade 9 Maths
          <small>09:00 · Room 204</small>
        </span>
        <span className="week__block" style={{ gridColumn: 3, gridRow: '2 / span 2' }} data-c="a">
          Grade 9 Maths
          <small>
            <Check size={11} strokeWidth={3} /> 24 of 26 present
          </small>
        </span>
        <span className="week__block" style={{ gridColumn: 5, gridRow: '2 / span 2' }} data-c="a">
          Grade 9 Maths
          <small>09:00 · Room 204</small>
        </span>
        <span className="week__block" style={{ gridColumn: 2, gridRow: '4 / span 2' }} data-c="b">
          IELTS Prep
          <small>18:30 · Room B2</small>
        </span>
        <span className="week__block" style={{ gridColumn: 4, gridRow: '4 / span 2' }} data-c="b">
          IELTS Prep
          <small>18:30 · Room B2</small>
        </span>
        <span className="week__block" style={{ gridColumn: 5, gridRow: '5 / span 1' }} data-c="c">
          Piano
          <small>16:00</small>
        </span>
      </div>
    </>,
    <>
      <ul className="invoices">
        <li>
          <FileText size={15} strokeWidth={1.75} />
          <span className="tabular">INV-0412</span>
          Dea Morina
          <b className="tabular">€60</b>
          <em data-s="paid">Paid</em>
        </li>
        <li>
          <FileText size={15} strokeWidth={1.75} />
          <span className="tabular">INV-0413</span>
          Gent Leka
          <b className="tabular">€60</b>
          <em data-s="due">Due Fri</em>
        </li>
        <li>
          <FileText size={15} strokeWidth={1.75} />
          <span className="tabular">INV-0414</span>
          Jon Dervishi
          <b className="tabular">€60</b>
          <em data-s="late">6 days late</em>
        </li>
        <li>
          <FileText size={15} strokeWidth={1.75} />
          <span className="tabular">INV-0415</span>
          Ilira Shala
          <b className="tabular">€60</b>
          <em data-s="paid">Paid</em>
        </li>
      </ul>
      <span className="vignette__action">
        <Bell size={14} strokeWidth={2} /> Remind 2 families
      </span>
    </>,
    <>
      <div className="report">
        <div className="report__head">
          <strong>Progress report</strong>
          <span>Arta Krasniqi · Term 1</span>
        </div>
        <dl>
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
        <p className="report__note">“Confident with proofs; keep practising data questions.”</p>
        <span className="vignette__action vignette__action--solid">
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
    <section className="section container features" id="platform" aria-labelledby="features-title">
      <div className="section-head" data-reveal>
        <h2 id="features-title">Everything a teaching organization runs on, in one system.</h2>
        <p>
          Four jobs that usually live in four tools, or in a spreadsheet nobody trusts. In Shigjetademy they share the
          same students, the same classes and the same term.
        </p>
      </div>

      <div className="showcase" data-reveal>
        <div className="showcase__tabs" role="tablist" aria-label="Platform features" aria-orientation="vertical" onKeyDown={onKeyDown}>
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
              className="showcase__tab"
              data-tone={t.id}
              onClick={() => setActive(n)}
            >
              <span className="showcase__title">{t.title}</span>
              <span className="showcase__detail">
                <span className="showcase__detail-inner">
                  <span className="showcase__body">{t.body}</span>
                  <span className="showcase__points">
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

        <div className="showcase__stage">
          {TABS.map((t, n) => (
            <div
              key={t.id}
              id={`panel-${t.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${t.id}`}
              className="showcase__panel"
              data-active={n === active || undefined}
              inert={n !== active}
            >
              <div className="vignette" data-tone={t.id} aria-hidden="true">
                {PANELS[n]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
