import { siFacebook, siInstagram, siLinkedin, siX, siYoutube } from 'simple-icons'
import { SITE } from '../lib/site'

const SOCIAL = [
  { key: 'facebook', label: 'Facebook', icon: siFacebook },
  { key: 'instagram', label: 'Instagram', icon: siInstagram },
  { key: 'linkedin', label: 'LinkedIn', icon: siLinkedin },
  { key: 'x', label: 'X', icon: siX },
  { key: 'youtube', label: 'YouTube', icon: siYoutube },
] as const

const SIZES = {
  md: 'gap-1.5 [--size:38px]',
  lg: 'gap-2 [--size:46px]',
}

const circle =
  'grid size-(--size) place-items-center rounded-full text-ink-2 shadow-[inset_0_0_0_1px_var(--rule-strong)] transition-[background-color,color,scale] duration-[180ms] ease-out [&_svg]:size-[calc(var(--size)*0.46)] [&_svg]:fill-current'

/** Social profile icons from lib/site.ts. Profiles without a URL stay visible but quiet, and are not links. */
export function SocialLinks({ size = 'md', className = '' }: { size?: 'md' | 'lg'; className?: string }) {
  return (
    <ul className={`flex flex-wrap ${SIZES[size]} ${className}`} aria-label="Shigjetademy on social media">
      {SOCIAL.map(({ key, label, icon }) => {
        const url = SITE.social[key]
        const svg = (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d={icon.path} />
          </svg>
        )
        return (
          <li key={key}>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className={`${circle} hover:bg-navy hover:text-white hover:shadow-none active:scale-[0.94]`}
              >
                {svg}
              </a>
            ) : (
              <span
                aria-label={`${label} (coming soon)`}
                title={`${label} · coming soon`}
                className={`${circle} cursor-default opacity-45`}
              >
                {svg}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
