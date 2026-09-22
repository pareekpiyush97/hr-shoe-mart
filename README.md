# HR Shoe Mart — Bikaner

A working e-commerce storefront for HR Shoe Mart, Station Road, Bikaner: live catalogue,
size-level stock, cart, coupons, guest checkout, order tracking and a staff admin panel.

**Live site:** https://pareekpiyush97.github.io/hr-shoe-mart/

## How it is put together

| Layer     | Choice                                                            |
| --------- | ----------------------------------------------------------------- |
| Front end | React 19 + TypeScript + Vite, Tailwind v4, HashRouter              |
| Data      | Supabase Postgres (`hr-shoe-mart` project, ap-south-1 / Mumbai)    |
| Auth      | Supabase email + password; customers can also check out as guests  |
| Payments  | COD and UPI out of the box; Razorpay via a Supabase Edge Function  |
| Hosting   | GitHub Pages, built and deployed by GitHub Actions on push to main |

### Why the money logic lives in Postgres

The browser never decides what an order costs. `place_order()` is a
`SECURITY DEFINER` function that re-reads every price from the `products` table,
locks the size row, checks stock, applies the coupon and computes delivery —
then writes the order. A tampered cart simply gets the real price.

Row-level security keeps the rest honest: anonymous visitors can read the
catalogue and nothing else. Orders are readable only by the customer who placed
them (or by an admin), and coupon codes are never listed to the public.

## Database

| Table                                    | Holds                                        |
| ---------------------------------------- | -------------------------------------------- |
| `categories`, `brands`                   | Navigation and filters                       |
| `products`, `product_variants`           | Catalogue and per-size stock                 |
| `orders`, `order_items`                  | Orders, with a human order no. `HRSM-…`      |
| `coupons`                                | Discount codes, validated server side        |
| `profiles`, `addresses`, `wishlist`, `reviews` | Customer account data                  |
| `settings`                               | Shop address, phone, delivery fee, UPI id    |

Functions callable from the browser: `place_order`, `track_order`, `preview_coupon`.

## Turning on Razorpay

Card / UPI / netbanking is wired but dormant until the keys exist. In the
Supabase dashboard → **Edge Functions → Secrets**, add:

```
RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
```

The `razorpay` function creates the order server side and verifies the payment
signature before marking anything paid; the checkout page shows the card option
only once `action: "config"` reports the keys are present. No redeploy needed.

## Making someone an admin

Register normally on the site, then in the Supabase SQL editor:

```sql
update public.profiles
   set role = 'admin'
 where id = (select id from auth.users where email = 'you@example.com');
```

The admin panel at `#/admin` then shows orders, revenue, low stock, price and
stock editing, and an add-product form.

## Local development

```bash
npm install
npm run dev
```

`src/lib/supabase.ts` falls back to the live project, so it runs with no `.env`.
To point at a different Supabase project, copy `.env.example` to `.env`.

## Shop details

Address, phone, WhatsApp number, UPI id, delivery fee and the free-delivery
threshold all come from the `settings` table — change them there and the whole
site updates, no code change or redeploy.
