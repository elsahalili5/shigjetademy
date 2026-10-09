import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Bell, CalendarDays, Check, ClipboardCheck, FileText, MessageSquare, Wallet } from 'lucide-react'
import wordmark from '../assets/brand/shigjetademy-wordmark.png'

type Role = {
  role: string
  body: string
  screen: { title: string; greeting: string; content: ReactNode }
}

const ROLES: Role[] = [
  {
    role: 'Directors & admins',
    body: 'Enrolment, timetables, attendance and fee collection across every class, in one view.',
    screen: {
      title: 'Today',
      greeting: 'All classes',
      content: (
        <>
          <Row icon={<ClipboardCheck size={15} />} label="Registers taken" value="5 of 6" tone="green" />
          <Row icon={<Wallet size={15} />} label="Fees this month" value="23 paid · 3 due" tone="kraft" />
          <Row icon={<Bell size={15} />} label="Absences today" value="4 students" tone="coral" />
          <Bar label="Seats filled" value={0.86} />
        </>
      ),
    },
  },
  {
    role: 'Teachers',
    body: 'Their timetable, quick registers, the gradebook and messages to their students’ families.',
    screen: {
      title: 'My classes',
      greeting: 'Wednesday',
      content: (
        <>
          <Lesson time="09:00" name="Grade 9 Mathematics" room="Room 204" action="Take register" />
          <Lesson time="11:15" name="Grade 8 Mathematics" room="Room 204" />
          <Lesson time="14:00" name="Maths club" room="Lab 2" />
        </>
      ),
    },
  },
  {
    role: 'Students',
    body: 'Their schedule, grades and progress reports, plus messages from teachers.',
    screen: {
      title: 'Hi, Arta',
      greeting: 'Next up',
      content: (
        <>
          <Lesson time="09:00" name="Grade 9 Mathematics" room="Room 204" />
          <Row icon={<Check size={15} />} label="Unit 3 test" value="9.1" tone="green" />
          <Row icon={<FileText size={15} />} label="Term report" value="Ready Friday" tone="navy" />
          <Row icon={<MessageSquare size={15} />} label="New message" value="Ms Leka" tone="kraft" />
        </>
      ),
    },
  },
  {
    role: 'Parents & guardians',
    body: 'Attendance, reports and fee status for each child, and a direct line to the school.',
    screen: {
      title: 'Dea Morina',
      greeting: 'Grade 9',
      content: (
        <>
          <Row icon={<CalendarDays size={15} />} label="Attendance" value="96% this term" tone="green" />
          <Row icon={<Wallet size={15} />} label="October fees" value="Paid" tone="green" />
          <Row icon={<FileText size={15} />} label="Progress report" value="Available" tone="navy" />
          <Row icon={<Bell size={15} />} label="Absent · Mon" value="Notified 09:10" tone="coral" />
        </>
      ),
    },
  },
]

// Each row tints its icon and value: --tone for ink, --wash behind the icon
const ROW_TONES: Record<string, string> = {
  green: '[--tone:var(--green-deep)] [--wash:var(--green-wash)]',
  kraft: '[--tone:var(--kraft-ink)] [--wash:var(--kraft-wash)]',
  coral: '[--tone:var(--coral-deep)] [--wash:var(--coral-wash)]',
  navy: '[--tone:var(--ink)] [--wash:#dfe6ee]',
}

function Row({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className={`grid grid-cols-[auto_1fr_auto] items-center gap-2.5 rounded-xl bg-mist p-2.5 ${ROW_TONES[tone]}`}>
      <span className="grid size-7 place-items-center rounded-lg bg-(--wash) text-(--tone)" aria-hidden="true">
        {icon}
      </span>
      <span className="font-semibold">{label}</span>
      <span className="text-right text-[0.74rem] font-semibold text-(--tone)">{value}</span>
    </div>
  )
}

function Lesson({ time, name, room, action }: { time: string; name: string; room: string; action?: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-mist p-3">
      <span className="tabular pt-0.5 font-data text-[0.72rem] text-green-deep">{time}</span>
      <span>
        <strong className="block font-[650]">{name}</strong>
        <span className="text-[0.74rem] text-ink-3">{room}</span>
      </span>
      {action && (
        <span className="col-start-2 mt-1.5 justify-self-start rounded-full bg-green-deep px-3 py-1.5 text-[0.74rem] font-semibold text-white">
          {action}
        </span>
      )}
    </div>
  )
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-mist px-2.5 py-3">
      <span className="mb-2 flex justify-between font-semibold">
        {label}
        <b className="tabular">{Math.round(value * 100)}%</b>
      </span>
      <i
        className="block h-2 rounded-sm bg-[linear-gradient(90deg,var(--green)_calc(var(--v)*100%),var(--mist-deep)_0)]"
        style={{ '--v': value } as CSSProperties}
      />
    </div>
  )
}

// One colour per role, from the brand palette: wash behind, ink for the name
const ROLE_TONES = [
  { wash: '#dfe6ee', ink: 'var(--navy)' },
  { wash: 'var(--green-wash)', ink: 'var(--green-deep)' },
  { wash: 'var(--kraft-wash)', ink: 'var(--kraft-ink)' },
  { wash: 'var(--coral-wash)', ink: 'var(--coral-deep)' },
]

export function Roles() {
  const [active, setActive] = useState(0)

  return (
    <section className="section band-white" id="roles" aria-labelledby="roles-title">
      <div className="shell grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-center gap-[clamp(32px,6vw,96px)] max-[960px]:grid-cols-1">
        <div>
          <div data-reveal>
            <h2 id="roles-title" className="text-[clamp(2rem,3.8vw,3.4rem)] font-[680] tracking-[-0.032em]">One platform. Everyone sees their part.</h2>
            <p className="mt-[18px] max-w-[46ch] text-ink-2">
              Everyone works from the same record, and each role sees only what they need. Choose a role to see
              their view.
            </p>
          </div>
          <ul className="mt-9">
            {ROLES.map((r, n) => (
              <li
                key={r.role}
                data-reveal
                className="border-t border-rule last:border-b"
                style={{ '--i': n, '--role-wash': ROLE_TONES[n].wash, '--role-ink': ROLE_TONES[n].ink } as CSSProperties}
              >
                <button
                  type="button"
                  aria-pressed={n === active}
                  onClick={() => setActive(n)}
                  onMouseEnter={() => setActive(n)}
                  onFocus={() => setActive(n)}
                  className="group grid w-full grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-7 gap-y-2 rounded-[14px] px-4 py-[22px] text-left transition-[background-color,scale] duration-200 ease-out active:scale-[0.99] aria-pressed:bg-(--role-wash) max-[560px]:grid-cols-1 max-[560px]:px-3 max-[560px]:py-[18px]"
                >
                  <span className="font-display text-[1.3rem] leading-[1.2] font-[650] tracking-[-0.02em] text-ink-3 transition-colors duration-200 group-aria-pressed:text-(--role-ink)">{r.role}</span>
                  <span className="text-[0.95rem] text-ink-2">{r.body}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div
          // The phone: drawn in CSS, screens crossfade with a touch of blur
          className="relative grid justify-items-center gap-4 overflow-hidden rounded-[28px] bg-(--role-wash) py-[clamp(24px,4vw,48px)] transition-colors duration-[360ms] before:absolute before:-top-[170px] before:-right-[190px] before:size-[420px] before:rounded-full before:border-[38px] before:border-kraft before:opacity-35 before:content-['']"
          data-reveal
          style={{ '--i': 2, '--role-wash': ROLE_TONES[active].wash } as CSSProperties}
        >
          <div
            className="relative h-[560px] w-[290px] overflow-hidden rounded-[44px] border-10 border-navy bg-white px-[18px] pt-[46px] pb-[18px] shadow-[0_40px_70px_-40px_rgba(22,34,46,0.6)] max-[560px]:h-[530px] max-[560px]:w-[270px]"
            aria-live="polite"
          >
            <div className="absolute top-2.5 left-1/2 -ml-[46px] h-6 w-[92px] rounded-full bg-navy" aria-hidden="true" />
            <div className="flex items-center gap-2 border-b border-rule pb-3.5">
              <img src={wordmark} alt="Shigjetademy" width={88} height={22} />
            </div>
            <div className="mt-4 grid">
              {ROLES.map((r, n) => (
                <div
                  key={r.role}
                  className="pointer-events-none [grid-area:1/1] translate-y-1.5 opacity-0 blur-[6px] transition-[opacity,filter,translate] duration-[240ms] ease-out data-active:pointer-events-auto data-active:translate-y-0 data-active:opacity-100 data-active:blur-none motion-reduce:translate-y-0 motion-reduce:blur-none"
                  data-active={n === active || undefined}
                  aria-hidden={n !== active}
                >
                  <p className="text-[0.78rem] font-semibold text-ink-3">{r.screen.greeting}</p>
                  <h3 className="mt-0.5 mb-3.5 text-[1.5rem] font-bold">{r.screen.title}</h3>
                  <div className="grid gap-2 text-[0.8rem]">{r.screen.content}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="relative text-[0.8rem] text-ink-3">{ROLES[active].role} view · illustrative</p>
        </div>
      </div>
    </section>
  )
}
