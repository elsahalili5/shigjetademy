import type { CSSProperties } from 'react'
import { ArrowRight, BookOpen, Check, GraduationCap, Wallet } from 'lucide-react'
import { Arcs } from './Arcs'
import { BuiltFor } from './BuiltFor'
import { RegisterCard } from './RegisterCard'
import classPhoto from '../assets/photos/class.jpg'
import teacherPhoto from '../assets/photos/teacher.jpg'
import { Link } from '../lib/router'
import './Hero.css'

const i = (n: number) => ({ '--i': n }) as CSSProperties


export function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <figure className="hero__media">
        <img
          src={classPhoto}
          alt="A teacher helps two secondary students work through a lesson on a laptop"
          width={928}
          height={1152}
          fetchPriority="high"
        />
      </figure>
      <Arcs className="hero__arcs" />

      <div className="container hero__grid">
        <div className="hero__copy">
          <h1 id="hero-title" className="rise" style={i(0)}>
            From enrolment to achievement,{' '}
            <span className="hero__mark">
              all connected.
              <svg viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path d="M 3 15 Q 150 -3 297 12" pathLength={1} />
              </svg>
            </span>
          </h1>
          <p className="hero__lede rise" style={i(1)}>
            Shigjetademy gives your team one place to manage students, classes, attendance, assessments and more.
          </p>
          <div className="hero__actions rise" style={i(2)}>
            <Link className="button hero__primary" href="/contact">
              Get started
              <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="scene" role="group" aria-label="Illustrative product data">
          <span className="scene__badge scene__badge--book" style={i(0)} aria-hidden="true">
            <BookOpen size={20} strokeWidth={1.8} />
          </span>
          <span className="scene__badge scene__badge--cap" style={i(1)} aria-hidden="true">
            <GraduationCap size={20} strokeWidth={1.8} />
          </span>

          <div className="float float--register" style={i(0)}>
            <RegisterCard />
          </div>

          <div className="float float--pay" style={i(1)}>
            <div className="card card--toast">
              <span className="card__icon card__icon--green">
                <Wallet size={16} strokeWidth={2} aria-hidden="true" />
              </span>
              <span>
                <strong>Payment received · €60</strong>
                <span>Dea Morina · INV-0412</span>
              </span>
            </div>
          </div>

          <div className="float float--teacher" style={i(2)}>
            <div className="card card--toast">
              <img className="card__face" src={teacherPhoto} alt="" width={40} height={40} />
              <span>
                <strong>Grades published</strong>
                <span>Physics 10B · 18 reports sent</span>
              </span>
              <span className="card__done" aria-hidden="true">
                <Check size={13} strokeWidth={3} />
              </span>
            </div>
          </div>

          <div className="float float--next" style={i(3)}>
            <div className="card card--next">
              <span className="card__date">
                <span>Tue</span>
                <strong className="tabular">14</strong>
              </span>
              <span>
                <span className="card__label">Next session</span>
                <strong>IELTS Evening Prep</strong>
                <span className="tabular">18:30 · Room B2</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <BuiltFor />
      </div>
    </section>
  )
}
