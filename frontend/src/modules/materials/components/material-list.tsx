import { useId } from 'react'
import { BookOpen } from 'lucide-react'
import type { Material } from '@shigjetademy/shared/materials'
import { EmptyMessage } from '#/components/EmptyMessage'
import { LoadError } from '#/components/LoadError'
import { SkeletonRows } from '#/components/SkeletonRows'
import { getSectionNames, groupBySection } from '../utils/sections'
import { MaterialItem } from './material-item'

interface MaterialListProps {
  organizationId: string
  status: 'pending' | 'error' | 'success'
  materials?: Material[]
  onRetry: () => void
}

/** The chosen space's materials, one block per section with General first */
export function MaterialList({ organizationId, status, materials, onRetry }: MaterialListProps) {
  if (status === 'error') return <LoadError what="materials" onRetry={onRetry} />
  if (!materials) return <SkeletonRows />
  if (materials.length === 0) return <EmptyMessage icon={BookOpen} title="No materials here yet." text="Files, links and notes shared with this group or course show here." />
  const sectionNames = getSectionNames(materials)
  return (
    <div className="grid gap-6">
      {groupBySection(materials).map((section) => (
        <MaterialSectionBlock key={section.name} organizationId={organizationId} name={section.name} materials={section.materials} sectionNames={sectionNames} />
      ))}
    </div>
  )
}

interface MaterialSectionBlockProps {
  organizationId: string
  name: string
  materials: Material[]
  sectionNames: string[]
}

function MaterialSectionBlock({ organizationId, name, materials, sectionNames }: MaterialSectionBlockProps) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-2.5 font-data text-[0.84rem] tracking-[0.06em] text-ink-2 uppercase">
        {name}
      </h2>
      <ul className="rounded-card border border-rule">
        {materials.map((material) => (
          <MaterialItem key={material.id} organizationId={organizationId} material={material} sectionNames={sectionNames} />
        ))}
      </ul>
    </section>
  )
}
