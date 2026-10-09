import type { CSSProperties, ReactNode } from 'react'
import { Arcs } from './Arcs'

const i = (n: number) => ({ '--i': n }) as CSSProperties

type Props = {
  id: string
  title: ReactNode
  intro: ReactNode
  children?: ReactNode
}

/** The navy opening band every inner page shares, echoing the homepage hero. */
export function PageHeader({ id, title, intro, children }: Props) {
  return (
    <header
      className="relative isolate mx-(--frame) mt-(--frame) overflow-hidden rounded-panel bg-navy bg-[radial-gradient(60%_90%_at_92%_0%,rgba(31,176,139,0.16),transparent_70%)] pt-[calc(var(--nav-h)+clamp(48px,8vw,104px))] pb-[clamp(64px,9vw,112px)] text-on-navy [--arc-green:rgba(34,168,135,0.28)]"
      aria-labelledby={id}
    >
      <Arcs className="-top-[300px] -right-[260px] -z-10 w-[760px]" />
      <div className="shell">
        <h1
          id={id}
          className="rise max-w-[16ch] text-[clamp(2.5rem,5.4vw,4.8rem)] leading-none font-bold tracking-[-0.036em] text-white [&_em]:text-kraft [&_em]:not-italic"
          style={i(0)}
        >
          {title}
        </h1>
        <p className="rise mt-6 max-w-[54ch] text-[1.12rem] text-on-navy-2" style={i(1)}>
          {intro}
        </p>
        {children && (
          <div className="rise mt-[clamp(32px,4vw,48px)]" style={i(2)}>
            {children}
          </div>
        )}
      </div>
    </header>
  )
}
