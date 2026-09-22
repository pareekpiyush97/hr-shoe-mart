import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Heart, Menu, Package, Phone, Search, ShoppingBag, User, X } from 'lucide-react'
import { cartCount, useCart, useWishlist } from '../lib/store'
import { useAuth } from '../lib/auth'
import { useSettings } from '../lib/settings'
import { cx } from '../lib/format'

const LINKS = [
  { to: '/shop', label: 'All Footwear' },
  { to: '/shop?gender=men', label: 'Men' },
  { to: '/shop?gender=women', label: 'Women' },
  { to: '/shop?gender=kids', label: 'Kids' },
  { to: '/shop?category=slippers-chappal', label: 'Chappal & Jutti' },
  { to: '/track', label: 'Track Order' },
]

export default function Header() {
  const lines = useCart((s) => s.lines)
  const wish = useWishlist((s) => s.slugs)
  const { session, isAdmin } = useAuth()
  const { store, delivery } = useSettings()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  function search(e: React.FormEvent) {
    e.preventDefault()
    navigate(`/shop?q=${encodeURIComponent(q.trim())}`)
    setOpen(false)
  }

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-ink text-bone">
        <div className="shell flex h-9 items-center justify-between text-[11px] tracking-wide">
          <p className="truncate">
            Free delivery above ₹{delivery.free_above} · {delivery.eta_city} · COD available
          </p>
          <a href={`tel:${store.phone}`} className="hidden items-center gap-1.5 hover:text-brass sm:flex">
            <Phone size={12} /> {store.phone}
          </a>
        </div>
      </div>

      <div className="border-b border-ink/10 bg-bone/95 backdrop-blur">
        <div className="shell flex h-18 items-center gap-4 py-3">
          <button
            className="-ml-1 p-2 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-clay font-display text-lg font-bold text-bone">
              HR
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block font-display text-lg font-bold">{store.name}</span>
              <span className="block text-[10px] tracking-[0.18em] text-inksoft uppercase">
                Bikaner
              </span>
            </span>
          </Link>

          <form onSubmit={search} className="relative mx-auto hidden w-full max-w-md lg:block">
            <Search size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-ink/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search sneakers, formal, jutti…"
              className="field bg-white/70 pl-10"
              aria-label="Search products"
            />
          </form>

          <div className="ml-auto flex items-center gap-1">
            <Link
              to="/wishlist"
              className="relative rounded-full p-2.5 hover:bg-sand"
              aria-label="Wishlist"
            >
              <Heart size={19} />
              {wish.length > 0 && <Dot n={wish.length} />}
            </Link>
            <Link
              to={session ? '/account' : '/login'}
              className="rounded-full p-2.5 hover:bg-sand"
              aria-label="Account"
            >
              <User size={19} />
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden rounded-full p-2.5 hover:bg-sand sm:block"
                aria-label="Admin"
              >
                <Package size={19} />
              </Link>
            )}
            <Link
              to="/cart"
              className="relative rounded-full bg-ink p-2.5 text-bone hover:bg-clay"
              aria-label="Cart"
            >
              <ShoppingBag size={19} />
              {lines.length > 0 && <Dot n={cartCount(lines)} light />}
            </Link>
          </div>
        </div>

        <nav className="hidden border-t border-ink/8 lg:block">
          <div className="shell flex h-11 items-center gap-7 text-[13px] font-medium">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cx(
                    'transition hover:text-clay',
                    isActive && l.to === '/shop' ? 'text-clay' : 'text-inksoft',
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
            <span className="ml-auto text-[12px] text-clay">
              Coupon <strong>HRSM10</strong> — 10% off above ₹999
            </span>
          </div>
        </nav>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[82%] max-w-sm flex-col bg-bone p-5">
            <div className="mb-5 flex items-center justify-between">
              <span className="font-display text-xl font-bold">{store.name}</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <X size={22} />
              </button>
            </div>
            <form onSubmit={search} className="relative mb-5">
              <Search size={16} className="absolute top-1/2 left-4 -translate-y-1/2 text-ink/40" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search footwear…"
                className="field pl-10"
              />
            </form>
            <nav className="flex flex-col">
              {LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="border-b border-ink/8 py-3.5 text-sm font-medium"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                to={session ? '/account' : '/login'}
                onClick={() => setOpen(false)}
                className="border-b border-ink/8 py-3.5 text-sm font-medium"
              >
                {session ? 'My Account' : 'Login / Register'}
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setOpen(false)}
                  className="border-b border-ink/8 py-3.5 text-sm font-medium text-clay"
                >
                  Admin Panel
                </Link>
              )}
            </nav>
            <a href={`tel:${store.phone}`} className="btn-clay mt-auto">
              <Phone size={16} /> Call the shop
            </a>
          </div>
        </div>
      )}
    </header>
  )
}

function Dot({ n, light }: { n: number; light?: boolean }) {
  return (
    <span
      className={cx(
        'absolute -top-0.5 -right-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full px-1 text-[10px] font-bold',
        light ? 'bg-brass text-ink' : 'bg-clay text-bone',
      )}
    >
      {n}
    </span>
  )
}
