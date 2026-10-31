import { Link, useNavigate } from '@tanstack/react-router'
import { INVITED_ROLE_PHRASES } from '@shigjetademy/shared/invitations'
import type { InvitationPreview } from '@shigjetademy/shared/invitations'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage } from '#/lib/error-message'
import { useFormatDate } from '#/lib/use-format-date'
import { SubmitButton } from '#/modules/auth/components/auth-form-parts'
import { useAuth } from '#/modules/auth/hooks/use-auth'
import { useAcceptInvitation } from '../hooks/use-accept-invitation'
import { useInvitation } from '../hooks/use-invitation'
import { InviteSignupForm } from './invite-signup-form'

/** Who is looking at the link: nobody logged in, the invited person, or someone else */
type InviteViewer = 'anonymous' | 'invited' | 'other'

interface InvitePageProps {
  token: string
}

/** The page an invite link opens: create an account or log in, then accept and land in the organization */
export function InvitePage({ token }: InvitePageProps) {
  const invitation = useInvitation(token)
  const auth = useAuth()
  const accept = useAcceptInvitation(token)
  const navigate = useNavigate()

  const handleAccept = () => {
    accept.mutate(undefined, { onSuccess: () => void navigate({ to: '/dashboard' }) })
  }

  const handleSwitchAccount = async () => {
    accept.reset()
    await auth.logout()
    // Logging out clears the cache, so read the invitation again for the signed-out view
    await invitation.refetch()
  }

  if (invitation.isPending) return <InviteSkeleton />
  if (invitation.isError) return <InvitationUnusable message={getErrorMessage(invitation.error)} />

  const preview = invitation.data
  const viewer: InviteViewer = !auth.user ? 'anonymous' : auth.user.email.toLowerCase() === preview.email.toLowerCase() ? 'invited' : 'other'

  return (
    <>
      <InviteSummary preview={preview} />
      <InviteStep
        viewer={viewer}
        token={token}
        preview={preview}
        signedInEmail={auth.user?.email ?? ''}
        accept={{ isPending: accept.isPending, error: accept.isError ? getErrorMessage(accept.error) : null }}
        onAccept={handleAccept}
        onSwitchAccount={handleSwitchAccount}
      />
    </>
  )
}

interface InviteSummaryProps {
  preview: InvitationPreview
}

function InviteSummary({ preview }: InviteSummaryProps) {
  const formatDate = useFormatDate()
  return (
    <>
      <p className="font-data text-[0.807rem] tracking-[0.06em] text-ink-3 uppercase">Invitation</p>
      <h1 className="mt-3">Join {preview.organization.name}</h1>
      <p className="mt-2.5 text-ink-2">
        {preview.invited_by.first_name} {preview.invited_by.last_name} invited you {INVITED_ROLE_PHRASES[preview.role]}. This invitation works until{' '}
        {formatDate(preview.expires_at)}.
      </p>
    </>
  )
}

interface InviteStepProps {
  viewer: InviteViewer
  token: string
  preview: InvitationPreview
  signedInEmail: string
  accept: { isPending: boolean; error: string | null }
  onAccept: () => void
  onSwitchAccount: () => Promise<void>
}

function InviteStep({ viewer, token, preview, signedInEmail, accept, onAccept, onSwitchAccount }: InviteStepProps) {
  switch (viewer) {
    case 'anonymous':
      return <InviteSignupForm token={token} email={preview.email} onRegistered={onAccept} />
    case 'invited':
      return (
        <form
          className="mt-8 grid gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            onAccept()
          }}
        >
          <p className="text-ink-2">
            You’re logged in as <strong className="text-ink">{signedInEmail}</strong>.
          </p>
          {accept.error ? <FormAlert>{accept.error}</FormAlert> : null}
          <SubmitButton isPending={accept.isPending} label="Accept invitation" pendingLabel="Joining…" />
        </form>
      )
    case 'other':
      return (
        <div className="mt-8 grid gap-4">
          <FormAlert>
            This invitation is for {preview.email}, but you’re logged in as {signedInEmail}. Switch account to accept it.
          </FormAlert>
          <button type="button" className="button min-h-[52px] w-full bg-navy text-white hover:bg-navy-2" onClick={() => void onSwitchAccount()}>
            Switch account
          </button>
        </div>
      )
    default: {
      const unknown: never = viewer
      throw new Error(`Unknown invite viewer: ${String(unknown)}`)
    }
  }
}

interface InvitationUnusableProps {
  message: string
}

function InvitationUnusable({ message }: InvitationUnusableProps) {
  return (
    <>
      <h1>This invitation can’t be used</h1>
      <p className="mt-2.5 text-ink-2">{message}</p>
      <p className="mt-6 text-ink-2">Ask the person who invited you to send a new link.</p>
      <Link to="/login" className="button mt-6 min-h-[52px] w-full bg-navy text-white no-underline hover:bg-navy-2">
        Go to log in
      </Link>
    </>
  )
}

function InviteSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading your invitation">
      <span className="h-3 w-24 animate-pulse rounded bg-mist" />
      <span className="h-10 w-72 max-w-full animate-pulse rounded bg-mist" />
      <span className="h-4 w-full animate-pulse rounded bg-mist" />
      <span className="mt-6 h-[50px] w-full animate-pulse rounded-xl bg-mist" />
      <span className="h-[50px] w-full animate-pulse rounded-xl bg-mist" />
      <span className="h-[52px] w-full animate-pulse rounded-xl bg-mist" />
    </div>
  )
}
