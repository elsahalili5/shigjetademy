// Learning materials: files, links and notes shared with a group or a course. The forms and the endpoints that store them share these schemas and response shapes.
import { z } from 'zod'
import { optionalText } from './organization.ts'
import { SPACE_KINDS } from './spaces.ts'
import type { Space, SpaceRef } from './spaces.ts'

export const MATERIAL_TITLE_MAX_LENGTH = 150

export const MATERIAL_DESCRIPTION_MAX_LENGTH = 1000

export const MATERIAL_SECTION_MAX_LENGTH = 60

export const MATERIAL_NOTE_MAX_LENGTH = 10000

export const MATERIAL_URL_MAX_LENGTH = 2000

export const MATERIAL_KINDS = ['FILE', 'LINK', 'NOTE'] as const

export type MaterialKind = (typeof MATERIAL_KINDS)[number]

/** The section a material without one is listed under */
export const GENERAL_SECTION = 'General'

const titleSchema = z.string().trim().min(1, 'Write a title.').max(MATERIAL_TITLE_MAX_LENGTH, `Keep the title under ${MATERIAL_TITLE_MAX_LENGTH} characters.`)

export const materialUrlSchema = z
  .string()
  .trim()
  .max(MATERIAL_URL_MAX_LENGTH, `Keep the link under ${MATERIAL_URL_MAX_LENGTH} characters.`)
  .pipe(z.url({ protocol: /^https?$/, error: 'Enter a full web address, like https://example.com.' }))

export const materialNoteSchema = z.string().trim().min(1, 'Write the note.').max(MATERIAL_NOTE_MAX_LENGTH, `Keep the note under ${MATERIAL_NOTE_MAX_LENGTH} characters.`)

/** What every material has, and all that can change after it is shared. An empty description or section means none. */
export const materialDetailsSchema = z.object({
  title: titleSchema,
  description: optionalText(MATERIAL_DESCRIPTION_MAX_LENGTH),
  section: optionalText(MATERIAL_SECTION_MAX_LENGTH),
})

export type MaterialDetailsInput = z.infer<typeof materialDetailsSchema>

/** A change to a shared material: its title, description and section; what it holds stays */
export const updateMaterialSchema = materialDetailsSchema

export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>

/** The group or course a material is shared with */
export const materialSpaceSchema = z.object({
  space_kind: z.enum(SPACE_KINDS, 'Choose where to share it.'),
  space_id: z.uuid('Choose where to share it.'),
})

export type MaterialSpaceInput = z.infer<typeof materialSpaceSchema>

/** A link or a note; files are uploaded on their own */
export const createMaterialSchema = z.discriminatedUnion('kind', [
  materialDetailsSchema.extend({ ...materialSpaceSchema.shape, kind: z.literal('LINK'), url: materialUrlSchema }),
  materialDetailsSchema.extend({ ...materialSpaceSchema.shape, kind: z.literal('NOTE'), body: materialNoteSchema }),
])

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>

/** The fields sent beside an uploaded file */
export const materialFileFieldsSchema = materialDetailsSchema.extend(materialSpaceSchema.shape)

export type MaterialFileFieldsInput = z.infer<typeof materialFileFieldsSchema>

export const MATERIAL_FILE_MAX_BYTES = 20 * 1024 * 1024

/** The file types materials take, each with the extensions a file of it may have: PDF, Word, PowerPoint, Excel, images and plain text */
export const MATERIAL_FILE_TYPES = {
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-powerpoint': ['ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
  'image/gif': ['gif'],
  'text/plain': ['txt'],
} as const satisfies Record<string, readonly string[]>

type MaterialFileType = keyof typeof MATERIAL_FILE_TYPES

const isMaterialFileType = (type: string): type is MaterialFileType => Object.hasOwn(MATERIAL_FILE_TYPES, type)

/** The file picker's filter: every allowed extension */
export const MATERIAL_FILE_ACCEPT = Object.values(MATERIAL_FILE_TYPES)
  .flat()
  .map((extension) => `.${extension}`)
  .join(',')

export const MATERIAL_FILE_TYPE_MESSAGE = 'Upload a PDF, Word, PowerPoint, Excel, image or plain text file.'

export const MATERIAL_FILE_SIZE_MESSAGE = 'Files must be 20 MB or smaller.'

type MaterialFileCheck = {
  name: string
  type: string
}

/** An allowed type whose name ends in one of that type's extensions */
export const isAllowedMaterialFile = ({ name, type }: MaterialFileCheck) => {
  if (!isMaterialFileType(type)) return false
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  const extensions: readonly string[] = MATERIAL_FILE_TYPES[type]
  return name.includes('.') && extensions.includes(extension)
}

export type MaterialAuthor = {
  membership_id: string
  first_name: string
  last_name: string
}

/** A group or course materials are shared with; can_post says whether the viewer may share there */
export type MaterialSpace = Space

/** An uploaded file: the name it was uploaded with, its type and its size in bytes */
export type MaterialFile = {
  name: string
  type: string
  size: number
}

/** One material. Dates are ISO timestamps in UTC. url is set for a link, body for a note, file for a file. */
export type Material = {
  id: string
  space: SpaceRef
  kind: MaterialKind
  title: string
  description: string | null
  section: string | null
  url: string | null
  body: string | null
  file: MaterialFile | null
  author: MaterialAuthor
  created_at: string
  updated_at: string
  /** The author, the owner and admins with Learning materials change and remove it */
  can_edit: boolean
  can_remove: boolean
}
