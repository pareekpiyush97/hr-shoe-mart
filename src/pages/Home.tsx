import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BadgeIndianRupee,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Category, Product } from '../lib/types'
import ProductCard from '../components/ProductCard'
import { ProductSkeleton } from '../components/ui'
import Stars from '../components/Stars'
import { useSettings } from '../lib/settings'

const BRANDS = [
  'Campus', 'Bata', 'Sparx', 'Relaxo', 'Woodland', 'Red Chief', 'Liberty',
  'Paragon', 'VKC Pride', 'Puma', 'Nike', 'Adidas', 'Metro', 'Khadims', 'Aqualite',
]

const REVIEWS = [
  {
    name: 'Mahendra Singh',
    where: 'Rani Bazar, Bikaner',
    text: 'Shop se hamesha lete the, ab online order kiya — shaam tak ghar pe pahunch gaya. Size bhi bilkul sahi.',
    rating: 5,
  },
  {
    name: 'Sunita Sharma',
    where: 'Gangashahar',
    text: 'Bachchon ke school shoes ka collection accha hai aur rate market se kam. Exchange bhi bina jhanjhat hua.',
    rating: 5,
  },
  {
    name: 'Imran Khan',
    where: 'Nokha Road',
    text: 'Red Chief ka original piece mila, bill ke saath. COD ka option hone se bharosa ban gaya.',
    rating: 4,
  },
]

export default function Home() {
  const [cats, setCats] = useState<Category[]>([])
  const [featured, setFeatured] = useState<Product[]>([])
  const [fresh, setFresh] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { store, delivery } = useSettings()

  useEffect(() => {
    const sel = '*, brands(name, slug), categories(name, slug), product_variants(id, size, stock)'
    Promise.all([
      supabase.from('categories').select('*').order('sort_order'),
      supabase.from('products').select(sel).eq('is_featured', true).limit(8),
      supabase.from('products').select(sel).order('sort_order', { ascending: false }).limit(8),
    ]).then(([c, f, n]) => {
      setCats((c.data as Category[]) ?? [])
      setFeatured((f.data as Product[]) ?? [])
      setFresh((n.data as Product[]) ?? [])
      setLoading(false)
    })
  }, [])

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden bg-sand">
        <div className="shell grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div className="rise">
            <p className="eyebrow">Since 1998 · Station Road, Bikaner</p>
            <h1 className="mt-4 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">
              Bikaner ka apna
              <span className="block text-clay">footwear ghar</span>
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-inksoft">
              Sports shoes se lekar haath se bani Bikaneri jutti tak — 15+ bharosemand brands, asli
              maal, aur {delivery.eta_city}. Ab poora stock online, ghar baithe.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary">
                Shop the collection <ArrowRight size={16} />
              </Link>
              <Link to="/shop?category=slippers-chappal" className="btn-ghost">
                Bikaneri jutti dekhein
              </Link>
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6">
              {[
                ['15+', 'Brands'],
                ['50+', 'Styles in stock'],
                ['27 yrs', 'Bharosa'],
              ].map(([v, k]) => (
                <div key={k}>
                  <dt className="font-display text-2xl font-bold">{v}</dt>
                  <dd className="text-xs tracking-wide text-inksoft uppercase">{k}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative grid grid-cols-2 gap-4">
            <img
              src="https://images.pexels.com/photos/1027130/pexels-photo-1027130.jpeg?auto=compress&cs=tinysrgb&w=800"
              alt="Red sneakers"
              className="aspect-3/4 w-full rounded-3xl object-cover"
            />
            <div className="grid gap-4">
              <img
                src="https://images.pexels.com/photos/12210271/pexels-photo-12210271.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Tan leather oxfords"
                className="aspect-4/5 w-full rounded-3xl object-cover"
              />
              <div className="rounded-3xl bg-ink p-5 text-bone">
                <BadgeIndianRupee size={22} className="text-brass" />
                <p className="mt-3 font-display text-lg leading-snug">
                  Festive offer — flat 10% off
                </p>
                <p className="mt-1 text-xs text-bone/70">
                  Code <strong className="text-brass">HRSM10</strong> · ₹999 se upar
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- TRUST BAR ---------------- */}
      <section className="border-y border-ink/10 bg-bone">
        <div className="shell grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            [Truck, 'Free delivery', `₹${delivery.free_above} se upar · ${delivery.eta_city}`],
            [ShieldCheck, '100% original', 'Har pair bill aur warranty ke saath'],
            [RefreshCw, '7-day exchange', 'Size galat? Bina jhanjhat badlein'],
            [MapPin, 'Shop pe try karein', 'Online order, store pickup bhi'],
          ].map(([Icon, title, note]) => {
            const I = Icon as typeof Truck
            return (
              <div key={title as string} className="flex gap-3">
                <I size={20} className="mt-0.5 shrink-0 text-clay" />
                <div>
                  <p className="text-sm font-semibold">{title as string}</p>
                  <p className="text-xs text-inksoft">{note as string}</p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ---------------- CATEGORIES ---------------- */}
      <section className="shell py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Categories</p>
            <h2 className="mt-2 text-3xl sm:text-4xl">Aap kya dhoondh rahe hain?</h2>
          </div>
          <Link to="/shop" className="hidden text-sm font-semibold text-clay hover:underline sm:block">
            View all →
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(loading ? Array.from({ length: 8 }) : cats).map((c, i) => {
            const cat = c as Category | undefined
            if (!cat) return <div key={i} className="aspect-square animate-pulse rounded-2xl bg-sand" />
            return (
              <Link
                key={cat.id}
                to={`/shop?category=${cat.slug}`}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-sand"
              >
                <img
                  src={cat.image_url ?? ''}
                  alt={cat.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="font-display text-base font-semibold text-bone">{cat.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-bone/70">
                    Shop now <ArrowRight size={11} />
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ---------------- FEATURED ---------------- */}
      <section className="shell pb-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Handpicked</p>
            <h2 className="mt-2 text-3xl sm:text-4xl">Is hafte ke favourites</h2>
          </div>
          <Link to="/shop" className="hidden text-sm font-semibold text-clay hover:underline sm:block">
            All products →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)
            : featured.map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* ---------------- GENDER SPLIT ---------------- */}
      <section className="shell grid gap-4 pb-16 md:grid-cols-3">
        {[
          ['men', 'Men', 'Formal, sports aur daily wear', 'https://images.pexels.com/photos/12210271/pexels-photo-12210271.jpeg?auto=compress&cs=tinysrgb&w=900'],
          ['women', 'Women', 'Heels, flats, jutti aur slides', 'https://images.pexels.com/photos/34294446/pexels-photo-34294446.jpeg?auto=compress&cs=tinysrgb&w=900'],
          ['kids', 'Kids', 'School shoes se play clogs tak', 'https://images.pexels.com/photos/13822967/pexels-photo-13822967.jpeg?auto=compress&cs=tinysrgb&w=900'],
        ].map(([g, title, note, img]) => (
          <Link
            key={g}
            to={`/shop?gender=${g}`}
            className="group relative aspect-4/3 overflow-hidden rounded-3xl md:aspect-3/4"
          >
            <img
              src={img}
              alt={title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink/85 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <h3 className="text-2xl text-bone">{title}</h3>
              <p className="mt-1 text-sm text-bone/75">{note}</p>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-brass">
                Explore <ArrowRight size={13} />
              </span>
            </div>
          </Link>
        ))}
      </section>

      {/* ---------------- BRAND MARQUEE ---------------- */}
      <section className="overflow-hidden border-y border-ink/10 bg-sand py-7">
        <div className="marquee-track flex w-max gap-12 whitespace-nowrap">
          {[...BRANDS, ...BRANDS].map((b, i) => (
            <span
              key={i}
              className="font-display text-xl font-semibold text-ink/35 transition hover:text-clay"
            >
              {b}
            </span>
          ))}
        </div>
      </section>

      {/* ---------------- NEW ARRIVALS ---------------- */}
      <section className="shell py-16">
        <div className="mb-8">
          <p className="eyebrow">Fresh stock</p>
          <h2 className="mt-2 text-3xl sm:text-4xl">Naya aaya hai</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={i} />)
            : fresh.slice(0, 8).map((p) => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      {/* ---------------- REVIEWS ---------------- */}
      <section className="bg-ink py-16 text-bone">
        <div className="shell">
          <p className="eyebrow">Customers</p>
          <h2 className="mt-2 mb-9 text-3xl text-bone sm:text-4xl">Bikaner bolta hai</h2>
          <div className="grid gap-5 md:grid-cols-3">
            {REVIEWS.map((r) => (
              <figure key={r.name} className="rounded-2xl bg-bone/6 p-6">
                <Stars value={r.rating} />
                <blockquote className="mt-3 text-sm leading-relaxed text-bone/85">
                  “{r.text}”
                </blockquote>
                <figcaption className="mt-4 text-xs">
                  <span className="font-semibold text-bone">{r.name}</span>
                  <span className="text-bone/55"> · {r.where}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- VISIT ---------------- */}
      <section className="shell py-16">
        <div className="grid items-center gap-8 rounded-3xl bg-sand p-8 lg:grid-cols-2 lg:p-12">
          <div>
            <p className="eyebrow">Visit us</p>
            <h2 className="mt-2 text-3xl sm:text-4xl">Dukaan par aaiye, pair try kijiye</h2>
            <p className="mt-4 text-sm leading-relaxed text-inksoft">
              Online order karke store pickup bhi kar sakte hain. Humare counter par har size try
              karne ki suvidha hai — aur jo online dikh raha hai, wahi stock shop mein bhi hai.
            </p>
            <div className="mt-6 space-y-2 text-sm">
              <p>
                <strong>Pata:</strong> {store.address}
              </p>
              <p>
                <strong>Samay:</strong> {store.hours}
              </p>
              <p>
                <strong>Phone:</strong>{' '}
                <a href={`tel:${store.phone}`} className="text-clay hover:underline">
                  {store.phone}
                </a>
              </p>
            </div>
            <a href={store.map} target="_blank" rel="noreferrer" className="btn-clay mt-7">
              <MapPin size={16} /> Google Maps par kholein
            </a>
          </div>
          <img
            src="https://images.pexels.com/photos/27196457/pexels-photo-27196457.jpeg?auto=compress&cs=tinysrgb&w=1000"
            alt="Shoe store shelves"
            loading="lazy"
            className="aspect-4/3 w-full rounded-2xl object-cover"
          />
        </div>
      </section>
    </>
  )
}
