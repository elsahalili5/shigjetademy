import { ArrowRight, CalendarDays, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { MyTeaching } from '@shigjetademy/shared/lecturers'
import { Link } from '@tanstack/react-router'
import illustration from '#/assets/illustrations/lecturer-welcome.png'
import { Arcs } from '#/components/Arcs'
import { useFormatDay } from '#/lib/use-format-date'
import { useNow } from '../hooks/use-now'
import { getOrganizationClock } from '../utils/organization-clock'
import { getPartOfDay } from '../utils/part-of-day'
import type { PartOfDay } from '../utils/part-of-day'
import { getTodayStatus } from '../utils/today-status'
import type { TodayStatus } from '../utils/today-status'

const GREETINGS = {
  MORNING: 'Good morning',
  AFTERNOON: 'Good afternoon',
  EVENING: 'Good evening',
} as const satisfies Record<PartOfDay, string>

const TAGLINE = 'Empower minds. Inspire futures.'

const NO_CLASSES_TEXT = 'No classes scheduled yet. Your timetable will show here.'

interface WelcomeBannerProps {
  firstName: string
  organizationName: string
  /** The organization's time zone; the greeting and today follow it, not the device clock */
  timeZone: string
  /** The lecturer's periods once loaded; until then the banner greets without the today status */
  myTeaching?: MyTeaching
}

/** The head of My teaching: who and where, the tagline, what today is for teaching, and the way to the calendar */
export function WelcomeBanner({ firstName, organizationName, timeZone, myTeaching }: WelcomeBannerProps) {
  const now = useNow()
  const clock = getOrganizationClock({ now, timeZone })
  const status = myTeaching ? getTodayStatus({ clock, myTeaching }) : null

  return (
    <section
      aria-label="Welcome"
      className="relative isolate overflow-hidden bg-navy bg-[radial-gradient(60%_90%_at_88%_0%,rgba(31,176,139,0.22),transparent_70%),radial-gradient(45%_70%_at_0%_100%,rgba(220,181,127,0.14),transparent_70%)] text-white [--arc-green:rgba(31,176,139,0.45)] [--arc-knot:rgba(220,181,127,0.5)] [--arc:rgba(255,255,255,0.06)]"
    >
      <Arcs className="-top-[18%] right-[-6%] -z-10 w-[min(640px,58vw)] max-[760px]:right-[-30%] max-[760px]:w-[420px]" />

      <div className="grid gap-5 px-[clamp(20px,3.4vw,44px)] pt-[clamp(32px,4.4vw,56px)] pb-[clamp(64px,8vw,104px)] min-[760px]:pr-[clamp(300px,34vw,440px)]">
        <div className="grid gap-2">
          <h2 className="font-display text-[clamp(2.1rem,3.8vw,3.2rem)] leading-[1.02] font-[720] tracking-[-0.03em] text-balance">
            {GREETINGS[getPartOfDay(clock.hour)]}, {firstName}!
          </h2>
          <p className="text-[1.02rem] text-on-navy-2">{organizationName} · Lecturer</p>
        </div>

        <p className="font-display text-[clamp(1.2rem,1.8vw,1.5rem)] leading-snug font-[650] tracking-[-0.015em] text-kraft">{TAGLINE}</p>

        <ul aria-label="Today" className="flex flex-wrap gap-2">
          {status ? <StatusItem status={status} /> : null}
          <TodayItem icon={Clock} text={NO_CLASSES_TEXT} />
        </ul>

        <Link
          to="/dashboard/academic-periods"
          className="group mt-1 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-white px-5 font-semibold text-navy no-underline shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)] transition-[background-color,transform] duration-200 ease-out hover:bg-green-wash active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green max-[480px]:w-full max-[480px]:justify-center"
        >
          Open the calendar
          <ArrowRight className="transition-transform duration-200 ease-out group-hover:translate-x-0.5" size={17} strokeWidth={2} aria-hidden="true" />
        </Link>
      </div>

      <img
        className="pointer-events-none absolute right-[clamp(16px,5vw,80px)] bottom-0 z-10 h-[calc(100%-12px)] max-h-[400px] w-auto select-none max-[1024px]:max-h-[320px] max-[760px]:hidden"
        src={illustration}
        alt=""
        width={685}
        height={1001}
        draggable={false}
      />

      {/* The band ends on a soft arc, the same sweep as the logo, and the page continues in white below it */}
      <svg
        className="pointer-events-none absolute bottom-0 left-0 h-[clamp(28px,4.6vw,60px)] w-full fill-white"
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M0 60 L0 34 C360 4 900 -4 1440 30 L1440 60 Z" />
      </svg>
    </section>
  )
}

interface StatusItemProps {
  status: TodayStatus
}

function StatusItem({ status }: StatusItemProps) {
  const formatDay = useFormatDay()
  switch (status.kind) {
    case 'WEEKEND':
      return <TodayItem icon={CalendarDays} text="It’s the weekend, enjoy it!" />
    case 'HOLIDAY':
      return <TodayItem icon={CalendarDays} text={`Today is ${status.name}, enjoy your time off!`} />
    case 'TERM':
      return <TodayItem icon={CalendarDays} text={`${status.name}, week ${status.week}`} />
    case 'UPCOMING_TERM':
      return <TodayItem icon={CalendarDays} text={`${status.name} starts on ${formatDay(status.startDate)}`} />
    case 'NONE':
      return null
    default: {
      const unknown: never = status
      throw new Error(`Unknown today status: ${String(unknown)}`)
    }
  }
}

interface TodayItemProps {
  icon: LucideIcon
  text: string
}

function TodayItem({ icon: Icon, text }: TodayItemProps) {
  return (
    <li className="flex items-center gap-2 rounded-xl bg-white/[0.07] px-3 py-2 text-[0.95rem] text-on-navy ring-1 ring-white/10">
      <Icon className="flex-none text-green" size={16} strokeWidth={2} aria-hidden="true" />
      {text}
    </li>
  )
}
