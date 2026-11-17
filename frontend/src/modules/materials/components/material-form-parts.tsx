import { useId } from 'react'
import type { UseFormRegisterReturn } from 'react-hook-form'
import { MATERIAL_DESCRIPTION_MAX_LENGTH, MATERIAL_SECTION_MAX_LENGTH, MATERIAL_TITLE_MAX_LENGTH } from '@shigjetademy/shared/materials'
import { FormField } from '#/components/FormField'
import { fieldProps } from '#/lib/field-props'
import { INPUT_CLASS } from '#/modules/auth/components/auth-field'

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
      <FormField id={ids.title} label="Title" error={errors.title}>
        <input id={ids.title} className={INPUT_CLASS} maxLength={MATERIAL_TITLE_MAX_LENGTH} {...fieldProps({ id: ids.title, error: errors.title, isPending })} {...fields.title} />
      </FormField>

      <FormField id={ids.description} label="Description" hint="Optional" error={errors.description}>
        <textarea id={ids.description} className={`${INPUT_CLASS} min-h-[84px] resize-y py-3`} maxLength={MATERIAL_DESCRIPTION_MAX_LENGTH} {...fieldProps({ id: ids.description, error: errors.description, isPending })} {...fields.description} />
      </FormField>

      <FormField id={ids.section} label="Section" hint="Optional, like Week 3" error={errors.section}>
        <input id={ids.section} list={ids.sections} className={INPUT_CLASS} maxLength={MATERIAL_SECTION_MAX_LENGTH} {...fieldProps({ id: ids.section, error: errors.section, isPending })} {...fields.section} />
        <datalist id={ids.sections}>
          {sectionNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </FormField>
    </>
  )
}
