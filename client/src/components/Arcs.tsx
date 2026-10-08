import type { CSSProperties } from 'react'
import './Arcs.css'

// The logo's geometry, drawn large: arc segments on shared centres, cut by one diagonal.
function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const rad = (d: number) => ((d - 90) * Math.PI) / 180
  const x1 = cx + r * Math.cos(rad(from))
  const y1 = cy + r * Math.sin(rad(from))
  const x2 = cx + r * Math.cos(rad(to))
  const y2 = cy + r * Math.sin(rad(to))
  const large = (to - from + 360) % 360 > 180 ? 1 : 0
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

type Props = { className?: string }

export function Arcs({ className }: Props) {
  const cx = 500
  const cy = 500
  return (
    <svg className={`arcs ${className ?? ''}`} viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
      <path className="arcs__line" style={{ '--d': 0 } as CSSProperties} d={arc(cx, cy, 460, -2, 104)} pathLength={1} />
      <path className="arcs__line" style={{ '--d': 1 } as CSSProperties} d={arc(cx, cy, 330, 248, 330)} pathLength={1} />
      <path
        className="arcs__line arcs__line--green"
        style={{ '--d': 2 } as CSSProperties}
        d={arc(cx, cy, 330, 196, 244)}
        pathLength={1}
      />
      <path
        className="arcs__line arcs__line--green"
        style={{ '--d': 3 } as CSSProperties}
        d={arc(cx, cy, 330, 22, 128)}
        pathLength={1}
      />
      <path className="arcs__line arcs__line--shaft" style={{ '--d': 4 } as CSSProperties} d="M 120 790 L 900 250" pathLength={1} />
    </svg>
  )
}
