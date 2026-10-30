import { useId, useState } from 'react'
import type { FormEvent, RefObject } from 'react'
import { X } from 'lucide-react'
import { PERMISSIONS } from '@shigjetademy/shared/auth'
import type { Permission } from '@shigjetademy/shared/auth'
import { AuthField } from '#/modules/auth/components/auth-field'
import { PermissionPicker } from './permission-picker'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type AdminAccessDialogMode =
  | { kind: 'invite' }
  | { kind: 'edit'; membershipId: string; firstName: string; lastName: string; email: string; permissions: Permission[] }

export type AdminAccessInput = {
  email: string
  firstName: string
  lastName: string
  permissions: Permission[]
}

interface AdminAccessDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  mode: AdminAccessDialogMode
  onSubmit: (input: AdminAccessInput) => void
}

/** Invite a School Admin, or edit an existing one's name and access; opened with dialogRef.current.showModal() */
export function AdminAccessDialog({ dialogRef, mode, onSubmit }: AdminAccessDialogProps) {
  const isEditing = mode.kind === 'edit'
  // A new key per mode remounts the form, so it starts from that mode's values
  const formKey = isEditing ? `edit-${mode.email}` : 'invite'

  const handleClose = () => dialogRef.current?.close()

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="admin-access-title"
      className="m-auto max-h-[min(92svh,820px)] w-[min(100%-32px,640px)] overflow-hidden rounded-panel bg-white p-0 text-ink shadow-card backdrop:bg-navy/50 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex max-h-[inherit] flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-rule px-6 pt-6 pb-4">
          <div>
            <h2 id="admin-access-title" className="text-[1.45rem] font-[680] tracking-[-0.02em]">
              {isEditing ? `Edit ${mode.firstName} ${mode.lastName}` : 'Invite a school admin'}
            </h2>
            <p className="mt-1 text-[0.95rem] text-ink-2">
              {isEditing ? `${mode.email} · changes apply the next time they open Shigjetademy.` : 'They get an email with a link to join. The link works for 7 days.'}
            </p>
          </div>
          <button type="button" className="grid size-10 flex-none place-items-center rounded-full text-ink-3 hover:bg-mist hover:text-ink" onClick={handleClose} aria-label="Close">
            <X size={20} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>
        <AdminAccessForm key={formKey} mode={mode} onSubmit={onSubmit} onCancel={handleClose} />
      </div>
    </dialog>
  )
}

interface AdminAccessFormProps {
  mode: AdminAccessDialogMode
  onSubmit: (input: AdminAccessInput) => void
  onCancel: () => void
}

function AdminAccessForm({ mode, onSubmit, onCancel }: AdminAccessFormProps) {
  const ids = { email: useId(), firstName: useId(), lastName: useId() }
  const isEditing = mode.kind === 'edit'
  const [email, setEmail] = useState(isEditing ? mode.email : '')
  const [firstName, setFirstName] = useState(isEditing ? mode.firstName : '')
  const [lastName, setLastName] = useState(isEditing ? mode.lastName : '')
  const [permissions, setPermissions] = useState<Permission[]>(isEditing ? mode.permissions : [...PERMISSIONS])
  const [errors, setErrors] = useState<{ email?: string; firstName?: string; lastName?: string; permissions?: string }>({})

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // The invite form asks for the email; editing asks for the name
    const found = {
      email: isEditing || EMAIL_PATTERN.test(email.trim()) ? undefined : 'Enter an email address like name@school.org.',
      firstName: !isEditing || firstName.trim() ? undefined : 'Enter their first name.',
      lastName: !isEditing || lastName.trim() ? undefined : 'Enter their last name.',
      permissions: permissions.length > 0 ? undefined : 'Choose at least one thing they can manage.',
    }
    setErrors(found)
    if (Object.values(found).some(Boolean)) return
    onSubmit({ email: email.trim().toLowerCase(), firstName: firstName.trim(), lastName: lastName.trim(), permissions })
    onCancel()
  }

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
      <div className="grid gap-6 overflow-y-auto px-6 py-5">
        {isEditing ? (
          <div className="grid grid-cols-2 gap-3 max-[560px]:grid-cols-1">
            <AuthField
              id={ids.firstName}
              label="First name"
              autoComplete="off"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              error={errors.firstName}
            />
            <AuthField
              id={ids.lastName}
              label="Last name"
              autoComplete="off"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              error={errors.lastName}
            />
          </div>
        ) : (
          <AuthField
            id={ids.email}
            label="Email"
            type="email"
            autoComplete="off"
            inputMode="email"
            placeholder="admin@school.org"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={errors.email}
          />
        )}
        <PermissionPicker value={permissions} onChange={setPermissions} error={errors.permissions} />
      </div>

      <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
        <span className="mr-auto text-[0.93rem] text-ink-3">
          {permissions.length} of {PERMISSIONS.length} selected
        </span>
        <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="button button--primary min-h-11 px-5 text-base">
          {isEditing ? 'Save changes' : 'Send invitation'}
        </button>
      </footer>
    </form>
  )
}
