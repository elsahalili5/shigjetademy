import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { EMPTY_MATERIAL_FORM, materialFormSchema } from '../utils/material-form'
import type { MaterialFormValues } from '../utils/material-form'

export function useMaterialForm() {
  return useForm<MaterialFormValues>({ resolver: zodResolver(materialFormSchema), defaultValues: EMPTY_MATERIAL_FORM })
}
