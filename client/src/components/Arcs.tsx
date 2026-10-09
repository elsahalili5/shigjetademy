import type { CSSProperties } from 'react'

// The new logo's graduation cap, drawn large as strokes: the board, the cap beneath it,
// and the tassel. Colours come from --arc / --arc-green / --arc-knot set by the parent panel.
type Props = { className?: string }

const d = (n: number) => ({ '--d': n }) as CSSProperties

const line =
  'fill-none stroke-[40] [stroke-linecap:round] [stroke-linejoin:round] motion-safe:[stroke-dasharray:1] motion-safe:[stroke-dashoffset:1] motion-safe:animate-draw motion-safe:[animation-delay:calc(var(--d)*120ms+200ms)]'

export function Arcs({ className = '' }: Props) {
  return (
    <svg
      className={`pointer-events-none absolute overflow-visible ${className}`}
      viewBox="0 0 1000 1000"
      aria-hidden="true"
      focusable="false"
    >
      {/* Mortarboard: a flat diamond */}
      <path
        className={`${line} stroke-[var(--arc,rgba(255,255,255,0.07))]`}
        style={d(0)}
        d="M 500 200 L 900 380 L 500 560 L 100 380 Z"
        pathLength={1}
      />
      {/* The cap under the board */}
      <path
        className={`${line} stroke-[var(--arc-green,rgba(34,168,135,0.5))]`}
        style={d(1)}
        d="M 270 480 L 270 650 Q 500 760 730 650 L 730 480"
        pathLength={1}
      />
      {/* Tassel cord and its knot */}
      <path
        className={`${line} stroke-[var(--arc-green,rgba(34,168,135,0.5))]`}
        style={d(2)}
        d="M 900 380 L 900 640"
        pathLength={1}
      />
      {/* The knot is solid: it fades in once the cord has drawn */}
      <circle
        className="fill-[var(--arc-knot,rgba(34,168,135,0.5))] stroke-none motion-safe:animate-knot-in motion-safe:[animation-delay:calc(var(--d)*120ms+900ms)]"
        style={d(3)}
        cx="900"
        cy="690"
        r="34"
      />
    </svg>
  )
}
