import { useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { TableAddButton } from '#/components/TableToolbar'
import { useInboxConversations } from '../hooks/use-inbox-conversations'
import { ConversationList } from './conversation-list'
import { ConversationThread, NoConversationSelected } from './conversation-thread'
import { NewMessageDialog } from './new-message-dialog'

interface InboxPageProps {
  organizationId: string
  organizationName: string
}

/** Private messages: the member's conversations on the left, the open one on the right (below it on narrow screens) */
export function InboxPage({ organizationId, organizationName }: InboxPageProps) {
  const conversations = useInboxConversations(organizationId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={MessageSquare} title="Inbox" subtitle={`${organizationName} · private messages`} />
      <div className="px-[clamp(20px,3.4vw,44px)] pb-5">
        <TableAddButton label="New message" onClick={() => dialogRef.current?.showModal()} />
      </div>
      <div className="grid flex-1 grid-cols-[minmax(260px,360px)_minmax(0,1fr)] items-stretch px-[clamp(20px,3.4vw,44px)] pb-10 max-[1000px]:grid-cols-1">
        <section className="min-h-[320px] overflow-hidden rounded-l-card border border-rule max-[1000px]:rounded-card" aria-label="Your conversations">
          <ConversationList status={conversations.status} conversations={conversations.data} selectedId={selectedId} onSelect={setSelectedId} onRetry={() => void conversations.refetch()} />
        </section>
        <section className="flex min-h-[420px] min-w-0 flex-col rounded-r-card border border-l-0 border-rule max-[1000px]:mt-4 max-[1000px]:rounded-card max-[1000px]:border-l" aria-label="Conversation">
          {selectedId ? <ConversationThread key={selectedId} organizationId={organizationId} conversationId={selectedId} /> : <NoConversationSelected />}
        </section>
      </div>
      <NewMessageDialog dialogRef={dialogRef} organizationId={organizationId} onStarted={setSelectedId} />
    </div>
  )
}
