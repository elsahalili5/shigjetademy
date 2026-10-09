import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Loader2, LogOut } from 'lucide-react'
import wordmark from '../assets/brand/shigjetademy-wordmark.png'
import { Arcs } from '../components/Arcs'
import { Link, navigate, useTitle } from '../lib/router'

type User = { name: string; email: string; organization: string }
type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'error'; message: string }


export function AuthPage() {
  useTitle('Log in · Shigjetademy')
  const [user, setUser] = useState<User | null>(null)

  // The form shows at once; if a session already exists, the signed-in view replaces it
  useEffect(() => {
    let live = true
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d: { user: User | null }) => live && setUser(d.user))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {})
    setUser(null)
  }

  return (
    // Auth: form on the left, a navy brand panel on the right
    <div className="grid min-h-svh grid-cols-2 gap-(--frame) bg-haze p-(--frame) max-[900px]:grid-cols-1">
      <main className="grid grid-rows-[auto_1fr_auto] px-[clamp(20px,5vw,72px)] py-[clamp(20px,3vw,36px)]">
        <Link className="flex items-center gap-2.5 justify-self-start font-display text-[1.2rem] font-bold tracking-[-0.02em] text-ink no-underline" href="/" aria-label="Shigjetademy home">
          <img src={wordmark} alt="Shigjetademy" width={152} height={38} />
        </Link>

        <div className="mx-auto my-[clamp(32px,6vh,64px)] w-[min(100%,440px)] self-center [&_h1]:text-[clamp(2rem,3.4vw,2.8rem)] [&_h1]:font-bold [&_h1]:tracking-[-0.034em]">
          {user ? (
            <SignedIn user={user} onLogout={logout} />
          ) : (
            <LoginForm onDone={setUser} />
          )}
        </div>

        <p className="text-[0.85rem] text-ink-3 [&_a]:no-underline">{!user && <Link href="/">← Back to the website</Link>}</p>
      </main>

      {/* Quiet brand panel: the logo's arcs and one line, nothing to read past */}
      <aside
        className="relative isolate flex items-end overflow-hidden rounded-panel bg-navy bg-[radial-gradient(70%_60%_at_100%_100%,rgba(31,176,139,0.2),transparent_70%)] p-[clamp(32px,5vw,64px)] max-[900px]:hidden"
        aria-hidden="true"
      >
        <Arcs className="-top-[30%] -left-[10%] -z-10 w-[140%]" />
        <p className="max-w-[10ch] font-display text-[clamp(2.2rem,4vw,3.6rem)] leading-none font-bold tracking-[-0.036em] text-white [&_em]:text-kraft [&_em]:not-italic">
          Every class, <em>one place.</em>
        </p>
      </aside>

    </div>
  )
}

function LoginForm({ onDone }: { onDone: (u: User) => void }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [showPw, setShowPw] = useState(false)
  const ids = { email: useId(), pw: useId(), err: useId() }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>
    setStatus({ kind: 'sending' })
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus({ kind: 'error', message: body.error ?? 'Something went wrong. Please try again.' })
        return
      }
      onDone(body.user)
    } catch {
      setStatus({ kind: 'error', message: 'We couldn’t reach the server. Check your connection and try again.' })
    }
  }

  const sending = status.kind === 'sending'

  return (
    <>
      <h1>Welcome back</h1>
      <p className="mt-2.5 text-ink-2">Log in to run your term in Shigjetademy.</p>

      <form className="mt-8 grid gap-4" noValidate onSubmit={onSubmit} aria-describedby={status.kind === 'error' ? ids.err : undefined}>
        <div className="grid min-w-0 gap-1.5 [&_label]:text-[0.88rem] [&_label]:font-[650] [&_input]:min-h-[50px] [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-rule-strong [&_input]:bg-white [&_input]:px-3.5 [&_input]:text-base [&_input]:transition-[border-color,box-shadow] [&_input]:duration-150 [&_input]:placeholder:text-ink-3 [&_input:hover:not(:disabled)]:border-ink-3 [&_input:focus]:border-green-deep [&_input:focus]:shadow-[0_0_0_3px_var(--green-wash)] [&_input:focus]:outline-none [&_input:disabled]:opacity-60">
          <label htmlFor={ids.email}>Email</label>
          <input
            id={ids.email}
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            maxLength={200}
            placeholder="you@school.edu"
            disabled={sending}
          />
        </div>

        <div className="grid min-w-0 gap-1.5 [&_label]:text-[0.88rem] [&_label]:font-[650] [&_input]:min-h-[50px] [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-rule-strong [&_input]:bg-white [&_input]:px-3.5 [&_input]:text-base [&_input]:transition-[border-color,box-shadow] [&_input]:duration-150 [&_input]:placeholder:text-ink-3 [&_input:hover:not(:disabled)]:border-ink-3 [&_input:focus]:border-green-deep [&_input:focus]:shadow-[0_0_0_3px_var(--green-wash)] [&_input:focus]:outline-none [&_input:disabled]:opacity-60">
          <label htmlFor={ids.pw}>Password</label>
          <div className="relative [&_input]:pr-[52px]">
            <input
              id={ids.pw}
              name="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              required
              maxLength={200}
              disabled={sending}
            />
            <button
              type="button"
              className="absolute top-[3px] right-[3px] grid size-11 place-items-center rounded-[10px] bg-transparent text-ink-3 transition-colors duration-150 hover:bg-mist hover:text-ink"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              aria-pressed={showPw}
            >
              {showPw ? <EyeOff size={18} strokeWidth={1.9} /> : <Eye size={18} strokeWidth={1.9} />}
            </button>
          </div>
        </div>

        {status.kind === 'error' && (
          <p id={ids.err} className="flex items-start gap-2 rounded-xl bg-coral-wash px-3.5 py-3 text-[0.9rem] font-[550] text-coral-deep [&_svg]:mt-0.5 [&_svg]:flex-none" role="alert">
            <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
            {status.message}
          </p>
        )}

        <button className="button mt-1.5 min-h-[52px] w-full bg-navy text-white enabled:hover:bg-navy-2" type="submit" disabled={sending}>
          {sending ? (
            <>
              <Loader2 className="animate-[spin_700ms_linear_infinite] motion-reduce:animate-[spin_1600ms_linear_infinite]" size={18} strokeWidth={2.2} aria-hidden="true" />
              Logging in…
            </>
          ) : (
            <>
              Log in
              <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-[0.95rem] text-ink-2">
        Don’t have an account?{' '}
        <Link href="/contact" className="font-[650] text-green-deep">Contact us</Link>
      </p>
    </>
  )
}

function SignedIn({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="grid justify-items-start" role="status">
      <span className="mb-5 grid size-14 place-items-center rounded-full bg-green-wash text-green-deep" aria-hidden="true">
        <Check size={26} strokeWidth={2.6} />
      </span>
      <h1>You’re signed in, {user.name.split(' ')[0]}.</h1>
      <p className="mt-2.5 text-ink-2">
        {user.organization} · {user.email}
      </p>
      <p className="mt-5 text-ink-2">
        Your account is set up. The Shigjetademy dashboard for your organization is coming soon.
      </p>
      <div className="mt-7 grid w-full gap-2.5 [&_.button]:min-h-[50px] [&_.button]:w-full">
        <button className="button mt-1.5 min-h-[52px] w-full bg-navy text-white enabled:hover:bg-navy-2" type="button" onClick={() => navigate('/')}>
          Back to the website
          <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
        </button>
        <button className="button button--ghost" type="button" onClick={onLogout}>
          <LogOut size={16} strokeWidth={2} aria-hidden="true" />
          Log out
        </button>
      </div>
    </div>
  )
}
