import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import wordmark from '#/assets/brand/shigjetademy-wordmark.png'
import { Arcs } from '#/components/Arcs'

interface AuthShellProps {
  children: ReactNode
}

/** The sign-in frame: the page's content on the left, a quiet navy brand panel on the right */
export function AuthShell({ children }: AuthShellProps) {
  return (
    // Locked to one screen on desktop; phones keep scrolling so the form is never cut off
    <div className="grid h-svh grid-cols-2 gap-(--frame) overflow-hidden bg-haze p-(--frame) max-[900px]:h-auto max-[900px]:min-h-svh max-[900px]:grid-cols-1 max-[900px]:overflow-visible">
      {/* Equal outer rows keep the form at the vertical middle, not pushed by the logo */}
      <main className="grid min-h-0 grid-rows-[1fr_auto_1fr] gap-6 overflow-y-auto px-[clamp(20px,5vw,72px)] py-[clamp(20px,3vw,36px)]">
        <Link className="flex items-center self-start justify-self-start no-underline" to="/" aria-label="Shigjetademy home">
          <img src={wordmark} alt="Shigjetademy" width={152} height={38} />
        </Link>

        <div className="mx-auto w-[min(100%,440px)] self-center [&_h1]:text-[clamp(2rem,3.4vw,2.8rem)] [&_h1]:font-bold [&_h1]:tracking-[-0.034em]">
          {children}
        </div>

        <p className="self-end text-[0.953rem] text-ink-3 [&_a]:no-underline">
          <Link to="/">← Back to the website</Link>
        </p>
      </main>

      {/* Quiet brand panel: the logo's arcs and one line, nothing to read past */}
      <aside
        className="relative isolate flex items-end overflow-hidden rounded-panel bg-navy bg-[radial-gradient(70%_60%_at_100%_100%,rgba(31,176,139,0.2),transparent_70%)] p-[clamp(32px,5vw,64px)] max-[900px]:hidden"
        aria-hidden="true"
      >
        <Arcs className="-top-[30%] -left-[10%] -z-10 w-[140%]" />
        <p className="max-w-[10ch] font-display text-[clamp(2.2rem,4vw,3.6rem)] leading-none font-bold tracking-[-0.036em] text-white [&_em]:text-kraft [&_em]:not-italic">
          Every class, <em>one place.</em>
        </p>
      </aside>
    </div>
  )
}
