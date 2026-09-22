import { Link } from 'react-router-dom'
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { useSettings, waLink } from '../lib/settings'

export function About() {
  const { store } = useSettings()
  return (
    <div className="shell max-w-3xl py-14">
      <p className="eyebrow">Our story</p>
      <h1 className="mt-3 text-4xl">{store.name}, Bikaner</h1>
      <div className="mt-6 space-y-5 text-[15px] leading-relaxed text-inksoft">
        <p>
          {store.address} par humari dukaan 1998 se chal rahi hai. Shuruaat ek chhoti si counter shop
          se hui thi — school shoes aur chappal. Aaj humare paas 15 se zyada brands hain, aur teen
          peedhiyon ke customer humare paas aate hain.
        </p>
        <p>
          Hum ek hi cheez par sabse zyada dhyan dete hain — <strong className="text-ink">asli maal
          aur sahi fit</strong>. Har pair bill ke saath jaata hai, aur agar size galat nikla to 7 din
          ke andar bina jhanjhat exchange ho jaata hai.
        </p>
        <p>
          Ab humne poora stock online kar diya hai. Jo aapko website par dikh raha hai, wahi shop ke
          rack par bhi hai — stock live update hota hai. Aap ghar baithe order kar sakte hain, ya
          online dekh kar dukaan par aakar try kar sakte hain.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          ['27 years', 'Bikaner me seva'],
          ['15+ brands', 'Ek hi chhat ke neeche'],
          ['7-day', 'Easy exchange'],
        ].map(([a, b]) => (
          <div key={a} className="card p-5">
            <p className="font-display text-2xl font-bold">{a}</p>
            <p className="mt-1 text-sm text-inksoft">{b}</p>
          </div>
        ))}
      </div>

      <Link to="/shop" className="btn-clay mt-10">
        Collection dekhein
      </Link>
    </div>
  )
}

export function Contact() {
  const { store } = useSettings()
  return (
    <div className="shell max-w-3xl py-14">
      <p className="eyebrow">Get in touch</p>
      <h1 className="mt-3 text-4xl">Humse baat karein</h1>
      <p className="mt-4 text-sm text-inksoft">
        Size, stock ya order — kisi bhi baat ke liye seedha call ya WhatsApp kijiye. Shop ke samay me
        jawab turant milta hai.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <a href={`tel:${store.phone}`} className="card flex items-start gap-3 p-5 hover:border-clay">
          <Phone size={18} className="mt-0.5 text-clay" />
          <span>
            <span className="block text-sm font-semibold">Call</span>
            <span className="block text-sm text-inksoft">{store.phone}</span>
          </span>
        </a>
        <a
          href={waLink(store.whatsapp, 'Namaste HR Shoe Mart!')}
          target="_blank"
          rel="noreferrer"
          className="card flex items-start gap-3 p-5 hover:border-clay"
        >
          <MessageCircle size={18} className="mt-0.5 text-moss" />
          <span>
            <span className="block text-sm font-semibold">WhatsApp</span>
            <span className="block text-sm text-inksoft">Photo bhej kar bhi poochh sakte hain</span>
          </span>
        </a>
        <a href={`mailto:${store.email}`} className="card flex items-start gap-3 p-5 hover:border-clay">
          <Mail size={18} className="mt-0.5 text-clay" />
          <span>
            <span className="block text-sm font-semibold">Email</span>
            <span className="block text-sm text-inksoft">{store.email}</span>
          </span>
        </a>
        <a href={store.map} target="_blank" rel="noreferrer" className="card flex items-start gap-3 p-5 hover:border-clay">
          <MapPin size={18} className="mt-0.5 text-clay" />
          <span>
            <span className="block text-sm font-semibold">Shop</span>
            <span className="block text-sm text-inksoft">{store.address}</span>
          </span>
        </a>
      </div>

      <p className="mt-6 flex items-center gap-2 text-sm text-inksoft">
        <Clock size={15} className="text-clay" /> {store.hours}
      </p>
    </div>
  )
}

export function Policies() {
  const { delivery } = useSettings()
  const blocks = [
    [
      'Delivery',
      `Bikaner city me ${delivery.eta_city.toLowerCase()}. Baaki Rajasthan me ${delivery.eta_outside.toLowerCase()}. ₹${delivery.free_above} se upar ke order par delivery free, uske neeche ₹${delivery.fee} charge lagta hai.`,
    ],
    [
      'Exchange & return',
      'Delivery ke 7 din ke andar size ya fit ki problem par exchange ho jaata hai. Shoe bilkul unused hona chahiye, original box aur bill ke saath. Sale/clearance items par exchange nahi hota.',
    ],
    [
      'Payment',
      'Cash on Delivery, UPI (QR ya UPI ID), aur card/netbanking — teenon chalte hain. Online payment Razorpay ke through secure hota hai; hum aapke card details kabhi store nahi karte.',
    ],
    [
      'Cancellation',
      'Dispatch se pehle order cancel karna free hai — bas humein call ya WhatsApp kar dijiye. Prepaid order ka refund 5-7 working days me aa jaata hai.',
    ],
    [
      'Warranty',
      'Har brand ki apni manufacturing warranty hoti hai (aam taur par 3 mahine sole/stitching par). Warranty claim ke liye bill zaroori hai.',
    ],
    [
      'Privacy',
      'Aapka naam, number aur address sirf order deliver karne ke liye use hota hai. Hum ye kisi third party ko nahi bechte.',
    ],
  ]

  return (
    <div className="shell max-w-3xl py-14">
      <p className="eyebrow">Policies</p>
      <h1 className="mt-3 text-4xl">Delivery, exchange & payment</h1>
      <div className="mt-8 space-y-7">
        {blocks.map(([h, b]) => (
          <section key={h}>
            <h2 className="text-xl">{h}</h2>
            <p className="mt-2 text-sm leading-relaxed text-inksoft">{b}</p>
          </section>
        ))}
      </div>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="shell max-w-md py-24 text-center">
      <p className="font-display text-6xl font-bold text-clay">404</p>
      <h1 className="mt-4 text-2xl">Ye page nahi mila</h1>
      <p className="mt-2 text-sm text-inksoft">Shayad link purana ho gaya hai.</p>
      <Link to="/" className="btn-clay mt-7">
        Home par wapas
      </Link>
    </div>
  )
}
