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

const panel = 'min-w-0 rounded-xl border border-rule bg-white px-4 py-3.5'
const panelHead =
  'mb-3 flex items-baseline justify-between gap-3 [&_h3]:font-sans [&_h3]:text-[0.92rem] [&_h3]:font-bold [&_h3]:tracking-normal [&_p]:text-right [&_p]:text-[0.76rem] [&_p]:text-ink-3'
const STAGE_DOT: Record<string, string> = {
  Enrolling: 'bg-amber',
  Assessing: 'bg-[#e4705a]',
  Reported: 'bg-[#9fb0c0]',
}
const MARK: Record<string, string> = {
  present: 'bg-green-wash text-green-deep',
  absent: 'bg-red-wash text-red',
  late: 'bg-amber-wash text-[#7a4f10]',
}
const FEE_BAR: Record<string, string> = { Paid: 'bg-green', Due: 'bg-amber', Overdue: 'bg-[#e4705a]' }
const FEE_PILL: Record<string, string> = {
  Paid: 'bg-green-wash text-green-deep',
  Due: 'bg-amber-wash text-[#7a4f10]',
  Overdue: 'bg-red-wash text-red',
}

export function ProductFrame({ compact = false }: { compact?: boolean }) {
  const day = DAY
  const [cohortId, setCohortId] = useState(COHORTS[0].id)
  const cohort = COHORTS.find((c) => c.id === cohortId) ?? COHORTS[0]

  return (
    <div
      className="relative grid grid-cols-[208px_minmax(0,1fr)] overflow-hidden rounded-[18px] bg-white text-[0.88rem] shadow-[0_0_0_1px_var(--rule),0_30px_60px_-30px_rgba(32,46,60,0.35)] max-[900px]:grid-cols-1"
      aria-label="Shigjetademy app preview with illustrative data">
      <aside className="border-r border-rule bg-mist px-3 py-[18px] text-ink-2 max-[900px]:hidden">
        <div className="flex items-center gap-2 px-2 pb-[18px] font-display font-bold text-ink">
          <img className="h-[22px] w-6 object-contain" src={wordmark} alt="Shigjetademy" width={96} height={24} />
        </div>
        <ul className="grid gap-0.5">
          {NAV.map(({ icon: Icon, label, active }) => (
            <li
              key={label}
              data-active={active || undefined}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-[9px] data-active:bg-white data-active:font-semibold data-active:text-ink data-active:shadow-[0_1px_2px_rgba(22,34,46,0.08)] data-active:[&_svg]:text-green-deep"
            >
              <Icon size={17} strokeWidth={1.75} aria-hidden="true" />
              {label}
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0 px-[22px] pt-[18px] pb-6 max-[560px]:px-3.5 max-[560px]:pt-4 max-[560px]:pb-[18px]">
        <div className="flex items-center gap-4 max-[560px]:flex-wrap max-[560px]:gap-y-1 max-[560px]:pt-[22px]">
          <p className="whitespace-nowrap text-ink-3 [&_strong]:font-semibold [&_strong]:text-ink">
            Classes <span aria-hidden="true">/</span> <strong>{cohort.name}</strong>
          </p>
          <div className="ml-auto flex w-[220px] items-center gap-2 rounded-lg bg-mist px-3 py-[7px] text-ink-3 max-[1080px]:hidden" aria-hidden="true">
            <Search size={15} strokeWidth={2} />
            Search students
          </div>
          <p className="font-data text-[0.7rem] whitespace-nowrap text-ink-2 max-[1080px]:ml-auto max-[560px]:ml-0">
            Week {weekOf(day)} · {WEEKDAY[weekdayOf(day)]}
          </p>
        </div>

        <div className="mt-[18px] mb-4 flex gap-1.5 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Classes">
          {COHORTS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={c.id === cohort.id}
              onClick={() => setCohortId(c.id)}
              className="inline-flex items-center gap-2 rounded-full border border-rule bg-transparent px-3 py-[7px] text-[0.84rem] font-medium whitespace-nowrap text-ink-2 transition-colors duration-200 hover:border-rule-strong hover:text-ink aria-selected:border-ink aria-selected:bg-ink aria-selected:text-white"
            >
              <i className={`size-2 rounded-full ${STAGE_DOT[stageOf(c, day)] ?? 'bg-green'}`} aria-hidden="true" />
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] items-start gap-3.5 max-[900px]:grid-cols-1" role="tabpanel">
          <Register cohort={cohort} day={day} sessionCount={compact ? 5 : 6} />
          <div className="grid gap-3.5">
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
    <div className={panel}>
      <div className={panelHead}>
        <h3>Register</h3>
        <p>
          {c.weekdays.map((w) => WEEKDAY[w]).join(' · ')} {c.time} · {c.room}
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="flex items-start gap-3 px-2 py-7 text-ink-2 [&_strong]:font-semibold [&_strong]:text-ink [&_svg]:flex-none [&_svg]:text-amber">
          <ClipboardCheck size={22} strokeWidth={1.5} aria-hidden="true" />
          <p>
            <strong>The register opens with the first session on day {c.startDay}.</strong>
            <br />
            {enrolledBy(c, day)} of {c.seats} seats are filled so far.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto [scrollbar-width:thin]" tabIndex={0} aria-label="Attendance register, scrollable">
          <table className="w-full min-w-[420px] border-collapse [&_:is(td,th)]:border-b [&_:is(td,th)]:border-rule [&_:is(td,th)]:px-1.5 [&_:is(td,th)]:py-[7px] [&_:is(td,th)]:text-center [&_tbody_tr:last-child>*]:border-b-0">
            <thead>
              <tr>
                <th scope="col" className="pl-0! text-left! font-data text-[0.62rem] leading-[1.2] font-medium text-ink-2">Student</th>
                {sessions.map((s) => (
                  <th scope="col" key={s} className="tabular font-data text-[0.62rem] leading-[1.2] font-medium text-ink-2">
                    W{weekOf(s)}
                    <span className="block text-ink-3">{WEEKDAY[weekdayOf(s)]}</span>
                  </th>
                ))}
                <th scope="col" className="font-data text-[0.72rem] text-ink">
                  Avg
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((name, i) => (
                <tr key={name}>
                  <th scope="row" className="pl-0! text-left! font-medium whitespace-nowrap">
                    {name}
                  </th>
                  {sessions.map((s) => {
                    const present = isPresent(c, i, s)
                    const late = present && isLate(c, i, s)
                    const mark = late ? 'late' : present ? 'present' : 'absent'
                    return (
                      <td key={`${s}`}>
                        <span
                          className={`inline-grid size-[22px] place-items-center rounded-md motion-safe:animate-stamp ${MARK[mark]}`}
                          title={mark}
                        >
                          {mark === 'present' && <Check size={13} strokeWidth={3} />}
                          {mark === 'absent' && <X size={13} strokeWidth={3} />}
                          {mark === 'late' && <Clock3 size={13} strokeWidth={2.5} />}
                          <span className="visually-hidden">{mark}</span>
                        </span>
                      </td>
                    )
                  })}
                  <td className="tabular font-data text-[0.72rem] text-ink">{score(c, i).toFixed(1)}</td>
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
    <div className={panel}>
      <div className={panelHead}>
        <h3>Fees this month</h3>
        <p className="tabular">€{FEE[c.id]} per student</p>
      </div>
      <div className="flex h-2 gap-[3px]" aria-hidden="true">
        {tally.map(({ s, n }) => (
          <span
            key={s}
            className={`basis-0 rounded transition-[flex-grow] duration-500 ease-out ${FEE_BAR[s]}`}
            style={{ flexGrow: n }}
          />
        ))}
      </div>
      <p className="tabular mt-2 text-[0.78rem] text-ink-2">
        {tally
          .filter((t) => t.n)
          .map((t) => `${t.n} ${t.s.toLowerCase()}`)
          .join(' · ')}
      </p>
      <ul className="mt-2.5">
        {shown.map((r) => (
          <li key={r.name} className="flex justify-between border-t border-rule py-[7px]">
            <span>{r.name}</span>
            <em className={`rounded-full px-2 py-0.5 text-[0.72rem] font-semibold not-italic ${FEE_PILL[r.status]}`}>{r.status}</em>
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
    <div className={panel}>
      <div className={panelHead}>
        <h3>Messages</h3>
        <p>Automatic</p>
      </div>
      <ul className="grid gap-2">
        {items.map((m) => (
          <li key={m} className="flex items-start gap-2 text-ink-2">
            <MessageSquare className="mt-[3px] flex-none text-green-deep" size={14} strokeWidth={2} aria-hidden="true" />
            {m}
          </li>
        ))}
      </ul>
    </div>
  )
}
