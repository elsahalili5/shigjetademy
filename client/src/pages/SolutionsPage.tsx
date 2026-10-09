import { useRef } from 'react'
import type { CSSProperties } from 'react'
import {
  Award,
  BookOpen,
  Building2,
  ClipboardCheck,
  FileQuestion,
  GraduationCap,
  Heart,
  Layers,
  Presentation,
  Settings2,
  TrendingUp,
  UserPlus,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { usePinnedTrack } from '../hooks/usePinnedTrack'
import { useTitle } from '../lib/router'
import './Solutions.css'

// Palette tones: bright fill (on navy), deep ink (on light), wash (light ground)
const TONES = {
  green: { fill: 'var(--green)', ink: 'var(--green-deep)', wash: 'var(--green-wash)' },
  kraft: { fill: 'var(--kraft)', ink: 'var(--kraft-ink)', wash: 'var(--kraft-wash)' },
  coral: { fill: 'var(--coral)', ink: 'var(--coral-deep)', wash: 'var(--coral-wash)' },
  slate: { fill: 'var(--on-navy-2)', ink: 'var(--ink-2)', wash: '#dfe6ee' },
}
type Tone = keyof typeof TONES

const toneVars = (t: Tone, n = 0) =>
  ({ '--i': n, '--tone': TONES[t].fill, '--tone-ink': TONES[t].ink, '--tone-wash': TONES[t].wash }) as CSSProperties

/* ---------- Content ---------- */

type CapId = 'courses' | 'attendance' | 'grades' | 'materials' | 'tests' | 'payments' | 'performance'

const CAPS: Record<CapId, { icon: LucideIcon; label: string; tone: Tone }> = {
  courses: { icon: Layers, label: 'Courses & groups', tone: 'kraft' },
  attendance: { icon: ClipboardCheck, label: 'Attendance', tone: 'green' },
  grades: { icon: Award, label: 'Grades', tone: 'slate' },
  materials: { icon: BookOpen, label: 'Learning materials', tone: 'coral' },
  tests: { icon: FileQuestion, label: 'Tests', tone: 'kraft' },
  payments: { icon: Wallet, label: 'Payments', tone: 'green' },
  performance: { icon: TrendingUp, label: 'Performance', tone: 'coral' },
}

type RoleId = 'owner' | 'teacher' | 'student' | 'parent'

const DAYS: {
  id: RoleId
  icon: LucideIcon
  role: string
  title: string
  body: string
  look: 'navy' | Tone
  moments: { time: string; text: string; cap: CapId }[]
}[] = [
  {
    id: 'owner',
    icon: Building2,
    role: 'Owners & admins',
    title: 'The whole organization, at a glance.',
    body: 'Courses, groups, attendance and fees across every class and branch.',
    look: 'navy',
    moments: [
      { time: '08:00', text: 'Checks how every class started the day', cap: 'performance' },
      { time: '10:30', text: 'Opens a new evening group for IELTS', cap: 'courses' },
      { time: '13:00', text: 'Sees who has paid this month and who is due', cap: 'payments' },
      { time: '17:00', text: 'Reviews attendance across all classes', cap: 'attendance' },
    ],
  },
  {
    id: 'teacher',
    icon: Presentation,
    role: 'Teachers',
    title: 'Teach, take the register, move on.',
    body: 'Their timetable, registers, materials, tests and gradebook in one place.',
    look: 'green',
    moments: [
      { time: '08:45', text: 'Opens today’s classes and rooms', cap: 'courses' },
      { time: '09:05', text: 'Takes the register in Room 204', cap: 'attendance' },
      { time: '11:00', text: 'Shares the Unit 3 worksheet with the group', cap: 'materials' },
      { time: '15:15', text: 'Marks the Unit 3 test straight into the gradebook', cap: 'tests' },
    ],
  },
  {
    id: 'student',
    icon: GraduationCap,
    role: 'Students',
    title: 'Everything for class, in their pocket.',
    body: 'Their schedule, materials, tests and grades, always up to date.',
    look: 'kraft',
    moments: [
      { time: '08:30', text: 'Checks today’s timetable', cap: 'courses' },
      { time: '12:00', text: 'Downloads the class notes', cap: 'materials' },
      { time: '16:00', text: 'Takes the Unit 3 quiz', cap: 'tests' },
      { time: '19:00', text: 'Sees the new grade come in', cap: 'grades' },
    ],
  },
  {
    id: 'parent',
    icon: Heart,
    role: 'Parents',
    title: 'Close to their child’s progress.',
    body: 'Attendance, grades, reports and fees for each child, without chasing anyone.',
    look: 'coral',
    moments: [
      { time: '09:10', text: 'Gets a note that their child is in class', cap: 'attendance' },
      { time: '13:00', text: 'Pays the term invoice', cap: 'payments' },
      { time: '18:00', text: 'Reads the latest grades', cap: 'grades' },
      { time: '20:30', text: 'Opens the progress report', cap: 'performance' },
    ],
  },
]

// Which roles meet each capability during their day (derived, so the index never drifts from the stories)
const usedBy = (cap: CapId) => DAYS.filter((d) => d.moments.some((m) => m.cap === cap)).map((d) => d.id)

const STEPS: { icon: LucideIcon; title: string; body: string; tone: Tone }[] = [
  { icon: Settings2, title: 'Organization setup', body: 'Add your organization, branches, staff and the courses you run.', tone: 'kraft' },
  { icon: UserPlus, title: 'Enrolment', body: 'Students and families join courses and groups, with one record each.', tone: 'green' },
  { icon: Presentation, title: 'Teaching', body: 'Teachers follow their timetable, take registers and share materials.', tone: 'slate' },
  { icon: GraduationCap, title: 'Assessment', body: 'Tests and grades are recorded and roll into progress reports.', tone: 'coral' },
  { icon: Wallet, title: 'Payments', body: 'Tuition is invoiced per student and payment status stays visible.', tone: 'green' },
]

/* ---------- Page ---------- */

export function SolutionsPage() {
  useTitle('Solutions · Shigjetademy')
  return (
    <>
      <PageHeader
        id="solutions-page-title"
        title={
          <>
            Education management, <em>solved end to end.</em>
          </>
        }
        intro="Shigjetademy brings the everyday work of running a school, academy or training centre into one platform, from the first enrolment to the last payment."
      />


      <RoleDays />

      <section className="section container sol-index" aria-labelledby="index-title">
        <div className="section-head" data-reveal>
          <h2 id="index-title">Seven capabilities, one record.</h2>
          <p>Every day above runs on the same seven capabilities, sharing the same students, courses and groups.</p>
        </div>
        <ul className="index" data-reveal>
          {(Object.keys(CAPS) as CapId[]).map((id, n) => {
            const { icon: Icon, label, tone } = CAPS[id]
            const roles = usedBy(id)
            return (
              <li key={id} style={toneVars(tone, n)}>
                <span className="index__icon" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.9} />
                </span>
                <strong>{label}</strong>
                <span className="index__roles">
                  {roles.length ? (
                    <>
                      <span className="visually-hidden">Used by </span>
                      {roles.map((r) => (
                        <span key={r} data-role={r}>
                          {DAYS.find((d) => d.id === r)!.role}
                        </span>
                      ))}
                    </>
                  ) : (
                    <span>Owners & admins</span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="sol-how" id="how" aria-labelledby="how-title">
        <div className="container">
          <div className="sol-how__head" data-reveal>
            <h2 id="how-title">How it works.</h2>
            <p>One path, from the day you set up to the day the fees come in.</p>
          </div>
          <ol className="steps" data-reveal>
            {STEPS.map(({ icon: Icon, title, body, tone }, n) => (
              <li key={title} style={toneVars(tone, n)}>
                <span className="steps__node" aria-hidden="true">
                  <Icon size={20} strokeWidth={1.9} />
                </span>
                <span className="steps__num tabular" aria-hidden="true">
                  Step {n + 1}
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  )
}

/* ---------- Signature: four days, pinned and scrolled sideways ---------- */

function RoleDays() {
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const tabs = useRef<HTMLDivElement>(null)
  const last = useRef(-1)

  // The active day is written straight to the DOM in the scroll frame: no re-render per step
  // Active = the day whose centre sits closest to the middle of the screen
  const pinned = usePinnedTrack(section, track, (progress) => {
    const row = track.current
    if (!row) return
    const x = progress * Math.max(0, row.scrollWidth - window.innerWidth)
    const mid = window.innerWidth / 2
    let next = 0
    let best = Infinity
    row.querySelectorAll<HTMLElement>('[data-day]').forEach((el, n) => {
      const d = Math.abs(el.offsetLeft - x + el.offsetWidth / 2 - mid)
      if (d < best) {
        best = d
        next = n
      }
    })
    if (next === last.current) return
    last.current = next
    track.current?.querySelectorAll<HTMLElement>('[data-day]').forEach((el, n) => el.toggleAttribute('data-active', n === next))
    tabs.current?.querySelectorAll<HTMLElement>('button').forEach((el, n) => el.setAttribute('aria-current', String(n === next)))
  })

  const jumpTo = (n: number) => {
    const el = section.current
    if (!el) return
    if (!pinned) {
      track.current?.children[n]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
      return
    }
    const runway = el.offsetHeight - window.innerHeight
    const top = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top: top + runway * ((n + 0.5) / DAYS.length), behavior: 'smooth' })
  }

  return (
    <section ref={section} className="days band-white" data-pinned={pinned || undefined} aria-labelledby="days-title">
      <div className="days__sticky">
        <div className="container days__head">
          <div>
            <h2 id="days-title">Four days, one platform.</h2>
            <p>The same Shigjetademy, seen by the four people who use it every day.</p>
          </div>
          <div ref={tabs} className="days__tabs" role="group" aria-label="Jump to a role">
            {DAYS.map((d, n) => (
              <button key={d.id} type="button" aria-current={n === 0} onClick={() => jumpTo(n)}>
                {d.role}
              </button>
            ))}
          </div>
        </div>

        <div ref={track} className="days__track">
          {DAYS.map((d, n) => {
            const Icon = d.icon
            return (
              <article
                key={d.id}
                className="day"
                data-day
                data-look={d.look}
                data-active={!pinned || n === 0 || undefined}
                aria-labelledby={`day-${d.id}`}
              >
                <div className="day__intro">
                  <span className="day__icon" aria-hidden="true">
                    <Icon size={22} strokeWidth={1.9} />
                  </span>
                  <p className="day__role">{d.role}</p>
                  <h3 id={`day-${d.id}`}>{d.title}</h3>
                  <p className="day__body">{d.body}</p>
                </div>
                <ol className="day__moments" aria-label={`${d.role}: an illustrative day`}>
                  {d.moments.map((m, k) => {
                    const cap = CAPS[m.cap]
                    const CapIcon = cap.icon
                    return (
                      <li key={m.time} style={toneVars(cap.tone, k)}>
                        <time className="tabular">{m.time}</time>
                        <span className="day__text">{m.text}</span>
                        <span className="day__cap">
                          <CapIcon size={13} strokeWidth={2.2} aria-hidden="true" />
                          {cap.label}
                        </span>
                      </li>
                    )
                  })}
                </ol>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
