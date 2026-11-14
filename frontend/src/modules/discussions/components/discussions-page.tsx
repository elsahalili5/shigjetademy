import { useRef, useState } from 'react'
import { MessagesSquare } from 'lucide-react'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { SelectField } from '#/components/SelectField'
import { TableToolbar } from '#/components/TableToolbar'
import { useDiscussionSpaces } from '../hooks/use-discussion-spaces'
import { useDiscussions } from '../hooks/use-discussions'
import { ALL_SPACES, getSpaceKey, getSpaceLabel } from '../utils/space'
import { DiscussionDetailPane, NoDiscussionSelected } from './discussion-detail'
import { DiscussionFormDialog } from './discussion-form-dialog'
import { DiscussionList } from './discussion-list'

interface DiscussionsPageProps {
  organizationId: string
  organizationName: string
}

/** Conversations in the member's groups and courses: the topics on the left, the open one on the right (below it on narrow screens) */
export function DiscussionsPage({ organizationId, organizationName }: DiscussionsPageProps) {
  const topics = useDiscussions(organizationId)
  const spaces = useDiscussionSpaces(organizationId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [spaceFilter, setSpaceFilter] = useState(ALL_SPACES)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const shownTopics = spaceFilter === ALL_SPACES ? topics.data : topics.data?.filter((topic) => getSpaceKey(topic.space) === spaceFilter)

  const handleCreated = (topicId: string) => {
    setSpaceFilter(ALL_SPACES)
    setSelectedId(topicId)
  }

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={MessagesSquare} title="Groups & Discussions" subtitle={`${organizationName} · conversations in your groups and courses`} />
      <div className="px-[clamp(20px,3.4vw,44px)] pb-5">
        <TableToolbar
          addLabel="New topic"
          onAdd={() => dialogRef.current?.showModal()}
          search={
            <div className="w-[min(100%,320px)]">
              <SelectField id="discussion-space-filter" label="Show topics from" value={spaceFilter} onChange={(event) => setSpaceFilter(event.target.value)}>
                <option value={ALL_SPACES}>All my groups and courses</option>
                {spaces.data?.map((space) => (
                  <option key={getSpaceKey(space)} value={getSpaceKey(space)}>
                    {getSpaceLabel(space)}
                  </option>
                ))}
              </SelectField>
            </div>
          }
        />
      </div>
      <div className="grid flex-1 grid-cols-[minmax(260px,360px)_minmax(0,1fr)] items-stretch px-[clamp(20px,3.4vw,44px)] pb-10 max-[1000px]:grid-cols-1">
        <section className="min-h-[320px] overflow-hidden rounded-l-card border border-rule max-[1000px]:rounded-card" aria-label="Your topics">
          <DiscussionList
            status={topics.status}
            topics={shownTopics}
            hasNoSpaces={spaces.data?.length === 0}
            isFiltered={spaceFilter !== ALL_SPACES}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onRetry={() => void topics.refetch()}
          />
        </section>
        <section className="flex min-h-[420px] min-w-0 flex-col rounded-r-card border border-l-0 border-rule max-[1000px]:mt-4 max-[1000px]:rounded-card max-[1000px]:border-l" aria-label="Topic">
          {selectedId ? <DiscussionDetailPane key={selectedId} organizationId={organizationId} topicId={selectedId} /> : <NoDiscussionSelected />}
        </section>
      </div>
      <DiscussionFormDialog dialogRef={dialogRef} organizationId={organizationId} onSaved={handleCreated} />
    </div>
  )
}
