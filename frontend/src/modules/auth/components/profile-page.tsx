import { UserRound } from 'lucide-react'
import type { AuthUser } from '@shigjetademy/shared/auth'
import { ChangePasswordForm } from './change-password-form'
import { ProfileDetailsForm } from './profile-details-form'
import { ROLE_LABELS } from '../utils/role-labels'

interface ProfilePageProps {
  user: AuthUser
}

/** The signed-in user's own account: details, password and the organizations they belong to. */
export function ProfilePage({ user }: ProfilePageProps) {
  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <header className="bg-linear-to-b from-green-wash to-white px-[clamp(20px,3.4vw,44px)] pt-[clamp(24px,3.4vw,40px)] pb-6">
        <div className="flex items-start gap-4">
          <span
            className="grid size-14 flex-none place-items-center rounded-2xl bg-white text-green-deep shadow-[0_1px_2px_rgba(22,34,46,0.06),0_10px_24px_-12px_rgba(22,34,46,0.3)]"
            aria-hidden="true"
          >
            <UserRound size={26} strokeWidth={1.7} />
          </span>
          <div>
            <h1 className="font-display text-[clamp(1.7rem,2.6vw,2.3rem)] leading-[1.05] font-[680] tracking-[-0.03em]">Your profile</h1>
            <p className="mt-1.5 text-ink-2">Your name, email and password</p>
          </div>
        </div>
      </header>

      <div className="grid max-w-[760px] gap-5 px-[clamp(20px,3.4vw,44px)] pb-10">
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
          <section className="rounded-card border border-rule p-[clamp(20px,2.4vw,28px)]" aria-labelledby="memberships-title">
            <h2 id="memberships-title" className="mb-4 text-[1.2rem] font-[650]">
              Your organizations
            </h2>
            <ul className="grid gap-2">
              {user.memberships.map((membership) => (
                <li key={membership.id} className="flex items-center justify-between gap-4 rounded-xl bg-mist px-4 py-3">
                  <span className="font-semibold">{membership.organization.name}</span>
                  <span className="chip chip--navy">{ROLE_LABELS[membership.role]}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  )
}
