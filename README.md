# HR Shoe Mart — Bikaner

A working e-commerce storefront for HR Shoe Mart, Station Road, Bikaner: live
catalogue, size-level stock, cart, coupons, order tracking and a staff admin
panel.

**Live site:** https://pareekpiyush97.github.io/hr-shoe-mart/

## How it is put together

| Layer     | Choice                                                            |
| --------- | ----------------------------------------------------------------- |
| Front end | React 19 + TypeScript + Vite, Tailwind v4, HashRouter              |
| Data      | Firebase Firestore, `asia-south1` (Mumbai)                         |
| Auth      | Firebase Auth, email + password; sign-in is required to pay        |
| Server    | Cloud Functions — orders, coupons, tracking, Razorpay              |
| Payments  | COD and UPI out of the box; Razorpay once the keys are set         |
| Hosting   | GitHub Pages from the `gh-pages` branch (`npm run deploy`)         |

> The Actions workflow that would build Pages automatically lives in
> `deploy/github-pages-workflow.yml` rather than `.github/workflows/`, because
> the token used to create this repo has no `workflow` scope. Run
> `gh auth refresh -s workflow`, move the file into `.github/workflows/`, add
> the `VITE_FIREBASE_*` values as repository **variables**, and switch Pages to
> "GitHub Actions" to get push-to-deploy.

### Why the money logic lives on the server

The browser never decides what an order costs. `placeOrder` is a Cloud Function
that re-reads every price from Firestore, checks and decrements stock inside a
transaction, applies the coupon and computes delivery — then writes the order.
A tampered cart simply gets charged the real price.

Security rules keep the rest honest: `orders` is **not** client-writable at all,
coupon codes are never readable from the browser, and `admin` is a custom claim
set server side from an `adminEmails` allowlist — nobody can promote themselves.
Visitors may read the catalogue and their own data, and nothing else.

## Firestore collections

| Collection                                         | Holds                                                    |
| -------------------------------------------------- | -------------------------------------------------------- |
| `categories`, `brands`                             | Navigation and filters (document id = slug)               |
| `products`                                         | Catalogue; sizes are a `variants: { "UK 8": 20 }` map     |
| `orders`                                           | Orders with a human number `HRSM-…`; server-written only  |
| `coupons`                                          | Discount codes — never readable from the browser          |
| `settings`                                         | Shop address, phone, delivery fee, UPI id                 |
| `profiles`, `addresses/*`, `wishlist/*`, `reviews` | Customer account data                                     |
| `adminEmails`, `counters`                          | Server only: who is staff, and the order-number sequence  |

Sizes live on the product rather than in their own collection, so a product page
is a single read and stock can be decremented in a single-document transaction.

Callable functions: `placeOrder`, `previewCoupon`, `trackOrder`,
`razorpayConfig`, `razorpayCreate`, `razorpayVerify`.

## First-time Firebase setup

```bash
npm i -g firebase-tools
```

```bash
firebase login
```

Then, once, in the Firebase console:

1. **Build → Firestore Database → Create database** — production mode, region
   `asia-south1`.
2. **Build → Authentication → Sign-in method → Email/Password → Enable.**
3. **Authentication → Settings → Authorised domains** — add
   `pareekpiyush97.github.io`.
4. **Project settings → Your apps → Web app** — copy the config into `.env`
   (see `.env.example`).
5. **Project settings → Service accounts → Generate new private key** — save it
   as `firebase/service-account.json`. It is git-ignored; never commit it.

Then load the catalogue and ship the backend:

```bash
firebase use --add
```

```bash
node firebase/build-seed.cjs && node firebase/import-to-firestore.mjs
```

```bash
firebase deploy --only firestore:rules,firestore:indexes,functions
```

Cloud Functions require the **Blaze** plan. Its free monthly allowance covers a
shop this size, so the bill is normally ₹0 — but a card has to be on file.
Until the functions are deployed the catalogue, login, cart, wishlist and admin
panel all work; only placing an order does not.

## Turning on Razorpay

Card / UPI / netbanking is wired but dormant until the keys exist:

```bash
firebase functions:secrets:set RAZORPAY_KEY_ID
```

```bash
firebase functions:secrets:set RAZORPAY_KEY_SECRET
```

```bash
firebase deploy --only functions
```

`razorpayCreate` builds the payment from the **stored** order total, and
`razorpayVerify` checks the HMAC signature before anything is marked paid. The
checkout page shows the card option only once `razorpayConfig` reports the keys
are present, so nothing breaks while they are missing.

## Making someone an admin

Emails in the `adminEmails` collection become admins the moment they register —
`onUserCreate` reads that list and sets an `admin` custom claim. Add one from
the console (Firestore → `adminEmails` → add document, document ID = the
lowercase email).

Nothing in the browser can read or write that collection, and the claim can only
be set server side, so the admin panel cannot be self-granted. Someone who
registered before being added just needs to sign out and back in.

## Local development

```bash
npm install
```

```bash
npm run dev
```

Copy `.env.example` to `.env` and fill in the Firebase web config. Without it
the pages still render — the catalogue is simply empty.

To push a new build live:

```bash
npm run deploy
```

## Shop details

Address, phone, WhatsApp number, UPI id, delivery fee and the free-delivery
threshold all live in the `settings` collection — change them there and the
whole site updates, with no code change and no redeploy.
