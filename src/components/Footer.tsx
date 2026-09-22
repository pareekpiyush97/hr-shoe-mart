import { Link } from 'react-router-dom'
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { useSettings, waLink } from '../lib/settings'

export default function Footer() {
  const { store, delivery } = useSettings()

  return (
    <footer className="mt-24 bg-ink text-bone/75">
      <div className="shell grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-clay font-display text-lg font-bold text-bone">
              HR
            </span>
            <span className="font-display text-xl font-bold text-bone">{store.name}</span>
          </div>
          <p className="text-sm leading-relaxed">{store.tagline}</p>
          <p className="mt-4 text-sm leading-relaxed">
            Campus, Bata, Sparx, Relaxo, Woodland, Red Chief, Nike, Adidas aur Puma — sab ek chhat ke
            neeche.
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold tracking-[0.18em] text-bone uppercase">Shop</h3>
          <ul className="space-y-2.5 text-sm">
            {[
              ['/shop?gender=men', 'Men'],
              ['/shop?gender=women', 'Women'],
              ['/shop?gender=kids', 'Kids'],
              ['/shop?category=sports-running', 'Sports & Running'],
              ['/shop?category=formal-shoes', 'Formal'],
              ['/shop?category=slippers-chappal', 'Chappal & Jutti'],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="hover:text-brass">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold tracking-[0.18em] text-bone uppercase">Help</h3>
          <ul className="space-y-2.5 text-sm">
            {[
              ['/track', 'Track your order'],
              ['/account', 'My account'],
              ['/about', 'About the shop'],
              ['/policies', 'Delivery & exchange'],
              ['/contact', 'Contact us'],
            ].map(([to, label]) => (
              <li key={to}>
                <Link to={to} className="hover:text-brass">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed">
            Free delivery above ₹{delivery.free_above}. {delivery.eta_outside}.
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold tracking-[0.18em] text-bone uppercase">Visit</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2.5">
              <MapPin size={16} className="mt-0.5 shrink-0 text-brass" />
              <a href={store.map} target="_blank" rel="noreferrer" className="hover:text-brass">
                {store.address}
              </a>
            </li>
            <li className="flex gap-2.5">
              <Clock size={16} className="mt-0.5 shrink-0 text-brass" />
              {store.hours}
            </li>
            <li className="flex gap-2.5">
              <Phone size={16} className="mt-0.5 shrink-0 text-brass" />
              <a href={`tel:${store.phone}`} className="hover:text-brass">
                {store.phone}
              </a>
            </li>
            <li className="flex gap-2.5">
              <Mail size={16} className="mt-0.5 shrink-0 text-brass" />
              <a href={`mailto:${store.email}`} className="hover:text-brass">
                {store.email}
              </a>
            </li>
          </ul>
          <a
            href={waLink(store.whatsapp, 'Namaste! HR Shoe Mart se kuch poochhna tha.')}
            target="_blank"
            rel="noreferrer"
            className="btn mt-5 bg-moss text-bone hover:brightness-110"
          >
            <MessageCircle size={16} /> WhatsApp
          </a>
        </div>
      </div>

      <div className="border-t border-bone/12">
        <div className="shell flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {store.name}, Bikaner. All rights reserved.
          </p>
          <p>Cash on Delivery · UPI · Cards & Netbanking via Razorpay</p>
        </div>
      </div>
    </footer>
  )
}
