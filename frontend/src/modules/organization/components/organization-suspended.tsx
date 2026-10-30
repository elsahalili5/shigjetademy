import { PauseCircle } from 'lucide-react'
import { SITE } from '#/lib/site'

interface OrganizationSuspendedProps {
  organizationName: string
}

/** Shown to a suspended organization's members in place of the modules */
export function OrganizationSuspended({ organizationName }: OrganizationSuspendedProps) {
  return (
    <div className="grid h-full place-items-center bg-linear-to-b from-coral-wash to-white to-40% p-8 text-center">
      <div className="grid max-w-[42ch] justify-items-center gap-4" role="status">
        <span className="grid size-16 place-items-center rounded-[18px] bg-white text-coral-deep shadow-card" aria-hidden="true">
          <PauseCircle size={28} strokeWidth={1.6} />
        </span>
        <h1 className="font-display text-[1.9rem] leading-tight font-[680] tracking-[-0.03em]">This organization is suspended</h1>
        <p className="text-ink-2">
          {organizationName} can’t use Shigjetademy right now. Your data is safe and comes back as soon as the organization is reactivated.
        </p>
        <p className="text-ink-2">
          Questions? Write to{' '}
          <a className="font-semibold text-green-deep" href={`mailto:${SITE.email}`}>
            {SITE.email}
          </a>
          .
        </p>
      </div>
    </div>
  )
}
