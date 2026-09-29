import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, MessageCircle, ShoppingBag } from 'lucide-react'
import { cartCount, useCart } from '../lib/store'
import { inr } from '../lib/format'
import { authMessage, useAuth } from '../lib/auth'
import { firebaseReady } from '../lib/firebase'
import { useSettings, waLink } from '../lib/settings'
import { Alert } from '../components/ui'
import { cx } from '../lib/format'

export default function Login() {
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const lines = useCart((s) => s.lines)
  const { store } = useSettings()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  // Sent here mid-purchase? Go back to checkout once they are signed in.
  const next = params.get('next') ?? ''
  const toCheckout = next === '/checkout'

  useEffect(() => {
    if (user) navigate(next || '/account', { replace: true })
  }, [user, next, navigate])

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
        setOk('Account ban gaya! Aapko seedha checkout par le ja rahe hain.')
      }
    } catch (e) {
      setErr(authMessage(e))
    } finally {
      setBusy(false)
    }
  }

  if (!firebaseReady)
    return (
      <div className="shell max-w-md py-16 text-center">
        <h1 className="text-3xl">Account abhi shuru nahi hua</h1>
        <p className="mt-3 text-sm leading-relaxed text-inksoft">
          Online account aur payment par kaam chal raha hai. Tab tak order karna utna hi aasan hai
          — cart bhar kar checkout par jaaiye, poora order WhatsApp par chala jayega aur hum
          confirm kar denge.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link to={lines.length ? '/checkout' : '/shop'} className="btn-clay">
            {lines.length ? `Checkout par jaayein · ${cartCount(lines)} item` : 'Shopping shuru karein'}
          </Link>
          <a
            href={waLink(store.whatsapp, `Namaste ${store.name}! Mujhe kuch poochhna tha.`)}
            target="_blank"
            rel="noreferrer"
            className="btn bg-moss text-bone hover:brightness-110"
          >
            <MessageCircle size={16} /> Seedha WhatsApp karein
          </a>
        </div>

        <p className="mt-6 text-xs text-inksoft">
          Purana order dekhna hai? <Link to="/track" className="font-semibold text-clay hover:underline">Track order</Link> se
          order number aur mobile daal kar dekh sakte hain.
        </p>
      </div>
    )

  return (
    <div className="shell max-w-md py-16">
      <h1 className="text-center text-3xl">
        {toCheckout ? 'Payment se pehle login' : mode === 'in' ? 'Welcome back' : 'Create account'}
      </h1>
      <p className="mt-2 text-center text-sm text-inksoft">
        {toCheckout
          ? 'Order confirm karne ke liye account zaroori hai — isse aapka order save rehta hai aur track karna aasan ho jaata hai.'
          : 'Account se orders track karna, address save karna aur review likhna aasan ho jaata hai.'}
      </p>

      {toCheckout && lines.length > 0 && (
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-sand px-4 py-3 text-sm">
          <ShoppingBag size={17} className="shrink-0 text-clay" />
          <span>
            Aapka bag surakshit hai — {cartCount(lines)} item,{' '}
            <strong>{inr(lines.reduce((n, l) => n + l.price * l.qty, 0))}</strong>. Login karte hi
            seedha checkout par pahunch jayenge.
          </span>
        </div>
      )}

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
          {mode === 'in'
            ? toCheckout
              ? 'Login aur checkout'
              : 'Login'
            : 'Create account'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-inksoft">
        {mode === 'in' ? 'Naye hain? Upar Register par click kijiye.' : 'Pehle se account hai? Login par click kijiye.'}{' '}
        <Link to="/shop" className="font-semibold text-clay hover:underline">
          Ya shopping jaari rakhein
        </Link>
      </p>
    </div>
  )
}
