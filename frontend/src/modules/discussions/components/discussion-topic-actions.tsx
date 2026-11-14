import { useState } from 'react'
import { Lock, LockOpen, Pencil, Pin, PinOff, Trash2 } from 'lucide-react'
import type { DiscussionTopicDetail } from '@shigjetademy/shared/discussions'
import { ConfirmGroup } from '#/components/ConfirmGroup'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage } from '#/lib/error-message'
import { useLockDiscussion } from '../hooks/use-lock-discussion'
import { usePinDiscussion } from '../hooks/use-pin-discussion'
import { useRemoveDiscussion } from '../hooks/use-remove-discussion'

const ACTION_CLASS = 'button button--ghost min-h-10 px-3.5 text-[0.95rem]'

interface DiscussionTopicActionsProps {
  organizationId: string
  topic: DiscussionTopicDetail
  onEdit: () => void
}

/** What the member may do with the open topic: edit their own, remove their own or (as a moderator) anyone's, and pin and lock it */
export function DiscussionTopicActions({ organizationId, topic, onEdit }: DiscussionTopicActionsProps) {
  const pinDiscussion = usePinDiscussion(organizationId)
  const lockDiscussion = useLockDiscussion(organizationId)
  const removeDiscussion = useRemoveDiscussion(organizationId)
  const [isConfirmingRemove, setIsConfirmingRemove] = useState(false)
  const error = pinDiscussion.error ?? lockDiscussion.error ?? removeDiscussion.error
  const isModerating = topic.can_moderate && topic.status === 'ACTIVE'

  const handleRemove = () => removeDiscussion.mutate(topic.id, { onSettled: () => setIsConfirmingRemove(false) })

  return (
    <footer className="grid gap-3 border-t border-rule px-5 py-4">
      {error ? <FormAlert>{getErrorMessage(error)}</FormAlert> : null}
      <div className="flex flex-wrap items-center gap-2.5">
        {topic.can_edit ? (
          <button type="button" className={ACTION_CLASS} onClick={onEdit}>
            <Pencil size={16} strokeWidth={2} aria-hidden="true" />
            Edit topic
          </button>
        ) : null}
        {isModerating ? (
          <button type="button" className={ACTION_CLASS} disabled={pinDiscussion.isPending} onClick={() => pinDiscussion.mutate({ topicId: topic.id, isPinned: !topic.is_pinned })}>
            {topic.is_pinned ? <PinOff size={16} strokeWidth={2} aria-hidden="true" /> : <Pin size={16} strokeWidth={2} aria-hidden="true" />}
            {topic.is_pinned ? 'Unpin topic' : 'Pin topic'}
          </button>
        ) : null}
        {isModerating ? (
          <button type="button" className={ACTION_CLASS} disabled={lockDiscussion.isPending} onClick={() => lockDiscussion.mutate({ topicId: topic.id, isLocked: !topic.is_locked })}>
            {topic.is_locked ? <LockOpen size={16} strokeWidth={2} aria-hidden="true" /> : <Lock size={16} strokeWidth={2} aria-hidden="true" />}
            {topic.is_locked ? 'Unlock topic' : 'Lock topic'}
          </button>
        ) : null}
        {topic.can_remove ? <RemoveTopicButton isConfirming={isConfirmingRemove} onAsk={() => setIsConfirmingRemove(true)} onConfirm={handleRemove} onCancel={() => setIsConfirmingRemove(false)} /> : null}
      </div>
    </footer>
  )
}

interface RemoveTopicButtonProps {
  isConfirming: boolean
  onAsk: () => void
  onConfirm: () => void
  onCancel: () => void
}

/** Remove, which asks once before it goes ahead */
function RemoveTopicButton({ isConfirming, onAsk, onConfirm, onCancel }: RemoveTopicButtonProps) {
  if (isConfirming) return <ConfirmGroup label="Remove this topic" question="Remove this topic and its replies?" confirmLabel="Remove" onConfirm={onConfirm} onCancel={onCancel} />
  return (
    <button type="button" className={ACTION_CLASS} onClick={onAsk}>
      <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
      Remove topic
    </button>
  )
}
