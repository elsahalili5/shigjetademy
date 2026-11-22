type OverviewKeyParams = {
  organizationId: string
  termId: string | null
}

type GroupReportKeyParams = OverviewKeyParams & {
  groupId: string
}

type StudentReportKeyParams = OverviewKeyParams & {
  studentId: string
}

/** The term the server picks when none is asked for */
const CURRENT_TERM = 'current'

export const performanceQueryKeys = {
  overview: ({ organizationId, termId }: OverviewKeyParams) => ['organizations', organizationId, 'grades', 'overview', termId ?? CURRENT_TERM] as const,
  groupReport: ({ organizationId, groupId, termId }: GroupReportKeyParams) => ['organizations', organizationId, 'grades', 'overview', termId ?? CURRENT_TERM, 'groups', groupId] as const,
  studentReport: ({ organizationId, studentId, termId }: StudentReportKeyParams) => ['organizations', organizationId, 'grades', 'overview', termId ?? CURRENT_TERM, 'students', studentId] as const,
}
