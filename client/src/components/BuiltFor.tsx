import type { CSSProperties } from 'react'
import { Building2, Presentation, School, UserRound } from 'lucide-react'

const i = (n: number) => ({ '--i': n }) as CSSProperties

// Each audience carries its own colour from the palette, so green is one voice among four
const BUILT_FOR = [
  { icon: School, label: 'Schools', tone: 'var(--green)' },
  { icon: Building2, label: 'Academies', tone: 'var(--kraft)' },
  { icon: Presentation, label: 'Training centres', tone: 'var(--coral)' },
  { icon: UserRound, label: 'Independent educators', tone: 'var(--on-navy-2)' },
]


/** The four organization types, as one divided strip on a navy field. */
export function BuiltFor({ labelId = 'built-for-label' }: { labelId?: string }) {
  return (
    // Near-solid navy so the names read the same over the photo as over the field
    <div
      className="mt-[clamp(32px,5vh,56px)] mb-[clamp(24px,4vh,40px)] grid grid-cols-[auto_minmax(0,1fr)] items-stretch overflow-hidden rounded-card bg-[rgba(29,56,80,0.86)] shadow-[inset_0_0_0_1px_rgba(231,238,243,0.12)] backdrop-blur-[14px] backdrop-saturate-[1.2] max-[1080px]:grid-cols-1"
    >
      <p
        className="flex items-center bg-white/[0.03] px-[clamp(20px,2.4vw,32px)] text-[0.8rem] font-semibold tracking-[0.01em] text-on-navy-2 shadow-[inset_-1px_0_0_rgba(231,238,243,0.12)] max-[1080px]:px-5 max-[1080px]:py-3 max-[1080px]:shadow-[inset_0_-1px_0_rgba(231,238,243,0.12)]"
        id={labelId}
      >
        Built for
      </p>
      <ul aria-labelledby={labelId} className="grid grid-cols-4 max-[640px]:grid-cols-2">
        {BUILT_FOR.map(({ icon: Icon, label, tone }, n) => (
          <li
            key={label}
            style={{ ...i(n), '--tone': tone } as CSSProperties}
            className="group flex min-w-0 items-center gap-3.5 px-[clamp(16px,2vw,28px)] py-5 font-display text-[clamp(1rem,1.25vw,1.15rem)] leading-[1.15] font-semibold tracking-[-0.015em] text-white motion-safe:animate-built-for-in motion-safe:[animation-delay:calc(var(--i)*90ms+1100ms)] [&+li]:shadow-[inset_1px_0_0_rgba(231,238,243,0.12)] max-[640px]:flex-col max-[640px]:items-start max-[640px]:gap-2.5 max-[640px]:p-4 max-[640px]:[&+li]:shadow-none max-[640px]:even:shadow-[inset_1px_0_0_rgba(231,238,243,0.12)] max-[640px]:nth-[n+3]:shadow-[inset_0_1px_0_rgba(231,238,243,0.12)] max-[640px]:nth-4:shadow-[inset_1px_0_0_rgba(231,238,243,0.12),inset_0_1px_0_rgba(231,238,243,0.12)]"
          >
            <span
              className="grid size-10 flex-none place-items-center rounded-xl bg-[color-mix(in_srgb,var(--tone)_20%,transparent)] text-(--tone) transition-[background-color,color,translate] duration-[220ms] ease-out group-hover:-translate-y-0.5 group-hover:bg-(--tone) group-hover:text-navy"
              aria-hidden="true"
            >
              <Icon size={18} strokeWidth={1.8} />
            </span>
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}
