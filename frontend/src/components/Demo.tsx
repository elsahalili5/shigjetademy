import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { AlertCircle, ArrowRight, CheckCircle2, ChevronDown } from 'lucide-react'
import { Arcs } from './Arcs'
import { Link } from '@tanstack/react-router'
import type { OrganizationType, STUDENT_COUNTS } from '@shigjetademy/shared'
import { SITE } from '#/lib/site'

type Status = { kind: 'idle' } | { kind: 'sent'; name: string; email: string }
type Errors = Partial<Record<'name' | 'email' | 'organization' | 'orgType', string>>

// Values go into the email; labels read inside the sentence
const ORG_TYPES = [
  { value: 'School', label: 'a school' },
  { value: 'Kindergarten', label: 'a kindergarten' },
  { value: 'Academy', label: 'an academy' },
  { value: 'Training centre', label: 'a training centre' },
  { value: 'Independent lecturer', label: 'an independent lecturer' },
  { value: 'Other', label: 'something else' },
] satisfies { value: OrganizationType; label: string }[]
const SIZES = [
  { value: 'Under 50 students', label: 'under 50' },
  { value: '50–250 students', label: '50–250' },
  { value: '250–1,000 students', label: '250–1,000' },
  { value: 'Over 1,000 students', label: 'over 1,000' },
] satisfies { value: (typeof STUDENT_COUNTS)[number]; label: string }[]

// A blank in the sentence: a line the answer is written on, sized to what is typed
const blank =
  'inline-block max-w-full min-w-[5ch] border-0 border-b-2 border-rule-strong bg-transparent px-0.5 pb-0.5 align-baseline leading-[1.2] font-bold tracking-[-0.02em] text-ink transition-colors duration-200 [field-sizing:content] placeholder:font-semibold placeholder:text-ink-3 hover:border-ink-3 focus:border-green-deep focus:outline-none aria-[invalid=true]:border-red'

function validate(data: FormData): Errors {
  const errors: Errors = {}
  // Sentence order, so errors list and focus follow the reading order
  if (!String(data.get('name') ?? '').trim()) errors.name = 'Enter your name.'
  if (!String(data.get('organization') ?? '').trim()) errors.organization = 'Enter your organization’s name.'
  if (!data.get('orgType')) errors.orgType = 'Choose the type of organization.'
  const email = String(data.get('email') ?? '').trim()
  if (!email) errors.email = 'Enter your email address.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter an email address like name@school.org.'
  return errors
}

export function Demo() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [errors, setErrors] = useState<Errors>({})

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    const found = validate(data)
    setErrors(found)
    const first = Object.keys(found)[0]
    if (first) {
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }

    // No backend for this form: it opens the visitor's mail app with the request written out
    const text = (key: string) => String(data.get(key) ?? '').trim()
    const body = [
      `Name: ${text('name')}`,
      `Email: ${text('email')}`,
      `Organization: ${text('organization')} (${text('orgType')})`,
      text('size') ? `Students: ${text('size')}` : '',
      text('message') ? `\n${text('message')}` : '',
    ]
      .filter(Boolean)
      .join('\n')
    const subject = `Demo request: ${text('organization')}`
    window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    setStatus({ kind: 'sent', name: text('name').split(' ')[0], email: text('email') })
  }

  const field = (name: keyof Errors) => ({
    name,
    id: `demo-${name}`,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `demo-${name}-error` : undefined,
  })

  const errorList = Object.entries(errors) as [keyof Errors, string][]

  return (
    // The close: a headline, then the request written as one sentence with blanks to fill
    <section
      data-flush-end
      className="relative isolate mt-[clamp(112px,14vw,176px)] overflow-hidden bg-haze text-ink [--arc-green:rgba(220,181,127,0.45)] [--arc-knot:rgba(220,181,127,0.45)] [--arc:rgba(20,42,61,0.06)]"
      id="demo"
      aria-labelledby="demo-title"
    >
      <Arcs className="-right-[160px] -bottom-[260px] -z-10 w-[620px] -rotate-[8deg] max-[900px]:hidden" />
      <div className="mx-auto max-w-(--max) px-(--gutter) py-[clamp(72px,10vw,128px)]">
        <div className="grid grid-cols-[minmax(0,7fr)_minmax(0,5fr)] items-end gap-[clamp(24px,4vw,64px)] border-b border-rule pb-[clamp(32px,4vw,48px)] max-[900px]:grid-cols-1">
          <h2 id="demo-title" className="text-[clamp(2.3rem,4.6vw,4.2rem)] leading-none font-bold tracking-[-0.035em] text-balance text-ink">
            See your own term in Shigjetademy.
          </h2>
          <div>
            <p className="max-w-[44ch] text-[1.189rem] text-ink-2">
              Tell us about your organization and we’ll show you the platform, set up around your classes.
            </p>
            <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2 [&>li]:flex [&>li]:items-baseline [&>li]:gap-2 [&>li]:text-[0.987rem] [&>li]:font-medium [&>li]:text-ink [&>li]:before:size-2 [&>li]:before:flex-none [&>li]:before:rounded-full [&>li]:before:bg-green [&>li]:before:content-[''] [&>li:nth-child(2)]:before:bg-kraft [&>li:nth-child(3)]:before:bg-coral [&>li:nth-child(4)]:before:bg-ink-3">
              <li>Enrolment and class lists</li>
              <li>Timetables and registers</li>
              <li>Fees and invoices</li>
              <li>Grades, reports and messages</li>
            </ul>
          </div>
        </div>

        {status.kind === 'sent' ? (
          <div className="mx-auto grid max-w-[30ch] justify-items-center gap-5 pt-[clamp(40px,5vw,64px)] text-center" role="status">
            <CheckCircle2 className="text-green-deep" size={40} strokeWidth={1.75} aria-hidden="true" />
            <p className="font-display text-[clamp(1.6rem,3.2vw,2.7rem)] leading-[1.25] font-bold tracking-[-0.025em] text-ink">
              Thanks, {status.name}. We’ll reply to <span className="text-green-deep">{status.email}</span> soon.
            </p>
            <button type="button" className="button button--ghost" onClick={() => setStatus({ kind: 'idle' })}>
              Send another message
            </button>
          </div>
        ) : (
          <form noValidate onSubmit={onSubmit} className="pt-[clamp(40px,5vw,64px)] text-center" aria-labelledby="demo-title">
            {/* Each blank keeps a real label for screen readers; the sentence is what sighted visitors read */}
            <p className="mx-auto max-w-[38ch] font-display text-[clamp(1.5rem,3.2vw,2.7rem)] leading-[1.75] font-semibold tracking-[-0.02em] text-ink-2 max-[640px]:leading-[1.65]">
              Hi, I’m{' '}
              <Blank label="Full name">
                <input {...field('name')} className={blank} autoComplete="name" placeholder="your name" size={9} />
              </Blank>{' '}
              from{' '}
              <Blank label="Organization name">
                <input {...field('organization')} className={blank} autoComplete="organization" placeholder="your organization" size={16} />
              </Blank>
              . We’re{' '}
              <Blank label="Organization type">
                <Select {...field('orgType')} placeholder="what kind of place" options={ORG_TYPES} isRequired />
              </Blank>{' '}
              with{' '}
              <Blank label="Number of students (optional)">
                <Select name="size" id="demo-size" placeholder="how many" options={SIZES} />
              </Blank>{' '}
              students. You can reach me at{' '}
              <Blank label="Work email">
                <input {...field('email')} className={blank} type="email" autoComplete="email" inputMode="email" placeholder="you@school.edu" size={14} />
              </Blank>
              .
            </p>

            {errorList.length > 0 && (
              <ul className="mt-6 grid justify-items-center gap-1.5 text-[1.009rem] font-medium text-red" role="alert">
                {errorList.map(([name, message]) => (
                  <li key={name} id={`demo-${name}-error`} className="flex items-center gap-2">
                    <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
                    {message}
                  </li>
                ))}
              </ul>
            )}

            <div className="mx-auto mt-[clamp(32px,4vw,48px)] grid max-w-[38rem] gap-[clamp(32px,4vw,48px)] [&_textarea]:text-center">
              <div className="field">
                <label htmlFor="demo-message">
                  Anything else we should know? <span>(optional)</span>
                </label>
                <textarea
                  name="message"
                  id="demo-message"
                  maxLength={2000}
                  placeholder="How you run your classes today and what you’d like to see."
                />
              </div>

              <div className="grid gap-3">
                <button className="button min-h-[56px] w-full bg-navy text-base text-white enabled:hover:bg-navy-2" type="submit">
                  Send message
                  <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                </button>
                <p className="text-[0.897rem] text-ink-3">
                  Student numbers and the note are optional. We only use these details to reply to you. See our{' '}
                  <Link to="/privacy" className="text-ink-2 underline underline-offset-2 hover:text-ink">
                    privacy policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </form>
        )}
      </div>
    </section>
  )
}

interface BlankProps {
  label: string
  children: ReactNode
}

/** A blank in the sentence with its label kept for assistive tech. */
function Blank({ label, children }: BlankProps) {
  return (
    <label className="inline">
      <span className="sr-only">{label}</span>
      {children}
    </label>
  )
}

interface SelectProps {
  name: string
  id: string
  placeholder: string
  options: { value: string; label: string }[]
  isRequired?: boolean
  'aria-invalid'?: boolean
  'aria-describedby'?: string
}

/** A dropdown blank: grey prompt until something is picked, chevron drawn after it. */
function Select({ placeholder, options, isRequired, ...rest }: SelectProps) {
  return (
    <span className="relative inline-block max-w-full">
      <select
        {...rest}
        defaultValue=""
        className={`${blank} cursor-pointer appearance-none pr-[1.1em] has-[option[value='']:checked]:font-semibold has-[option[value='']:checked]:text-ink-3`}
      >
        <option value="" disabled={isRequired}>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="font-sans text-base font-normal text-ink">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-0 bottom-[0.45em] size-[0.6em] text-ink-3" strokeWidth={2.4} aria-hidden="true" />
    </span>
  )
}
