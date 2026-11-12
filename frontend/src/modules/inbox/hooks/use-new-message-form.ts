import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { startConversationSchema } from '@shigjetademy/shared/inbox'
import type { StartConversationInput } from '@shigjetademy/shared/inbox'

export function useNewMessageForm() {
  return useForm<StartConversationInput>({
    resolver: zodResolver(startConversationSchema),
    defaultValues: { recipient_membership_id: '', body: '' },
  })
}
