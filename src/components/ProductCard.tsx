import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import type { Product } from '../lib/types'
import { cx, inr, off } from '../lib/format'
import { useWishlist } from '../lib/store'
import Stars from './Stars'

export default function ProductCard({ p }: { p: Product }) {
  const wished = useWishlist((s) => s.slugs.includes(p.slug))
  const toggle = useWishlist((s) => s.toggle)
  const discount = off(p.mrp, p.price)
  const inStock = (p.product_variants ?? []).some((v) => v.stock > 0)

  return (
    <article className="group relative">
      <Link to={`/product/${p.slug}`} className="block">
        <div className="relative aspect-4/5 overflow-hidden rounded-2xl bg-sand">
          <img
            src={p.images[0]}
            alt={p.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {discount > 0 && (
            <span className="absolute top-3 left-3 rounded-full bg-clay px-2.5 py-1 text-[11px] font-bold text-bone">
              {discount}% OFF
            </span>
          )}
          {!inStock && (
            <span className="absolute inset-x-0 bottom-0 bg-ink/80 py-2 text-center text-xs font-semibold text-bone">
              Out of stock
            </span>
          )}
        </div>
      </Link>

      <button
        onClick={() => toggle(p.slug)}
        aria-label={wished ? 'Remove from wishlist' : 'Add to wishlist'}
        className="absolute top-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-bone/90 backdrop-blur transition hover:bg-bone"
      >
        <Heart size={16} className={cx(wished ? 'fill-clay text-clay' : 'text-ink')} />
      </button>

      <div className="pt-3">
        <p className="text-[11px] tracking-[0.14em] text-inksoft uppercase">
          {p.brands?.name ?? 'HR Shoe Mart'}
        </p>
        <Link to={`/product/${p.slug}`}>
          <h3 className="mt-1 line-clamp-1 font-display text-[15px] font-semibold hover:text-clay">
            {p.title}
          </h3>
        </Link>
        <div className="mt-1.5 flex items-center gap-2">
          <Stars value={p.rating} />
          <span className="text-[11px] text-inksoft">({p.review_count})</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-[15px] font-bold">{inr(p.price)}</span>
          {discount > 0 && (
            <span className="text-xs text-inksoft line-through">{inr(p.mrp)}</span>
          )}
        </div>
      </div>
    </article>
  )
}
