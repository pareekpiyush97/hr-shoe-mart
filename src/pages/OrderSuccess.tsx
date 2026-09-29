import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { CheckCircle2, MessageCircle, Package } from 'lucide-react'
import { trackOrder } from '../lib/db'
import { useSettings, waLink } from '../lib/settings'
import { inr, when } from '../lib/format'
import { Spinner } from '../components/ui'
import type { TrackedOrder } from '../lib/types'


export default function OrderSuccess() {
  const { orderNo } = useParams()
  const { state } = useLocation() as { state?: { phone?: string } }
  const { store } = useSettings()
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderNo || !state?.phone) {
      setLoading(false)
      return
    }
    trackOrder(orderNo, state.phone)
      .then(setOrder)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orderNo, state])

  if (loading) return <Spinner label="Order confirm kar rahe hain…" />

  const waText = order
    ? `Namaste ${store.name}! Maine order place kiya hai.\n\nOrder no: ${order.orderNo}\nTotal: ${inr(order.total)}\nPayment: ${order.paymentMethod.toUpperCase()}\n\nKripya confirm kar dijiye.`
    : `Namaste! Mera order number ${orderNo} hai.`

  return (
    <div className="shell max-w-3xl py-14">
      <div className="text-center">
        <CheckCircle2 size={56} className="mx-auto text-moss" />
        <h1 className="mt-5 text-3xl sm:text-4xl">Order place ho gaya!</h1>
        <p className="mt-3 text-sm text-inksoft">
          Aapka order number{' '}
          <strong className="font-display text-base text-ink">{orderNo}</strong> hai. Isse save kar
          lijiye — track karne ke kaam aayega.
        </p>
      </div>

      {order && (
        <div className="card mt-9 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/8 pb-4">
            <div>
              <p className="text-xs text-inksoft">{order.createdAt ? `Placed on ${when(order.createdAt)}` : ''}</p>
              <p className="mt-0.5 text-sm font-semibold capitalize">Status: {order.status}</p>
            </div>
            <span className="rounded-full bg-sand px-3 py-1.5 text-xs font-semibold capitalize">
              {order.paymentMethod === 'cod'
                ? 'Cash on delivery'
                : order.paymentMethod === 'upi'
                  ? 'UPI'
                  : 'Paid online'}{' '}
              · {order.paymentStatus}
            </span>
          </div>

          <ul className="mt-4 space-y-3">
            {order.items.map((i, k) => (
              <li key={k} className="flex gap-3">
                <img
                  src={i.imageUrl ?? ''}
                  alt=""
                  className="h-16 w-14 rounded-lg bg-sand object-cover"
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

          <dl className="mt-4 space-y-2 border-t border-ink/8 pt-4 text-sm">
            <Row k="Subtotal" v={inr(order.subtotal)} />
            {order.discount > 0 && <Row k="Discount" v={`− ${inr(order.discount)}`} />}
            <Row k="Delivery" v={order.shippingFee === 0 ? 'FREE' : inr(order.shippingFee)} />
            <div className="flex justify-between pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd>{inr(order.total)}</dd>
            </div>
          </dl>

          <div className="mt-5 rounded-xl bg-sand p-4 text-sm">
            <p className="font-semibold">Delivery address</p>
            <p className="mt-1 text-inksoft">
              {order.customerName}, {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''},{' '}
              {order.shippingAddress.city}, {order.shippingAddress.state} —{' '}
              {order.shippingAddress.pincode}
            </p>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <a
          href={waLink(store.whatsapp, waText)}
          target="_blank"
          rel="noreferrer"
          className="btn bg-moss text-bone hover:brightness-110"
        >
          <MessageCircle size={16} /> WhatsApp par confirm karein
        </a>
        <Link to="/track" className="btn-ghost">
          <Package size={16} /> Track order
        </Link>
        <Link to="/shop" className="btn-primary">
          Aur shopping karein
        </Link>
      </div>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-inksoft">{k}</dt>
      <dd>{v}</dd>
    </div>
  )
}
