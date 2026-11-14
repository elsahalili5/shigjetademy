import { z } from 'zod'
import { discussionTopicTextSchema } from '@shigjetademy/shared/discussions'
import type { CreateDiscussionTopicInput, DiscussionSpace, DiscussionTopicDetail } from '@shigjetademy/shared/discussions'
import { getSpaceKey } from './space'

/** The form's fields: the space is picked as one string, "GROUP:<id>" or "COURSE:<id>", until it is turned into an input */
export const discussionFormSchema = discussionTopicTextSchema.extend({ space: z.string().min(1, 'Choose where to post it.') })

export type DiscussionFormValues = z.infer<typeof discussionFormSchema>

type ToFormValuesParams = {
  topic: DiscussionTopicDetail | null
  spaces: DiscussionSpace[]
}

/** The form's starting values: empty for a new topic (with the only space chosen when there is just one), the saved ones for an edit */
export const toFormValues = ({ topic, spaces }: ToFormValuesParams): DiscussionFormValues => {
  if (topic) return { space: getSpaceKey(topic.space), title: topic.title, body: topic.body }
  return { space: spaces.length === 1 ? getSpaceKey(spaces[0]) : '', title: '', body: '' }
}

type ToCreateInputParams = {
  values: DiscussionFormValues
  spaces: DiscussionSpace[]
}

/** The request for a new topic, or null when the chosen space is not one the member may post in */
export const toCreateInput = ({ values, spaces }: ToCreateInputParams): CreateDiscussionTopicInput | null => {
  const space = spaces.find((item) => getSpaceKey(item) === values.space)
  return space ? { space_kind: space.kind, space_id: space.id, title: values.title, body: values.body } : null
}
