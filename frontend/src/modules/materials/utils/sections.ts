import { GENERAL_SECTION } from '@shigjetademy/shared/materials'
import type { Material } from '@shigjetademy/shared/materials'

export type MaterialSection = {
  name: string
  materials: Material[]
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/** The materials by section, General (those without one) first and the rest in natural order, so Week 2 comes before Week 10; each keeps the list's order */
export const groupBySection = (materials: Material[]): MaterialSection[] => {
  const bySection = new Map<string, Material[]>()
  for (const material of materials) {
    const name = material.section ?? GENERAL_SECTION
    bySection.set(name, [...(bySection.get(name) ?? []), material])
  }
  const names = [...bySection.keys()].sort((first, second) => (first === GENERAL_SECTION ? -1 : second === GENERAL_SECTION ? 1 : collator.compare(first, second)))
  return names.map((name) => ({ name, materials: bySection.get(name) ?? [] }))
}

/** The sections already used in a space, offered when adding another material */
export const getSectionNames = (materials: Material[] | undefined) => [...new Set((materials ?? []).flatMap((material) => (material.section ? [material.section] : [])))].sort(collator.compare)
