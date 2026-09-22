import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from './supabase'
import type { DeliverySettings, PaymentSettings, StoreSettings } from './types'

interface SettingsValue {
  store: StoreSettings
  delivery: DeliverySettings
  payment: PaymentSettings
  ready: boolean
}

const FALLBACK: SettingsValue = {
  store: {
    name: 'HR Shoe Mart',
    tagline: 'Bikaner ka bharosemand footwear store',
    phone: '+919000000000',
    whatsapp: '919000000000',
    email: 'hrshoemart.bikaner@gmail.com',
    address: 'Station Road, Bikaner, Rajasthan 334001',
    hours: 'Mon-Sun, 10:00 AM - 9:00 PM',
    map: 'https://maps.google.com/?q=Station+Road+Bikaner',
  },
  delivery: {
    fee: 49,
    free_above: 999,
    eta_city: 'Same day in Bikaner city',
    eta_outside: '2-4 days across Rajasthan',
  },
  payment: { upi_id: 'hrshoemart@upi', upi_name: 'HR Shoe Mart', razorpay_enabled: false },
  ready: false,
}

const Ctx = createContext<SettingsValue>(FALLBACK)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<SettingsValue>(FALLBACK)

  useEffect(() => {
    supabase
      .from('settings')
      .select('key, value')
      .then(({ data }) => {
        if (!data) return
        const map = Object.fromEntries(data.map((r) => [r.key, r.value])) as Record<string, unknown>
        setValue({
          store: { ...FALLBACK.store, ...(map.store as StoreSettings) },
          delivery: { ...FALLBACK.delivery, ...(map.delivery as DeliverySettings) },
          payment: { ...FALLBACK.payment, ...(map.payment as PaymentSettings) },
          ready: true,
        })
      })
  }, [])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useSettings = () => useContext(Ctx)

export const waLink = (whatsapp: string, text: string) =>
  `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
