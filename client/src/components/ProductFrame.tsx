import { useState } from 'react'
import {
  CalendarDays,
  Check,
  ClipboardCheck,
  Clock3,
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Search,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import wordmark from '../assets/brand/shigjetademy-wordmark.png'
import type { Cohort, FeeStatus } from '../lib/term'
import {
  COHORTS,
  STUDENTS,
  WEEKDAY,
  enrolledBy,
  feeStatus,
  isLate,
  isPresent,
  nextUp,
  score,
  sessionsUntil,
  stageOf,
  weekOf,
  weekdayOf,
} from '../lib/term'
import './ProductFrame.css'

const NAV = [
  { icon: LayoutDashboard, label: 'Overview' },
  { icon: Users, label: 'Students' },
  { icon: CalendarDays, label: 'Timetable' },
  { icon: ClipboardCheck, label: 'Attendance', active: true },
  { icon: Wallet, label: 'Payments' },
  { icon: GraduationCap, label: 'Grades' },
  { icon: MessageSquare, label: 'Messages' },
]

const FEE = { 'g9-math': 60, ielts: 140, forklift: 220, piano: 90 } as Record<string, number>

const DAY = 45

export function ProductFrame({ compact = false }: { compact?: boolean }) {
  const day = DAY
  const [cohortId, setCohortId] = useState(COHORTS[0].id)
  const cohort = COHORTS.find((c) => c.id === cohortId) ?? COHORTS[0]

  return (
    <div className="app" aria-label="Shigjetademy app preview with illustrative data">
      <aside className="app__side">
        <div className="app__brand">
          <img src={wordmark} alt="Shigjetademy" width={96} height={24} />
        </div>
        <ul>
          {NAV.map(({ icon: Icon, label, active }) => (
            <li key={label} data-active={active || undefined}>
              <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </aside>

      <div className="app__main">
        <div className="app__top">
          <p className="app__crumbs">
            Classes <span aria-hidden="true">/</span> <strong>{cohort.name}</strong>
          </p>
          <div className="app__search" aria-hidden="true">
            <Search size={15} strokeWidth={2} />
            Search students
          </div>
          <p className="app__day">
            Week {weekOf(day)} · {WEEKDAY[weekdayOf(day)]}
          </p>
        </div>

        <div className="app__tabs" role="tablist" aria-label="Classes">
          {COHORTS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === cohort.id}
              data-stage={stageOf(c, day)}
              onClick={() => setCohortId(c.id)}
            >
              <i aria-hidden="true" />
              {c.name}
            </button>
          ))}
        </div>

        <div className="app__grid" role="tabpanel">
          <Register cohort={cohort} day={day} sessionCount={compact ? 5 : 6} />
          <div className="app__col">
            <Fees cohort={cohort} day={day} rows={compact ? 2 : 4} />
            {!compact && <Messages cohort={cohort} day={day} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function Register({ cohort: c, day, sessionCount }: { cohort: Cohort; day: number; sessionCount: number }) {
  const sessions = sessionsUntil(c, day).slice(-sessionCount)
  const stage = stageOf(c, day)
  const rows = STUDENTS.slice(0, Math.min(STUDENTS.length, stage === 'Enrolling' ? enrolledBy(c, day) : c.enrolled))

  return (
    <div className="panel panel--register">
      <div className="panel__head">
        <h3>Register</h3>
        <p>
          {c.weekdays.map((w) => WEEKDAY[w]).join(' · ')} {c.time} · {c.room}
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="panel__empty">
          <ClipboardCheck size={22} strokeWidth={1.5} aria-hidden="true" />
          <p>
            <strong>The register opens with the first session on day {c.startDay}.</strong>
            <br />
            {enrolledBy(c, day)} of {c.seats} seats are filled so far.
          </p>
        </div>
      ) : (
        <div className="register" tabIndex={0} aria-label="Attendance register, scrollable">
          <table>
            <thead>
              <tr>
                <th scope="col">Student</th>
                {sessions.map((s) => (
                  <th scope="col" key={s} className="tabular">
                    W{weekOf(s)}
                    <span>{WEEKDAY[weekdayOf(s)]}</span>
                  </th>
                ))}
                <th scope="col" className="register__avg">
                  Avg
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((name, i) => (
                <tr key={name}>
                  <th scope="row">{name}</th>
                  {sessions.map((s) => {
                    const present = isPresent(c, i, s)
                    const late = present && isLate(c, i, s)
                    const mark = late ? 'late' : present ? 'present' : 'absent'
                    return (
                      <td key={`${s}`} data-mark={mark}>
                        <span className="tick" title={mark}>
                          {mark === 'present' && <Check size={13} strokeWidth={3} />}
                          {mark === 'absent' && <X size={13} strokeWidth={3} />}
                          {mark === 'late' && <Clock3 size={13} strokeWidth={2.5} />}
                          <span className="visually-hidden">{mark}</span>
                        </span>
                      </td>
                    )
                  })}
                  <td className="register__avg tabular">{score(c, i).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const FEE_ORDER: FeeStatus[] = ['Overdue', 'Due', 'Paid']

function Fees({ cohort: c, day, rows }: { cohort: Cohort; day: number; rows: number }) {
  const stage = stageOf(c, day)
  const count = stage === 'Enrolling' ? enrolledBy(c, day) : c.enrolled
  const statuses = Array.from({ length: count }, (_, i) =>
    stage === 'Enrolling' ? ('Due' as FeeStatus) : feeStatus(c, i, day),
  )
  const tally = FEE_ORDER.map((s) => ({ s, n: statuses.filter((x) => x === s).length }))
  const shown = STUDENTS.slice(0, rows).map((name, i) => ({ name, status: statuses[i] })).filter((r) => r.status)

  return (
    <div className="panel">
      <div className="panel__head">
        <h3>Fees this month</h3>
        <p className="tabular">€{FEE[c.id]} per student</p>
      </div>
      <div className="fees__bar" aria-hidden="true">
        {tally.map(({ s, n }) => (
          <span key={s} data-status={s} style={{ flexGrow: n }} />
        ))}
      </div>
      <p className="fees__tally tabular">
        {tally
          .filter((t) => t.n)
          .map((t) => `${t.n} ${t.s.toLowerCase()}`)
          .join(' · ')}
      </p>
      <ul className="fees__list">
        {shown.map((r) => (
          <li key={r.name}>
            <span>{r.name}</span>
            <em data-status={r.status}>{r.status}</em>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Messages({ cohort: c, day }: { cohort: Cohort; day: number }) {
  const stage = stageOf(c, day)
  const items =
    stage === 'Enrolling'
      ? ['Welcome pack to new enrolments', `Reminder: ${nextUp(c, day).split(' · ')[0].toLowerCase()}`]
      : stage === 'Reported'
        ? [`Reports delivered to ${c.enrolled} ${c.audience}`, 'Re-enrolment invitation for next term']
        : stage === 'Assessing'
          ? ['Assessment timetable sent', 'Report cards scheduled for the final week']
          : ['Absence notices sent after each session', `${nextUp(c, day).replace('Next · ', 'Next session: ')}`]

  return (
    <div className="panel">
      <div className="panel__head">
        <h3>Messages</h3>
        <p>Automatic</p>
      </div>
      <ul className="messages">
        {items.map((m) => (
          <li key={m}>
            <MessageSquare size={14} strokeWidth={2} aria-hidden="true" />
            {m}
          </li>
        ))}
      </ul>
    </div>
  )
}
