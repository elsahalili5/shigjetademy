import { apiClient } from '#/api/client'
import { downloadFile, uploadForm } from '#/api/files'
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

export const materialsApi = {
  listSpaces: (organizationId: string) => apiClient.get<MaterialSpace[]>(`${materialsPath(organizationId)}/spaces`),
  list: ({ organizationId, ...space }: ListParams) => apiClient.get<Material[]>(materialsPath(organizationId), { params: space }),
  create: ({ organizationId, ...input }: CreateParams) => apiClient.post<Material, CreateMaterialInput>(materialsPath(organizationId), input),
  upload: ({ organizationId, fields, file }: UploadParams) => uploadForm<Material>({ url: `${materialsPath(organizationId)}/files`, fields, file }),
  download: (params: MaterialParams) => downloadFile(`${materialPath(params)}/download`),
  update: ({ organizationId, materialId, ...input }: UpdateParams) => apiClient.put<Material, UpdateMaterialInput>(materialPath({ organizationId, materialId }), input),
  remove: (params: MaterialParams) => apiClient.delete<{ id: string }>(materialPath(params)),
}
