type ListKeyParams = {
  organizationId: string
  groupId: string
}

export const testQueryKeys = {
  groups: (organizationId: string) => ['organizations', organizationId, 'tests', 'groups'] as const,
  mine: (organizationId: string) => ['organizations', organizationId, 'tests', 'mine'] as const,
  sheet: ({ organizationId, testId }: { organizationId: string; testId: string }) => ['organizations', organizationId, 'tests', 'sheet', testId] as const,
  list: ({ organizationId, groupId }: ListKeyParams) => ['organizations', organizationId, 'tests', 'list', groupId] as const,
}
