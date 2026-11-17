// Assignment files and hand-in files are private (see lib/private-files): they are only handed out by the download routes, after they check the reader's access.
// They take the same files as learning materials.
import { MATERIAL_FILE_MAX_BYTES, MATERIAL_FILE_SIZE_MESSAGE, MATERIAL_FILE_TYPE_MESSAGE, isAllowedMaterialFile } from '@shigjetademy/shared/materials'
import { createFileUpload } from '@lib/file-upload.ts'
import { createPrivateFileStore } from '@lib/private-files.ts'

/** The most text fields sent beside a file: an assignment's details, group and remove flag, or a hand-in's text and keep flag */
const ASSIGNMENT_FIELD_LIMIT = 10

export const assignmentFiles = createPrivateFileStore({ folder: 'assignments', dirVariable: 'ASSIGNMENTS_DIR' })

export const runAssignmentUpload = createFileUpload({
  fieldName: 'file',
  storage: assignmentFiles.storage,
  maxBytes: MATERIAL_FILE_MAX_BYTES,
  maxFields: ASSIGNMENT_FIELD_LIMIT,
  isAllowed: isAllowedMaterialFile,
  typeMessage: MATERIAL_FILE_TYPE_MESSAGE,
  sizeMessage: MATERIAL_FILE_SIZE_MESSAGE,
})
