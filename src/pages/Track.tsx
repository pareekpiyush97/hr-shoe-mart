import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Loader2, Search } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cx, inr, when } from '../lib/format'
import { Alert } from '../components/ui'
import type { OrderItem } from '../lib/types'

const STEPS = ['placed', 'confirmed', 'packed', 'shipped', 'delivered']
const LABEL: Record<string, string> = {
  placed: 'Order placed',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Out for delivery',
  delivered: 'Delivered',
}

interface Tracked {
  order_no: string
  status: string
  created_at: string
  payment_method: string
  payment_status: string
  customer_name: string
  shipping_address: { line1: string; line2?: string; city: string; state: string; pincode: string }
  subtotal: number
  discount: number
  shipping_fee: number
  total: number
  items: OrderItem[]
}

export default function Track() {
  const [params] = useSearchParams()
  const [orderNo, setOrderNo] = useState(params.get('order') ?? '')
  const [phone, setPhone] = useState('')
  const [order, setOrder] = useState<Tracked | null>(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function find(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setOrder(null)
    setBusy(true)
    const { data, error } = await supabase.rpc('track_order', {
      p_order_no: orderNo,
      p_phone: phone,
    })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    if (!data) {
      setErr('Is order number aur mobile ke saath koi order nahi mila. Dobara check kijiye.')
      return
    }
    setOrder(data as Tracked)
  }

  const step = order ? STEPS.indexOf(order.status) : -1
  const cancelled = order?.status === 'cancelled'

  return (
    <div className="shell max-w-3xl py-12">
      <h1 className="text-3xl sm:text-4xl">Track your order</h1>
      <p className="mt-2 text-sm text-inksoft">
        Order number aur wahi mobile number daaliye jo order ke waqt diya tha.
      </p>

      <form onSubmit={find} className="card mt-7 grid gap-4 p-6 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label className="label">Order number</label>
          <input
            required
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value.toUpperCase())}
            placeholder="HRSM-260922-1001"
            className="field"
          />
        </div>
        <div>
          <label className="label">Mobile number</label>
          <input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit number"
            inputMode="numeric"
            className="field"
          />
        </div>
        <button disabled={busy} className="btn-clay self-end">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Track
        </button>
      </form>

      {err && (
        <div className="mt-5">
          <Alert>{err}</Alert>
        </div>
      )}

      {order && (
        <div className="card mt-7 p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/8 pb-4">
            <div>
              <h2 className="font-display text-xl">{order.order_no}</h2>
              <p className="text-xs text-inksoft">Placed {when(order.created_at)}</p>
            </div>
            <span className="rounded-full bg-sand px-3 py-1.5 text-xs font-semibold capitalize">
              {order.payment_method} · {order.payment_status}
            </span>
          </div>

          {cancelled ? (
            <div className="mt-5">
              <Alert>Ye order cancel ho chuka hai. Sawal ho to humein call kijiye.</Alert>
            </div>
          ) : (
            <ol className="mt-6 space-y-0">
              {STEPS.map((s, i) => {
                const done = i <= step
                return (
                  <li key={s} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={cx(
                          'grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition',
                          done ? 'border-moss bg-moss text-bone' : 'border-ink/15 text-ink/25',
                        )}
                      >
                        {done ? <Check size={15} /> : <span className="text-xs">{i + 1}</span>}
                      </span>
                      {i < STEPS.length - 1 && (
                        <span className={cx('h-10 w-0.5', i < step ? 'bg-moss' : 'bg-ink/12')} />
                      )}
                    </div>
                    <div className="pt-1 pb-6">
                      <p className={cx('text-sm font-semibold', !done && 'text-ink/40')}>
                        {LABEL[s]}
                      </p>
                      {i === step && (
                        <p className="mt-0.5 text-xs text-inksoft">Abhi yahan par hai</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}

          <ul className="mt-2 space-y-3 border-t border-ink/8 pt-4">
            {order.items.map((i, k) => (
              <li key={k} className="flex gap-3">
                <img
                  src={i.image_url ?? ''}
                  alt=""
                  className="h-14 w-12 rounded-lg bg-sand object-cover"
                />
                <div className="flex-1 text-sm">
                  <p className="font-medium">{i.title}</p>
                  <p className="text-xs text-inksoft">
                    Size {i.size} · Qty {i.qty}
                  </p>
                </div>
                <span className="text-sm font-semibold">{inr(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex justify-between border-t border-ink/8 pt-4 font-bold">
            <span>Total</span>
            <span>{inr(order.total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
