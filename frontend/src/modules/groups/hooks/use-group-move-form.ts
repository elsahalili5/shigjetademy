import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { groupMoveSchema } from '@shigjetademy/shared/groups'
import type { GroupMoveInput } from '@shigjetademy/shared/groups'

export function useGroupMoveForm() {
  return useForm<GroupMoveInput>({ resolver: zodResolver(groupMoveSchema), defaultValues: { group_id: '' } })
}
