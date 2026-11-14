import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { createAnnouncementFormSchema } from '../utils/announcement-form'
import type { AnnouncementFormValues } from '../utils/announcement-form'

type UseAnnouncementFormParams = {
  defaultValues: AnnouncementFormValues
  timeZone: string
}

export function useAnnouncementForm({ defaultValues, timeZone }: UseAnnouncementFormParams) {
  return useForm<AnnouncementFormValues>({ resolver: zodResolver(createAnnouncementFormSchema(timeZone)), defaultValues })
}
