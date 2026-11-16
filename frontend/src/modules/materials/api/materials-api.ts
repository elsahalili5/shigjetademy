import { apiClient, isApiError } from '#/api/client'
import type { CreateMaterialInput, Material, MaterialFileFieldsInput, MaterialSpace, MaterialSpaceInput, UpdateMaterialInput } from '@shigjetademy/shared/materials'

type CreateParams = CreateMaterialInput & {
  organizationId: string
}

type UploadParams = {
  organizationId: string
  fields: MaterialFileFieldsInput
  file: File
}

type ListParams = MaterialSpaceInput & {
  organizationId: string
}

type MaterialParams = {
  organizationId: string
  materialId: string
}

type UpdateParams = UpdateMaterialInput & MaterialParams

const materialsPath = (organizationId: string) => `/organizations/${organizationId}/materials`

const materialPath = ({ organizationId, materialId }: MaterialParams) => `${materialsPath(organizationId)}/${materialId}`

/** The fields and the file as one multipart body */
const toFormData = ({ fields, file }: Pick<UploadParams, 'fields' | 'file'>) => {
  const formData = new FormData()
  for (const [name, value] of Object.entries(fields)) formData.append(name, value)
  formData.append('file', file)
  return formData
}

const readErrorMessage = (body: unknown) => {
  if (typeof body !== 'object' || body === null || !('error' in body)) return undefined
  return typeof body.error === 'string' ? body.error : undefined
}

/** A failed blob request carries its JSON error as a Blob; reading it back lets the server's message show instead of the status code */
const readBlobError = async (error: unknown) => {
  if (!isApiError(error) || !error.response || !(error.response.data instanceof Blob)) return error
  const text = await error.response.data.text()
  try {
    const body: unknown = JSON.parse(text)
    error.response.data = { error: readErrorMessage(body) ?? text }
  } catch {
    // Not JSON: the text itself is the reason
    error.response.data = { error: text || undefined }
  }
  return error
}

export const materialsApi = {
  listSpaces: (organizationId: string) => apiClient.get<MaterialSpace[]>(`${materialsPath(organizationId)}/spaces`),
  list: ({ organizationId, ...space }: ListParams) => apiClient.get<Material[]>(materialsPath(organizationId), { params: space }),
  create: ({ organizationId, ...input }: CreateParams) => apiClient.post<Material, CreateMaterialInput>(materialsPath(organizationId), input),
  // The client sends JSON by default; a multipart type lets the browser send the form with its boundary
  upload: ({ organizationId, ...upload }: UploadParams) =>
    apiClient.post<Material, FormData>(`${materialsPath(organizationId)}/files`, toFormData(upload), { headers: { 'Content-Type': 'multipart/form-data' } }),
  // Through the client, so the request carries the member's token; a plain link would not
  download: (params: MaterialParams) =>
    apiClient.get<Blob>(`${materialPath(params)}/download`, { responseType: 'blob' }).catch(async (error: unknown) => {
      throw await readBlobError(error)
    }),
  update: ({ organizationId, materialId, ...input }: UpdateParams) => apiClient.put<Material, UpdateMaterialInput>(materialPath({ organizationId, materialId }), input),
  remove: (params: MaterialParams) => apiClient.delete<{ id: string }>(materialPath(params)),
}
