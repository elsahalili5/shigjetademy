import { useState } from 'react'
import type { FormEvent } from 'react'
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react'
import { Arcs } from './Arcs'
import './Demo.css'

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
      <span className="field__error" id={`demo-${name}-error`}>
        {errors[name]}
      </span>
    ) : null

  return (
    <section className="demo" id="demo" aria-labelledby="demo-title">
      <Arcs className="demo__arcs" />
      <div className="demo__inner">
        <div className="demo__copy">
          <h2 id="demo-title">See your own term in Shigjetademy.</h2>
          <p>
            Tell us a little about your organization and we’ll arrange a walkthrough of the platform, built around
            how you already run your classes.
          </p>
          <ul className="demo__covers">
            <li>Enrolment and class lists</li>
            <li>Timetables and registers</li>
            <li>Fees and invoices</li>
            <li>Grades, reports and messages</li>
          </ul>
        </div>

        <div className="demo__card">
          {status.kind === 'sent' ? (
            <div className="demo__done" role="status">
              <CheckCircle2 size={32} strokeWidth={1.75} aria-hidden="true" />
              <h3>Thanks, {status.name}. Your request is in.</h3>
              <p>
                We’ll email <strong>{status.email}</strong> to find a time that suits you.
              </p>
              <button type="button" className="button button--ghost" onClick={() => setStatus({ kind: 'idle' })}>
                Send another request
              </button>
            </div>
          ) : (
            <form noValidate onSubmit={onSubmit}>
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
                <p className="demo__error" role="alert">
                  <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
                  {status.message}
                </p>
              )}

              <button className="button button--primary demo__submit" type="submit" disabled={status.kind === 'sending'}>
                {status.kind === 'sending' ? (
                  <>
                    <Loader2 className="spin" size={16} strokeWidth={2} aria-hidden="true" />
                    Sending request
                  </>
                ) : (
                  <>
                    Book a demo
                    <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                  </>
                )}
              </button>
              <p className="demo__fine">We only use these details to arrange your demo.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
