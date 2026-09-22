import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Package, ShieldCheck } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { inr, when } from '../lib/format'
import { Empty, Spinner } from '../components/ui'
import type { Order } from '../lib/types'

export default function Account() {
  const { session, profile, loading, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [busy, setBusy] = useState(true)

  useEffect(() => {
    if (!loading && !session) navigate('/login', { replace: true })
  }, [loading, session, navigate])

  useEffect(() => {
    if (!session) return
    supabase
      .from('orders')
      .select('*, order_items(title, size, qty, price, image_url)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data as Order[]) ?? [])
        setBusy(false)
      })
  }, [session])

  if (loading || !session) return <Spinner />

  return (
    <div className="shell py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl">
            Namaste, {profile?.full_name || session.user.email?.split('@')[0]}
          </h1>
          <p className="mt-1.5 text-sm text-inksoft">{session.user.email}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Link to="/admin" className="btn-ghost">
              <ShieldCheck size={16} /> Admin panel
            </Link>
          )}
          <button
            onClick={async () => {
              await signOut()
              navigate('/')
            }}
            className="btn-ghost"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <h2 className="mt-10 mb-5 text-2xl">My orders</h2>

      {busy ? (
        <Spinner label="Orders laa rahe hain…" />
      ) : orders.length === 0 ? (
        <Empty
          title="Abhi tak koi order nahi"
          note="Guest checkout se kiya order yahan nahi dikhega — use Track Order page se dekhein."
          action={
            <div className="mt-2 flex gap-3">
              <Link to="/shop" className="btn-clay">
                Shop now
              </Link>
              <Link to="/track" className="btn-ghost">
                Track an order
              </Link>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o.id} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/8 pb-3">
                <div>
                  <p className="font-display text-lg">{o.order_no}</p>
                  <p className="text-xs text-inksoft">{when(o.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-sand px-3 py-1.5 text-xs font-semibold capitalize">
                    {o.status}
                  </span>
                  <Link
                    to={`/track?order=${o.order_no}`}
                    className="text-xs font-semibold text-clay hover:underline"
                  >
                    Track
                  </Link>
                </div>
              </div>

              <ul className="mt-3 space-y-2">
                {(o.order_items ?? []).map((i, k) => (
                  <li key={k} className="flex items-center gap-3 text-sm">
                    <img
                      src={i.image_url ?? ''}
                      alt=""
                      className="h-12 w-10 rounded-lg bg-sand object-cover"
                    />
                    <span className="flex-1">
                      {i.title}{' '}
                      <span className="text-xs text-inksoft">
                        (size {i.size} × {i.qty})
                      </span>
                    </span>
                    <span className="font-medium">{inr(i.price * i.qty)}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center justify-between border-t border-ink/8 pt-3">
                <span className="flex items-center gap-1.5 text-xs text-inksoft">
                  <Package size={13} /> {o.payment_method.toUpperCase()} · {o.payment_status}
                </span>
                <span className="font-bold">{inr(o.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
