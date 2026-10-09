import type { CSSProperties } from 'react'
import { ArrowRight, BookOpen, Check, GraduationCap, Wallet } from 'lucide-react'
import { Arcs } from './Arcs'
import { BuiltFor } from './BuiltFor'
import { RegisterCard } from './RegisterCard'
import classPhoto from '../assets/photos/class.jpg'
import teacherPhoto from '../assets/photos/teacher.jpg'
import { Link } from '../lib/router'

const i = (n: number) => ({ '--i': n }) as CSSProperties

// Cards sit along the photo's edges, clear of the faces, and float in one after another
const float = 'absolute z-[3] motion-safe:animate-card-in motion-safe:[animation-delay:calc(var(--i)*140ms+750ms)]'
const badge =
  'absolute z-[2] grid size-12 place-items-center rounded-[14px] shadow-[0_1px_2px_rgba(0,0,0,0.15),0_14px_28px_-12px_rgba(0,0,0,0.5)] motion-safe:animate-card-in motion-safe:[animation-delay:calc(var(--i)*140ms+1300ms)]'
const toast = 'hero-card flex items-center gap-3 px-3.5 py-3'

export function Hero() {
  return (
    // Full-bleed hero: a navy field with the classroom photo bleeding off the right edge
    <section
      className="relative isolate mx-(--frame) mt-(--frame) overflow-hidden rounded-panel bg-navy text-on-navy [--arc-green:rgba(34,168,135,0.22)]"
      id="top"
      aria-labelledby="hero-title"
    >
      {/* The fade: solid navy where the copy sits, clearing towards the people */}
      <figure className="absolute top-0 right-0 bottom-0 -z-20 m-0 w-[max(58%,calc(50%+160px))] bg-navy-2 after:absolute after:inset-0 after:bg-[linear-gradient(90deg,var(--navy)_0%,rgba(20,42,61,0.86)_16%,rgba(20,42,61,0.38)_42%,rgba(20,42,61,0.06)_72%),linear-gradient(0deg,var(--navy)_0%,rgba(20,42,61,0.55)_16%,rgba(20,42,61,0)_38%),linear-gradient(180deg,rgba(20,42,61,0.35)_0%,rgba(20,42,61,0)_18%)] after:content-[''] motion-safe:animate-media-in max-[900px]:bottom-auto max-[900px]:left-0 max-[900px]:h-[460px] max-[900px]:w-full max-[900px]:after:bg-[linear-gradient(0deg,var(--navy)_0%,rgba(20,42,61,0.6)_24%,rgba(20,42,61,0)_55%),linear-gradient(180deg,rgba(20,42,61,0.3)_0%,rgba(20,42,61,0)_20%)]">
        <img
          className="size-full object-cover object-[50%_30%] motion-safe:animate-media-settle"
          src={classPhoto}
          alt="A teacher helps two secondary students work through a lesson on a laptop"
          width={928}
          height={1152}
          fetchPriority="high"
        />
      </figure>
      <Arcs className="-bottom-[440px] -left-[420px] -z-10 w-[820px] max-[900px]:hidden" />

      {/* Padding clears the nav, which sits on the panel itself */}
      <div className="shell grid min-h-[clamp(600px,calc(100svh-160px),760px)] grid-cols-2 items-stretch gap-[clamp(24px,4vw,56px)] pt-[calc(var(--nav-h)+clamp(40px,7vh,88px))] max-[900px]:min-h-0 max-[900px]:grid-cols-1 max-[900px]:gap-2 max-[900px]:pt-[calc(var(--nav-h)+12px)]">
        <div className="self-center">
          <h1
            id="hero-title"
            className="rise text-[clamp(2.5rem,4.6vw,4.3rem)] leading-[1.02] font-bold tracking-[-0.036em] text-white max-[900px]:max-w-[14ch]"
            style={i(0)}
          >
            From enrolment to achievement,{' '}
            <span className="relative inline-block whitespace-nowrap text-green">
              all connected.
              <svg
                className="absolute -bottom-[0.16em] -left-[2%] h-[0.26em] w-[104%] overflow-visible"
                viewBox="0 0 300 20"
                preserveAspectRatio="none"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  className="fill-none stroke-kraft stroke-5 [stroke-linecap:butt] [vector-effect:non-scaling-stroke] motion-safe:animate-mark-draw motion-safe:[stroke-dasharray:1] motion-safe:[stroke-dashoffset:1]"
                  d="M 3 15 Q 150 -3 297 12"
                  pathLength={1}
                />
              </svg>
            </span>
          </h1>
          <p className="rise mt-[26px] max-w-[44ch] text-[1.1rem] text-on-navy-2" style={i(1)}>
            Shigjetademy gives your team one place to manage students, classes, attendance, assessments and more.
          </p>
          <div className="rise mt-8 flex flex-wrap gap-2.5" style={i(2)}>
            <Link
              className="button bg-green text-navy shadow-[0_1px_2px_rgba(0,0,0,0.2),0_14px_28px_-12px_rgba(31,176,139,0.55)] hover:bg-[#2bc49c]"
              href="/contact"
            >
              Get started
              <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div
          className="relative min-h-[540px] max-[900px]:-order-1 max-[900px]:ml-auto max-[900px]:min-h-[380px] max-[900px]:w-[min(100%,560px)]"
          role="group"
          aria-label="Illustrative product data"
        >
          <span className={`${badge} top-0 left-[52%] bg-white text-coral-deep max-[900px]:hidden`} style={i(0)} aria-hidden="true">
            <BookOpen size={20} strokeWidth={1.8} />
          </span>
          <span
            className={`${badge} top-[46%] right-[4%] bg-kraft text-kraft-ink max-[1180px]:top-[4%] max-[900px]:top-auto max-[900px]:bottom-10`}
            style={i(1)}
            aria-hidden="true"
          >
            <GraduationCap size={20} strokeWidth={1.8} />
          </span>

          <div className={`${float} top-[6%] left-0 w-[270px] max-[900px]:top-auto max-[900px]:bottom-4 max-[900px]:w-[262px]`} style={i(0)}>
            <RegisterCard />
          </div>

          <div className={`${float} top-[24%] right-0 w-[248px] max-[1180px]:top-[44%] max-[900px]:top-0 max-[900px]:w-[236px]`} style={i(1)}>
            <div className={toast}>
              <span className="grid size-8 flex-none place-items-center rounded-[10px] bg-green-wash text-green-deep">
                <Wallet size={16} strokeWidth={2} aria-hidden="true" />
              </span>
              <span>
                <strong>Payment received · €60</strong>
                <span className="text-ink-3">Dea Morina · INV-0412</span>
              </span>
            </div>
          </div>

          <div className={`${float} bottom-[6%] left-[2%] w-[292px] max-[900px]:hidden`} style={i(2)}>
            <div className={toast}>
              <img className="size-10 flex-none rounded-full object-cover" src={teacherPhoto} alt="" width={40} height={40} />
              <span>
                <strong>Grades published</strong>
                <span className="text-ink-3">Physics 10B · 18 reports sent</span>
              </span>
              <span className="ml-auto grid size-[22px] flex-none place-items-center rounded-full bg-green text-white" aria-hidden="true">
                <Check size={13} strokeWidth={3} />
              </span>
            </div>
          </div>

          <div className={`${float} right-0 bottom-[18%] w-[230px] max-[1180px]:bottom-[22%] max-[900px]:hidden`} style={i(3)}>
            <div className="hero-card flex items-center gap-3.5 px-3.5 py-3">
              <span className="grid h-[50px] w-[46px] flex-none place-content-center place-items-center rounded-xl bg-navy text-[0.66rem] leading-[1.1] font-semibold text-on-navy-2">
                <span>Tue</span>
                <strong className="tabular font-display text-[1.3rem] font-bold text-white">14</strong>
              </span>
              <span>
                <span className="block text-[0.7rem] font-bold text-green-deep">Next session</span>
                <strong>IELTS Evening Prep</strong>
                <span className="tabular text-ink-3">18:30 · Room B2</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="shell">
        <BuiltFor />
      </div>
    </section>
  )
}
