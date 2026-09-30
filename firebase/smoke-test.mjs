/**
 * End-to-end exercise of the backend against the emulator suite.
 *
 *   npm run emu          # terminal 1
 *   npm run emu:seed     # terminal 2
 *   node firebase/smoke-test.mjs
 *
 * It signs up a throwaway customer, prices a coupon, places an order, tracks
 * it, and then tries the three things a tampered browser would try. Nothing
 * here touches the real project — every host below is 127.0.0.1, and the
 * project id is the emulator's `demo-` one, which Google refuses to serve.
 */

const PROJECT = 'demo-hr-shoe-mart'
const REGION = 'asia-south1'
const AUTH = 'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1'
const FN = `http://127.0.0.1:5001/${PROJECT}/${REGION}`
const FS = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`

let pass = 0
let fail = 0

function ok(name, cond, detail = '') {
  if (cond) {
    pass++
    console.log(`  ✓ ${name}`)
  } else {
    fail++
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

/** Callable functions speak {data: …} in and {result: …} / {error: …} out. */
async function callFn(name, payload, idToken) {
  const res = await fetch(`${FN}/${name}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(idToken ? { authorization: `Bearer ${idToken}` } : {}),
    },
    body: JSON.stringify({ data: payload }),
  })
  const body = await res.json().catch(() => ({}))
  return { status: res.status, result: body.result, error: body.error }
}

/** Read a product straight from the emulator's REST API, to check stock moved. */
async function stockOf(slug, size) {
  const res = await fetch(`${FS}/products/${slug}`)
  const doc = await res.json()
  const v = doc.fields?.variants?.mapValue?.fields?.[size]
  return Number(v?.integerValue ?? v?.doubleValue ?? NaN)
}

async function main() {
  console.log('Backend smoke test (emulator)\n')

  // ---------------------------------------------------------------- sign up
  // A throwaway address and a generated password, on the auth emulator only.
  const email = `smoke-${Date.now()}@example.com`
  const password = `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`
  const signUp = await fetch(`${AUTH}/accounts:signUp?key=fake-api-key`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  }).then((r) => r.json())

  console.log('auth')
  ok('customer can sign up', Boolean(signUp.idToken), signUp.error?.message)
  if (!signUp.idToken) return
  const token = signUp.idToken

  // ------------------------------------------------------------- catalogue
  console.log('\ncatalogue')
  const listRes = await fetch(`${FS}/products?pageSize=1`)
  const listed = await listRes.json()
  ok('products are readable', Array.isArray(listed.documents) && listed.documents.length > 0)

  // Pick two real products and a real size from the seeded catalogue.
  const all = await fetch(`${FS}/products?pageSize=300`).then((r) => r.json())
  const picked = []
  for (const d of all.documents ?? []) {
    const f = d.fields
    const sizes = Object.entries(f.variants?.mapValue?.fields ?? {}).filter(
      ([, v]) => Number(v.integerValue ?? 0) >= 2,
    )
    if (!sizes.length) continue
    picked.push({
      slug: f.slug.stringValue,
      title: f.title.stringValue,
      price: Number(f.price.integerValue ?? f.price.doubleValue),
      size: sizes[0][0],
    })
    if (picked.length === 2) break
  }
  ok('two in-stock products found', picked.length === 2)
  if (picked.length < 2) return

  const [a, b] = picked
  ok('sizes are Indian', /^IND /.test(a.size), a.size)

  const items = [
    { slug: a.slug, size: a.size, qty: 2 },
    { slug: b.slug, size: b.size, qty: 1 },
  ]
  const expectedSubtotal = a.price * 2 + b.price

  // ----------------------------------------------------------- coupon price
  console.log('\ncoupons')
  const preview = await callFn('previewCoupon', { code: 'HRSM10', subtotal: expectedSubtotal })
  const couponWorks = preview.result?.ok === true
  ok(
    'HRSM10 prices against the real subtotal',
    couponWorks || expectedSubtotal < 699,
    JSON.stringify(preview.result ?? preview.error),
  )

  const junk = await callFn('previewCoupon', { code: 'NOTACOUPON', subtotal: expectedSubtotal })
  ok('an invented code is refused', junk.result?.ok === false)

  // ------------------------------------------------------------ place order
  console.log('\nplaceOrder')
  const customer = {
    customer: { name: 'Smoke Test', phone: '9876543210', email },
    address: { line1: 'Station Road, near clock tower', city: 'Bikaner', state: 'Rajasthan', pincode: '334001' },
    paymentMethod: 'cod',
    coupon: 'HRSM10',
  }

  const before = await stockOf(a.slug, a.size)

  const anon = await callFn('placeOrder', { ...customer, items })
  ok('a logged-out order is refused', anon.error?.status === 'UNAUTHENTICATED', JSON.stringify(anon.error))

  const placed = await callFn('placeOrder', { ...customer, items }, token)
  const order = placed.result
  ok('order is placed', Boolean(order?.orderNo), JSON.stringify(placed.error))
  if (!order) return

  ok('order number is dated', /^HRSM-\d{6}-\d+$/.test(order.orderNo), order.orderNo)
  ok(
    'server priced the cart itself',
    order.subtotal === expectedSubtotal,
    `server ${order.subtotal} vs catalogue ${expectedSubtotal}`,
  )
  const expectedTotal = order.subtotal - order.discount + order.shippingFee
  ok('total adds up', order.total === expectedTotal, `${order.total} vs ${expectedTotal}`)
  ok(
    'coupon applied or correctly withheld',
    order.discount > 0 || expectedSubtotal < 699,
    `discount ${order.discount} on subtotal ${order.subtotal}`,
  )

  const after = await stockOf(a.slug, a.size)
  ok('stock came down by the quantity ordered', after === before - 2, `${before} → ${after}`)

  // ---------------------------------------------------------------- tamper
  console.log('\ntampering')
  const cheap = await callFn(
    'placeOrder',
    { ...customer, items: [{ slug: a.slug, size: a.size, qty: 1, price: 1 }] },
    token,
  )
  ok(
    'a price sent by the browser is ignored',
    cheap.result?.subtotal === a.price,
    `got ${cheap.result?.subtotal}, catalogue says ${a.price}`,
  )

  const ghost = await callFn('placeOrder', { ...customer, items: [{ slug: 'no-such-shoe', size: 'IND 8', qty: 1 }] }, token)
  ok('an unknown product is refused', Boolean(ghost.error), JSON.stringify(ghost.result))

  const greedy = await callFn(
    'placeOrder',
    { ...customer, items: [{ slug: a.slug, size: a.size, qty: 99999 }] },
    token,
  )
  ok('more than the shelf holds is refused', Boolean(greedy.error), JSON.stringify(greedy.result))

  const noAddress = await callFn(
    'placeOrder',
    { ...customer, address: { line1: 'x', pincode: '1' }, items },
    token,
  )
  ok('a junk address is refused', Boolean(noAddress.error), JSON.stringify(noAddress.result))

  // ---------------------------------------------------------------- track
  console.log('\ntrackOrder')
  const tracked = await callFn('trackOrder', { orderNo: order.orderNo, phone: '9876543210' })
  ok('order tracks by number + phone', tracked.result?.orderNo === order.orderNo)
  ok('tracked total matches the order', tracked.result?.total === order.total)

  const wrongPhone = await callFn('trackOrder', { orderNo: order.orderNo, phone: '9000000001' })
  ok("someone else's phone reveals nothing", wrongPhone.result === null || wrongPhone.result === undefined)

  console.log(`\n${pass} passed, ${fail} failed`)
  process.exit(fail === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error('\nsmoke test crashed:', e.message)
  process.exit(1)
})
