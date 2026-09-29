import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IndianRupee, LayoutDashboard, Package, PlusCircle, Save, ShoppingCart } from 'lucide-react'
import { useAuth } from '../lib/auth'
import {
  adminCreateProduct,
  adminListAllProducts,
  adminListOrders,
  adminSaveProduct,
  adminSetOrderStatus,
  adminSetStock,
  listBrands,
  listCategories,
} from '../lib/db'
import { cx, inr, when } from '../lib/format'
import { Alert, Empty, Spinner, Toast } from '../components/ui'
import {
  sizesOf,
  type Brand,
  type Category,
  type Order,
  type OrderStatus,
  type Product,
} from '../lib/types'

const TABS = [
  ['dash', 'Dashboard', LayoutDashboard],
  ['orders', 'Orders', ShoppingCart],
  ['products', 'Products', Package],
  ['new', 'Add product', PlusCircle],
] as const

const STATUSES: OrderStatus[] = ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled']

export default function Admin() {
  const { user, loading, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('dash')
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [busy, setBusy] = useState(true)
  const [toast, setToast] = useState('')
  const [err, setErr] = useState('')

  const reload = useCallback(async () => {
    const [o, p, c, b] = await Promise.all([
      adminListOrders(100),
      adminListAllProducts(),
      listCategories(),
      listBrands(),
    ])
    setOrders(o)
    setProducts(p)
    setCats(c)
    setBrands(b)
    setBusy(false)
  }, [])

  useEffect(() => {
    if (!loading && !user) navigate('/login', { replace: true })
  }, [loading, user, navigate])

  useEffect(() => {
    if (isAdmin) reload()
  }, [isAdmin, reload])

  if (loading) return <Spinner />
  if (!isAdmin)
    return (
      <div className="shell py-16">
        <Empty
          title="Admin access chahiye"
          note="Ye panel sirf store staff ke liye hai. Agar aap owner hain to apne account ko admin banwaiye."
          action={
            <Link to="/" className="btn-clay mt-2">
              Back to store
            </Link>
          }
        />
      </div>
    )

  const revenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((n, o) => n + Number(o.total), 0)
  const pending = orders.filter((o) => ['placed', 'confirmed', 'packed'].includes(o.status)).length
  const lowStock = products.filter((p) =>
    Object.values(p.variants ?? {}).some((n) => n > 0 && n <= 3),
  )
  const outOfStock = products.filter((p) =>
    Object.values(p.variants ?? {}).every((n) => n === 0),
  )

  async function setStatus(id: string, status: OrderStatus) {
    try {
      await adminSetOrderStatus(id, status)
      setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)))
      setToast('Order status update ho gaya')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function saveProduct(p: Product, patch: Partial<Product>) {
    try {
      await adminSaveProduct(p.slug, patch)
      setProducts((ps) => ps.map((x) => (x.id === p.id ? { ...x, ...patch } : x)))
      setToast(`${p.title} saved`)
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  async function saveStock(slug: string, size: string, stock: number) {
    try {
      await adminSetStock(slug, size, stock)
      setProducts((ps) =>
        ps.map((p) =>
          p.slug === slug ? { ...p, variants: { ...p.variants, [size]: stock } } : p,
        ),
      )
      setToast('Stock update ho gaya')
    } catch (e) {
      setErr((e as Error).message)
    }
  }

  return (
    <div className="shell py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Staff only</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Store admin</h1>
        </div>
        <Link to="/" className="btn-ghost">
          View storefront
        </Link>
      </div>

      <div className="mt-7 flex gap-2 overflow-x-auto border-b border-ink/10 pb-px">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cx(
              'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition',
              tab === id ? 'border-clay text-clay' : 'border-transparent text-inksoft hover:text-ink',
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {err && (
        <div className="mt-5">
          <Alert>{err}</Alert>
        </div>
      )}

      {busy ? (
        <Spinner />
      ) : (
        <div className="pt-8">
          {tab === 'dash' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Total orders" value={String(orders.length)} />
                <Stat label="Pending fulfilment" value={String(pending)} accent />
                <Stat label="Revenue" value={inr(revenue)} icon />
                <Stat label="Live products" value={String(products.filter((p) => p.isActive).length)} />
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                <div className="card p-5">
                  <h2 className="text-lg">Low stock (≤ 3 pairs)</h2>
                  {lowStock.length === 0 ? (
                    <p className="mt-3 text-sm text-inksoft">Sab theek hai.</p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-sm">
                      {lowStock.slice(0, 8).map((p) => (
                        <li key={p.id} className="flex justify-between gap-3">
                          <span className="line-clamp-1">{p.title}</span>
                          <span className="shrink-0 text-clay">
                            {sizesOf(p)
                              .filter(([, n]) => n > 0 && n <= 3)
                              .map(([sz, n]) => `${sz}:${n}`)
                              .join(', ')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="card p-5">
                  <h2 className="text-lg">Out of stock</h2>
                  {outOfStock.length === 0 ? (
                    <p className="mt-3 text-sm text-inksoft">Koi product out of stock nahi.</p>
                  ) : (
                    <ul className="mt-3 space-y-2 text-sm">
                      {outOfStock.map((p) => (
                        <li key={p.id} className="line-clamp-1">
                          {p.title}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <h2 className="mt-8 mb-4 text-lg">Latest orders</h2>
              <OrderTable orders={orders.slice(0, 6)} onStatus={setStatus} />
            </>
          )}

          {tab === 'orders' &&
            (orders.length === 0 ? (
              <Empty title="Abhi koi order nahi aaya" />
            ) : (
              <OrderTable orders={orders} onStatus={setStatus} detailed />
            ))}

          {tab === 'products' && (
            <div className="space-y-4">
              {products.map((p) => (
                <ProductRow key={p.id} p={p} onSave={saveProduct} onStock={saveStock} />
              ))}
            </div>
          )}

          {tab === 'new' && (
            <NewProduct
              cats={cats}
              brands={brands}
              onDone={async (msg) => {
                setToast(msg)
                await reload()
                setTab('products')
              }}
              onError={setErr}
            />
          )}
        </div>
      )}

      {toast && <Toast message={toast} onDone={() => setToast('')} />}
    </div>
  )
}

function Stat({ label, value, accent, icon }: { label: string; value: string; accent?: boolean; icon?: boolean }) {
  return (
    <div className={cx('card p-5', accent && 'border-clay/30 bg-clay/5')}>
      <p className="text-xs tracking-wide text-inksoft uppercase">{label}</p>
      <p className="mt-2 flex items-center gap-1 font-display text-2xl font-bold">
        {icon && <IndianRupee size={18} className="text-clay" />}
        {value}
      </p>
    </div>
  )
}

function OrderTable({
  orders,
  onStatus,
  detailed,
}: {
  orders: Order[]
  onStatus: (id: string, s: OrderStatus) => void
  detailed?: boolean
}) {
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <div key={o.id} className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg">{o.orderNo}</p>
              <p className="text-xs text-inksoft">{o.createdAt ? when(o.createdAt) : ''}</p>
              <p className="mt-1.5 text-sm">
                {o.customerName} ·{' '}
                <a href={`tel:${o.customerPhone}`} className="text-clay hover:underline">
                  {o.customerPhone}
                </a>
              </p>
              {detailed && (
                <p className="mt-1 max-w-md text-xs text-inksoft">
                  {o.shippingAddress.line1}
                  {o.shippingAddress.line2 ? `, ${o.shippingAddress.line2}` : ''},{' '}
                  {o.shippingAddress.city} — {o.shippingAddress.pincode}
                </p>
              )}
            </div>

            <div className="text-right">
              <p className="font-bold">{inr(o.total)}</p>
              <p className="text-xs text-inksoft capitalize">
                {o.paymentMethod} · {o.paymentStatus}
              </p>
              <select
                value={o.status}
                onChange={(e) => onStatus(o.id, e.target.value as OrderStatus)}
                className="field mt-2 w-auto py-1.5 text-xs capitalize"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {detailed && (
            <ul className="mt-3 flex flex-wrap gap-3 border-t border-ink/8 pt-3">
              {(o.items ?? []).map((i, k) => (
                <li key={k} className="flex items-center gap-2 rounded-lg bg-sand px-2.5 py-1.5 text-xs">
                  <img src={i.imageUrl ?? ''} alt="" className="h-8 w-7 rounded object-cover" />
                  {i.title} · {i.size} × {i.qty}
                </li>
              ))}
            </ul>
          )}

          {o.notes && <p className="mt-3 text-xs text-inksoft italic">Note: {o.notes}</p>}
        </div>
      ))}
    </div>
  )
}

function ProductRow({
  p,
  onSave,
  onStock,
}: {
  p: Product
  onSave: (p: Product, patch: Partial<Product>) => void
  onStock: (slug: string, size: string, stock: number) => void
}) {
  const [price, setPrice] = useState(String(p.price))
  const [mrp, setMrp] = useState(String(p.mrp))
  const [open, setOpen] = useState(false)

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-4">
        <img src={p.images[0]} alt="" className="h-16 w-14 rounded-lg bg-sand object-cover" />
        <div className="min-w-48 flex-1">
          <p className="font-display text-base font-semibold">{p.title}</p>
          <p className="text-xs text-inksoft">
            {p.brandName} · {p.categoryName}
          </p>
        </div>

        <label className="text-xs">
          <span className="mb-1 block text-inksoft">MRP</span>
          <input
            value={mrp}
            onChange={(e) => setMrp(e.target.value)}
            className="field w-24 py-2"
            inputMode="numeric"
          />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-inksoft">Price</span>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="field w-24 py-2"
            inputMode="numeric"
          />
        </label>

        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={p.isActive}
            onChange={(e) => onSave(p, { isActive: e.target.checked })}
            className="accent-[#b14724]"
          />
          Live
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={p.isFeatured}
            onChange={(e) => onSave(p, { isFeatured: e.target.checked })}
            className="accent-[#b14724]"
          />
          Featured
        </label>

        <button
          onClick={() => onSave(p, { price: Number(price), mrp: Number(mrp) })}
          className="btn-ghost px-4 py-2 text-xs"
        >
          <Save size={13} /> Save
        </button>
        <button onClick={() => setOpen((o) => !o)} className="text-xs font-semibold text-clay">
          {open ? 'Hide stock' : 'Stock'}
        </button>
      </div>

      {open && (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-ink/8 pt-4">
          {sizesOf(p).map(([sz, stock]) => (
            <label key={sz} className="text-xs">
              <span className="mb-1 block text-inksoft">{sz}</span>
              <input
                type="number"
                min={0}
                defaultValue={stock}
                onBlur={(e) => {
                  const n = Math.max(0, Number(e.target.value))
                  if (n !== stock) onStock(p.slug, sz, n)
                }}
                className="field w-20 py-2 text-center"
              />
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function NewProduct({
  cats,
  brands,
  onDone,
  onError,
}: {
  cats: Category[]
  brands: Brand[]
  onDone: (msg: string) => void
  onError: (m: string) => void
}) {
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const title = String(f.get('title'))
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    setBusy(true)

    const sizes = String(f.get('sizes'))
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    const stock = Math.max(0, Number(f.get('stock')) || 0)
    const categorySlug = String(f.get('category'))
    const brandSlug = String(f.get('brand'))

    try {
      // Firestore keeps the category and brand names on the product, so the
      // storefront never has to look them up.
      await adminCreateProduct({
        slug,
        title,
        subtitle: String(f.get('subtitle')),
        description: String(f.get('description')),
        categorySlug,
        categoryName: cats.find((c) => c.slug === categorySlug)?.name ?? null,
        brandSlug,
        brandName: brands.find((b) => b.slug === brandSlug)?.name ?? null,
        gender: String(f.get('gender')) as Product['gender'],
        mrp: Number(f.get('mrp')),
        price: Number(f.get('price')),
        images: [String(f.get('image'))],
        color: String(f.get('color')),
        material: String(f.get('material')),
        rating: 4.5,
        reviewCount: 0,
        isActive: true,
        isFeatured: false,
        sortOrder: 999,
        variants: Object.fromEntries(sizes.map((size) => [size, stock])),
      })
      onDone(`${title} add ho gaya`)
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="card max-w-2xl space-y-4 p-6">
      <h2 className="text-xl">Naya product add karein</h2>

      <div>
        <label className="label">Title *</label>
        <input name="title" required className="field" placeholder="Campus Blaze Grey" />
      </div>
      <div>
        <label className="label">Short line</label>
        <input name="subtitle" className="field" placeholder="Lightweight daily sneaker" />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea name="description" rows={3} className="field" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Category *</label>
          <select name="category" required className="field">
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Brand *</label>
          <select name="brand" required className="field">
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Wear for</label>
          <select name="gender" defaultValue="unisex" className="field">
            {['men', 'women', 'kids', 'unisex'].map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Colour</label>
          <input name="color" className="field" />
        </div>
        <div>
          <label className="label">MRP *</label>
          <input name="mrp" required type="number" className="field" />
        </div>
        <div>
          <label className="label">Selling price *</label>
          <input name="price" required type="number" className="field" />
        </div>
        <div>
          <label className="label">Material</label>
          <input name="material" className="field" />
        </div>
        <div>
          <label className="label">Stock per size</label>
          <input name="stock" type="number" defaultValue={10} className="field" />
        </div>
      </div>

      <div>
        <label className="label">Image URL *</label>
        <input name="image" required className="field" placeholder="https://…jpg" />
      </div>
      <div>
        <label className="label">Sizes (comma separated) *</label>
        <input name="sizes" required defaultValue="IND 6, IND 7, IND 8, IND 9, IND 10" className="field" />
      </div>

      <button disabled={busy} className="btn-clay">
        {busy ? 'Saving…' : 'Add product'}
      </button>
    </form>
  )
}
