import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Plus } from 'lucide-react'
import { Link } from '../lib/router'
import './Faq.css'

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
    a: 'Book a demo. We’ll walk you through the platform with your own classes and way of working in mind.',
  },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="section container faq" id="faq" aria-labelledby="faq-title">
      <div className="faq__head" data-reveal>
        <h2 id="faq-title">Questions, answered.</h2>
        <p>
          Something else on your mind? <Link href="/contact">Book a demo</Link> and ask us directly.
        </p>
      </div>
      <ul className="faq__list">
        {FAQS.map((f, n) => {
          const isOpen = open === n
          return (
            <li key={f.q} data-open={isOpen || undefined} data-reveal style={{ '--i': n } as CSSProperties}>
              <h3>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${n}`}
                  id={`faq-q-${n}`}
                  onClick={() => setOpen(isOpen ? null : n)}
                >
                  {f.q}
                  <span className="faq__icon" aria-hidden="true">
                    <Plus size={18} strokeWidth={2} />
                  </span>
                </button>
              </h3>
              <div className="faq__answer" id={`faq-${n}`} role="region" aria-labelledby={`faq-q-${n}`}>
                <div>
                  <p>{f.a}</p>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
