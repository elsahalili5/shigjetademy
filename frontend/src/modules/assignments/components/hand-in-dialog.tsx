import { useId, useState } from 'react'
import type { ChangeEvent, FormEvent, RefObject } from 'react'
import { HAND_IN_TEXT_MAX_LENGTH } from '@shigjetademy/shared/assignments'
import type { StudentAssignment } from '@shigjetademy/shared/assignments'
import { MATERIAL_FILE_ACCEPT } from '@shigjetademy/shared/materials'
import { FormAlert } from '#/components/FormAlert'
import { FormDialog } from '#/components/FormDialog'
import { FormDialogFooter } from '#/components/FormDialogFooter'
import { FormField } from '#/components/FormField'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { fieldProps } from '#/lib/field-props'
import { INPUT_CLASS } from '#/modules/auth/components/auth-field'
import { useHandIn } from '../hooks/use-hand-in'
import { useHandInForm } from '../hooks/use-hand-in-form'
import { toHandInFields, toHandInFormValues } from '../utils/hand-in-form'
import type { HandInFormValues } from '../utils/hand-in-form'

interface HandInDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>
  organizationId: string
  assignment: StudentAssignment
}

/** Hand in an answer, a file or both; handing in again replaces it until it is marked */
export function HandInDialog({ dialogRef, organizationId, assignment }: HandInDialogProps) {
  const ids = { text: useId(), file: useId(), keepFile: useId() }
  const form = useHandInForm(toHandInFormValues(assignment.hand_in))
  const handIn = useHandIn({ organizationId, assignmentId: assignment.id })
  const savedFile = assignment.hand_in?.file ?? null
  const isPending = handIn.isPending
  const { errors } = form.formState
  const fieldError = (fieldName: keyof HandInFormValues) => getFieldError<HandInFormValues>({ fieldName, formErrors: errors, backendError: handIn.error })

  // Bumped on close, so the file input, which the form can't clear, starts empty again
  const [formKey, setFormKey] = useState(0)

  const handleClose = () => {
    dialogRef.current?.close()
    form.reset()
    handIn.reset()
    setFormKey((key) => key + 1)
  }

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => form.setValue('file', event.target.files?.[0] ?? null, { shouldValidate: form.formState.isSubmitted })

  const handleValid = (values: HandInFormValues) => handIn.mutate({ fields: toHandInFields(values), file: values.file }, { onSuccess: () => dialogRef.current?.close() })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => void form.handleSubmit(handleValid)(event)

  return (
    <FormDialog dialogRef={dialogRef} title={assignment.hand_in ? 'Replace hand-in' : 'Hand in'} subtitle={`${assignment.title}. You can hand in again until it is marked.`} onClose={handleClose}>
      <form key={formKey} className="flex min-h-0 flex-col" noValidate onSubmit={handleSubmit}>
        <div className="grid gap-5 overflow-y-auto px-6 py-5">
          <FormField id={ids.text} label="Your answer" error={fieldError('text')}>
            <textarea id={ids.text} className={`${INPUT_CLASS} min-h-[160px] resize-y py-3`} maxLength={HAND_IN_TEXT_MAX_LENGTH} {...fieldProps({ id: ids.text, error: fieldError('text'), isPending })} {...form.register('text')} />
          </FormField>

          <FormField id={ids.file} label="File" hint={savedFile ? 'Optional, replaces the file you handed in' : 'Optional, up to 20 MB'} error={fieldError('file')}>
            <input
              id={ids.file}
              type="file"
              accept={MATERIAL_FILE_ACCEPT}
              className="text-[0.95rem] file:mr-3 file:rounded-lg file:border-0 file:bg-mist file:px-3 file:py-2 file:font-semibold"
              {...fieldProps({ id: ids.file, error: fieldError('file'), isPending })}
              onChange={handleFileChange}
            />
          </FormField>

          {savedFile ? (
            <label htmlFor={ids.keepFile} className="flex items-center gap-3">
              <input id={ids.keepFile} type="checkbox" className="size-4 accent-green-deep" disabled={isPending} {...form.register('keep_file')} />
              <span>Keep {savedFile.name}</span>
            </label>
          ) : null}

          {handIn.error ? <FormAlert>{getErrorMessage(handIn.error)}</FormAlert> : null}
        </div>
        <FormDialogFooter submitLabel="Hand in" isPending={isPending} onCancel={handleClose} />
      </form>
    </FormDialog>
  )
}
