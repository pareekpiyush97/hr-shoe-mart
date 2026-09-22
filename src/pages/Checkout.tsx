import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Banknote, CreditCard, Loader2, Lock, QrCode } from 'lucide-react'
import { callFunction, supabase } from '../lib/supabase'
import { cartSubtotal, useCart } from '../lib/store'
import { useSettings } from '../lib/settings'
import { useAuth } from '../lib/auth'
import { cx, inr } from '../lib/format'
import type { PayMethod, PlacedOrder } from '../lib/types'
import { Alert, Empty } from '../components/ui'

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (window.Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}

export default function Checkout() {
  const { lines, clear } = useCart()
  const { delivery, payment, store } = useSettings()
  const { session, profile } = useAuth()
  const navigate = useNavigate()

  const [method, setMethod] = useState<PayMethod>('cod')
  const [rzpReady, setRzpReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null)
  const [couponMsg, setCouponMsg] = useState('')

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    line1: '',
    line2: '',
    city: 'Bikaner',
    state: 'Rajasthan',
    pincode: '',
    notes: '',
  })

  const subtotal = cartSubtotal(lines)
  const discount = applied?.discount ?? 0
  const ship = subtotal - discount >= delivery.free_above ? 0 : delivery.fee
  const total = subtotal - discount + ship

  useEffect(() => {
    callFunction<{ configured: boolean }>('razorpay', { action: 'config' })
      .then((r) => setRzpReady(Boolean(r.configured)))
      .catch(() => setRzpReady(false))
  }, [])

  useEffect(() => {
    if (!session) return
    setForm((f) => ({
      ...f,
      name: f.name || profile?.full_name || '',
      phone: f.phone || profile?.phone || '',
      email: f.email || session.user.email || '',
    }))
  }, [session, profile])

  const on = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  async function applyCoupon(e: React.FormEvent) {
    e.preventDefault()
    const { data } = await supabase.rpc('preview_coupon', { p_code: code, p_subtotal: subtotal })
    const res = data as { ok: boolean; reason?: string; code?: string; discount?: number }
    if (!res?.ok) {
      setApplied(null)
      setCouponMsg(res?.reason ?? 'Coupon not valid')
      return
    }
    setApplied({ code: res.code!, discount: Number(res.discount) })
    setCouponMsg('')
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      const { data, error } = await supabase.rpc('place_order', {
        p: {
          customer: { name: form.name, phone: form.phone, email: form.email },
          address: {
            line1: form.line1,
            line2: form.line2,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
          },
          items: lines.map((l) => ({ slug: l.slug, size: l.size, qty: l.qty })),
          coupon: applied?.code ?? '',
          payment_method: method,
          notes: form.notes,
        },
      })
      if (error) throw new Error(friendly(error.message))

      const order = data as PlacedOrder

      if (method === 'razorpay') {
        const ok = await loadRazorpayScript()
        if (!ok) throw new Error('Payment window load nahi hui. Internet check karke dobara try karein.')

        const rzp = await callFunction<{
          key_id: string
          razorpay_order_id: string
          amount: number
          currency: string
          customer: { name: string; contact: string; email: string }
        }>('razorpay', { action: 'create', order_no: order.order_no })

        await new Promise<void>((resolve, reject) => {
          const checkout = new window.Razorpay!({
            key: rzp.key_id,
            amount: rzp.amount,
            currency: rzp.currency,
            name: store.name,
            description: `Order ${order.order_no}`,
            order_id: rzp.razorpay_order_id,
            prefill: {
              name: rzp.customer.name,
              contact: rzp.customer.contact,
              email: rzp.customer.email,
            },
            theme: { color: '#b14724' },
            handler: async (res: Record<string, string>) => {
              try {
                await callFunction('razorpay', {
                  action: 'verify',
                  order_no: order.order_no,
                  razorpay_order_id: res.razorpay_order_id,
                  razorpay_payment_id: res.razorpay_payment_id,
                  razorpay_signature: res.razorpay_signature,
                })
                resolve()
              } catch (verifyErr) {
                reject(verifyErr)
              }
            },
            modal: {
              ondismiss: () =>
                reject(
                  new Error(
                    `Payment cancel ho gaya. Aapka order ${order.order_no} pending hai — dobara pay karein ya COD chunein.`,
                  ),
                ),
            },
          })
          checkout.open()
        })
      }

      clear()
      navigate(`/order/${order.order_no}`, { state: { phone: form.phone } })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (lines.length === 0)
    return (
      <div className="shell py-16">
        <Empty
          title="Checkout ke liye bag khali hai"
          action={
            <Link to="/shop" className="btn-clay mt-2">
              Products dekhein
            </Link>
          }
        />
      </div>
    )

  const methods: { id: PayMethod; label: string; note: string; icon: typeof Banknote; on: boolean }[] = [
    { id: 'cod', label: 'Cash on Delivery', note: 'Saamaan milne par cash dein', icon: Banknote, on: true },
    {
      id: 'upi',
      label: 'UPI / QR',
      note: `${payment.upi_id} par pay karke screenshot bhejein`,
      icon: QrCode,
      on: true,
    },
    {
      id: 'razorpay',
      label: 'Card / UPI / Netbanking',
      note: rzpReady ? 'Secure payment via Razorpay' : 'Razorpay keys abhi set nahi hain',
      icon: CreditCard,
      on: rzpReady,
    },
  ]

  return (
    <div className="shell py-10">
      <h1 className="text-3xl sm:text-4xl">Checkout</h1>
      <p className="mt-1.5 text-sm text-inksoft">
        Account banana zaroori nahi — guest checkout chalu hai.
      </p>

      <form onSubmit={placeOrder} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-4 text-xl">Delivery details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Full name *</label>
                <input required value={form.name} onChange={on('name')} className="field" />
              </div>
              <div>
                <label className="label">Mobile number *</label>
                <input
                  required
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))
                  }
                  placeholder="10-digit number"
                  inputMode="numeric"
                  className="field"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Email (optional)</label>
                <input type="email" value={form.email} onChange={on('email')} className="field" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Address *</label>
                <input
                  required
                  value={form.line1}
                  onChange={on('line1')}
                  placeholder="House / shop no., street"
                  className="field"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Landmark / area</label>
                <input value={form.line2} onChange={on('line2')} className="field" />
              </div>
              <div>
                <label className="label">City *</label>
                <input required value={form.city} onChange={on('city')} className="field" />
              </div>
              <div>
                <label className="label">Pincode *</label>
                <input
                  required
                  value={form.pincode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) }))
                  }
                  inputMode="numeric"
                  className="field"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Order note (optional)</label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={on('notes')}
                  placeholder="Delivery ka best time, size ki koi request…"
                  className="field"
                />
              </div>
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 text-xl">Payment method</h2>
            <div className="space-y-3">
              {methods.map((m) => (
                <label
                  key={m.id}
                  className={cx(
                    'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition',
                    !m.on && 'cursor-not-allowed opacity-45',
                    method === m.id ? 'border-clay bg-clay/5' : 'border-ink/12 hover:border-ink/30',
                  )}
                >
                  <input
                    type="radio"
                    name="pay"
                    disabled={!m.on}
                    checked={method === m.id}
                    onChange={() => setMethod(m.id)}
                    className="mt-1 accent-[#b14724]"
                  />
                  <m.icon size={19} className="mt-0.5 text-clay" />
                  <span>
                    <span className="block text-sm font-semibold">{m.label}</span>
                    <span className="block text-xs text-inksoft">{m.note}</span>
                  </span>
                </label>
              ))}
            </div>

            {method === 'upi' && (
              <div className="mt-4 rounded-xl bg-sand p-4 text-sm">
                <p className="font-semibold">UPI se pay karein</p>
                <p className="mt-1 text-inksoft">
                  UPI ID: <strong className="text-ink">{payment.upi_id}</strong> ({payment.upi_name})
                </p>
                <p className="mt-2 text-xs text-inksoft">
                  Order place karne ke baad {inr(total)} bhejein aur screenshot WhatsApp par bhej
                  dein. Confirm hote hi dispatch ho jayega.
                </p>
              </div>
            )}

            {method === 'razorpay' && !rzpReady && (
              <p className="mt-3 text-xs text-clay">
                Razorpay abhi live nahi hai. COD ya UPI se order kar sakte hain.
              </p>
            )}
          </section>
        </div>

        <aside className="h-fit lg:sticky lg:top-40">
          <div className="card p-6">
            <h2 className="text-xl">Your order</h2>
            <ul className="mt-4 space-y-3 border-b border-ink/8 pb-4">
              {lines.map((l) => (
                <li key={`${l.slug}-${l.size}`} className="flex gap-3">
                  <img src={l.image} alt="" className="h-14 w-12 rounded-lg bg-sand object-cover" />
                  <div className="flex-1 text-sm">
                    <p className="line-clamp-1 font-medium">{l.title}</p>
                    <p className="text-xs text-inksoft">
                      Size {l.size} · Qty {l.qty}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{inr(l.price * l.qty)}</span>
                </li>
              ))}
            </ul>

            <form onSubmit={applyCoupon} className="mt-4 flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="field"
              />
              <button type="button" onClick={applyCoupon} className="btn-ghost shrink-0 px-5">
                Apply
              </button>
            </form>
            {couponMsg && <p className="mt-2 text-xs text-clay">{couponMsg}</p>}
            {applied && (
              <p className="mt-2 text-xs font-semibold text-moss">
                {applied.code} applied — {inr(applied.discount)} off
              </p>
            )}

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-inksoft">Subtotal</dt>
                <dd>{inr(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-inksoft">Discount</dt>
                  <dd className="font-semibold text-moss">− {inr(discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-inksoft">Delivery</dt>
                <dd className={ship === 0 ? 'font-semibold text-moss' : ''}>
                  {ship === 0 ? 'FREE' : inr(ship)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-ink/8 pt-3 text-base font-bold">
                <dt>Total payable</dt>
                <dd>{inr(total)}</dd>
              </div>
            </dl>

            {err && (
              <div className="mt-4">
                <Alert>{err}</Alert>
              </div>
            )}

            <button disabled={busy} className="btn-clay mt-5 w-full">
              {busy ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Processing…
                </>
              ) : method === 'razorpay' ? (
                <>
                  <Lock size={15} /> Pay {inr(total)}
                </>
              ) : (
                `Place order · ${inr(total)}`
              )}
            </button>
            <p className="mt-3 text-center text-[11px] text-inksoft">
              Order place karte hi stock reserve ho jaata hai. Prices aur stock server par verify
              hote hain.
            </p>
          </div>
        </aside>
      </form>
    </div>
  )
}

function friendly(raw: string) {
  if (raw.includes('OUT_OF_STOCK'))
    return raw.replace(/.*OUT_OF_STOCK:\s*/, 'Stock khatam: ') + ' — quantity kam karke try karein.'
  if (raw.includes('PHONE_INVALID')) return 'Mobile number 10 digit ka hona chahiye.'
  if (raw.includes('PINCODE_INVALID')) return 'Pincode sahi nahi hai.'
  if (raw.includes('ADDRESS_REQUIRED')) return 'Poora address likhiye.'
  if (raw.includes('NAME_REQUIRED')) return 'Naam likhiye.'
  if (raw.includes('CART_EMPTY')) return 'Bag khali hai.'
  if (raw.includes('SIZE_NOT_FOUND')) return 'Ye size ab available nahi hai.'
  return raw
}
