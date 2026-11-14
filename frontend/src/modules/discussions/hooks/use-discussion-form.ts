import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { discussionFormSchema } from '../utils/discussion-form'
import type { DiscussionFormValues } from '../utils/discussion-form'

type UseDiscussionFormParams = {
  defaultValues: DiscussionFormValues
}

export function useDiscussionForm({ defaultValues }: UseDiscussionFormParams) {
  return useForm<DiscussionFormValues>({ resolver: zodResolver(discussionFormSchema), defaultValues })
}
