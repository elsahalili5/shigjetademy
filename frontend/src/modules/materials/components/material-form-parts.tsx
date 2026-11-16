import { useId } from 'react'
import type { ReactNode } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { MATERIAL_DESCRIPTION_MAX_LENGTH, MATERIAL_SECTION_MAX_LENGTH, MATERIAL_TITLE_MAX_LENGTH } from '@shigjetademy/shared/materials'
import { FieldError, INPUT_CLASS } from '#/modules/auth/components/auth-field'
import { fieldProps } from '../utils/field-props'

interface MaterialFieldProps {
  id: string
  label: string
  hint?: string
  error: string | undefined
  children: ReactNode
}

/** A labelled field with its error under it */
export function MaterialField({ id, label, hint, error, children }: MaterialFieldProps) {
  return (
    <div className="grid gap-1.5">
      <label className="text-[0.987rem] font-[650]" htmlFor={id}>
        {label}
        {hint ? <span className="ml-1.5 font-normal text-ink-3">{hint}</span> : null}
      </label>
      {children}
      {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
    </div>
  )
}

type DetailsField = 'title' | 'description' | 'section'

interface MaterialDetailsFieldsProps {
  fields: Record<DetailsField, UseFormRegisterReturn>
  errors: Record<DetailsField, string | undefined>
  /** The sections already used in the space, offered as suggestions */
  sectionNames: string[]
  isPending: boolean
}

/** What every material has and what can change later: a title, and an optional description and section */
export function MaterialDetailsFields({ fields, errors, sectionNames, isPending }: MaterialDetailsFieldsProps) {
  const ids = { title: useId(), description: useId(), section: useId(), sections: useId() }
  return (
    <>
      <MaterialField id={ids.title} label="Title" error={errors.title}>
        <input id={ids.title} className={INPUT_CLASS} maxLength={MATERIAL_TITLE_MAX_LENGTH} {...fieldProps({ id: ids.title, error: errors.title, isPending })} {...fields.title} />
      </MaterialField>

      <MaterialField id={ids.description} label="Description" hint="Optional" error={errors.description}>
        <textarea id={ids.description} className={`${INPUT_CLASS} min-h-[84px] resize-y py-3`} maxLength={MATERIAL_DESCRIPTION_MAX_LENGTH} {...fieldProps({ id: ids.description, error: errors.description, isPending })} {...fields.description} />
      </MaterialField>

      <MaterialField id={ids.section} label="Section" hint="Optional, like Week 3" error={errors.section}>
        <input id={ids.section} list={ids.sections} className={INPUT_CLASS} maxLength={MATERIAL_SECTION_MAX_LENGTH} {...fieldProps({ id: ids.section, error: errors.section, isPending })} {...fields.section} />
        <datalist id={ids.sections}>
          {sectionNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </MaterialField>
    </>
  )
}

interface MaterialFormFooterProps {
  submitLabel: string
  isPending: boolean
  onCancel: () => void
}

export function MaterialFormFooter({ submitLabel, isPending, onCancel }: MaterialFormFooterProps) {
  return (
    <footer className="flex flex-wrap items-center justify-end gap-2.5 border-t border-rule px-6 py-4">
      <button type="button" className="button button--ghost min-h-11 px-4 text-base" onClick={onCancel}>
        Cancel
      </button>
      <button type="submit" className="button button--primary min-h-11 px-5 text-base" disabled={isPending}>
        {isPending ? 'Saving…' : submitLabel}
      </button>
    </footer>
  )
}
