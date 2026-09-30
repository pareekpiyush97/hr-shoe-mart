/**
 * Every Firestore read and every server call the storefront makes, in one
 * place. Pages import from here and never touch the SDK directly, so swapping
 * or caching the data layer later touches one file.
 */
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { call, db, firebaseReady } from './firebase'
import type {
  Brand,
  Category,
  Order,
  PlacedOrder,
  Product,
  Review,
  TrackedOrder,
} from './types'

const shape = <T>(d: QueryDocumentSnapshot<DocumentData>) => ({ id: d.id, ...d.data() }) as T

/**
 * Catalogue fallback.
 *
 * The shop can survive a missing order button; it cannot survive an empty
 * shelf. So every catalogue read goes through `catalogue()` below, which
 * falls back to the same seed file the importer uses — loaded as a separate
 * chunk, so it costs nothing until it is needed. It covers three cases: no
 * Firebase config at all, a project whose catalogue has not been imported
 * yet, and a read that simply fails. Orders, accounts and reviews get no
 * such net — those must be real or fail loudly.
 */
interface Seed {
  categories: Category[]
  brands: Brand[]
  products: Product[]
  settings: Record<string, unknown>
}
let seedPromise: Promise<Seed> | null = null
const seed = () => {
  seedPromise ??= import('../../firebase/seed/catalogue.json').then((m) => m.default as unknown as Seed)
  return seedPromise
}

/** Empty enough that the seed is a better answer than what Firestore returned. */
const blank = (v: unknown) =>
  v == null ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v as object).length === 0)

async function catalogue<T>(live: () => Promise<T>, fromSeed: (s: Seed) => T): Promise<T> {
  if (firebaseReady) {
    try {
      const out = await live()
      if (!blank(out)) return out
    } catch (err) {
      console.warn('[catalogue] Firestore read failed — falling back to the bundled seed', err)
    }
  }
  return fromSeed(await seed())
}

const millis = (v: unknown): number | null => {
  const t = v as { toMillis?: () => number } | null
  return t?.toMillis ? t.toMillis() : null
}

// ------------------------------------------------------------------ catalogue
export async function listCategories(): Promise<Category[]> {
  return catalogue(async () => {
    const snap = await getDocs(query(collection(db, 'categories'), orderBy('sortOrder')))
    return snap.docs.map((d) => shape<Category>(d))
  }, (s) => s.categories)
}

export async function listBrands(): Promise<Brand[]> {
  return catalogue(async () => {
    const snap = await getDocs(query(collection(db, 'brands'), orderBy('name')))
    return snap.docs.map((d) => shape<Brand>(d))
  }, (s) => s.brands)
}

/**
 * The whole active catalogue in one read. It is 53 products today; the shop
 * page then filters and sorts in memory, which keeps filtering instant and
 * costs one query instead of one per filter change.
 */
export async function listProducts(): Promise<Product[]> {
  return catalogue(async () => {
    const snap = await getDocs(
      query(collection(db, 'products'), where('isActive', '==', true), orderBy('sortOrder')),
    )
    return snap.docs.map((d) => shape<Product>(d))
  }, (s) => s.products)
}

export async function listFeatured(n = 8): Promise<Product[]> {
  return catalogue(
    async () => {
      const snap = await getDocs(
        query(
          collection(db, 'products'),
          where('isActive', '==', true),
          where('isFeatured', '==', true),
          fsLimit(n),
        ),
      )
      return snap.docs.map((d) => shape<Product>(d))
    },
    (s) => s.products.filter((p) => p.isFeatured).slice(0, n),
  )
}

export async function listNewest(n = 8): Promise<Product[]> {
  return catalogue(
    async () => {
      const snap = await getDocs(
        query(
          collection(db, 'products'),
          where('isActive', '==', true),
          orderBy('sortOrder', 'desc'),
          fsLimit(n),
        ),
      )
      return snap.docs.map((d) => shape<Product>(d))
    },
    (s) => [...s.products].sort((a, b) => b.sortOrder - a.sortOrder).slice(0, n),
  )
}

export async function getProduct(slug: string): Promise<Product | null> {
  return catalogue(
    async () => {
      const snap = await getDoc(doc(db, 'products', slug))
      if (!snap.exists() || snap.data().isActive === false) return null
      return { id: snap.id, ...snap.data() } as Product
    },
    (s) => s.products.find((p) => p.slug === slug) ?? null,
  )
}

export async function listRelated(categorySlug: string | null, exceptSlug: string, n = 4) {
  if (!categorySlug) return []
  return catalogue(
    async () => {
      const snap = await getDocs(
        query(
          collection(db, 'products'),
          where('isActive', '==', true),
          where('categorySlug', '==', categorySlug),
          fsLimit(n + 1),
        ),
      )
      return snap.docs
        .map((d) => shape<Product>(d))
        .filter((p) => p.slug !== exceptSlug)
        .slice(0, n)
    },
    (s) =>
      s.products
        .filter((p) => p.categorySlug === categorySlug && p.slug !== exceptSlug)
        .slice(0, n),
  )
}

export async function listBySlugs(slugs: string[]): Promise<Product[]> {
  if (slugs.length === 0) return []
  return catalogue(
    async () => {
      // `in` takes up to 30 values per query, so chunk for bigger wishlists.
      const chunks: string[][] = []
      for (let i = 0; i < slugs.length; i += 30) chunks.push(slugs.slice(i, i + 30))
      const results = await Promise.all(
        chunks.map((c) =>
          getDocs(query(collection(db, 'products'), where('slug', 'in', c))).then((s) =>
            s.docs.map((d) => shape<Product>(d)),
          ),
        ),
      )
      return results.flat()
    },
    (s) => s.products.filter((p) => slugs.includes(p.slug)),
  )
}

// ------------------------------------------------------------------ settings
export async function loadSettings() {
  return catalogue(
    async () => {
      const snap = await getDocs(collection(db, 'settings'))
      return Object.fromEntries(snap.docs.map((d) => [d.id, d.data()])) as Record<string, unknown>
    },
    (s) => s.settings,
  )
}

// ------------------------------------------------------------------- reviews
export async function listReviews(productSlug: string, n = 10): Promise<Review[]> {
  if (!firebaseReady) return []
  const snap = await getDocs(
    query(
      collection(db, 'reviews'),
      where('productSlug', '==', productSlug),
      orderBy('createdAt', 'desc'),
      fsLimit(n),
    ),
  )
  return snap.docs.map((d) => ({
    ...shape<Review>(d),
    createdAt: millis(d.data().createdAt),
  }))
}

export async function addReview(input: {
  productSlug: string
  userId: string
  name: string
  rating: number
  comment: string
}) {
  await addDoc(collection(db, 'reviews'), { ...input, createdAt: serverTimestamp() })
}

// -------------------------------------------------------------------- orders
// All three run server side — prices, stock and coupons are never decided here.
export const placeOrder = (payload: Record<string, unknown>) =>
  call<Record<string, unknown>, PlacedOrder>('placeOrder', payload)

export const previewCoupon = (code: string, subtotal: number) =>
  call<{ code: string; subtotal: number }, { ok: boolean; reason?: string; code?: string; discount?: number }>(
    'previewCoupon',
    { code, subtotal },
  )

export const trackOrder = (orderNo: string, phone: string) =>
  call<{ orderNo: string; phone: string }, TrackedOrder | null>('trackOrder', { orderNo, phone })

export async function listMyOrders(userId: string): Promise<Order[]> {
  const snap = await getDocs(
    query(collection(db, 'orders'), where('userId', '==', userId), orderBy('createdAt', 'desc')),
  )
  return snap.docs.map((d) => ({ ...shape<Order>(d), createdAt: millis(d.data().createdAt) }))
}

// --------------------------------------------------------------------- admin
export async function adminListOrders(n = 100): Promise<Order[]> {
  const snap = await getDocs(
    query(collection(db, 'orders'), orderBy('createdAt', 'desc'), fsLimit(n)),
  )
  return snap.docs.map((d) => ({ ...shape<Order>(d), createdAt: millis(d.data().createdAt) }))
}

export async function adminListAllProducts(): Promise<Product[]> {
  const snap = await getDocs(query(collection(db, 'products'), orderBy('sortOrder')))
  return snap.docs.map((d) => shape<Product>(d))
}

export const adminSetOrderStatus = (orderId: string, status: string) =>
  updateDoc(doc(db, 'orders', orderId), { status, updatedAt: serverTimestamp() })

export const adminSaveProduct = (slug: string, patch: Partial<Product>) =>
  updateDoc(doc(db, 'products', slug), { ...patch, updatedAt: serverTimestamp() })

export const adminSetStock = (slug: string, size: string, stock: number) =>
  updateDoc(doc(db, 'products', slug), {
    [`variants.${size}`]: Math.max(0, Math.round(stock)),
    updatedAt: serverTimestamp(),
  })

export async function adminCreateProduct(p: Omit<Product, 'id'>) {
  const batch = writeBatch(db)
  batch.set(doc(db, 'products', p.slug), { ...p, createdAt: serverTimestamp() })
  await batch.commit()
}

// ------------------------------------------------------------------ Razorpay
export const razorpayConfig = () =>
  call<Record<string, never>, { configured: boolean; keyId: string | null }>('razorpayConfig', {})

export const razorpayCreate = (orderNo: string) =>
  call<
    { orderNo: string },
    {
      keyId: string
      razorpayOrderId: string
      amount: number
      currency: string
      orderNo: string
      customer: { name: string; contact: string; email: string }
    }
  >('razorpayCreate', { orderNo })

export const razorpayVerify = (payload: {
  orderNo: string
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}) => call<typeof payload, { verified: boolean; orderNo: string }>('razorpayVerify', payload)
