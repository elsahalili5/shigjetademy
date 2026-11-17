type ListKeyParams = {
  organizationId: string
  groupId: string
}

export const assignmentQueryKeys = {
  groups: (organizationId: string) => ['organizations', organizationId, 'assignments', 'groups'] as const,
  mine: (organizationId: string) => ['organizations', organizationId, 'assignments', 'mine'] as const,
  detail: ({ organizationId, assignmentId }: { organizationId: string; assignmentId: string }) => ['organizations', organizationId, 'assignments', 'detail', assignmentId] as const,
  list: ({ organizationId, groupId }: ListKeyParams) => ['organizations', organizationId, 'assignments', 'list', groupId] as const,
}
