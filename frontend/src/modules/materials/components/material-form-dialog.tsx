import type { FormEvent, RefObject } from 'react'
import type { MaterialSpace } from '@shigjetademy/shared/materials'
import { FormDialog } from '#/components/FormDialog'
import { getSpaceLabel } from '#/lib/space'
import { useMaterialForm } from '../hooks/use-material-form'
import { useShareMaterial } from '../hooks/use-share-material'
import { EMPTY_MATERIAL_FORM, toMaterialRequest } from '../utils/material-form'
import type { MaterialFormValues } from '../utils/material-form'
import { MaterialFormFields } from './material-form-fields'

interface MaterialFormDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  /** Where the new material is shared: the space chosen on the page */
  space: MaterialSpace
  sectionNames: string[]
}

/** Share a file, a link or a note with the chosen group or course */
export function MaterialFormDialog({ dialogRef, organizationId, space, sectionNames }: MaterialFormDialogProps) {
  const form = useMaterialForm()
  const shareMaterial = useShareMaterial(organizationId)

  const handleClose = () => {
    dialogRef.current?.close()
    form.reset(EMPTY_MATERIAL_FORM)
    shareMaterial.reset()
  }

  const handleValid = (values: MaterialFormValues) => {
    const request = toMaterialRequest({ values, space })
    if (request) shareMaterial.mutate(request, { onSuccess: handleClose })
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => void form.handleSubmit(handleValid)(event)

  return (
    <FormDialog dialogRef={dialogRef} title="Add material" subtitle={`Shared with ${getSpaceLabel(space)}.`} onClose={handleClose}>
      <MaterialFormFields form={form} sectionNames={sectionNames} isPending={shareMaterial.isPending} error={shareMaterial.error} onSubmit={handleSubmit} onCancel={handleClose} />
    </FormDialog>
  )
}
