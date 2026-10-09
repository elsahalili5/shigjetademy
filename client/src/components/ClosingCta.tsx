import { ArrowRight } from 'lucide-react'
import { Arcs } from './Arcs'
import { Link } from '../lib/router'

/** The page's last word: one motivating line, one action. */
export function ClosingCta() {
  return (
    <section
      data-flush-end
      className="relative isolate mx-(--frame) mt-[clamp(96px,13vw,160px)] overflow-hidden rounded-panel bg-navy bg-[radial-gradient(50%_70%_at_50%_110%,rgba(31,176,139,0.28),transparent_70%),radial-gradient(40%_60%_at_0%_0%,rgba(220,181,127,0.14),transparent_70%)] text-center text-on-navy [--arc-green:rgba(34,168,135,0.28)]"
      aria-labelledby="cta-title"
    >
      <Arcs className="-right-[6%] -bottom-[22%] -z-10 w-[clamp(320px,38vw,560px)] -rotate-12" />
      <div className="shell grid justify-items-center py-[clamp(64px,8vw,112px)]" data-reveal>
        <h2
          id="cta-title"
          className="text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.95] font-bold tracking-[-0.04em] text-white"
        >
          Less paperwork.
          <br />
          More <em className="text-kraft not-italic">teaching.</em>
        </h2>
        <p className="mt-[22px] max-w-[46ch] text-[1.05rem] text-on-navy-2">
          Your students, classes, attendance, grades and fees, finally in one place. Set up your organization and run
          your next term in Shigjetademy.
        </p>
        <p className="mt-[clamp(22px,3vw,30px)] font-display text-[clamp(1.3rem,2.2vw,1.7rem)] font-[650] tracking-[-0.02em] text-white">
          So, what are you waiting for?
        </p>
        <Link
          className="button relative mt-[18px] min-h-[54px] bg-green px-7 text-[1.02rem] text-navy shadow-[0_1px_2px_rgba(0,0,0,0.2),0_18px_36px_-14px_rgba(31,176,139,0.65)] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-[0_0_0_0_rgba(31,176,139,0.55)] after:content-[''] hover:bg-[#2bc49c] motion-safe:[.motion_[data-inview]_&]:after:animate-cta-ring"
          href="/contact"
        >
          Get started now
          <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
