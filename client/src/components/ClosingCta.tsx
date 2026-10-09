import { ArrowRight } from 'lucide-react'
import { Arcs } from './Arcs'
import { Link } from '../lib/router'
import './ClosingCta.css'

/** The page's last word: one motivating line, one action. */
export function ClosingCta() {
  return (
    <section className="cta" aria-labelledby="cta-title">
      <Arcs className="cta__arcs" />
      <div className="container cta__inner" data-reveal>
        <h2 id="cta-title">
          Less paperwork.
          <br />
          More <em>teaching.</em>
        </h2>
        <p>
          Your students, classes, attendance, grades and fees, finally in one place. Set up your organization and run
          your next term in Shigjetademy.
        </p>
        <p className="cta__nudge">So, what are you waiting for?</p>
        <Link className="button cta__primary" href="/contact">
          Get started now
          <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
