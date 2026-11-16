import { useId } from 'react'
import type { ChangeEvent, FormEventHandler } from 'react'
import { useWatch } from 'react-hook-form'
import type { UseFormReturn } from 'react-hook-form'
import { MATERIAL_FILE_ACCEPT, MATERIAL_NOTE_MAX_LENGTH, MATERIAL_URL_MAX_LENGTH } from '@shigjetademy/shared/materials'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { INPUT_CLASS } from '#/modules/auth/components/auth-field'
import { MATERIAL_FORM_KINDS, MATERIAL_KIND_LABELS } from '../utils/material-form'
import type { MaterialFormValues } from '../utils/material-form'
import { fieldProps } from '../utils/field-props'
import { MaterialDetailsFields, MaterialField, MaterialFormFooter } from './material-form-parts'

interface MaterialFormFieldsProps {
  form: UseFormReturn<MaterialFormValues>
  /** The sections already used in the space, offered as suggestions */
  sectionNames: string[]
  isPending: boolean
  error: unknown
  onSubmit: FormEventHandler<HTMLFormElement>
  onCancel: () => void
}

/** The add form: what kind of material, the file, link or note itself, a title, and an optional description and section */
export function MaterialFormFields({ form, sectionNames, isPending, error, onSubmit, onCancel }: MaterialFormFieldsProps) {
  const ids = { file: useId(), url: useId(), body: useId() }
  const kind = useWatch({ control: form.control, name: 'kind' })
  const { errors } = form.formState
  const fieldError = (fieldName: keyof MaterialFormValues) => getFieldError<MaterialFormValues>({ fieldName, formErrors: errors, backendError: error })

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => form.setValue('file', event.target.files?.[0] ?? null, { shouldValidate: form.formState.isSubmitted })

  return (
    <form className="flex min-h-0 flex-col" noValidate onSubmit={onSubmit}>
      <div className="grid gap-5 overflow-y-auto px-6 py-5">
        <fieldset className="grid gap-2" disabled={isPending}>
          <legend className="mb-1 text-[0.987rem] font-[650]">Type</legend>
          <div className="flex flex-wrap gap-2">
            {MATERIAL_FORM_KINDS.map((item) => (
              <label key={item} className="flex items-center gap-3 rounded-xl border border-rule px-3 py-2 hover:bg-mist has-checked:border-green-deep has-checked:bg-green-wash">
                <input type="radio" className="size-4 accent-green-deep" value={item} {...form.register('kind')} />
                <span className="font-semibold">{MATERIAL_KIND_LABELS[item]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {kind === 'FILE' ? (
          <MaterialField id={ids.file} label="File" hint="PDF, Word, PowerPoint, Excel, image or text, up to 20 MB" error={fieldError('file')}>
            <input
              id={ids.file}
              type="file"
              accept={MATERIAL_FILE_ACCEPT}
              className="text-[0.95rem] file:mr-3 file:rounded-lg file:border-0 file:bg-mist file:px-3 file:py-2 file:font-semibold"
              {...fieldProps({ id: ids.file, error: fieldError('file'), isPending })}
              onChange={handleFileChange}
            />
          </MaterialField>
        ) : null}

        {kind === 'LINK' ? (
          <MaterialField id={ids.url} label="Web address" error={fieldError('url')}>
            <input id={ids.url} type="url" inputMode="url" placeholder="https://" className={INPUT_CLASS} maxLength={MATERIAL_URL_MAX_LENGTH} {...fieldProps({ id: ids.url, error: fieldError('url'), isPending })} {...form.register('url')} />
          </MaterialField>
        ) : null}

        {kind === 'NOTE' ? (
          <MaterialField id={ids.body} label="Note" error={fieldError('body')}>
            <textarea id={ids.body} className={`${INPUT_CLASS} min-h-[160px] resize-y py-3`} maxLength={MATERIAL_NOTE_MAX_LENGTH} {...fieldProps({ id: ids.body, error: fieldError('body'), isPending })} {...form.register('body')} />
          </MaterialField>
        ) : null}

        <MaterialDetailsFields
          fields={{ title: form.register('title'), description: form.register('description'), section: form.register('section') }}
          errors={{ title: fieldError('title'), description: fieldError('description'), section: fieldError('section') }}
          sectionNames={sectionNames}
          isPending={isPending}
        />

        {error ? <FormAlert>{getErrorMessage(error)}</FormAlert> : null}
      </div>

      <MaterialFormFooter submitLabel="Share" isPending={isPending} onCancel={onCancel} />
    </form>
  )
}
