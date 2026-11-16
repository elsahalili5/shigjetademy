import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { materialDetailsSchema } from '@shigjetademy/shared/materials'
import type { Material, MaterialDetailsInput } from '@shigjetademy/shared/materials'

/** The edit form, starting from the material's saved title, description and section */
export function useMaterialDetailsForm(material: Material) {
  return useForm<MaterialDetailsInput>({
    resolver: zodResolver(materialDetailsSchema),
    defaultValues: { title: material.title, description: material.description ?? '', section: material.section ?? '' },
  })
}
