import { useRef, useState } from 'react'
import { Archive, FileQuestion } from 'lucide-react'
import type { TestGroup } from '@shigjetademy/shared/tests'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SelectField } from '#/components/SelectField'
import { SkeletonRows } from '#/components/SkeletonRows'
import { TableToolbar } from '#/components/TableToolbar'
import { useTestGroups } from '../hooks/use-test-groups'
import { useTests } from '../hooks/use-tests'
import { TestFormDialog } from './test-form-dialog'
import { TestList } from './test-list'

interface GroupTestsProps {
  organizationId: string
  timeZone: string
}

/** For lecturers and staff: the groups they set tests for, one at a time */
export function GroupTests({ organizationId, timeZone }: GroupTestsProps) {
  const groups = useTestGroups(organizationId)

  if (groups.status === 'error') return <LoadError what="groups" onRetry={() => void groups.refetch()} />
  if (!groups.data) return <SkeletonRows />
  if (groups.data.length === 0) return <EmptyMessage icon={FileQuestion} title="You don’t teach a group yet." text="Tests show for the groups you teach." />
  return <PickedGroupTests organizationId={organizationId} timeZone={timeZone} groups={groups.data} />
}

interface PickedGroupTestsProps extends GroupTestsProps {
  groups: TestGroup[]
}

const groupLabel = (group: TestGroup) => `${group.name} · ${group.course_name}${group.is_archived ? ' (archived)' : ''}`

/** The group picker and Set test in one row, and the chosen group's tests under them */
function PickedGroupTests({ organizationId, timeZone, groups }: PickedGroupTestsProps) {
  const [pickedId, setPickedId] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const group = groups.find((item) => item.id === pickedId) ?? groups[0]
  const tests = useTests({ organizationId, groupId: group.id })

  return (
    <>
      <div className="px-[clamp(20px,3.4vw,44px)] pb-5">
        <TableToolbar
          addLabel="Set test"
          onAdd={group.can_set ? () => dialogRef.current?.showModal() : undefined}
          search={
            <div className="w-[min(100%,320px)]">
              <SelectField id="test-group-picker" label="Group" value={group.id} onChange={(event) => setPickedId(event.target.value)}>
                {groups.map((item) => (
                  <option key={item.id} value={item.id}>
                    {groupLabel(item)}
                  </option>
                ))}
              </SelectField>
            </div>
          }
        />
      </div>
      <div className="grid gap-4 px-[clamp(20px,3.4vw,44px)] pt-4 pb-10">
        {group.is_archived ? (
          <p className="flex items-center gap-2 rounded-xl bg-kraft-wash px-4 py-3 font-[550] text-kraft-ink">
            <Archive size={17} strokeWidth={2} aria-hidden="true" />
            This group is archived. Its tests and results stay readable, and nothing can be changed.
          </p>
        ) : null}
        <TestList organizationId={organizationId} timeZone={timeZone} status={tests.status} tests={tests.data} onRetry={() => void tests.refetch()} />
      </div>
      {group.can_set ? <TestFormDialog key={group.id} dialogRef={dialogRef} organizationId={organizationId} group={group} timeZone={timeZone} /> : null}
    </>
  )
}
