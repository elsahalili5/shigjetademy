// Private files live on local disk under backend/storage/<folder>, outside backend/uploads, which /api/uploads serves to anyone. They are only handed out
// by a download route, after it checks the reader's access. Each is stored under a generated name; the uploaded name is kept on its row.
import { randomUUID } from 'node:crypto'
import { mkdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Response } from 'express'
import multer from 'multer'
import { sendError } from './httpError.ts'

const STORAGE_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../storage')

type PrivateFileStoreParams = {
  /** The folder under backend/storage */
  folder: string
  /** The environment variable that moves the folder, which the tests do to keep their files apart */
  dirVariable: string
}

const isMissingFile = (error: unknown) => error instanceof Error && 'code' in error && error.code === 'ENOENT'

/** One folder of private files: where they are, multer's storage into it, and deleting one */
export const createPrivateFileStore = ({ folder, dirVariable }: PrivateFileStoreParams) => {
  const getDir = () => process.env[dirVariable] ?? path.join(STORAGE_ROOT, folder)

  const getPath = (fileKey: string) => path.join(getDir(), path.basename(fileKey))

  const storage = multer.diskStorage({
    destination: (_req, _file, callback) => {
      const dir = getDir()
      mkdir(dir, { recursive: true }).then(
        () => callback(null, dir),
        (error: Error) => callback(error, dir),
      )
    },
    filename: (_req, _file, callback) => callback(null, randomUUID()),
  })

  /** Deletes a stored file; one already gone is not an error */
  const remove = async (fileKey: string) => {
    try {
      await unlink(getPath(fileKey))
    } catch (error) {
      if (!isMissingFile(error)) throw error
    }
  }

  /** Takes a refused upload's file away; a failure is logged, so the caller still answers with why the upload was refused */
  const removeRefused = async (fileKey: string) => {
    try {
      await remove(fileKey)
    } catch (cleanupError) {
      console.error(`Failed to delete a refused upload in ${folder}`, cleanupError)
    }
  }

  /** Deletes the files of rows already removed; a failure is logged, since the rows are gone for everyone either way */
  const removeOrphans = async (fileKeys: string[]) => {
    for (const fileKey of fileKeys) {
      try {
        await remove(fileKey)
      } catch (error) {
        console.error(`Failed to delete the stored file ${fileKey} in ${folder}`, error)
      }
    }
  }

  return { getPath, storage, remove, removeRefused, removeOrphans }
}

/** A file multer stored, under its generated key */
export type StoredUpload = {
  key: string
  name: string
  type: string
  size: number
}

type UploadedFile = {
  filename: string
  originalname: string
  mimetype: string
  size: number
}

export const toStoredUpload = (file: UploadedFile): StoredUpload => ({ key: file.filename, name: file.originalname, type: file.mimetype, size: file.size })

type SendStoredFileParams = {
  res: Response
  file: { path: string; name: string; type: string }
  fallback: string
}

/** Sends a stored file as an attachment under its uploaded name; nosniff keeps a browser from reading it as anything but its stored type */
export const sendStoredFile = ({ res, file, fallback }: SendStoredFileParams) => {
  res.attachment(file.name)
  res.type(file.type)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Cache-Control', 'private, no-store')
  return res.sendFile(file.path, (error) => {
    if (!error || res.headersSent) return
    if ('code' in error && error.code === 'ENOENT') return res.status(404).json({ error: 'This file is no longer stored.' })
    return sendError({ res, error, fallback })
  })
}
