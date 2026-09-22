import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useWishlist } from '../lib/store'
import type { Product } from '../lib/types'
import ProductCard from '../components/ProductCard'
import { Empty, ProductSkeleton } from '../components/ui'

export default function Wishlist() {
  const slugs = useWishlist((s) => s.slugs)
  const [items, setItems] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (slugs.length === 0) {
      setItems([])
      setLoading(false)
      return
    }
    supabase
      .from('products')
      .select('*, brands(name, slug), categories(name, slug), product_variants(id, size, stock)')
      .in('slug', slugs)
      .then(({ data }) => {
        setItems((data as Product[]) ?? [])
        setLoading(false)
      })
  }, [slugs])

  return (
    <div className="shell py-10">
      <h1 className="text-3xl sm:text-4xl">Wishlist</h1>
      <p className="mt-1.5 text-sm text-inksoft">
        {slugs.length} saved item(s) — isi browser me save rehta hai.
      </p>

      <div className="mt-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Empty
            title="Wishlist khali hai"
            note="Product page par dil ke icon se pasand ke pairs save kar lijiye."
            action={
              <Link to="/shop" className="btn-clay mt-2">
                Browse footwear
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-9 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
