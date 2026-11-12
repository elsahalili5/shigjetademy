import { ArrowRight } from 'lucide-react'
import type { MyChild } from '@shigjetademy/shared/guardians'
import { Link } from '@tanstack/react-router'
import illustration from '#/assets/illustrations/lecturer-welcome.png'
import { Arcs } from '#/components/Arcs'
import { getParentsGreeting } from '../utils/get-parents-greeting'

const TAGLINE = 'Behind every confident child is a family that believes in them.'

interface GuardianWelcomeBannerProps {
  organizationName: string
  /** The guardian's children once loaded; until then the banner greets without names */
  linkedChildren?: MyChild[]
}

/** The head of My children: a welcome to the children's parents, the school, and the way to the teachers' notes */
export function GuardianWelcomeBanner({ organizationName, linkedChildren }: GuardianWelcomeBannerProps) {
  return (
    <section
      aria-label="Welcome"
      className="relative isolate overflow-hidden bg-navy bg-[radial-gradient(60%_90%_at_88%_0%,rgba(31,176,139,0.22),transparent_70%),radial-gradient(45%_70%_at_0%_100%,rgba(220,181,127,0.14),transparent_70%)] text-white [--arc-green:rgba(31,176,139,0.45)] [--arc-knot:rgba(220,181,127,0.5)] [--arc:rgba(255,255,255,0.06)]"
    >
      <Arcs className="-top-[18%] right-[-6%] -z-10 w-[min(640px,58vw)] max-[760px]:right-[-30%] max-[760px]:w-[420px]" />

      <div className="grid gap-5 px-[clamp(20px,3.4vw,44px)] pt-[clamp(32px,4.4vw,56px)] pb-[clamp(64px,8vw,104px)] min-[760px]:pr-[clamp(300px,34vw,440px)]">
        <div className="grid gap-2">
          <h2 className="font-display text-[clamp(2.1rem,3.8vw,3.2rem)] leading-[1.02] font-[720] tracking-[-0.03em] text-balance">{getParentsGreeting(linkedChildren)}</h2>
          <p className="text-[1.02rem] text-on-navy-2">{organizationName} · Parent</p>
        </div>

        <p className="font-display text-[clamp(1.2rem,1.8vw,1.5rem)] leading-snug font-[650] tracking-[-0.015em] text-kraft">{TAGLINE}</p>

        <Link
          to="/dashboard/my-notes"
          className="group mt-1 inline-flex min-h-11 w-fit items-center gap-2 rounded-full bg-white px-5 font-semibold text-navy no-underline shadow-[0_8px_24px_-12px_rgba(0,0,0,0.55)] transition-[background-color,transform] duration-200 ease-out hover:bg-green-wash active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green max-[480px]:w-full max-[480px]:justify-center"
        >
          Read your notes
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
