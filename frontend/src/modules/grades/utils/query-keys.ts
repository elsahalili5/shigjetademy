type GradebookKeyParams = {
  organizationId: string
  groupId: string
}

export const gradeQueryKeys = {
  groups: (organizationId: string) => ['organizations', organizationId, 'grades', 'groups'] as const,
  mine: (organizationId: string) => ['organizations', organizationId, 'grades', 'mine'] as const,
  gradebook: ({ organizationId, groupId }: GradebookKeyParams) => ['organizations', organizationId, 'grades', 'gradebook', groupId] as const,
}
