// Uploaded material files are private (see lib/private-files): they are only handed out by the download route, after it checks the reader's access.
import { MATERIAL_FILE_MAX_BYTES, MATERIAL_FILE_SIZE_MESSAGE, MATERIAL_FILE_TYPE_MESSAGE, isAllowedMaterialFile } from '@shigjetademy/shared/materials'
import { createFileUpload } from '@lib/file-upload.ts'
import { createPrivateFileStore } from '@lib/private-files.ts'

/** The title, description, section and space sent beside the file */
const MATERIAL_FIELD_LIMIT = 10

export const materialFiles = createPrivateFileStore({ folder: 'materials', dirVariable: 'MATERIALS_DIR' })

export const runMaterialUpload = createFileUpload({
  fieldName: 'file',
  storage: materialFiles.storage,
  maxBytes: MATERIAL_FILE_MAX_BYTES,
  maxFields: MATERIAL_FIELD_LIMIT,
  isAllowed: isAllowedMaterialFile,
  typeMessage: MATERIAL_FILE_TYPE_MESSAGE,
  sizeMessage: MATERIAL_FILE_SIZE_MESSAGE,
})
