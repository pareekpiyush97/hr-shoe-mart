import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { inStock as hasStock, type Product } from '../lib/types'
import { cx, inr, off } from '../lib/format'
import { useWishlist } from '../lib/store'
import Stars from './Stars'

export default function ProductCard({ p }: { p: Product }) {
  const wished = useWishlist((s) => s.slugs.includes(p.slug))
  const toggle = useWishlist((s) => s.toggle)
  const discount = off(p.mrp, p.price)
  const inStock = hasStock(p)

  return (
    <article className="group relative">
      <Link to={`/product/${p.slug}`} className="block">
        <div className="relative aspect-4/5 overflow-hidden rounded-t-[999px] rounded-b-xl bg-sand">
          <img
            src={p.images[0]}
            alt={p.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
          />
          {discount > 0 && (
            <span className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full border border-bone/50 bg-ink/35 px-3 py-1 text-[9px] font-medium tracking-[0.2em] text-bone uppercase backdrop-blur-sm">
              {discount}% off
            </span>
          )}
          {!inStock && (
            <span className="absolute inset-x-0 bottom-0 bg-ink/75 py-2 text-center text-[10px] font-medium tracking-[0.2em] text-bone uppercase">
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
        <p className="text-[9.5px] tracking-[0.26em] text-inksoft/80 uppercase">
          {p.brandName ?? 'HR Shoe Mart'}
        </p>
        <Link to={`/product/${p.slug}`}>
          <h3 className="mt-1.5 line-clamp-1 font-display text-[17px] font-normal transition-colors hover:text-clay">
            {p.title}
          </h3>
        </Link>
        <div className="mt-1.5 flex items-center gap-2">
          <Stars value={p.rating} />
          <span className="text-[11px] text-inksoft">({p.reviewCount})</span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2.5">
          <span className="price">{inr(p.price)}</span>
          {discount > 0 && (
            <span className="text-[12px] text-inksoft/70 line-through">{inr(p.mrp)}</span>
          )}
        </div>
      </div>
    </article>
  )
}
