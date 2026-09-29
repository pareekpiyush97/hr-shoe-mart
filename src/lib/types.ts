export type Gender = 'men' | 'women' | 'kids' | 'unisex'

export type OrderStatus = 'placed' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled'
export type PayMethod = 'cod' | 'upi' | 'razorpay'
export type PayStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface Category {
  id: string
  slug: string
  name: string
  imageUrl: string | null
  sortOrder: number
  isActive: boolean
}

export interface Brand {
  id: string
  slug: string
  name: string
  isActive: boolean
}

/**
 * Firestore has no joins, so the category and brand names live on the product,
 * and sizes are a `{ "IND 8": 20 }` map — one read renders a whole product page,
 * and stock can be decremented inside a single-document transaction.
 */
export interface Product {
  id: string
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  categorySlug: string | null
  categoryName: string | null
  brandSlug: string | null
  brandName: string | null
  gender: Gender
  mrp: number
  price: number
  images: string[]
  color: string | null
  material: string | null
  rating: number
  reviewCount: number
  isActive: boolean
  isFeatured: boolean
  sortOrder: number
  variants: Record<string, number>
}

/** Sizes in wearable order rather than the map's insertion order. */
export const sizesOf = (p: Product) =>
  Object.entries(p.variants ?? {}).sort(
    (a, b) =>
      (parseFloat(a[0].replace(/[^0-9.]/g, '')) || 0) - (parseFloat(b[0].replace(/[^0-9.]/g, '')) || 0),
  )

export const inStock = (p: Product) => Object.values(p.variants ?? {}).some((n) => n > 0)

/** "IND 8" → "8" for size chips, where the heading already says India. */
export const shortSize = (size: string) => size.replace(/^(IND|UK)\s*/i, '')

export interface CartLine {
  slug: string
  title: string
  size: string
  qty: number
  price: number
  mrp: number
  image: string
  brand: string
  maxStock: number
}

export interface OrderItem {
  slug?: string
  title: string
  size: string | null
  qty: number
  price: number
  imageUrl: string | null
}

export interface Order {
  id: string
  orderNo: string
  userId: string | null
  customerName: string
  customerPhone: string
  customerEmail: string | null
  shippingAddress: {
    line1: string
    line2?: string
    city: string
    state: string
    pincode: string
  }
  items: OrderItem[]
  subtotal: number
  discount: number
  shippingFee: number
  total: number
  couponCode: string | null
  paymentMethod: PayMethod
  paymentStatus: PayStatus
  status: OrderStatus
  notes: string | null
  createdAt: number | null
}

export interface PlacedOrder {
  id: string
  orderNo: string
  subtotal: number
  discount: number
  shippingFee: number
  total: number
  paymentMethod: PayMethod
  couponCode: string | null
}

export interface TrackedOrder {
  orderNo: string
  status: OrderStatus
  createdAt: number | null
  paymentMethod: PayMethod
  paymentStatus: PayStatus
  customerName: string
  shippingAddress: Order['shippingAddress']
  subtotal: number
  discount: number
  shippingFee: number
  total: number
  items: OrderItem[]
}

export interface Review {
  id: string
  productSlug: string
  userId: string | null
  name: string
  rating: number
  comment: string | null
  createdAt: number | null
}

export interface StoreSettings {
  name: string
  tagline: string
  phone: string
  whatsapp: string
  email: string
  address: string
  hours: string
  map: string
}

export interface DeliverySettings {
  fee: number
  free_above: number
  eta_city: string
  eta_outside: string
}

export interface PaymentSettings {
  upi_id: string
  upi_name: string
  razorpay_enabled: boolean
}
