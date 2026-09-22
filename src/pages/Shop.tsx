import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Brand, Category, Product } from '../lib/types'
import ProductCard from '../components/ProductCard'
import { Empty, ProductSkeleton } from '../components/ui'
import { cx, inr } from '../lib/format'

const SORTS = [
  ['featured', 'Featured'],
  ['low', 'Price: low to high'],
  ['high', 'Price: high to low'],
  ['discount', 'Biggest discount'],
  ['rating', 'Top rated'],
] as const

const GENDERS = [
  ['men', 'Men'],
  ['women', 'Women'],
  ['kids', 'Kids'],
  ['unisex', 'Unisex'],
]

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [cats, setCats] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const category = params.get('category') ?? ''
  const brand = params.get('brand') ?? ''
  const gender = params.get('gender') ?? ''
  const size = params.get('size') ?? ''
  const maxPrice = Number(params.get('max') ?? 0)
  const q = (params.get('q') ?? '').trim().toLowerCase()
  const sort = params.get('sort') ?? 'featured'

  useEffect(() => {
    Promise.all([
      supabase
        .from('products')
        .select('*, brands(name, slug), categories(name, slug), product_variants(id, size, stock)')
        .eq('is_active', true)
        .order('sort_order'),
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('brands').select('*').order('name'),
    ]).then(([p, c, b]) => {
      setProducts((p.data as Product[]) ?? [])
      setCats((c.data as Category[]) ?? [])
      setBrands((b.data as Brand[]) ?? [])
      setLoading(false)
    })
  }, [])

  const sizes = useMemo(() => {
    const set = new Set<string>()
    products.forEach((p) => p.product_variants?.forEach((v) => set.add(v.size)))
    return [...set].sort((a, b) => {
      const na = parseFloat(a.replace(/[^0-9.]/g, '')) || 0
      const nb = parseFloat(b.replace(/[^0-9.]/g, '')) || 0
      return a.includes('C') === b.includes('C') ? na - nb : a.includes('C') ? -1 : 1
    })
  }, [products])

  const priceCap = useMemo(
    () => Math.max(2000, ...products.map((p) => Math.ceil(p.price / 500) * 500)),
    [products],
  )

  const shown = useMemo(() => {
    let list = products.filter((p) => {
      if (category && p.categories?.slug !== category) return false
      if (brand && p.brands?.slug !== brand) return false
      if (gender && p.gender !== gender) return false
      if (maxPrice && p.price > maxPrice) return false
      if (size && !p.product_variants?.some((v) => v.size === size && v.stock > 0)) return false
      if (q) {
        const hay = `${p.title} ${p.subtitle ?? ''} ${p.brands?.name ?? ''} ${p.categories?.name ?? ''} ${p.color ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })

    list = [...list]
    if (sort === 'low') list.sort((a, b) => a.price - b.price)
    else if (sort === 'high') list.sort((a, b) => b.price - a.price)
    else if (sort === 'rating') list.sort((a, b) => b.rating - a.rating)
    else if (sort === 'discount')
      list.sort((a, b) => (b.mrp - b.price) / b.mrp - (a.mrp - a.price) / a.mrp)
    else list.sort((a, b) => Number(b.is_featured) - Number(a.is_featured) || a.sort_order - b.sort_order)
    return list
  }, [products, category, brand, gender, size, maxPrice, q, sort])

  function set(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (!value || next.get(key) === value) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const activeCount = [category, brand, gender, size, maxPrice ? 'p' : '', q].filter(Boolean).length
  const title =
    cats.find((c) => c.slug === category)?.name ??
    (gender ? `${gender[0].toUpperCase()}${gender.slice(1)}'s footwear` : 'All footwear')

  const filters = (
    <div className="space-y-7">
      <FilterBlock title="Category">
        {cats.map((c) => (
          <Chip key={c.id} on={category === c.slug} onClick={() => set('category', c.slug)}>
            {c.name}
          </Chip>
        ))}
      </FilterBlock>

      <FilterBlock title="Wear for">
        {GENDERS.map(([v, l]) => (
          <Chip key={v} on={gender === v} onClick={() => set('gender', v)}>
            {l}
          </Chip>
        ))}
      </FilterBlock>

      <FilterBlock title="Size">
        {sizes.map((s) => (
          <Chip key={s} on={size === s} onClick={() => set('size', s)}>
            {s}
          </Chip>
        ))}
      </FilterBlock>

      <FilterBlock title="Brand">
        {brands.map((b) => (
          <Chip key={b.id} on={brand === b.slug} onClick={() => set('brand', b.slug)}>
            {b.name}
          </Chip>
        ))}
      </FilterBlock>

      <div>
        <p className="label">Max price — {maxPrice ? inr(maxPrice) : 'any'}</p>
        <input
          type="range"
          min={299}
          max={priceCap}
          step={100}
          value={maxPrice || priceCap}
          onChange={(e) => set('max', e.target.value === String(priceCap) ? '' : e.target.value)}
          className="w-full accent-[#b14724]"
        />
        <div className="mt-1 flex justify-between text-[11px] text-inksoft">
          <span>₹299</span>
          <span>{inr(priceCap)}+</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="shell py-10">
      <nav className="mb-2 text-xs text-inksoft">
        <Link to="/" className="hover:text-clay">
          Home
        </Link>{' '}
        / <span className="text-ink">Shop</span>
      </nav>

      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-ink/10 pb-6">
        <div>
          <h1 className="text-3xl sm:text-4xl">{q ? `“${params.get('q')}”` : title}</h1>
          <p className="mt-1.5 text-sm text-inksoft">
            {loading ? 'Loading stock…' : `${shown.length} pairs available`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button className="btn-ghost lg:hidden" onClick={() => setShowFilters(true)}>
            <SlidersHorizontal size={15} /> Filters
            {activeCount > 0 && (
              <span className="rounded-full bg-clay px-1.5 text-[10px] text-bone">{activeCount}</span>
            )}
          </button>
          <select
            value={sort}
            onChange={(e) => set('sort', e.target.value)}
            className="field w-auto py-2.5 text-sm"
            aria-label="Sort products"
          >
            {SORTS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-5">
          {[
            ['category', cats.find((c) => c.slug === category)?.name],
            ['brand', brands.find((b) => b.slug === brand)?.name],
            ['gender', gender],
            ['size', size],
            ['max', maxPrice ? `Under ${inr(maxPrice)}` : ''],
            ['q', params.get('q')],
          ]
            .filter(([, label]) => label)
            .map(([key, label]) => (
              <button
                key={key as string}
                onClick={() => set(key as string, '')}
                className="flex items-center gap-1.5 rounded-full bg-sand px-3 py-1.5 text-xs font-medium capitalize hover:bg-sanddeep"
              >
                {label as string} <X size={12} />
              </button>
            ))}
          <button
            onClick={() => setParams(new URLSearchParams(), { replace: true })}
            className="text-xs font-semibold text-clay hover:underline"
          >
            Clear all
          </button>
        </div>
      )}

      <div className="grid gap-10 pt-8 lg:grid-cols-[230px_1fr]">
        <aside className="hidden lg:block">{filters}</aside>

        <div>
          {loading ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <Empty
              title="Is filter me kuch nahi mila"
              note="Filter hata kar dobara dekhein, ya humein WhatsApp kar dein — shop me stock ho sakta hai."
              action={
                <button
                  className="btn-clay mt-2"
                  onClick={() => setParams(new URLSearchParams(), { replace: true })}
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-9 sm:grid-cols-3">
              {shown.map((p) => (
                <ProductCard key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="fixed inset-0 z-60 lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setShowFilters(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-3xl bg-bone p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl">Filters</h2>
              <button onClick={() => setShowFilters(false)} aria-label="Close filters">
                <X size={22} />
              </button>
            </div>
            {filters}
            <button className="btn-primary mt-7 w-full" onClick={() => setShowFilters(false)}>
              Show {shown.length} results
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function FilterBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="label">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition',
        on
          ? 'border-clay bg-clay text-bone'
          : 'border-ink/15 bg-white text-inksoft hover:border-ink hover:text-ink',
      )}
    >
      {children}
    </button>
  )
}
