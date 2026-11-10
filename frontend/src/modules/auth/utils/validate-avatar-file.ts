import { ALLOWED_AVATAR_MIME_TYPES, AVATAR_MAX_BYTES } from '@shigjetademy/shared/auth'

export type AvatarFileRejectionReason = 'mimeType' | 'size'

export type ValidateAvatarFileResult = { status: 'valid' } | { status: 'invalid'; reason: AvatarFileRejectionReason }

/** The same checks the server makes, run first so a bad file never has to round-trip */
export const validateAvatarFile = (file: File): ValidateAvatarFileResult => {
  if (!(ALLOWED_AVATAR_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { status: 'invalid', reason: 'mimeType' }
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return { status: 'invalid', reason: 'size' }
  }
  return { status: 'valid' }
}
