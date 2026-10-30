import { useState } from 'react'
import { ArrowRight, Check, Clock, MailX } from 'lucide-react'
import { Link, useNavigate } from '@tanstack/react-router'
import type { Permission } from '@shigjetademy/shared/auth'
import { useAuth } from '#/modules/auth/hooks/use-auth'
import { PERMISSION_LABELS } from '../utils/permission-labels'

const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'long', year: 'numeric' })

// UI only for now: every link shows this sample invitation; "expired" shows the dead-link state
const SAMPLE_INVITATION = {
  organizationName: 'Oxford Academy',
  inviterName: 'Arben Krasniqi',
  email: 'teuta.morina@oxford.test',
  permissions: ['MANAGE_STUDENTS', 'MANAGE_LECTURERS', 'MANAGE_GUARDIANS', 'MANAGE_ATTENDANCE'] satisfies Permission[],
  expiresAt: '2026-11-04T09:00:00.000Z',
}

const EXPIRED_SAMPLE_TOKEN = 'expired'

interface InvitationCardProps {
  token: string
}

/** What someone sees when they open an invitation link */
export function InvitationCard({ token }: InvitationCardProps) {
  const [isAccepted, setIsAccepted] = useState(false)

  if (token === EXPIRED_SAMPLE_TOKEN) {
    return <InvitationUnavailable />
  }

  if (isAccepted) {
    return <InvitationAccepted organizationName={SAMPLE_INVITATION.organizationName} />
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="font-data text-[0.807rem] tracking-[0.06em] text-ink-3 uppercase">Invitation</p>
        <h1 className="mt-3">Join {SAMPLE_INVITATION.organizationName}</h1>
        <p className="mt-2.5 text-ink-2">
          {SAMPLE_INVITATION.inviterName} invited <strong className="text-ink">{SAMPLE_INVITATION.email}</strong> to help run{' '}
          {SAMPLE_INVITATION.organizationName} on Shigjetademy as a <strong className="text-ink">school admin</strong>.
        </p>
      </div>

      <section className="rounded-card border border-rule bg-white p-5" aria-labelledby="invite-access-title">
        <h2 id="invite-access-title" className="text-[1.05rem] font-[650]">
          You’ll be able to manage
        </h2>
        <ul className="mt-3 grid gap-2">
          {SAMPLE_INVITATION.permissions.map((permission) => (
            <li key={permission} className="flex items-center gap-2.5 text-ink-2">
              <Check className="flex-none text-green-deep" size={17} strokeWidth={2.4} aria-hidden="true" />
              {PERMISSION_LABELS[permission]}
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-center gap-2 text-[0.9rem] text-ink-3">
          <Clock size={15} strokeWidth={2} aria-hidden="true" />
          This invitation expires on {dateFormat.format(new Date(SAMPLE_INVITATION.expiresAt))}.
        </p>
      </section>

      <InvitationActions onAccept={() => setIsAccepted(true)} />
    </div>
  )
}

interface InvitationActionsProps {
  onAccept: () => void
}

/** Signed out: create an account or log in first. Signed in: accept, but only with the invited email. */
function InvitationActions({ onAccept }: InvitationActionsProps) {
  const auth = useAuth()

  if (auth.status === 'anonymous') {
    return (
      <div className="grid gap-2.5">
        <Link to="/signup" className="button button--primary min-h-[52px] w-full no-underline">
          Create an account to join
          <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
        </Link>
        <p className="text-center text-ink-2">
          Already have an account?{' '}
          <Link to="/login" className="font-[650] text-green-deep">
            Log in
          </Link>
        </p>
      </div>
    )
  }

  if (auth.user.email !== SAMPLE_INVITATION.email) {
    return (
      <div className="grid gap-3 rounded-xl bg-kraft-wash px-4 py-3.5 text-kraft-ink">
        <p>
          You’re logged in as <strong>{auth.user.email}</strong>. This invitation is for <strong>{SAMPLE_INVITATION.email}</strong>.
        </p>
        <button type="button" className="button button--ghost min-h-11 justify-self-start bg-white px-4 text-base" onClick={() => void auth.logout()}>
          Log out and switch account
        </button>
      </div>
    )
  }

  return (
    <button type="button" className="button button--primary min-h-[52px] w-full" onClick={onAccept}>
      Accept invitation
      <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
    </button>
  )
}

interface InvitationAcceptedProps {
  organizationName: string
}

function InvitationAccepted({ organizationName }: InvitationAcceptedProps) {
  const navigate = useNavigate()
  return (
    <div className="grid justify-items-start gap-4" role="status">
      <span className="grid size-14 place-items-center rounded-full bg-green-wash text-green-deep" aria-hidden="true">
        <Check size={26} strokeWidth={2.6} />
      </span>
      <h1>You’ve joined {organizationName}</h1>
      <p className="text-ink-2">You’re now a school admin. Your dashboard shows what you can manage.</p>
      <button type="button" className="button button--primary min-h-[52px] w-full" onClick={() => void navigate({ to: '/dashboard' })}>
        Go to the dashboard
        <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  )
}

function InvitationUnavailable() {
  return (
    <div className="grid justify-items-start gap-4">
      <span className="grid size-14 place-items-center rounded-full bg-coral-wash text-coral-deep" aria-hidden="true">
        <MailX size={26} strokeWidth={2} />
      </span>
      <h1>This invitation can’t be used</h1>
      <p className="text-ink-2">It has expired, was cancelled, or was already accepted. Ask the person who invited you to send a new one.</p>
      <Link to="/" className="font-[650] text-green-deep">
        Go to the Shigjetademy website
      </Link>
    </div>
  )
}
