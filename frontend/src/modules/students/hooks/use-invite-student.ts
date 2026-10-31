import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InfiniteData } from '@tanstack/react-query'
import type { InviteStudentInput } from '@shigjetademy/shared/invitations'
import type { StudentPage } from '@shigjetademy/shared/students'
import { studentsApi } from '../api/students-api'
import { replaceStudent } from '../utils/student-cache'
import { studentsQueryKey } from './use-students'

type InviteStudentParams = InviteStudentInput & {
  studentId: string
}

/** Emails the student a link to create their login, linked to this record; the answered row replaces the cached one */
export function useInviteStudent(organizationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: InviteStudentParams) => studentsApi.invite({ organizationId, ...params }),
    onSuccess: (saved) => queryClient.setQueriesData<InfiniteData<StudentPage, number>>({ queryKey: studentsQueryKey(organizationId) }, (data) => replaceStudent({ data, saved })),
  })
}
