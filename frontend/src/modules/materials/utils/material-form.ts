import { z } from 'zod'
import { MATERIAL_FILE_MAX_BYTES, MATERIAL_FILE_SIZE_MESSAGE, MATERIAL_FILE_TYPE_MESSAGE, isAllowedMaterialFile, materialDetailsSchema, materialNoteSchema, materialUrlSchema } from '@shigjetademy/shared/materials'
import type { CreateMaterialInput, MaterialFileFieldsInput, MaterialKind } from '@shigjetademy/shared/materials'
import type { SpaceRef } from '@shigjetademy/shared/spaces'

/** The kinds the add form offers, in the order it shows them */
export const MATERIAL_FORM_KINDS = ['FILE', 'LINK', 'NOTE'] as const satisfies readonly MaterialKind[]

export const MATERIAL_KIND_LABELS: Record<MaterialKind, string> = { FILE: 'File', LINK: 'Link', NOTE: 'Note' }

/** The file checks the server makes too, so a wrong file is refused before it is sent */
const fileSchema = z
  .instanceof(File, { message: 'Choose a file to upload.' })
  .refine((file) => isAllowedMaterialFile({ name: file.name, type: file.type }), MATERIAL_FILE_TYPE_MESSAGE)
  .refine((file) => file.size <= MATERIAL_FILE_MAX_BYTES, MATERIAL_FILE_SIZE_MESSAGE)

type KindFieldCheck = {
  field: 'file' | 'url' | 'body'
  schema: z.ZodType
}

// Each kind checks the one field it needs, with the same rules the server uses
const KIND_FIELD_CHECKS: Record<MaterialKind, KindFieldCheck> = {
  FILE: { field: 'file', schema: fileSchema },
  LINK: { field: 'url', schema: materialUrlSchema },
  NOTE: { field: 'body', schema: materialNoteSchema },
}

/** The add form's fields: every kind's field is there, and only the chosen kind's one is checked */
export const materialFormSchema = materialDetailsSchema
  .extend({ kind: z.enum(MATERIAL_FORM_KINDS), url: z.string(), body: z.string(), file: z.instanceof(File).nullable() })
  .superRefine((values, context) => {
    const check = KIND_FIELD_CHECKS[values.kind]
    const result = check.schema.safeParse(values[check.field])
    if (!result.success) context.addIssue({ code: 'custom', path: [check.field], message: result.error.issues[0]?.message ?? 'Check this field.' })
  })

export type MaterialFormValues = z.infer<typeof materialFormSchema>

export const EMPTY_MATERIAL_FORM: MaterialFormValues = { kind: 'FILE', title: '', description: '', section: '', url: '', body: '', file: null }

/** What the form sends: a file upload, or a link or note */
export type MaterialRequest = { kind: 'upload'; fields: MaterialFileFieldsInput; file: File } | { kind: 'create'; input: CreateMaterialInput }

type ToMaterialRequestParams = {
  values: MaterialFormValues
  space: Pick<SpaceRef, 'kind' | 'id'>
}

/** The request for a new material in the chosen space; null for a file kind without a file, which the form already refuses */
export const toMaterialRequest = ({ values, space }: ToMaterialRequestParams): MaterialRequest | null => {
  const shared = { space_kind: space.kind, space_id: space.id, title: values.title, description: values.description, section: values.section }
  switch (values.kind) {
    case 'FILE':
      return values.file ? { kind: 'upload', fields: shared, file: values.file } : null
    case 'LINK':
      return { kind: 'create', input: { ...shared, kind: 'LINK', url: values.url } }
    case 'NOTE':
      return { kind: 'create', input: { ...shared, kind: 'NOTE', body: values.body } }
    default: {
      const unknown: never = values.kind
      throw new Error(`Unknown material kind: ${String(unknown)}`)
    }
  }
}
