import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ALLOWED_AVATAR_MIME_TYPES, AVATAR_MAX_BYTES } from '@shigjetademy/shared/auth'

export { ALLOWED_AVATAR_MIME_TYPES, AVATAR_MAX_BYTES }

// backend/uploads/avatars, independent of the process's working directory
export const AVATAR_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../uploads/avatars')

export const AVATAR_URL_PREFIX = '/api/uploads/avatars'

type AvatarMimeType = (typeof ALLOWED_AVATAR_MIME_TYPES)[number]

const isAvatarMimeType = (mimeType: string): mimeType is AvatarMimeType => (ALLOWED_AVATAR_MIME_TYPES as readonly string[]).includes(mimeType)

// Keyed by every allowed mime type, so adding one to the shared list without an extension here fails to typecheck
// instead of silently writing a file with an `undefined` extension
const MIME_EXTENSIONS: Record<AvatarMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

type SaveAvatarFileParams = {
  userId: string
  mimeType: string
  buffer: Buffer
}

/** Writes the image under a name unique to this upload, and returns the URL it is served at */
export const saveAvatarFile = async ({ userId, mimeType, buffer }: SaveAvatarFileParams) => {
  if (!isAvatarMimeType(mimeType)) {
    throw new Error(`Unsupported avatar mime type: ${mimeType}`)
  }
  await mkdir(AVATAR_DIR, { recursive: true })
  const filename = `${userId}-${Date.now()}.${MIME_EXTENSIONS[mimeType]}`
  await writeFile(path.join(AVATAR_DIR, filename), buffer)
  return `${AVATAR_URL_PREFIX}/${filename}`
}

/** Deletes a previously stored avatar file; a missing file (already removed) is not an error */
export const deleteAvatarFile = async (avatarUrl: string | null) => {
  if (!avatarUrl) {
    return
  }
  const filename = avatarUrl.replace(`${AVATAR_URL_PREFIX}/`, '')
  try {
    await unlink(path.join(AVATAR_DIR, filename))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }
}
