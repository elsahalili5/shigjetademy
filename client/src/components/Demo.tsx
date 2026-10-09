import { useState } from 'react'
import type { FormEvent } from 'react'
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { Arcs } from './Arcs'

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent'; name: string; email: string } | { kind: 'error'; message: string }
type Errors = Partial<Record<'name' | 'email' | 'organization' | 'orgType', string>>

const ORG_TYPES = ['School', 'Academy', 'Training centre', 'Independent educator', 'Other']
const SIZES = ['Under 50 students', '50–250 students', '250–1,000 students', 'Over 1,000 students']

function validate(data: FormData): Errors {
  const errors: Errors = {}
  if (!String(data.get('name') ?? '').trim()) errors.name = 'Enter your name.'
  const email = String(data.get('email') ?? '').trim()
  if (!email) errors.email = 'Enter your email address.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter an email address like name@school.org.'
  if (!String(data.get('organization') ?? '').trim()) errors.organization = 'Enter your organization’s name.'
  if (!data.get('orgType')) errors.orgType = 'Choose the type of organization.'
  return errors
}

export function Demo() {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [errors, setErrors] = useState<Errors>({})

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
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

    setStatus({ kind: 'sending' })
    try {
      const res = await fetch('/api/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(data)),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(body?.error ?? 'The server could not save your request.')
      }
      setStatus({ kind: 'sent', name: String(data.get('name')).split(' ')[0], email: String(data.get('email')) })
    } catch (err) {
      const offline = err instanceof TypeError
      setStatus({
        kind: 'error',
        message: offline
          ? 'We couldn’t reach Shigjetademy. Check your connection and try again.'
          : `${(err as Error).message} Please try again.`,
      })
    }
  }

  const field = (name: keyof Errors) => ({
    name,
    id: `demo-${name}`,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `demo-${name}-error` : undefined,
  })

  const errorText = (name: keyof Errors) =>
    errors[name] ? (
      <span className="field-error" id={`demo-${name}-error`}>
        {errors[name]}
      </span>
    ) : null

  return (
    // The close: on the page's own ground, with the form card on it
    <section
      data-flush-end
      className="relative isolate mt-[clamp(112px,14vw,176px)] overflow-hidden bg-haze text-ink [--arc-green:rgba(220,181,127,0.45)] [--arc-knot:rgba(220,181,127,0.45)] [--arc:rgba(20,42,61,0.06)]"
      id="demo"
      aria-labelledby="demo-title"
    >
      <Arcs className="-bottom-[230px] -left-[120px] -z-10 w-[560px] rotate-[10deg]" />
      <div className="mx-auto grid max-w-(--max) grid-cols-[minmax(0,6fr)_minmax(0,5fr)] items-start gap-[clamp(40px,6vw,96px)] px-(--gutter) py-[clamp(72px,10vw,128px)] max-[900px]:grid-cols-1">
        <div>
          <h2 id="demo-title" className="text-[clamp(2.3rem,4.6vw,4.2rem)] leading-none font-bold tracking-[-0.035em] text-ink">See your own term in Shigjetademy.</h2>
          <p className="mt-[22px] max-w-[44ch] text-[1.06rem] text-ink-2">
            Tell us a little about your organization and we’ll arrange a walkthrough of the platform, built around
            how you already run your classes.
          </p>
          <ul className="mt-9 grid grid-cols-[repeat(2,minmax(0,max-content))] gap-x-8 gap-y-3 max-[480px]:grid-cols-1 [&>li]:flex [&>li]:items-baseline [&>li]:gap-2.5 [&>li]:font-medium [&>li]:text-ink [&>li]:before:size-[9px] [&>li]:before:flex-none [&>li]:before:rounded-full [&>li]:before:bg-green [&>li]:before:content-[''] [&>li:nth-child(2)]:before:bg-kraft [&>li:nth-child(3)]:before:bg-coral [&>li:nth-child(4)]:before:bg-ink-3">
            <li>Enrolment and class lists</li>
            <li>Timetables and registers</li>
            <li>Fees and invoices</li>
            <li>Grades, reports and messages</li>
          </ul>
        </div>

        {/* The form card needs a little lift off the cream */}
        <div className="rounded-card bg-white p-[clamp(22px,3vw,36px)] text-ink shadow-[0_1px_2px_rgba(20,42,61,0.06),0_30px_60px_-36px_rgba(20,42,61,0.4)]">
          {status.kind === 'sent' ? (
            <div className="grid justify-items-start gap-3 py-3" role="status">
              <CheckCircle2 className="text-green-deep" size={32} strokeWidth={1.75} aria-hidden="true" />
              <h3 className="text-[1.6rem]">Thanks, {status.name}. Your message is in.</h3>
              <p className="text-ink-2">
                We’ll reply to <strong>{status.email}</strong> soon.
              </p>
              <button type="button" className="button button--ghost" onClick={() => setStatus({ kind: 'idle' })}>
                Send another message
              </button>
            </div>
          ) : (
            <form noValidate onSubmit={onSubmit} className="grid gap-4">
              <div className="field">
                <label htmlFor="demo-name">Your name</label>
                <input {...field('name')} autoComplete="name" />
                {errorText('name')}
              </div>
              <div className="field">
                <label htmlFor="demo-email">Work email</label>
                <input {...field('email')} type="email" autoComplete="email" inputMode="email" />
                {errorText('email')}
              </div>
              <div className="field">
                <label htmlFor="demo-organization">Organization</label>
                <input {...field('organization')} autoComplete="organization" />
                {errorText('organization')}
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="demo-orgType">Type</label>
                  <select {...field('orgType')} defaultValue="">
                    <option value="" disabled>
                      Choose one
                    </option>
                    {ORG_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                  {errorText('orgType')}
                </div>
                <div className="field">
                  <label htmlFor="demo-size">
                    Size <span>(optional)</span>
                  </label>
                  <select name="size" id="demo-size" defaultValue="">
                    <option value="">Choose one</option>
                    {SIZES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {status.kind === 'error' && (
                <p className="flex items-start gap-2 rounded-lg bg-red-wash px-3 py-2.5 text-[0.88rem] text-[#8a3222] [&_svg]:mt-0.5 [&_svg]:flex-none" role="alert">
                  <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
                  {status.message}
                </p>
              )}

              <button className="button mt-1 min-h-[52px] w-full bg-green text-base text-navy hover:bg-[#2bc49c]" type="submit" disabled={status.kind === 'sending'}>
                {status.kind === 'sending' ? (
                  <>
                    <Loader2 className="spin" size={16} strokeWidth={2} aria-hidden="true" />
                    Sending message
                  </>
                ) : (
                  <>
                    Send message
                    <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                  </>
                )}
              </button>
              <p className="text-center text-[0.78rem] text-ink-3">We only use these details to reply to you.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
