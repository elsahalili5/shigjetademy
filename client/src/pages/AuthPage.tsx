import { useEffect, useId, useState } from 'react'
import type { FormEvent } from 'react'
import { AlertCircle, ArrowRight, Check, Eye, EyeOff, Loader2, LogOut } from 'lucide-react'
import wordmark from '../assets/brand/shigjetademy-wordmark.png'
import { Arcs } from '../components/Arcs'
import { Link, navigate, useTitle } from '../lib/router'
import './Auth.css'

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
    <div className="auth">
      <main className="auth__main">
        <Link className="auth__brand" href="/" aria-label="Shigjetademy home">
          <img src={wordmark} alt="Shigjetademy" width={152} height={38} />
        </Link>

        <div className="auth__body">
          {user ? (
            <SignedIn user={user} onLogout={logout} />
          ) : (
            <LoginForm onDone={setUser} />
          )}
        </div>

        <p className="auth__fine">{!user && <Link href="/">← Back to the website</Link>}</p>
      </main>

      {/* Quiet brand panel: the logo's arcs and one line, nothing to read past */}
      <aside className="auth__side" aria-hidden="true">
        <Arcs className="auth__arcs" />
        <p className="auth__side-title">
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
      <p className="auth__lede">Log in to run your term in Shigjetademy.</p>

      <form className="auth__form" noValidate onSubmit={onSubmit} aria-describedby={status.kind === 'error' ? ids.err : undefined}>
        <div className="auth__field">
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

        <div className="auth__field">
          <label htmlFor={ids.pw}>Password</label>
          <div className="auth__pw">
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
              className="auth__eye"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              aria-pressed={showPw}
            >
              {showPw ? <EyeOff size={18} strokeWidth={1.9} /> : <Eye size={18} strokeWidth={1.9} />}
            </button>
          </div>
        </div>

        {status.kind === 'error' && (
          <p id={ids.err} className="auth__error" role="alert">
            <AlertCircle size={16} strokeWidth={2} aria-hidden="true" />
            {status.message}
          </p>
        )}

        <button className="button auth__submit" type="submit" disabled={sending}>
          {sending ? (
            <>
              <Loader2 className="auth__spin" size={18} strokeWidth={2.2} aria-hidden="true" />
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

      <p className="auth__switch">
        Don’t have an account? <Link href="/contact">Contact us</Link>
      </p>
    </>
  )
}

function SignedIn({ user, onLogout }: { user: User; onLogout: () => void }) {
  return (
    <div className="auth__done" role="status">
      <span className="auth__done-icon" aria-hidden="true">
        <Check size={26} strokeWidth={2.6} />
      </span>
      <h1>You’re signed in, {user.name.split(' ')[0]}.</h1>
      <p className="auth__lede">
        {user.organization} · {user.email}
      </p>
      <p className="auth__note">
        Your account is set up. The Shigjetademy dashboard for your organization is coming soon.
      </p>
      <div className="auth__done-actions">
        <button className="button auth__submit" type="button" onClick={() => navigate('/')}>
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
