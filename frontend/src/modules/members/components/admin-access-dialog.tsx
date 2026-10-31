import { useId } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Controller } from 'react-hook-form'
import { X } from 'lucide-react'
import { PERMISSIONS } from '@shigjetademy/shared/auth'
import type { Permission } from '@shigjetademy/shared/auth'
import type { InviteMemberInput, OrganizationMember, UpdateMemberInput } from '@shigjetademy/shared/organization'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { AuthField } from '#/modules/auth/components/auth-field'
import { useAdminAccessForm } from '../hooks/use-admin-access-form'
import { useInviteAdminForm } from '../hooks/use-invite-admin-form'
import { useUpdateMember } from '../hooks/use-update-member'
import { PermissionPicker } from './permission-picker'

export type AdminAccessDialogMode = { kind: 'invite' } | { kind: 'edit'; member: OrganizationMember }

interface AdminAccessDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  mode: AdminAccessDialogMode
  /** Changes on every open, so the form remounts from the mode's values and a cancelled edit is gone */
  formKey: number
  organizationId: string
  onInvite: (input: InviteMemberInput) => void
  onSaved: (member: OrganizationMember) => void
}

/** Invite a School Admin, or edit an existing one's access; opened with dialogRef.current.showModal() */
export function AdminAccessDialog({ dialogRef, mode, formKey, organizationId, onInvite, onSaved }: AdminAccessDialogProps) {
  const handleClose = () => dialogRef.current?.close()

  const handleInvite = (input: InviteMemberInput) => {
    onInvite(input)
    handleClose()
  }

  const handleSaved = (member: OrganizationMember) => {
    onSaved(member)
    handleClose()
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="admin-access-title"
      className="m-auto max-h-[min(92svh,820px)] w-[min(100%-32px,640px)] overflow-hidden rounded-panel bg-white p-0 text-ink shadow-card backdrop:bg-navy/50 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex max-h-[inherit] flex-col">
        <AdminAccessDialogBody
          key={formKey}
          mode={mode}
          organizationId={organizationId}
          onInvite={handleInvite}
          onSaved={handleSaved}
          onCancel={handleClose}
        />
      </div>
    </dialog>
  )
}

interface AdminAccessDialogBodyProps {
  mode: AdminAccessDialogMode
  organizationId: string
  onInvite: (input: InviteMemberInput) => void
  onSaved: (member: OrganizationMember) => void
  onCancel: () => void
}

function AdminAccessDialogBody({ mode, organizationId, onInvite, onSaved, onCancel }: AdminAccessDialogBodyProps) {
  switch (mode.kind) {
    case 'invite':
      return (
        <>
          <DialogHeader title="Invite a school admin" onClose={onCancel}>
            Sending invitations isn’t connected yet, so nothing is sent from here. You can check the details now.
          </DialogHeader>
          <InviteAdminForm onInvite={onInvite} onCancel={onCancel} />
        </>
      )
    case 'edit':
      return (
        <>
          <DialogHeader title={`Edit ${mode.member.first_name} ${mode.member.last_name}’s access`} onClose={onCancel}>
            {mode.member.email} · changes apply the next time they open Shigjetademy.
          </DialogHeader>
          <AdminAccessForm member={mode.member} organizationId={organizationId} onSaved={onSaved} onCancel={onCancel} />
        </>
      )
    default: {
      const unhandled: never = mode
      throw new Error(`Unhandled dialog mode: ${String(unhandled)}`)
    }
  }
}

interface DialogHeaderProps {
  title: string
  onClose: () => void
  children: ReactNode
}

function DialogHeader({ title, onClose, children }: DialogHeaderProps) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-rule px-6 pt-6 pb-4">
      <div>
        <h2 id="admin-access-title" className="text-[1.45rem] font-[680] tracking-[-0.02em]">
          {title}
        </h2>
        <p className="mt-1 text-[0.95rem] text-ink-2">{children}</p>
      </div>
      <button type="button" className="grid size-10 flex-none place-items-center rounded-full text-ink-3 hover:bg-mist hover:text-ink" onClick={onClose} aria-label="Close">
        <X size={20} strokeWidth={2} aria-hidden="true" />
      </button>
    </header>
  )
}

interface InviteAdminFormProps {
  onInvite: (input: InviteMemberInput) => void
  onCancel: () => void
}

function InviteAdminForm({ onInvite, onCancel }: InviteAdminFormProps) {
  const inviteForm = useInviteAdminForm()
  const emailId = useId()
  const { errors } = inviteForm.formState

  const handleSubmit = inviteForm.handleSubmit(onInvite)

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-6 overflow-y-auto px-6 py-5">
        <AuthField
          id={emailId}
          label="Email"
          type="email"
          autoComplete="off"
          inputMode="email"
          placeholder="admin@school.org"
          error={errors.email?.message}
          {...inviteForm.register('email')}
        />
        <Controller
          control={inviteForm.control}
          name="permissions"
          render={({ field }) => <PermissionPicker value={field.value} onChange={field.onChange} error={errors.permissions?.message} />}
        />
      </div>
      <DialogFooter permissions={inviteForm.watch('permissions')} submitLabel="Check details" onCancel={onCancel} />
    </form>
  )
}

interface AdminAccessFormProps {
  member: OrganizationMember
  organizationId: string
  onSaved: (member: OrganizationMember) => void
  onCancel: () => void
}

// The dialog stays open until the save succeeds; a failure shows here and keeps the owner's choices
function AdminAccessForm({ member, organizationId, onSaved, onCancel }: AdminAccessFormProps) {
  const accessForm = useAdminAccessForm(member.permissions)
  const updateMember = useUpdateMember(organizationId)
  const { errors } = accessForm.formState

  const handleSubmit = accessForm.handleSubmit(({ permissions }: UpdateMemberInput) => {
    updateMember.mutate({ organizationId, membershipId: member.membership_id, permissions }, { onSuccess: onSaved })
  })

  // A server error belongs to the choices that were sent; changing them clears it
  const handlePermissionsChange = (onChange: (permissions: Permission[]) => void) => (permissions: Permission[]) => {
    onChange(permissions)
    if (updateMember.isError) updateMember.reset()
  }

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-6 overflow-y-auto px-6 py-5">
        <Controller
          control={accessForm.control}
          name="permissions"
          render={({ field }) => (
            <PermissionPicker
              value={field.value}
              onChange={handlePermissionsChange(field.onChange)}
              error={getFieldError<UpdateMemberInput>({ fieldName: 'permissions', formErrors: errors, backendError: updateMember.error })}
            />
          )}
        />
        {updateMember.isError ? <FormAlert>{getErrorMessage(updateMember.error)}</FormAlert> : null}
      </div>
      <DialogFooter permissions={accessForm.watch('permissions')} submitLabel={updateMember.isPending ? 'Saving…' : 'Save changes'} isPending={updateMember.isPending} onCancel={onCancel} />
    </form>
  )
}

interface DialogFooterProps {
  permissions: Permission[]
  submitLabel: string
  isPending?: boolean
  onCancel: () => void
}

function DialogFooter({ permissions, submitLabel, isPending = false, onCancel }: DialogFooterProps) {
  return (
    <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
      <span className="mr-auto text-[0.93rem] text-ink-3">
        {permissions.length} of {PERMISSIONS.length} selected
      </span>
      <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
        Cancel
      </button>
      <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
        {submitLabel}
      </button>
    </footer>
  )
}
