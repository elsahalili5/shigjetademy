import { Mail } from 'lucide-react'
import { SITE } from '../lib/site'
import { SocialLinks } from './SocialLinks'

const card =
  'flex items-center gap-[18px] rounded-[20px] bg-white p-[clamp(22px,2.6vw,30px)] shadow-[inset_0_0_0_1px_var(--rule)]'
const value =
  'mt-1 inline-block font-display text-[clamp(1.15rem,1.8vw,1.4rem)] font-[650] tracking-[-0.02em] no-underline'

/** Ways to reach Shigjetademy besides the form: email and social profiles, from lib/site.ts. */
export function ContactChannels() {
  return (
    // The form follows closely, so the cards read as part of the same contact page
    <section
      className="shell mt-[clamp(40px,6vw,72px)] grid grid-cols-2 gap-4 max-[900px]:grid-cols-1 [&+section]:mt-[clamp(40px,6vw,72px)]"
      aria-label="Other ways to reach us"
    >
      <div className={card}>
        <span
          className="grid size-12 flex-none place-items-center rounded-[14px] bg-green-wash text-green-deep"
          aria-hidden="true"
        >
          <Mail size={20} strokeWidth={1.9} />
        </span>
        <div>
          <p className="text-[0.82rem] font-[650] text-ink-3">Email us</p>
          {SITE.email ? (
            <a className={`${value} text-ink hover:underline`} href={`mailto:${SITE.email}`}>
              {SITE.email}
            </a>
          ) : (
            <p className={`${value} text-ink-3`}>Our email address is coming soon</p>
          )}
          <p className="mt-1 text-[0.86rem] text-ink-3">For questions, partnerships or anything else.</p>
        </div>
      </div>

      <div className={`${card} max-[900px]:flex-col max-[900px]:items-start`}>
        <div>
          <p className="text-[0.82rem] font-[650] text-ink-3">Follow us</p>
          <p className="mt-1 text-[0.86rem] text-ink-3">News and updates from the Shigjetademy team.</p>
        </div>
        <SocialLinks size="lg" className="ml-auto flex-none flex-nowrap max-[900px]:ml-0" />
      </div>
    </section>
  )
}
