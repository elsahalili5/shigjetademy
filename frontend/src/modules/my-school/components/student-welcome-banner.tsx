import illustration from '#/assets/illustrations/lecturer-welcome.png'
import { Arcs } from '#/components/Arcs'
import { useNow } from '#/modules/my-teaching/hooks/use-now'
import { getOrganizationClock } from '#/modules/my-teaching/utils/organization-clock'
import { getPartOfDay } from '#/modules/my-teaching/utils/part-of-day'
import type { PartOfDay } from '#/modules/my-teaching/utils/part-of-day'

const GREETINGS = {
  MORNING: 'Good morning',
  AFTERNOON: 'Good afternoon',
  EVENING: 'Good evening',
} as const satisfies Record<PartOfDay, string>

const TAGLINE = 'Learn today. Lead tomorrow.'

interface StudentWelcomeBannerProps {
  firstName: string
  organizationName: string
  /** The organization's time zone; the greeting follows it, not the device clock */
  timeZone: string
}

/** The head of My school: who and where, and the tagline */
export function StudentWelcomeBanner({ firstName, organizationName, timeZone }: StudentWelcomeBannerProps) {
  const now = useNow()
  const clock = getOrganizationClock({ now, timeZone })

  return (
    <section
      aria-label="Welcome"
      className="relative isolate overflow-hidden bg-navy bg-[radial-gradient(60%_90%_at_88%_0%,rgba(31,176,139,0.22),transparent_70%),radial-gradient(45%_70%_at_0%_100%,rgba(220,181,127,0.14),transparent_70%)] text-white [--arc-green:rgba(31,176,139,0.45)] [--arc-knot:rgba(220,181,127,0.5)] [--arc:rgba(255,255,255,0.06)]"
    >
      <Arcs className="-top-[18%] right-[-6%] -z-10 w-[min(640px,58vw)] max-[760px]:right-[-30%] max-[760px]:w-[420px]" />

      <div className="grid gap-5 px-[clamp(20px,3.4vw,44px)] pt-[clamp(32px,4.4vw,56px)] pb-[clamp(64px,8vw,104px)] min-[760px]:pr-[clamp(300px,34vw,440px)]">
        <div className="grid gap-2">
          <h2 className="font-display text-[clamp(2.1rem,3.8vw,3.2rem)] leading-[1.02] font-[720] tracking-[-0.03em] text-balance">{GREETINGS[getPartOfDay(clock.hour)]}, {firstName}!</h2>
          <p className="text-[1.02rem] text-on-navy-2">{organizationName} · Student</p>
        </div>

        <p className="font-display text-[clamp(1.2rem,1.8vw,1.5rem)] leading-snug font-[650] tracking-[-0.015em] text-kraft">{TAGLINE}</p>
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
