// Reads a multipart request with multer: one file under one field, checked for its type and size. Learning materials, assignments and avatars share it.
import type { Request, Response } from 'express'
import multer, { MulterError } from 'multer'
import type { StorageEngine } from 'multer'
import { HttpError } from './httpError.ts'

type UploadedFileCheck = {
  name: string
  type: string
}

export type FileUploadRules = {
  fieldName: string
  storage: StorageEngine
  maxBytes: number
  /** The text fields allowed beside the file; any number when left out */
  maxFields?: number
  isAllowed: (file: UploadedFileCheck) => boolean
  typeMessage: string
  sizeMessage: string
}

const UNREADABLE_MESSAGE = 'Could not process the uploaded file.'

/** A function that reads the request, storing its file; multer removes a file it stopped part way. It calls back instead of throwing, so the function awaits it. */
export const createFileUpload = ({ fieldName, storage, maxBytes, maxFields, isAllowed, typeMessage, sizeMessage }: FileUploadRules) => {
  const upload = multer({
    storage,
    limits: { fileSize: maxBytes, files: 1, ...(maxFields === undefined ? {} : { fields: maxFields }) },
    // Names like "Week 3 – slides.pdf" arrive as UTF-8
    defParamCharset: 'utf8',
    fileFilter: (_req, file, callback) => {
      if (!isAllowed({ name: file.originalname, type: file.mimetype })) return callback(new HttpError(400, typeMessage))
      callback(null, true)
    },
  }).single(fieldName)

  return (req: Request, res: Response) =>
    new Promise<void>((resolve, reject) => {
      upload(req, res, (error: unknown) => {
        if (!error) return resolve()
        if (error instanceof HttpError) return reject(error)
        if (error instanceof MulterError && error.code === 'LIMIT_FILE_SIZE') return reject(new HttpError(400, sizeMessage))
        return reject(new HttpError(400, UNREADABLE_MESSAGE))
      })
    })
}
