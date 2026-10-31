import { useId, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import type { OrganizationMember } from '@shigjetademy/shared/organization'
import type { TransferOwnershipInput } from '@shigjetademy/shared/organization-settings'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { LoadError } from '#/components/LoadError'
import { SectionCard } from '#/components/SectionCard'
import { SelectField } from '#/components/SelectField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { fullName } from '#/lib/full-name'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useOrganizationMembers } from '#/modules/members/hooks/use-organization-members'
import { useTransferOwnership } from '../hooks/use-transfer-ownership'
import { useTransferOwnershipForm } from '../hooks/use-transfer-ownership-form'

interface TransferOwnershipSectionProps {
  organizationId: string
  organizationName: string
}

/** Hands the organization to one of its school admins; the owner stays on as a school admin who may do everything */
export function TransferOwnershipSection({ organizationId, organizationName }: TransferOwnershipSectionProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const members = useOrganizationMembers(organizationId)
  const [formKey, setFormKey] = useState(0)

  const handleOpen = () => {
    setFormKey((key) => key + 1)
    dialogRef.current?.showModal()
  }

  const handleClose = () => dialogRef.current?.close()

  const admins = members.data?.filter((member) => member.role === 'ADMIN') ?? []

  return (
    <SectionCard title="Transfer ownership">
      <div className="grid gap-4 px-5 py-5">
        <p className="text-ink-2">
          Make one of your school admins the owner of {organizationName}. You stay on as a school admin who can do everything, but you lose the owner’s pages,
          including these settings.
        </p>
        <TransferOwnershipAction status={members.status} adminCount={admins.length} onOpen={handleOpen} onRetry={() => void members.refetch()} />
      </div>
      <TransferOwnershipDialog
        formKey={formKey}
        dialogRef={dialogRef}
        organizationId={organizationId}
        organizationName={organizationName}
        admins={admins}
        onClose={handleClose}
      />
    </SectionCard>
  )
}

interface TransferOwnershipActionProps {
  status: 'pending' | 'error' | 'success'
  adminCount: number
  onOpen: () => void
  onRetry: () => void
}

function TransferOwnershipAction({ status, adminCount, onOpen, onRetry }: TransferOwnershipActionProps) {
  if (status === 'pending') return <span className="h-11 w-52 animate-pulse rounded-full bg-mist" aria-busy="true" aria-label="Loading" />
  if (status === 'error') return <LoadError what="school admins" onRetry={onRetry} />
  if (adminCount === 0) {
    return (
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-2">
        Ownership can only go to a school admin. Invite one first.
        <Link to="/dashboard/members" className="font-semibold text-green-deep hover:underline">
          Go to Members
        </Link>
      </p>
    )
  }
  return (
    <div>
      <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onOpen}>
        Transfer ownership…
      </button>
    </div>
  )
}

interface TransferOwnershipDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  /** Changes on every open, so the form starts empty again */
  formKey: number
  organizationId: string
  organizationName: string
  admins: OrganizationMember[]
  onClose: () => void
}

function TransferOwnershipDialog({ dialogRef, formKey, organizationId, organizationName, admins, onClose }: TransferOwnershipDialogProps) {
  return (
    <FormDialog dialogRef={dialogRef} title="Transfer ownership" subtitle={`The person you choose becomes the owner of ${organizationName}.`} onClose={onClose}>
      <TransferOwnershipForm key={formKey} organizationId={organizationId} admins={admins} onClose={onClose} />
    </FormDialog>
  )
}

interface TransferOwnershipFormProps {
  organizationId: string
  admins: OrganizationMember[]
  onClose: () => void
}

function TransferOwnershipForm({ organizationId, admins, onClose }: TransferOwnershipFormProps) {
  const navigate = useNavigate()
  const form = useTransferOwnershipForm()
  const transferOwnership = useTransferOwnership(organizationId)
  const ids = { member: useId(), password: useId() }
  const { errors } = form.formState
  const isPending = transferOwnership.isPending
  const fieldError = (fieldName: keyof TransferOwnershipInput) =>
    getFieldError<TransferOwnershipInput>({ fieldName, formErrors: errors, backendError: transferOwnership.error })

  // The dashboard home sends the new school admin to their own landing page
  const handleSubmit = form.handleSubmit((input: TransferOwnershipInput) => {
    transferOwnership.mutate({ organizationId, ...input }, { onSuccess: () => void navigate({ to: '/dashboard' }) })
  })

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
        <div className="grid gap-4 overflow-y-auto px-6 py-5">
          <SelectField id={ids.member} label="New owner" disabled={isPending} error={fieldError('membership_id')} {...form.register('membership_id')}>
            <option value="">Choose a school admin</option>
            {admins.map((admin) => (
              <option key={admin.membership_id} value={admin.membership_id}>
                {fullName(admin)} · {admin.email}
              </option>
            ))}
          </SelectField>
          <AuthField
            id={ids.password}
            label="Your password"
            type="password"
            autoComplete="current-password"
            disabled={isPending}
            error={fieldError('password')}
            {...form.register('password')}
          />
          {transferOwnership.isError ? <FormAlert>{getErrorMessage(transferOwnership.error)}</FormAlert> : null}
        </div>
        <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
          <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
            {isPending ? 'Transferring…' : 'Transfer ownership'}
          </button>
        </footer>
    </form>
  )
}
