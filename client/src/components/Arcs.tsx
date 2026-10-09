import type { CSSProperties } from 'react'
import './Arcs.css'

// The new logo's graduation cap, drawn large as strokes: the board, the cap beneath it,
// and the tassel. Keeps the arcs__line classes so each panel's colours and draw-in still apply.
type Props = { className?: string }

const d = (n: number) => ({ '--d': n }) as CSSProperties

export function Arcs({ className }: Props) {
  return (
    <svg className={`arcs ${className ?? ''}`} viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
      {/* Mortarboard: a flat diamond */}
      <path className="arcs__line" style={d(0)} d="M 500 200 L 900 380 L 500 560 L 100 380 Z" pathLength={1} />
      {/* The cap under the board */}
      <path
        className="arcs__line arcs__line--green"
        style={d(1)}
        d="M 270 480 L 270 650 Q 500 760 730 650 L 730 480"
        pathLength={1}
      />
      {/* Tassel cord and its knot */}
      <path className="arcs__line arcs__line--green" style={d(2)} d="M 900 380 L 900 640" pathLength={1} />
      <circle className="arcs__line arcs__line--knot" style={d(3)} cx="900" cy="690" r="34" pathLength={1} />
    </svg>
  )
}
