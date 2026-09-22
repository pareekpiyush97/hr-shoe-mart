import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CartLine } from './types'

interface CartState {
  lines: CartLine[]
  add: (line: CartLine) => void
  setQty: (slug: string, size: string, qty: number) => void
  remove: (slug: string, size: string) => void
  clear: () => void
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line) =>
        set((s) => {
          const i = s.lines.findIndex((l) => l.slug === line.slug && l.size === line.size)
          if (i === -1) return { lines: [...s.lines, line] }
          const lines = [...s.lines]
          lines[i] = { ...lines[i], qty: Math.min(lines[i].qty + line.qty, lines[i].maxStock, 5) }
          return { lines }
        }),
      setQty: (slug, size, qty) =>
        set((s) => ({
          lines: s.lines.map((l) =>
            l.slug === slug && l.size === size
              ? { ...l, qty: Math.max(1, Math.min(qty, l.maxStock, 5)) }
              : l,
          ),
        })),
      remove: (slug, size) =>
        set((s) => ({ lines: s.lines.filter((l) => !(l.slug === slug && l.size === size)) })),
      clear: () => set({ lines: [] }),
    }),
    { name: 'hrsm-cart' },
  ),
)

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.qty, 0)
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.price * l.qty, 0)

interface WishState {
  slugs: string[]
  toggle: (slug: string) => void
  has: (slug: string) => boolean
}

export const useWishlist = create<WishState>()(
  persist(
    (set, get) => ({
      slugs: [],
      toggle: (slug) =>
        set((s) => ({
          slugs: s.slugs.includes(slug) ? s.slugs.filter((x) => x !== slug) : [...s.slugs, slug],
        })),
      has: (slug) => get().slugs.includes(slug),
    }),
    { name: 'hrsm-wishlist' },
  ),
)
