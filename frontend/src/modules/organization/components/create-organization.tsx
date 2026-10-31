import { useId } from 'react'
import type { ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Baby, ChevronDown, GraduationCap, Loader2, Presentation, School, Shapes, UserRound } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { ORGANIZATION_TYPES, STUDENT_COUNTS } from '@shigjetademy/shared'
import type { OrganizationType } from '@shigjetademy/shared'
import { COUNTRIES, CURRENCIES, ORGANIZATION_NAME_MAX } from '@shigjetademy/shared/organization'
import type { CreateOrganizationInput } from '@shigjetademy/shared/organization'
import wordmark from '#/assets/brand/shigjetademy-wordmark.png'
import { FormAlert } from '#/components/FormAlert'
import { getErrorMessage, getFieldError } from '#/lib/error-message'
import { FieldError, INPUT_CLASS } from '#/modules/auth/components/auth-field'
import { useCreateOrganizationForm } from '../hooks/use-create-organization-form'
import { currencyNames, regionNames } from '../utils/format'
import { OrganizationPreview } from './organization-preview'

const TYPE_DETAILS = {
  School: { icon: School, hint: 'Classes, terms and report cards' },
  Kindergarten: { icon: Baby, hint: 'Early-years groups and daily care' },
  Academy: { icon: GraduationCap, hint: 'Courses, languages or tutoring' },
  'Training centre': { icon: Presentation, hint: 'Professional or vocational training' },
  'Independent lecturer': { icon: UserRound, hint: 'You teach your own students' },
  Other: { icon: Shapes, hint: 'Something else, it adapts' },
} as const satisfies Record<OrganizationType, { icon: LucideIcon; hint: string }>

const VARIANT_COPY = {
  onboarding: {
    eyebrow: 'Step 2 of 2 · Your organization',
    title: 'Set up your organization',
    intro: 'You’ll be its owner. You can invite admins and lecturers once it’s ready.',
  },
  another: {
    eyebrow: 'New organization',
    title: 'Create another organization',
    intro: 'You’ll be its owner too. Its members, locations and activity stay separate from your other organizations.',
  },
} as const

type CreateOrganizationVariant = keyof typeof VARIANT_COPY

interface CreateOrganizationProps {
  variant: CreateOrganizationVariant
  onCreate: (input: CreateOrganizationInput) => void
  onEdit: () => void
  isPending: boolean
  backendError: unknown
}

/** Where an owner names a new organization: form on the left, a live workspace preview on the right. */
export function CreateOrganization({ variant, onCreate, onEdit, isPending, backendError }: CreateOrganizationProps) {
  const createOrganizationForm = useCreateOrganizationForm({ onSubmit: onCreate })
  const { form } = createOrganizationForm
  const { errors } = form.formState
  const fieldError = (fieldName: keyof CreateOrganizationInput) =>
    getFieldError<CreateOrganizationInput>({ fieldName, formErrors: errors, backendError })
  const copy = VARIANT_COPY[variant]
  const ids = { name: useId(), type: useId(), country: useId(), currency: useId(), size: useId() }

  const name = form.watch('name')
  const type = form.watch('type')
  const country = form.watch('country')

  return (
    <div className="grid h-svh grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-(--frame) bg-haze p-(--frame) max-[960px]:h-auto max-[960px]:min-h-svh max-[960px]:grid-cols-1">
      <main className="min-h-0 overflow-y-auto px-[clamp(20px,5vw,72px)] py-[clamp(20px,3vw,36px)]">
        <Link className="inline-flex no-underline" to="/" aria-label="Shigjetademy home">
          <img src={wordmark} alt="Shigjetademy" width={152} height={38} />
        </Link>

        <div className="mx-auto mt-[clamp(32px,6vh,72px)] w-[min(100%,560px)] pb-10">
          {variant === 'another' ? (
            <Link className="mb-6 inline-flex items-center gap-1.5 font-semibold text-ink-2 no-underline hover:text-ink" to="/dashboard">
              <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
              Back to your dashboard
            </Link>
          ) : null}
          <p className="font-data text-[0.807rem] tracking-[0.06em] text-ink-3 uppercase">{copy.eyebrow}</p>
          <h1 className="mt-3 text-[clamp(2rem,3.4vw,2.8rem)] font-bold tracking-[-0.034em]">{copy.title}</h1>
          <p className="mt-2.5 text-ink-2">{copy.intro}</p>

          <form className="mt-9 grid gap-7" noValidate onSubmit={createOrganizationForm.handleSubmit} onChange={onEdit}>
            <Field label="Organization name" htmlFor={ids.name} error={fieldError('name')}>
              <input
                id={ids.name}
                className={INPUT_CLASS}
                type="text"
                autoComplete="organization"
                maxLength={ORGANIZATION_NAME_MAX}
                placeholder="Oxford Academy"
                disabled={isPending}
                aria-invalid={!!fieldError('name')}
                aria-describedby={fieldError('name') ? `${ids.name}-error` : undefined}
                {...form.register('name')}
              />
            </Field>

            <fieldset className="grid min-w-0 gap-2.5" aria-describedby={fieldError('type') ? ids.type : undefined}>
              <legend className="mb-2.5 text-[0.987rem] font-[650]">What kind of organization is it?</legend>
              <div className="grid grid-cols-2 gap-2.5 max-[520px]:grid-cols-1">
                {ORGANIZATION_TYPES.map((option) => {
                  const { icon: Icon, hint } = TYPE_DETAILS[option]
                  return (
                    <label
                      key={option}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-rule-strong bg-white p-3.5 transition-[border-color,box-shadow,background-color] duration-150 hover:border-ink-3 has-checked:border-green-deep has-checked:bg-green-wash/40 has-checked:shadow-[0_0_0_1px_var(--green-deep)] has-focus-visible:shadow-[0_0_0_3px_var(--green-wash)] has-disabled:opacity-60"
                    >
                      <input className="visually-hidden" type="radio" value={option} disabled={isPending} {...form.register('type')} />
                      <span className="grid size-9 flex-none place-items-center rounded-[10px] bg-mist text-ink-2" aria-hidden="true">
                        <Icon size={18} strokeWidth={1.9} />
                      </span>
                      <span className="grid min-w-0 leading-snug">
                        <span className="font-semibold">{option}</span>
                        <span className="text-[0.93rem] text-ink-3">{hint}</span>
                      </span>
                    </label>
                  )
                })}
              </div>
              {fieldError('type') ? <FieldError id={ids.type}>{fieldError('type')}</FieldError> : null}
            </fieldset>

            <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-4 max-[520px]:grid-cols-1">
              <Field label="Country" htmlFor={ids.country} error={fieldError('country')}>
                <SelectFrame>
                  <select id={ids.country} className={`${INPUT_CLASS} appearance-none pr-10`} disabled={isPending} {...createOrganizationForm.countryField}>
                    {COUNTRIES.map((entry) => (
                      <option key={entry.code} value={entry.code}>
                        {regionNames.of(entry.code)}
                      </option>
                    ))}
                  </select>
                </SelectFrame>
              </Field>

              <Field label="Currency" htmlFor={ids.currency} error={fieldError('currency')}>
                <SelectFrame>
                  <select id={ids.currency} className={`${INPUT_CLASS} appearance-none pr-10`} disabled={isPending} {...form.register('currency')}>
                    {CURRENCIES.map((code) => (
                      <option key={code} value={code}>
                        {code} · {currencyNames.of(code)}
                      </option>
                    ))}
                  </select>
                </SelectFrame>
              </Field>
            </div>

            <Field label="How many students do you have?" hint="Optional" htmlFor={ids.size}>
              <SelectFrame>
                <select id={ids.size} className={`${INPUT_CLASS} appearance-none pr-10`} disabled={isPending} defaultValue="" {...createOrganizationForm.sizeField}>
                  <option value="">Choose a range</option>
                  {STUDENT_COUNTS.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </SelectFrame>
            </Field>

            {backendError ? <FormAlert>{getErrorMessage(backendError)}</FormAlert> : null}

            <button className="button button--primary mt-1 min-h-[52px] w-full" type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="animate-[spin_700ms_linear_infinite] motion-reduce:animate-[spin_1600ms_linear_infinite]" size={18} strokeWidth={2.2} aria-hidden="true" />
                  Creating your organization…
                </>
              ) : (
                <>
                  Create organization
                  <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      <OrganizationPreview name={name} type={type} country={country} />
    </div>
  )
}

interface FieldProps {
  label: string
  htmlFor: string
  hint?: string
  error?: string
  children: ReactNode
}

function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  const errorId = `${htmlFor}-error`
  return (
    <div className="grid min-w-0 gap-1.5">
      <label className="text-[0.987rem] font-[650]" htmlFor={htmlFor}>
        {label}
        {hint ? <span className="ml-1.5 font-normal text-ink-3">{hint}</span> : null}
      </label>
      {children}
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  )
}

interface SelectFrameProps {
  children: ReactNode
}

function SelectFrame({ children }: SelectFrameProps) {
  return (
    <div className="relative">
      {children}
      <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink-3" size={18} strokeWidth={1.9} aria-hidden="true" />
    </div>
  )
}
