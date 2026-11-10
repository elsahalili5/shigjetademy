import { useId, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import type { AuthUser } from '@shigjetademy/shared/auth'
import { FormAlert } from '#/components/FormAlert'
import { UserAvatar } from '#/components/UserAvatar'
import { getErrorMessage } from '#/lib/error-message'
import { useRemoveAvatar } from '../hooks/use-remove-avatar'
import { useUploadAvatar } from '../hooks/use-upload-avatar'
import { validateAvatarFile } from '../utils/validate-avatar-file'
import type { AvatarFileRejectionReason } from '../utils/validate-avatar-file'

const AVATAR_REJECTION_MESSAGES: Record<AvatarFileRejectionReason, string> = {
  mimeType: 'Upload a JPEG, PNG or WEBP image.',
  size: 'Images must be 2MB or smaller.',
}

const ACCEPTED_AVATAR_TYPES = 'image/jpeg,image/png,image/webp'

interface AvatarUploadControlProps {
  user: AuthUser
}

/** The profile photo: a square tile with the photo or initials, and overlay controls to add, change or remove it */
export function AvatarUploadControl({ user }: AvatarUploadControlProps) {
  const name = `${user.first_name} ${user.last_name}`
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const uploadAvatar = useUploadAvatar()
  const removeAvatar = useRemoveAvatar()
  const isBusy = uploadAvatar.isPending || removeAvatar.isPending
  const errorMessage = validationError ?? (uploadAvatar.isError ? getErrorMessage(uploadAvatar.error) : null) ?? (removeAvatar.isError ? getErrorMessage(removeAvatar.error) : null)

  const handleChoosePhoto = () => inputRef.current?.click()

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    setValidationError(null)
    uploadAvatar.reset()
    const result = validateAvatarFile(file)
    if (result.status === 'invalid') {
      setValidationError(AVATAR_REJECTION_MESSAGES[result.reason])
      return
    }
    uploadAvatar.mutate(file)
  }

  const handleRemove = () => {
    setValidationError(null)
    removeAvatar.mutate()
  }

  return (
    <div className="grid gap-2">
      <div className="relative size-24 flex-none">
        <UserAvatar
          name={name}
          avatarUrl={user.avatar_url}
          className="grid size-24 flex-none place-items-center rounded-2xl bg-green-wash font-display text-2xl font-bold text-green-deep"
        />
        <label htmlFor={inputId} className="sr-only">
          Profile photo file
        </label>
        <input ref={inputRef} id={inputId} type="file" accept={ACCEPTED_AVATAR_TYPES} className="sr-only" tabIndex={-1} onChange={handleFileChange} />
        <button
          type="button"
          onClick={handleChoosePhoto}
          disabled={isBusy}
          aria-label={user.avatar_url ? 'Change photo' : 'Add photo'}
          className="absolute -right-2 -bottom-2 grid size-9 place-items-center rounded-full border-2 border-white bg-navy text-white shadow-[0_2px_6px_rgba(22,34,46,0.3)] transition-transform duration-150 ease-out hover:scale-105 active:scale-90 disabled:cursor-progress disabled:opacity-60"
        >
          <Camera size={15} strokeWidth={2} aria-hidden="true" />
        </button>
        {user.avatar_url ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={isBusy}
            aria-label="Remove photo"
            className="absolute -top-2 -right-2 grid size-7 place-items-center rounded-full border-2 border-white bg-coral-deep text-white shadow-[0_2px_6px_rgba(22,34,46,0.3)] transition-transform duration-150 ease-out hover:scale-105 active:scale-90 disabled:cursor-progress disabled:opacity-60"
          >
            <Trash2 size={12} strokeWidth={2} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {isBusy ? <p className="text-[0.88rem] text-ink-3">{uploadAvatar.isPending ? 'Uploading…' : 'Removing…'}</p> : null}
      {errorMessage ? <FormAlert>{errorMessage}</FormAlert> : null}
    </div>
  )
}
