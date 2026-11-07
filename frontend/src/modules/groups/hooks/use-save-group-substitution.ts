import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { GroupSubstitutionInput } from '@shigjetademy/shared/groups'
import { groupsApi } from '../api/groups-api'
import { groupLecturersQueryKey } from './use-group-lecturers'

type UseSaveGroupSubstitutionParams = {
  organizationId: string
  groupId: string
}

type SaveGroupSubstitutionParams = { kind: 'add'; input: GroupSubstitutionInput } | { kind: 'edit'; substitutionId: string; input: GroupSubstitutionInput }

/** Adds or edits a substitution; the group's history loads again */
export function useSaveGroupSubstitution({ organizationId, groupId }: UseSaveGroupSubstitutionParams) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: SaveGroupSubstitutionParams) => {
      switch (params.kind) {
        case 'add':
          return groupsApi.addSubstitution({ organizationId, groupId, ...params.input })
        case 'edit':
          return groupsApi.updateSubstitution({ organizationId, groupId, substitutionId: params.substitutionId, ...params.input })
        default: {
          const unknown: never = params
          throw new Error(`Unknown save: ${String(unknown)}`)
        }
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupLecturersQueryKey({ organizationId, groupId }) }),
  })
}
