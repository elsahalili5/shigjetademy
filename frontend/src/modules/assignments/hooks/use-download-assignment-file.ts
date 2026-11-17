import { useMutation } from '@tanstack/react-query'
import { assignmentsApi } from '../api/assignments-api'
import type { AssignmentFileTarget } from '../types'

type UseDownloadAssignmentFileParams = {
  organizationId: string
  target: AssignmentFileTarget
}

const fetchFile = ({ organizationId, target }: UseDownloadAssignmentFileParams) => {
  switch (target.kind) {
    case 'assignment':
      return assignmentsApi.download({ organizationId, assignmentId: target.assignmentId })
    case 'hand-in':
      return assignmentsApi.downloadHandIn({ organizationId, assignmentId: target.assignmentId, submissionId: target.submissionId })
    default: {
      const unknown: never = target
      throw new Error(`Unknown file target: ${String(unknown)}`)
    }
  }
}

/** Fetches a stored file with the member's token; the component saves it */
export function useDownloadAssignmentFile(params: UseDownloadAssignmentFileParams) {
  return useMutation({ mutationFn: () => fetchFile(params) })
}
