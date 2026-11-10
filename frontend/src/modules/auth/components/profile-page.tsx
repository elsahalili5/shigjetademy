import { ArrowLeft } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { AuthUser } from '@shigjetademy/shared/auth'
import { OrganizationMark } from '#/modules/organization/components/organization-mark'
import { AvatarUploadControl } from './avatar-upload-control'
import { ChangePasswordForm } from './change-password-form'
import { ProfileDetailsForm } from './profile-details-form'
import { useActiveMembership } from '../hooks/use-active-membership'
import { isPlatformAdmin } from '../utils/session-user'
import { ROLE_LABELS } from '../utils/role-labels'

interface ProfilePageProps {
  user: AuthUser
}

/** The signed-in user's own account: their photo and identity, details, password and the organizations they belong to. */
export function ProfilePage({ user }: ProfilePageProps) {
  const membership = useActiveMembership()
  const roleLabel = membership ? ROLE_LABELS[membership.role] : isPlatformAdmin(user) ? 'Platform admin' : null
  const name = `${user.first_name} ${user.last_name}`

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <div className="px-[clamp(20px,3.4vw,44px)] pt-5">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-[0.95rem] font-semibold text-ink-2 no-underline hover:text-ink">
          <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
          Back
        </Link>
      </div>

      <div className="bg-linear-to-b from-green-wash to-white px-[clamp(20px,3.4vw,44px)] pt-6 pb-16" aria-hidden="true" />

      <div className="-mt-12 grid max-w-[760px] gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
        <section className="flex flex-wrap items-end gap-4" aria-labelledby="profile-name">
          <AvatarUploadControl user={user} />
          <div className="grid gap-1.5 pb-1">
            <h1 id="profile-name" className="font-display text-[clamp(1.7rem,2.6vw,2.3rem)] leading-[1.05] font-[680] tracking-[-0.03em]">{name}</h1>
            <p className="flex flex-wrap items-center gap-2 text-ink-2">
              {roleLabel ? <span className="chip chip--navy">{roleLabel}</span> : null}
              {membership ? <span className="font-semibold text-ink">{membership.organization.name}</span> : null}
              {membership ? <span aria-hidden="true">·</span> : null}
              {user.email}
            </p>
          </div>
        </section>

        <section className="rounded-card border border-rule p-[clamp(20px,2.4vw,28px)]">
          <h2 id="profile-details-title" className="mb-5 text-[1.2rem] font-[650]">
            Personal details
          </h2>
          <ProfileDetailsForm user={user} />
        </section>

        <section className="rounded-card border border-rule p-[clamp(20px,2.4vw,28px)]">
          <h2 id="change-password-title" className="mb-1 text-[1.2rem] font-[650]">
            Change password
          </h2>
          <p className="mb-5 text-[0.95rem] text-ink-3">Changing it logs you out on every other device.</p>
          <ChangePasswordForm />
        </section>

        {user.memberships.length > 0 ? (
          <section className="rounded-card border border-rule" aria-labelledby="memberships-title">
            <h2 id="memberships-title" className="px-5 pt-5 pb-3 text-[1.2rem] font-[650]">
              Your organizations
            </h2>
            <ul className="grid">
              {user.memberships.map((item) => (
                <li key={item.id} className="flex items-center gap-3 border-t border-rule px-5 py-3" aria-current={item.id === membership?.id ? 'true' : undefined}>
                  <OrganizationMark name={item.organization.name} />
                  <span className="min-w-0 flex-1 truncate font-semibold">{item.organization.name}</span>
                  {item.id === membership?.id ? <span className="chip chip--green">Current</span> : null}
                  <span className="chip chip--navy">{ROLE_LABELS[item.role]}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
