import { apiClient } from '#/api/client'
import type { CreateDemoRequestInput, CreateDemoRequestResponse } from '@shigjetademy/shared'

export const demoRequestApi = {
  create: (data: CreateDemoRequestInput) =>
    apiClient.post<CreateDemoRequestResponse, CreateDemoRequestInput>('/demo-requests', data),
}
