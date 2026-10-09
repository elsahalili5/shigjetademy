import { Mail } from 'lucide-react'
import { SITE } from '../lib/site'
import { SocialLinks } from './SocialLinks'
import './ContactChannels.css'

/** Ways to reach Shigjetademy besides the form: email and social profiles, from lib/site.ts. */
export function ContactChannels() {
  return (
    <section className="container channels" aria-label="Other ways to reach us">
      <div className="channel">
        <span className="channel__icon" aria-hidden="true">
          <Mail size={20} strokeWidth={1.9} />
        </span>
        <div>
          <p className="channel__title">Email us</p>
          {SITE.email ? (
            <a className="channel__value" href={`mailto:${SITE.email}`}>
              {SITE.email}
            </a>
          ) : (
            <p className="channel__value channel__value--pending">Our email address is coming soon</p>
          )}
          <p className="channel__note">For questions, partnerships or anything else.</p>
        </div>
      </div>

      <div className="channel">
        <div>
          <p className="channel__title">Follow us</p>
          <p className="channel__note">News and updates from the Shigjetademy team.</p>
        </div>
        <SocialLinks size="lg" className="channel__social" />
      </div>
    </section>
  )
}
