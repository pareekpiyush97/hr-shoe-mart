import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { cartSubtotal, useCart } from '../lib/store'
import { useSettings } from '../lib/settings'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { inr } from '../lib/format'
import { Alert, Empty } from '../components/ui'

export default function Cart() {
  const { lines, setQty, remove } = useCart()
  const { delivery } = useSettings()
  const { session } = useAuth()
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState<{ code: string; discount: number } | null>(null)
  const [msg, setMsg] = useState('')

  const subtotal = cartSubtotal(lines)
  const discount = applied?.discount ?? 0
  const ship = subtotal - discount >= delivery.free_above || subtotal === 0 ? 0 : delivery.fee
  const total = subtotal - discount + ship
  const saved = lines.reduce((n, l) => n + (l.mrp - l.price) * l.qty, 0) + discount

  async function applyCoupon(e: React.FormEvent) {
    e.preventDefault()
    setMsg('')
    const { data, error } = await supabase.rpc('preview_coupon', {
      p_code: code,
      p_subtotal: subtotal,
    })
    if (error) {
      setMsg(error.message)
      return
    }
    const res = data as { ok: boolean; reason?: string; code?: string; discount?: number }
    if (!res.ok) {
      setApplied(null)
      setMsg(res.reason ?? 'Coupon not valid')
      return
    }
    setApplied({ code: res.code!, discount: Number(res.discount) })
    setMsg('')
  }

  if (lines.length === 0)
    return (
      <div className="shell py-16">
        <Empty
          title="Aapka bag khali hai"
          note="Collection dekhiye — sports, formal, jutti aur bahut kuch."
          action={
            <Link to="/shop" className="btn-clay mt-2">
              Shopping shuru karein
            </Link>
          }
        />
      </div>
    )

  return (
    <div className="shell py-10">
      <h1 className="text-3xl sm:text-4xl">Shopping bag</h1>
      <p className="mt-1.5 text-sm text-inksoft">{lines.length} item(s)</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {lines.map((l) => (
            <div key={`${l.slug}-${l.size}`} className="card flex gap-4 p-4">
              <Link to={`/product/${l.slug}`} className="shrink-0">
                <img
                  src={l.image}
                  alt={l.title}
                  className="h-28 w-24 rounded-xl bg-sand object-cover"
                />
              </Link>
              <div className="flex-1">
                <p className="text-[11px] tracking-wide text-inksoft uppercase">{l.brand}</p>
                <Link to={`/product/${l.slug}`}>
                  <h3 className="font-display text-base font-semibold hover:text-clay">{l.title}</h3>
                </Link>
                <p className="mt-0.5 text-xs text-inksoft">Size: {l.size}</p>

                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <div className="flex items-center rounded-full border border-ink/15">
                    <button
                      onClick={() => setQty(l.slug, l.size, l.qty - 1)}
                      className="p-2"
                      aria-label="Decrease"
                    >
                      <Minus size={13} />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold">{l.qty}</span>
                    <button
                      onClick={() => setQty(l.slug, l.size, l.qty + 1)}
                      className="p-2"
                      aria-label="Increase"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <button
                    onClick={() => remove(l.slug, l.size)}
                    className="flex items-center gap-1.5 text-xs text-inksoft hover:text-clay"
                  >
                    <Trash2 size={13} /> Remove
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{inr(l.price * l.qty)}</p>
                {l.mrp > l.price && (
                  <p className="text-xs text-inksoft line-through">{inr(l.mrp * l.qty)}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <aside className="h-fit lg:sticky lg:top-40">
          <div className="card p-6">
            <h2 className="text-xl">Order summary</h2>

            <form onSubmit={applyCoupon} className="mt-5 flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Coupon code"
                className="field"
              />
              <button className="btn-ghost shrink-0 px-5">Apply</button>
            </form>
            {msg && <p className="mt-2 text-xs text-clay">{msg}</p>}
            {applied && (
              <p className="mt-2 text-xs font-semibold text-moss">
                {applied.code} applied — {inr(applied.discount)} off
              </p>
            )}
            <p className="mt-2 text-[11px] text-inksoft">
              Try <strong>HRSM10</strong> (10% off above ₹999) or <strong>BIKANER200</strong>.
            </p>

            <dl className="mt-5 space-y-2.5 border-t border-ink/8 pt-5 text-sm">
              <Row k="Subtotal" v={inr(subtotal)} />
              {discount > 0 && <Row k="Coupon discount" v={`− ${inr(discount)}`} good />}
              <Row k="Delivery" v={ship === 0 ? 'FREE' : inr(ship)} good={ship === 0} />
              <div className="flex justify-between border-t border-ink/8 pt-3 text-base font-bold">
                <dt>Total</dt>
                <dd>{inr(total)}</dd>
              </div>
            </dl>

            {saved > 0 && (
              <div className="mt-4">
                <Alert kind="ok">Is order par aap {inr(saved)} bacha rahe hain.</Alert>
              </div>
            )}

            <Link
              to={session ? '/checkout' : '/login?next=/checkout'}
              className="btn-clay mt-5 w-full"
            >
              {session ? 'Checkout karein' : 'Login karke checkout karein'}
            </Link>
            {!session && (
              <p className="mt-2 text-center text-[11px] text-inksoft">
                Payment se pehle ek baar login — aapka bag waise hi bacha rahega.
              </p>
            )}
            <Link
              to="/shop"
              className="mt-3 block text-center text-sm font-semibold text-inksoft hover:text-clay"
            >
              Aur shopping karein
            </Link>
          </div>
        </aside>
      </div>
    </div>
  )
}

function Row({ k, v, good }: { k: string; v: string; good?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-inksoft">{k}</dt>
      <dd className={good ? 'font-semibold text-moss' : 'font-medium'}>{v}</dd>
    </div>
  )
}
