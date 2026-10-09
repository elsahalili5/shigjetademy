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


// Each day card's ground: navy for owners, a palette wash for the others. --day-* colour the content.
const LOOKS = {
  navy: '[--day-ink:var(--white)] [--day-sub:var(--on-navy-2)] [--day-rule:rgba(231,238,243,0.14)] bg-navy bg-[radial-gradient(70%_70%_at_0%_100%,rgba(220,181,127,0.18),transparent_70%)]',
  green: '[--day-ink:var(--ink)] [--day-sub:var(--ink-2)] [--day-rule:var(--rule)] bg-green-wash',
  kraft: '[--day-ink:var(--ink)] [--day-sub:var(--ink-2)] [--day-rule:var(--rule)] bg-kraft-wash',
  coral: '[--day-ink:var(--ink)] [--day-sub:var(--ink-2)] [--day-rule:var(--rule)] bg-coral-wash',
  slate: '[--day-ink:var(--ink)] [--day-sub:var(--ink-2)] [--day-rule:var(--rule)] bg-haze',
} as Record<string, string>

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

      <section className="section shell pb-[clamp(96px,13vw,160px)]" aria-labelledby="index-title">
        <div className="section-head" data-reveal>
          <h2 id="index-title">Seven capabilities, one record.</h2>
          <p>Every day above runs on the same seven capabilities, sharing the same students, courses and groups.</p>
        </div>
        {/* Hairlines come from the 1px gaps over the rule colour, so they hold at every column count */}
        <ul
          className="grid grid-cols-7 gap-px overflow-hidden rounded-[20px] bg-rule shadow-[0_1px_2px_rgba(20,42,61,0.06),0_20px_40px_-28px_rgba(20,42,61,0.35)] max-[1080px]:grid-cols-4 max-[640px]:grid-cols-2"
          data-reveal
        >
          {(Object.keys(CAPS) as CapId[]).map((id, n) => {
            const { icon: Icon, label, tone } = CAPS[id]
            const roles = usedBy(id)
            return (
              <li
                key={id}
                style={toneVars(tone, n)}
                className="group flex flex-col gap-3 bg-white p-[clamp(18px,1.8vw,24px)] transition-colors duration-[220ms] hover:bg-[color-mix(in_srgb,var(--tone-wash)_40%,var(--white))] max-[1080px]:last:col-span-full max-[640px]:last:col-span-2"
              >
                <span
                  className="mb-[18px] grid size-[42px] place-items-center rounded-xl bg-(--tone-wash) text-(--tone-ink) transition-[background-color,color,translate] duration-[220ms] ease-out group-hover:-translate-y-0.5 group-hover:bg-(--tone) group-hover:text-navy"
                  aria-hidden="true"
                >
                  <Icon size={20} strokeWidth={1.9} />
                </span>
                <strong className="font-display text-[1.05rem] leading-[1.2] font-[650] tracking-[-0.015em]">{label}</strong>
                <span className="mt-auto flex flex-wrap gap-1 [&>span:not(.visually-hidden)]:rounded-full [&>span:not(.visually-hidden)]:bg-haze [&>span:not(.visually-hidden)]:px-2 [&>span:not(.visually-hidden)]:py-0.5 [&>span:not(.visually-hidden)]:text-[0.68rem] [&>span:not(.visually-hidden)]:font-semibold [&>span:not(.visually-hidden)]:text-ink-2">
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

      {/* How it works: a navy closing panel with a five-step path */}
      <section
        data-flush-end
        className="mx-(--frame) rounded-panel bg-navy bg-[radial-gradient(60%_80%_at_10%_100%,rgba(220,181,127,0.14),transparent_70%)] py-[clamp(80px,10vw,128px)] text-on-navy"
        id="how"
        aria-labelledby="how-title"
      >
        <div className="shell">
          <div className="mb-[clamp(48px,6vw,80px)] grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-end gap-[clamp(20px,4vw,64px)] max-[1080px]:grid-cols-1" data-reveal>
            <h2 id="how-title" className="text-[clamp(2rem,3.8vw,3.4rem)] font-[680] tracking-[-0.032em] text-white">How it works.</h2>
            <p className="max-w-[44ch] text-on-navy-2">One path, from the day you set up to the day the fees come in.</p>
          </div>
          {/* The path: a hairline through the nodes (ending on the last node's centre), drawn in once */}
          <ol
            className="relative grid grid-cols-5 gap-(--step-gap) [--node:52px] [--step-gap:clamp(16px,2vw,28px)] before:absolute before:top-[calc(var(--node)/2)] before:right-[calc((100%-4*var(--step-gap))/5-var(--node)/2)] before:left-[calc(var(--node)/2)] before:h-0.5 before:origin-left before:bg-linear-to-r before:from-kraft before:via-green before:to-coral before:opacity-55 before:content-[''] motion-safe:[.motion_&]:before:scale-x-0 motion-safe:[.motion_&]:before:transition-transform motion-safe:[.motion_&]:before:delay-150 motion-safe:[.motion_&]:before:duration-[1100ms] motion-safe:[.motion_&]:before:ease-in-out motion-safe:[.motion_&]:data-inview:before:scale-x-100 max-[1080px]:grid-cols-1 max-[1080px]:gap-7 max-[1080px]:before:top-[calc(var(--node)/2)] max-[1080px]:before:right-auto max-[1080px]:before:bottom-[calc(var(--node)/2)] max-[1080px]:before:left-[calc(var(--node)/2-1px)] max-[1080px]:before:h-auto max-[1080px]:before:w-0.5 max-[1080px]:before:origin-top max-[1080px]:before:bg-linear-to-b max-[1080px]:motion-safe:[.motion_&]:before:scale-x-100 max-[1080px]:motion-safe:[.motion_&]:before:scale-y-0 max-[1080px]:motion-safe:[.motion_&]:data-inview:before:scale-y-100"
            data-reveal
          >
            {STEPS.map(({ icon: Icon, title, body, tone }, n) => (
              <li
                key={title}
                style={toneVars(tone, n)}
                className="relative grid content-start gap-2.5 motion-safe:[.motion_&]:translate-y-3 motion-safe:[.motion_&]:opacity-0 motion-safe:[.motion_&]:transition-[opacity,translate] motion-safe:[.motion_&]:duration-500 motion-safe:[.motion_&]:ease-out motion-safe:[.motion_&]:[transition-delay:calc(var(--i)*180ms+200ms)] motion-safe:[.motion_[data-inview]_&]:translate-y-0 motion-safe:[.motion_[data-inview]_&]:opacity-100 max-[1080px]:grid-cols-[var(--node)_minmax(0,1fr)] max-[1080px]:gap-x-5 max-[1080px]:gap-y-1.5"
              >
                <span
                  className="mb-2.5 grid size-(--node) place-items-center rounded-2xl bg-(--tone) text-navy shadow-[0_0_0_6px_var(--navy),0_14px_28px_-14px_rgba(0,0,0,0.6)] max-[1080px]:row-span-3 max-[1080px]:mb-0"
                  aria-hidden="true"
                >
                  <Icon size={20} strokeWidth={1.9} />
                </span>
                <span className="tabular font-data text-[0.7rem] text-(--tone)" aria-hidden="true">
                  Step {n + 1}
                </span>
                <h3 className="text-[1.2rem] font-[650] tracking-[-0.02em] text-white">{title}</h3>
                <p className="text-[0.92rem] text-on-navy-2">{body}</p>
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
    <section
      ref={section}
      className="group/days band-white relative py-[clamp(80px,10vw,128px)] data-pinned:h-[calc(100svh+var(--track-distance,0px))] data-pinned:py-0"
      data-pinned={pinned || undefined}
      aria-labelledby="days-title"
    >
      <div className="flex flex-col justify-center gap-[clamp(24px,3.5vh,44px)] group-data-pinned/days:sticky group-data-pinned/days:top-0 group-data-pinned/days:h-svh group-data-pinned/days:overflow-hidden group-data-pinned/days:pt-[calc(var(--nav-h)+var(--frame))]">
        <div className="shell flex w-full flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div>
            <h2 id="days-title" className="text-[clamp(2rem,3.8vw,3.4rem)] font-[680] tracking-[-0.032em]">Four days, one platform.</h2>
            <p className="mt-3 max-w-[46ch] text-ink-2">The same Shigjetademy, seen by the four people who use it every day.</p>
          </div>
          {/* Role tabs: show where you are, and jump */}
          <div ref={tabs} className="flex flex-wrap gap-1 rounded-full bg-haze p-1 max-[640px]:hidden" role="group" aria-label="Jump to a role">
            {DAYS.map((d, n) => (
              <button
                key={d.id}
                type="button"
                aria-current={n === 0}
                onClick={() => jumpTo(n)}
                className="rounded-full bg-transparent px-4 py-[9px] text-[0.9rem] font-semibold text-ink-2 transition-[background-color,color,box-shadow,scale] duration-[220ms] ease-out hover:text-ink active:scale-[0.96] aria-[current=true]:bg-white aria-[current=true]:text-ink aria-[current=true]:shadow-[0_1px_2px_rgba(20,42,61,0.1),0_6px_14px_-8px_rgba(20,42,61,0.35)]"
              >
                {d.role}
              </button>
            ))}
          </div>
        </div>

        <div
          ref={track}
          className="flex snap-x snap-mandatory scroll-px-(--inset) gap-[clamp(16px,2vw,24px)] overflow-x-auto px-(--inset) [--inset:max(var(--gutter),calc((100vw-var(--max))/2+var(--gutter)))] [scrollbar-width:none] group-data-pinned/days:w-max group-data-pinned/days:overflow-visible group-data-pinned/days:will-change-transform [&::-webkit-scrollbar]:hidden"
        >
          {DAYS.map((d, n) => {
            const Icon = d.icon
            return (
              <article
                key={d.id}
                // One day: intro on the left, the timeline of moments on the right. While pinned, waiting
                // days keep their colour but their content steps back; the active day's moments step through.
                className={`group/day grid min-h-[clamp(380px,54vh,500px)] w-[min(86vw,860px)] flex-none snap-start grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-[clamp(20px,3vw,48px)] rounded-[28px] p-[clamp(24px,3.2vw,44px)] text-(--day-ink) transition-[scale] duration-500 ease-out motion-safe:*:transition-opacity motion-safe:*:duration-[400ms] motion-safe:group-data-pinned/days:not-data-active:scale-[0.97] motion-safe:group-data-pinned/days:not-data-active:*:opacity-40 max-[860px]:min-h-0 max-[860px]:w-[min(84vw,520px)] max-[860px]:grid-cols-1 ${LOOKS[d.look]}`}
                data-day
                data-active={!pinned || n === 0 || undefined}
                aria-labelledby={`day-${d.id}`}
              >
                <div className="flex flex-col gap-3">
                  <span
                    className={`mb-auto grid size-[52px] place-items-center rounded-2xl text-navy shadow-[0_1px_2px_rgba(20,42,61,0.08)] max-[860px]:mb-0 ${d.look === 'navy' ? 'bg-kraft' : 'bg-white'}`}
                    aria-hidden="true"
                  >
                    <Icon size={22} strokeWidth={1.9} />
                  </span>
                  <p className="mt-8 text-[0.86rem] font-[650] text-(--day-sub) max-[860px]:mt-2">{d.role}</p>
                  <h3 id={`day-${d.id}`} className="text-[clamp(1.6rem,2.6vw,2.3rem)] leading-[1.05] font-[680] tracking-[-0.03em] text-(--day-ink)">{d.title}</h3>
                  <p className="max-w-[34ch] text-(--day-sub) max-[640px]:hidden">{d.body}</p>
                </div>
                {/* Moments: time, what happens, and the capability in use */}
                <ol className="grid content-center" aria-label={`${d.role}: an illustrative day`}>
                  {d.moments.map((m, k) => {
                    const cap = CAPS[m.cap]
                    const CapIcon = cap.icon
                    return (
                      <li
                        key={m.time}
                        style={toneVars(cap.tone, k)}
                        className="grid grid-cols-[3.4rem_minmax(0,1fr)] gap-x-3.5 gap-y-1.5 border-t border-(--day-rule) py-4 last:border-b motion-safe:group-data-pinned/days:transition-[opacity,translate] motion-safe:group-data-pinned/days:duration-[420ms] motion-safe:group-data-pinned/days:ease-out motion-safe:group-data-pinned/days:[transition-delay:calc(var(--i)*90ms+120ms)] motion-safe:group-data-pinned/days:group-not-data-active/day:translate-x-3.5 motion-safe:group-data-pinned/days:group-not-data-active/day:opacity-0 motion-safe:group-data-pinned/days:group-not-data-active/day:delay-0 max-[860px]:py-[11px]"
                      >
                        <time className="tabular row-span-2 pt-0.5 font-data text-[0.78rem] text-(--day-sub)">{m.time}</time>
                        <span className="leading-[1.35] font-semibold">{m.text}</span>
                        <span
                          className={`inline-flex items-center gap-1.5 justify-self-start rounded-full px-2.5 py-[3px] text-[0.74rem] font-[650] ${d.look === 'navy' ? 'bg-[color-mix(in_srgb,var(--tone)_18%,transparent)] text-(--tone)' : 'bg-white text-(--tone-ink)'}`}
                        >
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
