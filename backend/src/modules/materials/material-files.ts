// Uploaded material files live on local disk under backend/storage/materials, outside backend/uploads, which /api/uploads serves to anyone. They are only
// handed out by the download route, after it checks the reader's access. Each is stored under a generated name; the uploaded name is kept on the row.
import { randomUUID } from 'node:crypto'
import { mkdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Request, Response } from 'express'
import multer, { MulterError } from 'multer'
import { MATERIAL_FILE_MAX_BYTES, MATERIAL_FILE_SIZE_MESSAGE, MATERIAL_FILE_TYPE_MESSAGE, isAllowedMaterialFile } from '@shigjetademy/shared/materials'
import { HttpError } from '@lib/httpError.ts'

const MATERIAL_FIELD_NAME = 'file'

/** The title, description, section and space sent beside the file */
const MATERIAL_FIELD_LIMIT = 10

const DEFAULT_MATERIALS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../storage/materials')

/** Where files are stored; MATERIALS_DIR moves it, which the tests do to keep their files apart */
const getMaterialsDir = () => process.env.MATERIALS_DIR ?? DEFAULT_MATERIALS_DIR

const materialUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      const dir = getMaterialsDir()
      mkdir(dir, { recursive: true }).then(
        () => callback(null, dir),
        (error: Error) => callback(error, dir),
      )
    },
    filename: (_req, _file, callback) => callback(null, randomUUID()),
  }),
  limits: { fileSize: MATERIAL_FILE_MAX_BYTES, files: 1, fields: MATERIAL_FIELD_LIMIT },
  // Names like "Week 3 – slides.pdf" arrive as UTF-8
  defParamCharset: 'utf8',
  fileFilter: (_req, file, callback) => {
    if (!isAllowedMaterialFile({ name: file.originalname, type: file.mimetype })) return callback(new HttpError(400, MATERIAL_FILE_TYPE_MESSAGE))
    callback(null, true)
  },
}).single(MATERIAL_FIELD_NAME)

/** Reads the multipart request, storing its file; multer removes a file it stopped part way. It calls back instead of throwing, so this awaits it. */
export const runMaterialUpload = (req: Request, res: Response) =>
  new Promise<void>((resolve, reject) => {
    materialUpload(req, res, (error: unknown) => {
      if (!error) return resolve()
      if (error instanceof HttpError) return reject(error)
      if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') return reject(new HttpError(400, MATERIAL_FILE_SIZE_MESSAGE))
      return reject(new HttpError(400, 'Could not process the uploaded file.'))
    })
  })

/** Where a stored file is on disk */
export const getMaterialFilePath = (fileKey: string) => path.join(getMaterialsDir(), path.basename(fileKey))

/** Deletes a stored file; one already gone is not an error */
export const deleteMaterialFile = async (fileKey: string) => {
  try {
    await unlink(getMaterialFilePath(fileKey))
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error
  }
}
