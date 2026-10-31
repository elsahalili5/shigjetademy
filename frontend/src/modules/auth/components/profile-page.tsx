import { UserRound } from 'lucide-react'
import type { AuthUser } from '@shigjetademy/shared/auth'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
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
      <DashboardPageHeader icon={UserRound} title="Your profile" subtitle="Your name, email and password" />

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
