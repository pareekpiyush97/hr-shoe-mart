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
import { listCategories, listFeatured, listNewest } from '../lib/db'
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
    Promise.all([listCategories(), listFeatured(8), listNewest(8)])
      .then(([c, f, n]) => {
        setCats(c)
        setFeatured(f)
        setFresh(n)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      {/* Full-bleed photograph, everything else gets out of its way. */}
      <section className="relative isolate min-h-[78vh] overflow-hidden">
        <img
          src="https://images.pexels.com/photos/33812005/pexels-photo-33812005.jpeg?auto=compress&cs=tinysrgb&w=1800"
          alt="Leather shoes on the display shelves"
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/90 via-ink/65 to-ink/25" />

        <div className="shell flex min-h-[78vh] flex-col justify-center py-20">
          <div className="rise max-w-2xl">
            <p className="text-[11px] font-semibold tracking-[0.3em] text-brass uppercase">
              Since 1998 · Station Road, Bikaner
            </p>
            <h1 className="mt-6 text-5xl leading-[1.02] text-bone sm:text-6xl lg:text-7xl">
              Bikaner ka apna
              <span className="mt-1 block italic">footwear ghar</span>
            </h1>
            <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-bone/75">
              Sports shoes se lekar haath se bani Bikaneri jutti tak — 15+ bharosemand brands, asli
              maal, aur {delivery.eta_city}.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-clay px-8">
                Shop the collection <ArrowRight size={15} />
              </Link>
              <Link to="/shop?category=slippers-chappal" className="btn-outline-light">
                Bikaneri jutti
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 border-t border-bone/15 bg-ink/45 backdrop-blur-sm">
          <dl className="shell grid grid-cols-3 gap-6 py-5">
            {[
              ['15+', 'Brands'],
              ['50+', 'Styles in stock'],
              ['27', 'Saal ka bharosa'],
            ].map(([v, k]) => (
              <div key={k}>
                <dt className="font-display text-2xl font-semibold text-brass">{v}</dt>
                <dd className="text-[10px] tracking-[0.2em] text-bone/60 uppercase">{k}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ---------------- FESTIVE STRIP ---------------- */}
      <section className="bg-ink">
        <div className="shell flex flex-wrap items-center justify-between gap-4 py-6">
          <p className="flex items-center gap-3 font-display text-xl text-bone">
            <BadgeIndianRupee size={20} className="text-brass" />
            Festive offer — flat 10% off
          </p>
          <p className="text-xs tracking-[0.18em] text-bone/60 uppercase">
            Code <span className="font-semibold text-brass">HRSM10</span> · ₹999 se upar
          </p>
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
      <section className="shell relative py-20 xl:px-16">
        <span className="vlabel absolute top-28 left-1 hidden xl:block">The Collection</span>

        <div className="mb-12 text-center">
          <p className="eyebrow">Categories</p>
          <h2 className="mx-auto mt-3 max-w-xl text-4xl leading-tight sm:text-5xl">
            Aap kya <span className="italic gold">dhoondh</span> rahe hain?
          </h2>
        </div>

        {/* Arch-topped frames — the lookbook device from the reference. */}
        <div className="grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
          {(loading ? Array.from({ length: 8 }) : cats).map((c, i) => {
            const cat = c as Category | undefined
            if (!cat)
              return <div key={i} className="arch aspect-4/5 animate-pulse bg-sand" />
            return (
              <Link key={cat.id} to={`/shop?category=${cat.slug}`} className="group text-center">
                <div className="arch aspect-4/5 bg-sand">
                  <img
                    src={cat.imageUrl ?? ''}
                    alt={cat.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <p className="mt-4 font-display text-[17px] transition group-hover:text-clay">
                  {cat.name}
                </p>
                <p className="mt-1 inline-flex items-center gap-1 text-[10px] tracking-[0.18em] text-inksoft uppercase">
                  Shop now <ArrowRight size={10} />
                </p>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ---------------- FEATURED ---------------- */}
      <section className="shell pb-16">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-ink/10 pb-6">
          <div>
            <p className="eyebrow">Handpicked</p>
            <h2 className="mt-3 text-4xl leading-tight sm:text-5xl">
              Is hafte ke <span className="italic gold">favourites</span>
            </h2>
          </div>
          <Link to="/shop" className="btn-outline">
            All products
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
              <h3 className="text-3xl text-bone">{title}</h3>
              <p className="mt-1.5 text-sm text-bone/70">{note}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-brass uppercase">
                Explore <ArrowRight size={11} />
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
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6 border-b border-ink/10 pb-6">
          <div>
            <p className="eyebrow">Fresh stock</p>
            <h2 className="mt-3 text-4xl leading-tight sm:text-5xl">
              Naya <span className="italic gold">aaya</span> hai
            </h2>
          </div>
          <span className="font-display text-5xl leading-none text-sanddeep">2026</span>
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
          <h2 className="mt-3 mb-10 text-4xl text-bone sm:text-5xl">
            Bikaner <span className="italic text-brass">bolta</span> hai
          </h2>
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
            <h2 className="mt-3 text-4xl leading-tight sm:text-5xl">
              Dukaan par aaiye, <span className="italic gold">pair try</span> kijiye
            </h2>
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
            src="https://images.pexels.com/photos/36311066/pexels-photo-36311066.jpeg?auto=compress&cs=tinysrgb&w=1200"
            alt="HR Shoe Mart storefront display"
            loading="lazy"
            className="aspect-4/3 w-full rounded-2xl object-cover"
          />
        </div>
      </section>
    </>
  )
}
