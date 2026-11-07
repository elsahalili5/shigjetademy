import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import type { InviteRecordInput } from '@shigjetademy/shared/invitations'
import type { LecturerPage } from '@shigjetademy/shared/lecturers'
import { lecturersApi } from '../api/lecturers-api'
import { replaceLecturer } from '../utils/lecturer-cache'
import { lecturersQueryKey } from './use-lecturers'

type InviteLecturerParams = InviteRecordInput & {
  lecturerId: string
}

/** Emails the lecturer a link to create their login, linked to this record; the answered row replaces the cached one */
export function useInviteLecturer(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: InviteLecturerParams) => lecturersApi.invite({ organizationId, ...params }),
    onSuccess: (saved) =>
      queryClient.setQueriesData<InfiniteData<LecturerPage, number>>({ queryKey: [...lecturersQueryKey(organizationId), 'list'] }, (data) => replaceLecturer({ data, saved })),
  })
}
