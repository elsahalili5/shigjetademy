import type { RefObject } from 'react'
import { Users } from 'lucide-react'
import type { DiscussionSpace, DiscussionTopicDetail } from '@shigjetademy/shared/discussions'
import { EmptyMessage } from '#/components/EmptyMessage'
import { FormDialog } from '#/components/FormDialog'
import { LoadError } from '#/components/LoadError'
import { useCreateDiscussion } from '../hooks/use-create-discussion'
import { useDiscussionForm } from '../hooks/use-discussion-form'
import { useDiscussionSpaces } from '../hooks/use-discussion-spaces'
import { useUpdateDiscussion } from '../hooks/use-update-discussion'
import { toCreateInput, toFormValues } from '../utils/discussion-form'
import { DiscussionFormFields } from './discussion-form-fields'

interface DiscussionFormDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  /** The topic to change; left out to start a new one */
  topic?: DiscussionTopicDetail
  onSaved: (topicId: string) => void
}

/** Start a new topic in one of the member's groups or courses, or change the member's own topic */
export function DiscussionFormDialog({ dialogRef, organizationId, topic, onSaved }: DiscussionFormDialogProps) {
  const handleClose = () => dialogRef.current?.close()

  const handleSaved = (topicId: string) => {
    handleClose()
    onSaved(topicId)
  }

  return (
    <FormDialog
      dialogRef={dialogRef}
      title={topic ? 'Edit topic' : 'New topic'}
      subtitle={topic ? 'Changes show to everyone in the group or course.' : 'Start a conversation with the people of one of your groups or courses.'}
      onClose={handleClose}
    >
      {topic ? <EditTopicForm organizationId={organizationId} topic={topic} onSaved={handleSaved} onCancel={handleClose} /> : <NewTopicBody organizationId={organizationId} onSaved={handleSaved} onCancel={handleClose} />}
    </FormDialog>
  )
}

interface NewTopicBodyProps {
  organizationId: string
  onSaved: (topicId: string) => void
  onCancel: () => void
}

function NewTopicBody({ organizationId, onSaved, onCancel }: NewTopicBodyProps) {
  const spaces = useDiscussionSpaces(organizationId)

  if (spaces.status === 'error') return <LoadError what="groups and courses" onRetry={() => void spaces.refetch()} />
  if (!spaces.data) return <p className="px-6 py-8 text-ink-2">Loading…</p>
  const postable = spaces.data.filter((space) => space.can_post)
  if (postable.length === 0) {
    return (
      <>
        <EmptyMessage icon={Users} title="There is nowhere you can post yet." text="You can start topics in the groups and courses you are in, unless they are archived." />
        <footer className="flex justify-end border-t border-rule px-6 py-4">
          <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
            Close
          </button>
        </footer>
      </>
    )
  }
  return <NewTopicForm organizationId={organizationId} spaces={postable} onSaved={onSaved} onCancel={onCancel} />
}

interface NewTopicFormProps {
  organizationId: string
  spaces: DiscussionSpace[]
  onSaved: (topicId: string) => void
  onCancel: () => void
}

function NewTopicForm({ organizationId, spaces, onSaved, onCancel }: NewTopicFormProps) {
  const form = useDiscussionForm({ defaultValues: toFormValues({ topic: null, spaces }) })
  const createDiscussion = useCreateDiscussion(organizationId)

  const handleSubmit = form.handleSubmit((values) => {
    const input = toCreateInput({ values, spaces })
    if (!input) return
    createDiscussion.mutate(input, {
      onSuccess: (saved) => {
        form.reset(toFormValues({ topic: null, spaces }))
        onSaved(saved.id)
      },
    })
  })

  return <DiscussionFormFields form={form} spaces={spaces} submitLabel="Post topic" isPending={createDiscussion.isPending} error={createDiscussion.error} onSubmit={handleSubmit} onCancel={onCancel} />
}

interface EditTopicFormProps {
  organizationId: string
  topic: DiscussionTopicDetail
  onSaved: (topicId: string) => void
  onCancel: () => void
}

function EditTopicForm({ organizationId, topic, onSaved, onCancel }: EditTopicFormProps) {
  const form = useDiscussionForm({ defaultValues: toFormValues({ topic, spaces: [] }) })
  const updateDiscussion = useUpdateDiscussion({ organizationId, topicId: topic.id })

  const handleSubmit = form.handleSubmit((values) =>
    updateDiscussion.mutate(
      { title: values.title, body: values.body },
      {
        onSuccess: (saved) => {
          form.reset(toFormValues({ topic: saved, spaces: [] }))
          onSaved(saved.id)
        },
      },
    ),
  )

  return <DiscussionFormFields form={form} submitLabel="Save changes" isPending={updateDiscussion.isPending} error={updateDiscussion.error} onSubmit={handleSubmit} onCancel={onCancel} />
}
