import type { FormEvent, RefObject } from 'react'
import type { Material, MaterialDetailsInput } from '@shigjetademy/shared/materials'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { FormDialogFooter } from '#/components/FormDialogFooter'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { useMaterialDetailsForm } from '../hooks/use-material-details-form'
import { useUpdateMaterial } from '../hooks/use-update-material'
import { MaterialDetailsFields } from './material-form-parts'

interface MaterialEditDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  material: Material
  sectionNames: string[]
}

/** Change a material's title, description and section; what it holds stays */
export function MaterialEditDialog({ dialogRef, organizationId, material, sectionNames }: MaterialEditDialogProps) {
  const form = useMaterialDetailsForm(material)
  const updateMaterial = useUpdateMaterial({ organizationId, materialId: material.id })
  const { errors } = form.formState
  const fieldError = (fieldName: keyof MaterialDetailsInput) => getFieldError<MaterialDetailsInput>({ fieldName, formErrors: errors, backendError: updateMaterial.error })

  const handleClose = () => {
    dialogRef.current?.close()
    form.reset()
    updateMaterial.reset()
  }

  const handleValid = (values: MaterialDetailsInput) => updateMaterial.mutate(values, { onSuccess: () => dialogRef.current?.close() })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => void form.handleSubmit(handleValid)(event)

  return (
    <FormDialog dialogRef={dialogRef} title="Edit material" subtitle="Changes show to everyone in the group or course." onClose={handleClose}>
      <form className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
        <div className="grid gap-5 overflow-y-auto px-6 py-5">
          <MaterialDetailsFields
            fields={{ title: form.register('title'), description: form.register('description'), section: form.register('section') }}
            errors={{ title: fieldError('title'), description: fieldError('description'), section: fieldError('section') }}
            sectionNames={sectionNames}
            isPending={updateMaterial.isPending}
          />
          {updateMaterial.error ? <FormAlert>{getErrorMessage(updateMaterial.error)}</FormAlert> : null}
        </div>
        <FormDialogFooter submitLabel="Save changes" isPending={updateMaterial.isPending} onCancel={handleClose} />
      </form>
    </FormDialog>
  )
}
