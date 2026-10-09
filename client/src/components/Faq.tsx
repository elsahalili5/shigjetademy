import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Plus } from 'lucide-react'
import { Link } from '../lib/router'

const FAQS = [
  {
    q: 'Who is Shigjetademy for?',
    a: 'Schools, academies, training centres and independent educators. Anyone who runs classes, keeps track of students and collects fees can run their term on it.',
  },
  {
    q: 'What can I manage with it?',
    a: 'Students and enrolment, timetables and attendance, tuition and invoices, and grades, progress reports and messages. They all share the same student records.',
  },
  {
    q: 'Can teachers, students and parents use it too?',
    a: 'Yes. Directors and admins see the whole organization, teachers see their own classes, and students and parents see their own schedule, grades, reports and fees.',
  },
  {
    q: 'Does it work for a single teacher?',
    a: 'Yes. The same platform works for one educator’s classes and for a school with many classes and staff.',
  },
  {
    q: 'How do I get started?',
    a: 'Contact us. We’ll walk you through the platform with your own classes and way of working in mind.',
  },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    // A soft warm field sets the questions apart from the white sections around them
    <section
      className="section shell relative isolate grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-start gap-[clamp(28px,5vw,80px)] pb-[clamp(96px,13vw,160px)] before:absolute before:inset-y-0 before:-inset-x-[calc(50vw-50%)] before:-z-10 before:bg-[color-mix(in_srgb,var(--kraft-wash)_70%,var(--haze))] before:content-[''] max-[900px]:grid-cols-1"
      id="faq" aria-labelledby="faq-title">
      <div data-reveal>
        <h2 id="faq-title" className="text-[clamp(2rem,3.8vw,3.4rem)] font-[680] tracking-[-0.032em]">Questions, answered.</h2>
        <p className="mt-[18px] text-ink-2">
          Something else on your mind? <Link href="/contact" className="font-semibold text-green-deep">
            Contact us
          </Link> and ask us directly.
        </p>
      </div>
      <ul className="grid gap-2.5">
        {FAQS.map((f, n) => {
          const isOpen = open === n
          return (
            <li
              key={f.q}
              data-open={isOpen || undefined}
              data-reveal
              style={{ '--i': n } as CSSProperties}
              className="group rounded-[18px] bg-white transition-shadow duration-200 data-open:shadow-[0_18px_36px_-24px_rgba(22,34,46,0.35)]"
            >
              <h3 className="font-sans text-[1.08rem] font-[650] tracking-[-0.01em]">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${n}`}
                  id={`faq-q-${n}`}
                  onClick={() => setOpen(isOpen ? null : n)}
                  className="group/btn flex w-full items-center justify-between gap-4 px-6 py-[22px] text-left"
                >
                  {f.q}
                  <span
                    className="grid size-[34px] flex-none place-items-center rounded-full bg-haze text-ink transition-[rotate,background-color,color] duration-[250ms] ease-out group-hover/btn:bg-mist-deep group-data-open:rotate-45 group-data-open:bg-coral-deep group-data-open:text-white group-data-open:group-hover/btn:bg-[#9c3f2d]"
                    aria-hidden="true"
                  >
                    <Plus size={18} strokeWidth={2} />
                  </span>
                </button>
              </h3>
              <div
                className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-[280ms] ease-out group-data-open:grid-rows-[1fr]"
                id={`faq-${n}`} role="region" aria-labelledby={`faq-q-${n}`}>
                <div className="overflow-hidden">
                  <p className="max-w-[60ch] px-6 pb-6 text-ink-2 opacity-0 transition-opacity duration-200 group-data-open:opacity-100 group-data-open:delay-[60ms]">
                    {f.a}
                  </p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
