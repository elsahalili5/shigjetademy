import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { transferOwnershipSchema } from '@shigjetademy/shared/organization-settings'
import type { TransferOwnershipInput } from '@shigjetademy/shared/organization-settings'

export function useTransferOwnershipForm() {
  return useForm<TransferOwnershipInput>({
    resolver: zodResolver(transferOwnershipSchema),
    defaultValues: { membership_id: '', password: '' },
  })
}
