export type Gender = 'men' | 'women' | 'kids' | 'unisex'

export type OrderStatus = 'placed' | 'confirmed' | 'packed' | 'shipped' | 'delivered' | 'cancelled'
export type PayMethod = 'cod' | 'upi' | 'razorpay'
export type PayStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface Category {
  id: string
  slug: string
  name: string
  image_url: string | null
  sort_order: number
  is_active: boolean
}

export interface Brand {
  id: string
  slug: string
  name: string
  is_active: boolean
}

export interface Variant {
  id: string
  product_id: string
  size: string
  stock: number
}

export interface Product {
  id: string
  slug: string
  title: string
  subtitle: string | null
  description: string | null
  category_id: string | null
  brand_id: string | null
  gender: Gender
  mrp: number
  price: number
  images: string[]
  color: string | null
  material: string | null
  rating: number
  review_count: number
  is_active: boolean
  is_featured: boolean
  sort_order: number
  created_at: string
  categories?: Pick<Category, 'name' | 'slug'> | null
  brands?: Pick<Brand, 'name' | 'slug'> | null
  product_variants?: Variant[]
}

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
  title: string
  size: string | null
  qty: number
  price: number
  image_url: string | null
}

export interface Order {
  id: string
  order_no: string
  customer_name: string
  customer_phone: string
  customer_email: string | null
  shipping_address: {
    line1: string
    line2?: string
    city: string
    state: string
    pincode: string
  }
  subtotal: number
  discount: number
  shipping_fee: number
  total: number
  coupon_code: string | null
  payment_method: PayMethod
  payment_status: PayStatus
  status: OrderStatus
  notes: string | null
  created_at: string
  order_items?: OrderItem[]
}

export interface PlacedOrder {
  id: string
  order_no: string
  subtotal: number
  discount: number
  shipping_fee: number
  total: number
  payment_method: PayMethod
  coupon_code: string | null
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
