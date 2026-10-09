import { siFacebook, siInstagram, siLinkedin, siX, siYoutube } from 'simple-icons'
import { SITE } from '../lib/site'
import './SocialLinks.css'

const SOCIAL = [
  { key: 'facebook', label: 'Facebook', icon: siFacebook },
  { key: 'instagram', label: 'Instagram', icon: siInstagram },
  { key: 'linkedin', label: 'LinkedIn', icon: siLinkedin },
  { key: 'x', label: 'X', icon: siX },
  { key: 'youtube', label: 'YouTube', icon: siYoutube },
] as const

/** Social profile icons from lib/site.ts. Profiles without a URL stay visible but quiet, and are not links. */
export function SocialLinks({ size = 'md', className = '' }: { size?: 'md' | 'lg'; className?: string }) {
  return (
    <ul className={`social social--${size} ${className}`} aria-label="Shigjetademy on social media">
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
              <a href={url} target="_blank" rel="noopener noreferrer" aria-label={label}>
                {svg}
              </a>
            ) : (
              <span aria-label={`${label} (coming soon)`} title={`${label} · coming soon`} data-pending>
                {svg}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
