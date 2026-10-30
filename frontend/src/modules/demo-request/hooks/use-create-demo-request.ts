import { useMutation } from '@tanstack/react-query'
import { demoRequestApi } from '../api/demo-request-api'

export function useCreateDemoRequest() {
  return useMutation({ mutationFn: demoRequestApi.create })
}
