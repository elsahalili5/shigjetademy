import type { CSSProperties } from 'react'
import { ArrowRight, Building2, ClipboardCheck, GraduationCap, Presentation, School, UserRound, Wallet } from 'lucide-react'
import { Arcs } from './Arcs'
import { ProductFrame } from './ProductFrame'
import './Hero.css'

const i = (n: number) => ({ '--i': n }) as CSSProperties

const NOTES = [
  {
    icon: ClipboardCheck,
    title: 'Register saved',
    body: 'Grade 9 Mathematics · 24 of 26 present',
  },
  {
    icon: Wallet,
    title: 'Payment received · €60',
    body: 'Dea Morina · INV-0412',
  },
]

const BUILT_FOR = [
  { icon: School, label: 'Schools' },
  { icon: Building2, label: 'Academies' },
  { icon: Presentation, label: 'Training centres' },
  { icon: UserRound, label: 'Independent educators' },
]

export function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="container hero__intro">
        <h1 id="hero-title" className="rise" style={i(0)}>
          Run every class, from first enrolment to final report.
        </h1>
        <div className="hero__aside">
          <p className="rise" style={i(1)}>
            Shigjetademy is the education-management platform for schools, academies, training centres and
            educators. Students, timetables, attendance, fees, grades and messages, in one place.
          </p>
          <div className="hero__actions rise" style={i(2)}>
            <a className="button button--primary" href="#demo">
              Book a demo
              <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
            </a>
            <a className="button button--ghost" href="#platform">
              See the platform
            </a>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="stage rise" style={i(3)}>
          <Arcs className="stage__arcs" />
          <div className="stage__frame">
            <ProductFrame compact />
          </div>
          <ol className="notes" aria-label="Example notifications">
            {NOTES.map(({ icon: Icon, title, body }, n) => (
              <li key={title} style={i(n)}>
                <span className="notes__icon">
                  <Icon size={16} strokeWidth={2} aria-hidden="true" />
                </span>
                <span>
                  <strong>{title}</strong>
                  <span>{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="built-for">
          <p>Built for</p>
          <ul>
            {BUILT_FOR.map(({ icon: Icon, label }) => (
              <li key={label}>
                <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
          <p className="built-for__note">
            <GraduationCap size={16} strokeWidth={1.75} aria-hidden="true" />
            Product data shown is illustrative.
          </p>
        </div>
      </div>
    </section>
  )
}
