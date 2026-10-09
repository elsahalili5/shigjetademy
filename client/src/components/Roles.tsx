import { useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Bell, CalendarDays, Check, ClipboardCheck, FileText, MessageSquare, Wallet } from 'lucide-react'
import wordmark from '../assets/brand/shigjetademy-wordmark.png'
import './Roles.css'

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

function Row({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string; tone: string }) {
  return (
    <div className="phone__row" data-tone={tone}>
      <span className="phone__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="phone__label">{label}</span>
      <span className="phone__value">{value}</span>
    </div>
  )
}

function Lesson({ time, name, room, action }: { time: string; name: string; room: string; action?: string }) {
  return (
    <div className="phone__lesson">
      <span className="phone__time tabular">{time}</span>
      <span>
        <strong>{name}</strong>
        <span>{room}</span>
      </span>
      {action && <span className="phone__action">{action}</span>}
    </div>
  )
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="phone__bar">
      <span>
        {label}
        <b className="tabular">{Math.round(value * 100)}%</b>
      </span>
      <i style={{ '--v': value } as CSSProperties} />
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
      <div className="container roles">
        <div className="roles__text">
          <div data-reveal>
            <h2 id="roles-title">One platform. Everyone sees their part.</h2>
            <p className="roles__lede">
              Everyone works from the same record, and each role sees only what they need. Choose a role to see
              their view.
            </p>
          </div>
          <ul className="roles__list">
            {ROLES.map((r, n) => (
              <li
                key={r.role}
                data-reveal
                style={{ '--i': n, '--role-wash': ROLE_TONES[n].wash, '--role-ink': ROLE_TONES[n].ink } as CSSProperties}
              >
                <button
                  type="button"
                  aria-pressed={n === active}
                  onClick={() => setActive(n)}
                  onMouseEnter={() => setActive(n)}
                  onFocus={() => setActive(n)}
                >
                  <span className="roles__name">{r.role}</span>
                  <span className="roles__body">{r.body}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="roles__device"
          data-reveal
          style={{ '--i': 2, '--role-wash': ROLE_TONES[active].wash } as CSSProperties}
        >
          <div className="phone" aria-live="polite">
            <div className="phone__notch" aria-hidden="true" />
            <div className="phone__bar-top">
              <img src={wordmark} alt="Shigjetademy" width={88} height={22} />
            </div>
            <div className="phone__screens">
              {ROLES.map((r, n) => (
                <div
                  key={r.role}
                  className="phone__screen"
                  data-active={n === active || undefined}
                  aria-hidden={n !== active}
                >
                  <p className="phone__greeting">{r.screen.greeting}</p>
                  <h3>{r.screen.title}</h3>
                  <div className="phone__content">{r.screen.content}</div>
                </div>
              ))}
            </div>
          </div>
          <p className="roles__caption">{ROLES[active].role} view · illustrative</p>
        </div>
      </div>
    </section>
  )
}
