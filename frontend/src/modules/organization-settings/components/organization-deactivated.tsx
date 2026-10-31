import { Link } from '@tanstack/react-router'
import { PowerOff } from 'lucide-react'

interface OrganizationDeactivatedProps {
  organizationName: string
  /** The owner deactivated it and can reactivate it from Organization settings */
  isOwner: boolean
}

/** Shown to a deactivated organization's members in place of the modules */
export function OrganizationDeactivated({ organizationName, isOwner }: OrganizationDeactivatedProps) {
  return (
    <div className="grid h-full place-items-center bg-linear-to-b from-mist to-white to-40% p-8 text-center">
      <div className="grid max-w-[42ch] justify-items-center gap-4" role="status">
        <span className="grid size-16 place-items-center rounded-[18px] bg-white text-ink-2 shadow-card" aria-hidden="true">
          <PowerOff size={28} strokeWidth={1.6} />
        </span>
        <h1 className="font-display text-[1.9rem] leading-tight font-[680] tracking-[-0.03em]">This organization is deactivated</h1>
        {isOwner ? (
          <>
            <p className="text-ink-2">You deactivated {organizationName}, so nobody in it can use Shigjetademy. Its data is safe, and you can reactivate it at any time.</p>
            <Link to="/dashboard/organization-settings" className="button button--primary min-h-11 px-5 text-base no-underline">
              Open organization settings
            </Link>
          </>
        ) : (
          <p className="text-ink-2">{organizationName} can’t use Shigjetademy right now. Your data is safe and comes back as soon as the owner reactivates the organization.</p>
        )}
      </div>
    </div>
  )
}
