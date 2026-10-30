import type { CSSProperties } from 'react'
import { ArrowRight } from 'lucide-react'
import { Arcs } from './Arcs'
import { BuiltFor } from './BuiltFor'
import classPhoto from '#/assets/photos/academy.jpg'
import { Link } from '@tanstack/react-router'

const i = (n: number) => ({ '--i': n }) as CSSProperties

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
          alt="A lecturer leans in to help a student with a tablet while classmates work on a laptop and in a notebook"
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
          <p className="rise mt-[26px] max-w-[44ch] text-[1.234rem] text-on-navy-2" style={i(1)}>
            Shigjetademy gives your team one place to manage students, classes, attendance, assessments and more.
          </p>
          <div className="rise mt-8 flex flex-wrap gap-2.5" style={i(2)}>
            <Link
              className="button bg-green text-navy hover:bg-[#2bc49c]"
              to="/contact"
            >
              Get started
              <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
        </div>

        {/* On phones the photo sits above the copy: this keeps its space */}
        <div className="hidden max-[900px]:-order-1 max-[900px]:block max-[900px]:min-h-[380px]" aria-hidden="true" />
      </div>

      <div className="shell">
        <BuiltFor />
      </div>
    </section>
  )
}
