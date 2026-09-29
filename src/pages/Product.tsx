import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Heart,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Truck,
} from 'lucide-react'
import { addReview, getProduct, listRelated, listReviews } from '../lib/db'
import { sizesOf, type Product, type Review } from '../lib/types'
import { useCart, useWishlist } from '../lib/store'
import { useSettings, waLink } from '../lib/settings'
import { cx, day, inr, off } from '../lib/format'
import ProductCard from '../components/ProductCard'
import Stars from '../components/Stars'
import { Alert, Empty, Spinner, Toast } from '../components/ui'
import { useAuth } from '../lib/auth'

export default function ProductPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [p, setP] = useState<Product | null>(null)
  const [related, setRelated] = useState<Product[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [size, setSize] = useState('')
  const [qty, setQty] = useState(1)
  const [img, setImg] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')
  const [pin, setPin] = useState('')
  const [pinMsg, setPinMsg] = useState('')

  const add = useCart((s) => s.add)
  const wished = useWishlist((s) => (slug ? s.slugs.includes(slug) : false))
  const toggleWish = useWishlist((s) => s.toggle)
  const { store, delivery } = useSettings()
  const { user, profile } = useAuth()

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setSize('')
    setQty(1)
    setImg(0)

    getProduct(slug)
      .then(async (prod) => {
        setP(prod)
        setLoading(false)
        if (!prod) return
        const [rel, rev] = await Promise.all([
          listRelated(prod.categorySlug, prod.slug, 4),
          listReviews(prod.slug, 10),
        ])
        setRelated(rel)
        setReviews(rev)
      })
      .catch(() => setLoading(false))
  }, [slug])

  if (loading) return <Spinner label="Product laa rahe hain…" />
  if (!p)
    return (
      <div className="shell py-16">
        <Empty
          title="Ye product nahi mila"
          note="Shayad stock se hata diya gaya ho."
          action={
            <Link to="/shop" className="btn-clay mt-2">
              Back to shop
            </Link>
          }
        />
      </div>
    )

  const variants = sizesOf(p)
  const discount = off(p.mrp, p.price)
  const picked = size ? { size, stock: p.variants?.[size] ?? 0 } : undefined
  const anyStock = variants.some(([, stock]) => stock > 0)

  function addToBag(goToCart = false) {
    if (!size) {
      setErr('Pehle size select kijiye')
      return
    }
    if (!picked || picked.stock < 1) {
      setErr('Ye size abhi stock me nahi hai')
      return
    }
    setErr('')
    add({
      slug: p!.slug,
      title: p!.title,
      size,
      qty,
      price: Number(p!.price),
      mrp: Number(p!.mrp),
      image: p!.images[0],
      brand: p!.brandName ?? '',
      maxStock: picked.stock,
    })
    if (goToCart) navigate('/checkout')
    else setToast(`${p!.title} (${size}) bag me add ho gaya`)
  }

  function checkPin(e: React.FormEvent) {
    e.preventDefault()
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setPinMsg('6-digit pincode daalein')
      return
    }
    setPinMsg(
      pin.startsWith('334')
        ? `✓ ${delivery.eta_city} — delivery available`
        : `✓ Delivery available — ${delivery.eta_outside}`,
    )
  }

  async function postReview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    try {
      await addReview({
        productSlug: p!.slug,
        userId: user!.uid,
        name: profile?.fullName || user!.email!.split('@')[0],
        rating: Number(data.get('rating')),
        comment: String(data.get('comment') ?? ''),
      })
      setReviews(await listReviews(p!.slug, 10))
      form.reset()
      setToast('Review post ho gaya, dhanyavaad!')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <div className="shell py-8">
      <nav className="mb-6 text-xs text-inksoft">
        <Link to="/" className="hover:text-clay">
          Home
        </Link>{' '}
        /{' '}
        <Link to="/shop" className="hover:text-clay">
          Shop
        </Link>{' '}
        /{' '}
        <Link to={`/shop?category=${p.categorySlug}`} className="hover:text-clay">
          {p.categoryName}
        </Link>{' '}
        / <span className="text-ink">{p.title}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* gallery */}
        <div>
          <div className="aspect-square overflow-hidden rounded-3xl bg-sand">
            <img src={p.images[img]} alt={p.title} className="h-full w-full object-cover" />
          </div>
          {p.images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {p.images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setImg(i)}
                  className={cx(
                    'h-20 w-20 overflow-hidden rounded-xl border-2 transition',
                    i === img ? 'border-clay' : 'border-transparent opacity-60 hover:opacity-100',
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* details */}
        <div>
          <p className="text-[11px] tracking-[0.18em] text-clay uppercase">
            {p.brandName} · {p.gender}
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl">{p.title}</h1>
          <p className="mt-2 text-sm text-inksoft">{p.subtitle}</p>

          <div className="mt-3 flex items-center gap-2">
            <Stars value={p.rating} size={15} />
            <span className="text-sm font-medium">{p.rating.toFixed(1)}</span>
            <span className="text-xs text-inksoft">({p.reviewCount} ratings)</span>
          </div>

          <div className="mt-5 flex items-end gap-3">
            <span className="font-display text-3xl font-bold">{inr(p.price)}</span>
            {discount > 0 && (
              <>
                <span className="text-lg text-inksoft line-through">{inr(p.mrp)}</span>
                <span className="mb-1 rounded-full bg-moss/12 px-2.5 py-1 text-xs font-bold text-moss">
                  {discount}% off
                </span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-inksoft">Inclusive of all taxes</p>

          {/* sizes */}
          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between">
              <p className="label mb-0">Select size (UK)</p>
              {picked && picked.stock > 0 && picked.stock <= 5 && (
                <span className="text-xs font-semibold text-clay">
                  Sirf {picked.stock} bache hain
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {variants.map(([sz, stock]) => (
                <button
                  key={sz}
                  disabled={stock < 1}
                  onClick={() => {
                    setSize(sz)
                    setQty(1)
                    setErr('')
                  }}
                  className={cx(
                    'min-w-14 rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
                    stock < 1
                      ? 'cursor-not-allowed border-ink/10 bg-sand/60 text-ink/25 line-through'
                      : size === sz
                        ? 'border-clay bg-clay text-bone'
                        : 'border-ink/15 bg-white hover:border-ink',
                  )}
                >
                  {sz}
                </button>
              ))}
            </div>
          </div>

          {/* qty + actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border border-ink/15 bg-white">
              <button
                onClick={() => setQty((n) => Math.max(1, n - 1))}
                className="px-4 py-2.5 text-lg leading-none"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-semibold">{qty}</span>
              <button
                onClick={() => setQty((n) => Math.min(n + 1, picked?.stock ?? 5, 5))}
                className="px-4 py-2.5 text-lg leading-none"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            <button onClick={() => addToBag()} disabled={!anyStock} className="btn-primary flex-1">
              <ShoppingBag size={16} /> Add to bag
            </button>
            <button onClick={() => addToBag(true)} disabled={!anyStock} className="btn-clay flex-1">
              Buy now
            </button>
            <button
              onClick={() => toggleWish(p.slug)}
              aria-label="Wishlist"
              className="grid h-11 w-11 place-items-center rounded-full border border-ink/15 hover:border-ink"
            >
              <Heart size={17} className={cx(wished && 'fill-clay text-clay')} />
            </button>
          </div>

          {err && <div className="mt-3">{<Alert>{err}</Alert>}</div>}
          {!anyStock && (
            <div className="mt-3">
              <Alert>
                Ye product abhi out of stock hai.{' '}
                <a
                  href={waLink(store.whatsapp, `${p.title} kab tak aayega?`)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold underline"
                >
                  WhatsApp par poochhein
                </a>
              </Alert>
            </div>
          )}

          {/* pincode */}
          <form onSubmit={checkPin} className="mt-7 rounded-2xl bg-sand p-4">
            <p className="label">Delivery check</p>
            <div className="flex gap-2">
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Pincode (e.g. 334001)"
                className="field"
                inputMode="numeric"
              />
              <button className="btn-ghost shrink-0">Check</button>
            </div>
            {pinMsg && <p className="mt-2 text-xs font-medium text-moss">{pinMsg}</p>}
          </form>

          {/* assurances */}
          <div className="mt-6 grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
            {[
              [Truck, 'Free above ₹' + delivery.free_above],
              [RefreshCw, '7-day exchange'],
              [ShieldCheck, '100% original'],
              [PackageCheck, 'COD available'],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Truck
              return (
                <div key={label as string} className="flex flex-col items-center gap-1.5 text-center">
                  <I size={18} className="text-clay" />
                  <span className="text-inksoft">{label as string}</span>
                </div>
              )
            })}
          </div>

          <a
            href={waLink(store.whatsapp, `Namaste, "${p.title}" ke baare me jaankari chahiye.`)}
            target="_blank"
            rel="noreferrer"
            className="btn mt-6 w-full bg-moss text-bone hover:brightness-110"
          >
            <MessageCircle size={16} /> Is product ke baare me WhatsApp karein
          </a>
        </div>
      </div>

      {/* description + specs */}
      <section className="mt-16 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl">Product details</h2>
          <p className="mt-4 text-sm leading-relaxed text-inksoft">{p.description}</p>
        </div>
        <div>
          <h2 className="text-2xl">Specifications</h2>
          <dl className="mt-4 divide-y divide-ink/8 text-sm">
            {[
              ['Brand', p.brandName],
              ['Category', p.categoryName],
              ['Colour', p.color],
              ['Material', p.material],
              ['Wear for', p.gender],
              ['Sizes available', variants.filter(([, n]) => n > 0).map(([sz]) => sz).join(', ') || '—'],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between gap-6 py-3">
                <dt className="text-inksoft">{k as string}</dt>
                <dd className="text-right font-medium capitalize">{(v as string) ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* reviews */}
      <section className="mt-16">
        <h2 className="text-2xl">Customer reviews</h2>
        {reviews.length === 0 ? (
          <p className="mt-3 text-sm text-inksoft">
            Abhi tak koi likhit review nahi. Pehla review aap likhiye!
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <figure key={r.id} className="card p-5">
                <div className="flex items-center justify-between">
                  <Stars value={r.rating} />
                  <span className="text-[11px] text-inksoft">{r.createdAt ? day(r.createdAt) : ''}</span>
                </div>
                {r.comment && <p className="mt-2.5 text-sm text-inksoft">{r.comment}</p>}
                <figcaption className="mt-3 text-xs font-semibold">{r.name}</figcaption>
              </figure>
            ))}
          </div>
        )}

        {user ? (
          <form onSubmit={postReview} className="card mt-6 max-w-lg p-5">
            <p className="label">Apna review likhein</p>
            <select name="rating" defaultValue="5" className="field mb-3">
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n > 1 ? 's' : ''}
                </option>
              ))}
            </select>
            <textarea
              name="comment"
              rows={3}
              placeholder="Fit, comfort, quality kaisi lagi?"
              className="field"
            />
            <button className="btn-primary mt-3">Post review</button>
          </form>
        ) : (
          <p className="mt-6 text-sm text-inksoft">
            <Link to="/login" className="font-semibold text-clay hover:underline">
              Login
            </Link>{' '}
            karke apna review likhein.
          </p>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl">Aise hi aur options</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.id} p={r} />
            ))}
          </div>
        </section>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  )
}
