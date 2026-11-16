import { useRef, useState } from 'react'
import { Archive, BookOpen } from 'lucide-react'
import type { MaterialSpace } from '@shigjetademy/shared/materials'
import { DashboardPageHeader } from '#/components/DashboardPageHeader'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SelectField } from '#/components/SelectField'
import { SkeletonRows } from '#/components/SkeletonRows'
import { TableToolbar } from '#/components/TableToolbar'
import { getSpaceKey, getSpaceLabel } from '#/lib/space'
import { useMaterialSpaces } from '../hooks/use-material-spaces'
import { useMaterials } from '../hooks/use-materials'
import { getSectionNames } from '../utils/sections'
import { MaterialFormDialog } from './material-form-dialog'
import { MaterialList } from './material-list'

interface MaterialsPageProps {
  organizationId: string
  organizationName: string
}

/** Files, links and notes shared with the member's groups and courses, one group or course at a time */
export function MaterialsPage({ organizationId, organizationName }: MaterialsPageProps) {
  const spaces = useMaterialSpaces(organizationId)

  return (
    <div className="flex h-full min-w-0 flex-col overflow-y-auto">
      <DashboardPageHeader icon={BookOpen} title="Learning materials" subtitle={`${organizationName} · files, links and notes for your groups and courses`} />
      <MaterialsBody organizationId={organizationId} status={spaces.status} spaces={spaces.data} onRetry={() => void spaces.refetch()} />
    </div>
  )
}

interface MaterialsBodyProps {
  organizationId: string
  status: 'pending' | 'error' | 'success'
  spaces?: MaterialSpace[]
  onRetry: () => void
}

function MaterialsBody({ organizationId, status, spaces, onRetry }: MaterialsBodyProps) {
  if (status === 'error') return <LoadError what="groups and courses" onRetry={onRetry} />
  if (!spaces) return <SkeletonRows />
  if (spaces.length === 0) return <EmptyMessage icon={BookOpen} title="You are not in a group or course yet." text="Materials show for the groups and courses you belong to." />
  return <SpaceMaterials organizationId={organizationId} spaces={spaces} />
}

interface SpaceMaterialsProps {
  organizationId: string
  spaces: MaterialSpace[]
}

/** The space picker and add button in one row, and the chosen space's materials under them */
function SpaceMaterials({ organizationId, spaces }: SpaceMaterialsProps) {
  const [pickedKey, setPickedKey] = useState<string | null>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const space = spaces.find((item) => getSpaceKey(item) === pickedKey) ?? spaces[0]
  const materials = useMaterials({ organizationId, space })

  return (
    <>
      <div className="px-[clamp(20px,3.4vw,44px)] pb-5">
        <TableToolbar
          addLabel="Add material"
          onAdd={space.can_post ? () => dialogRef.current?.showModal() : undefined}
          search={
            <div className="w-[min(100%,320px)]">
              <SelectField id="material-space-picker" label="Group or course" value={getSpaceKey(space)} onChange={(event) => setPickedKey(event.target.value)}>
                {spaces.map((item) => (
                  <option key={getSpaceKey(item)} value={getSpaceKey(item)}>
                    {item.is_archived ? `${getSpaceLabel(item)} (archived)` : getSpaceLabel(item)}
                  </option>
                ))}
              </SelectField>
            </div>
          }
        />
      </div>
      <div className="grid gap-4 px-[clamp(20px,3.4vw,44px)] pt-4 pb-10">
        {space.is_archived ? (
          <p className="flex items-center gap-2 rounded-xl bg-kraft-wash px-4 py-3 font-[550] text-kraft-ink">
            <Archive size={17} strokeWidth={2} aria-hidden="true" />
            {`This ${space.kind === 'GROUP' ? 'group' : 'course'} is archived. Its materials stay readable, and nothing new can be added.`}
          </p>
        ) : null}
        <MaterialList organizationId={organizationId} status={materials.status} materials={materials.data} onRetry={() => void materials.refetch()} />
      </div>
      {space.can_post ? <MaterialFormDialog key={getSpaceKey(space)} dialogRef={dialogRef} organizationId={organizationId} space={space} sectionNames={getSectionNames(materials.data)} /> : null}
    </>
  )
}
