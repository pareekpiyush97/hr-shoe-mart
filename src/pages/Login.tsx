import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { Alert } from '../components/ui'
import { cx } from '../lib/format'

export default function Login() {
  const { session, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  useEffect(() => {
    if (session) navigate('/account', { replace: true })
  }, [session, navigate])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    setErr('')
    setOk('')
    setBusy(true)
    try {
      if (mode === 'in') {
        await signIn(String(f.get('email')), String(f.get('password')))
      } else {
        await signUp(
          String(f.get('email')),
          String(f.get('password')),
          String(f.get('name')),
          String(f.get('phone')),
        )
        setOk('Account ban gaya! Agar email confirmation on hai to inbox check kijiye.')
      }
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="shell max-w-md py-16">
      <h1 className="text-center text-3xl">{mode === 'in' ? 'Welcome back' : 'Create account'}</h1>
      <p className="mt-2 text-center text-sm text-inksoft">
        Account se orders track karna aur address save karna aasan ho jaata hai. Guest checkout bhi
        chalu hai.
      </p>

      <div className="mt-7 flex rounded-full bg-sand p-1">
        {(['in', 'up'] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m)
              setErr('')
              setOk('')
            }}
            className={cx(
              'flex-1 rounded-full py-2.5 text-sm font-semibold transition',
              mode === m ? 'bg-ink text-bone' : 'text-inksoft',
            )}
          >
            {m === 'in' ? 'Login' : 'Register'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="card mt-5 space-y-4 p-6">
        {mode === 'up' && (
          <>
            <div>
              <label className="label">Full name</label>
              <input name="name" required className="field" />
            </div>
            <div>
              <label className="label">Mobile</label>
              <input name="phone" required inputMode="numeric" className="field" />
            </div>
          </>
        )}
        <div>
          <label className="label">Email</label>
          <input name="email" type="email" required className="field" />
        </div>
        <div>
          <label className="label">Password</label>
          <input name="password" type="password" required minLength={6} className="field" />
        </div>

        {err && <Alert>{err}</Alert>}
        {ok && <Alert kind="ok">{ok}</Alert>}

        <button disabled={busy} className="btn-clay w-full">
          {busy && <Loader2 size={16} className="animate-spin" />}
          {mode === 'in' ? 'Login' : 'Create account'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-inksoft">
        Bina account ke order karna hai?{' '}
        <Link to="/shop" className="font-semibold text-clay hover:underline">
          Guest checkout
        </Link>
      </p>
    </div>
  )
}
