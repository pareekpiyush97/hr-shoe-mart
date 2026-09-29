/**
 * HR Shoe Mart — server side.
 *
 * Everything that decides money or stock lives here, not in the browser.
 * placeOrder re-reads every price from Firestore, checks and decrements stock
 * inside a transaction, applies the coupon itself and only then writes the
 * order. A tampered cart just gets charged the real price.
 *
 * Deploy: firebase deploy --only functions
 */

const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const { defineSecret } = require('firebase-functions/params')
const functionsV1 = require('firebase-functions/v1')
const admin = require('firebase-admin')
const crypto = require('node:crypto')

admin.initializeApp()
const db = admin.firestore()

// Mumbai, same region the shop sells in.
setGlobalOptions({ region: 'asia-south1', maxInstances: 10 })

const RAZORPAY_KEY_ID = defineSecret('RAZORPAY_KEY_ID')
const RAZORPAY_KEY_SECRET = defineSecret('RAZORPAY_KEY_SECRET')

const MAX_LINES = 20
const MAX_QTY_PER_LINE = 5

const digits = (s) => String(s ?? '').replace(/[^0-9]/g, '')
const money = (n) => Math.round(Number(n) * 100) / 100
const clean = (s, max) => String(s ?? '').trim().slice(0, max)

/** HRSM-YYMMDD-1001, counted in IST so the date matches the shop's day. */
async function nextOrderNo(tx) {
  const ist = new Date(Date.now() + 5.5 * 60 * 60 * 1000)
  const stamp = ist.toISOString().slice(2, 10).replace(/-/g, '')
  const ref = db.collection('counters').doc('orders')
  const snap = await tx.get(ref)
  const next = (snap.exists ? snap.data().value : 1000) + 1
  tx.set(ref, { value: next }, { merge: true })
  return `HRSM-${stamp}-${next}`
}

function validateCustomer(data) {
  const name = clean(data?.customer?.name, 80)
  const phone = digits(data?.customer?.phone)
  const email = clean(data?.customer?.email, 120) || null
  const a = data?.address ?? {}

  if (name.length < 2) throw new HttpsError('invalid-argument', 'NAME_REQUIRED')
  if (phone.length !== 10) throw new HttpsError('invalid-argument', 'PHONE_INVALID')
  if (clean(a.line1, 200).length < 5) throw new HttpsError('invalid-argument', 'ADDRESS_REQUIRED')
  if (!/^[1-9][0-9]{5}$/.test(digits(a.pincode))) throw new HttpsError('invalid-argument', 'PINCODE_INVALID')

  return {
    name,
    phone,
    email,
    address: {
      line1: clean(a.line1, 200),
      line2: clean(a.line2, 200),
      city: clean(a.city, 80) || 'Bikaner',
      state: clean(a.state, 80) || 'Rajasthan',
      pincode: digits(a.pincode),
    },
  }
}

/** Shared by previewCoupon and placeOrder so the cart never shows a total the server won't honour. */
function computeDiscount(coupon, subtotal) {
  if (!coupon || coupon.isActive === false) return null
  if (coupon.expiresAt && coupon.expiresAt.toMillis() < Date.now()) return null
  if (subtotal < Number(coupon.minOrder ?? 0)) return null
  const raw =
    coupon.kind === 'percent'
      ? Math.min(Math.round((subtotal * Number(coupon.value)) / 100), Number(coupon.maxDiscount ?? Infinity))
      : Number(coupon.value)
  return Math.min(Math.round(raw), subtotal)
}

// ---------------------------------------------------------------- placeOrder
exports.placeOrder = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required before payment')

  const data = req.data ?? {}
  const who = validateCustomer(data)

  const items = Array.isArray(data.items) ? data.items : []
  if (items.length === 0) throw new HttpsError('invalid-argument', 'CART_EMPTY')
  if (items.length > MAX_LINES) throw new HttpsError('invalid-argument', 'CART_TOO_LARGE')

  const method = ['cod', 'upi', 'razorpay'].includes(data.paymentMethod) ? data.paymentMethod : null
  if (!method) throw new HttpsError('invalid-argument', 'PAYMENT_METHOD_INVALID')

  const couponCode = clean(data.coupon, 24).toUpperCase() || null
  const notes = clean(data.notes, 500)

  const result = await db.runTransaction(async (tx) => {
    // Firestore wants every read before any write.
    const refs = items.map((it) => db.collection('products').doc(String(it.slug ?? '')))
    const snaps = await Promise.all(refs.map((r) => tx.get(r)))
    const couponSnap = couponCode ? await tx.get(db.collection('coupons').doc(couponCode)) : null
    const deliverySnap = await tx.get(db.collection('settings').doc('delivery'))
    const orderNo = await nextOrderNo(tx)

    let subtotal = 0
    const lines = []
    const stockWrites = []

    snaps.forEach((snap, i) => {
      const it = items[i]
      const qty = Math.max(1, Math.min(MAX_QTY_PER_LINE, Math.floor(Number(it.qty) || 1)))
      const size = clean(it.size, 20)

      if (!snap.exists) throw new HttpsError('failed-precondition', `PRODUCT_NOT_FOUND: ${it.slug}`)
      const p = snap.data()
      if (p.isActive === false) throw new HttpsError('failed-precondition', `PRODUCT_NOT_FOUND: ${p.title}`)

      const stock = Number(p.variants?.[size])
      if (!Number.isFinite(stock)) throw new HttpsError('failed-precondition', `SIZE_NOT_FOUND: ${p.title} ${size}`)
      if (stock < qty) throw new HttpsError('failed-precondition', `OUT_OF_STOCK: ${p.title} (size ${size})`)

      // The price the shop charges is the one in the database, full stop.
      const price = money(p.price)
      subtotal += price * qty

      lines.push({ slug: p.slug, title: p.title, size, qty, price, imageUrl: p.images?.[0] ?? null })
      stockWrites.push({ ref: refs[i], size, qty })
    })

    subtotal = money(subtotal)

    const discount = couponSnap?.exists ? computeDiscount(couponSnap.data(), subtotal) : null
    const appliedCoupon = discount ? couponCode : null
    const d = deliverySnap.exists ? deliverySnap.data() : {}
    const freeAbove = Number(d.free_above ?? 999)
    const fee = Number(d.fee ?? 49)
    const shippingFee = subtotal - (discount ?? 0) >= freeAbove ? 0 : fee
    const total = money(subtotal - (discount ?? 0) + shippingFee)

    for (const w of stockWrites) {
      tx.update(w.ref, { [`variants.${w.size}`]: admin.firestore.FieldValue.increment(-w.qty) })
    }

    const orderRef = db.collection('orders').doc()
    tx.set(orderRef, {
      orderNo,
      userId: req.auth.uid,
      customerName: who.name,
      customerPhone: who.phone,
      customerEmail: who.email,
      shippingAddress: who.address,
      items: lines,
      subtotal,
      discount: discount ?? 0,
      shippingFee,
      total,
      couponCode: appliedCoupon,
      paymentMethod: method,
      paymentStatus: 'pending',
      status: 'placed',
      notes,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    return {
      id: orderRef.id,
      orderNo,
      subtotal,
      discount: discount ?? 0,
      shippingFee,
      total,
      paymentMethod: method,
      couponCode: appliedCoupon,
    }
  })

  return result
})

// ------------------------------------------------------------- previewCoupon
exports.previewCoupon = onCall(async (req) => {
  const code = clean(req.data?.code, 24).toUpperCase()
  const subtotal = money(Number(req.data?.subtotal) || 0)
  if (!code) return { ok: false, reason: 'Enter a coupon code' }

  const snap = await db.collection('coupons').doc(code).get()
  if (!snap.exists || snap.data().isActive === false) return { ok: false, reason: 'Invalid coupon code' }

  const c = snap.data()
  if (subtotal < Number(c.minOrder ?? 0)) {
    return { ok: false, reason: `Minimum order Rs ${Number(c.minOrder)} required` }
  }
  const discount = computeDiscount(c, subtotal)
  return discount ? { ok: true, code, discount } : { ok: false, reason: 'Invalid coupon code' }
})

// ---------------------------------------------------------------- trackOrder
// Public on purpose: order number plus the phone it was placed with.
exports.trackOrder = onCall(async (req) => {
  const orderNo = clean(req.data?.orderNo, 40).toUpperCase()
  const phone = digits(req.data?.phone)
  if (!orderNo || phone.length !== 10) return null

  const snap = await db
    .collection('orders')
    .where('orderNo', '==', orderNo)
    .where('customerPhone', '==', phone)
    .limit(1)
    .get()

  if (snap.empty) return null
  const o = snap.docs[0].data()
  return {
    orderNo: o.orderNo,
    status: o.status,
    createdAt: o.createdAt?.toMillis?.() ?? null,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    customerName: o.customerName,
    shippingAddress: o.shippingAddress,
    subtotal: o.subtotal,
    discount: o.discount,
    shippingFee: o.shippingFee,
    total: o.total,
    items: o.items ?? [],
  }
})

// ------------------------------------------------------------------ Razorpay
const rzpConfigured = () => Boolean(RAZORPAY_KEY_ID.value() && RAZORPAY_KEY_SECRET.value())

exports.razorpayConfig = onCall({ secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] }, async () => ({
  configured: rzpConfigured(),
  keyId: rzpConfigured() ? RAZORPAY_KEY_ID.value() : null,
}))

exports.razorpayCreate = onCall({ secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] }, async (req) => {
  if (!rzpConfigured()) throw new HttpsError('failed-precondition', 'Razorpay keys are not configured yet')
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required')

  const orderNo = clean(req.data?.orderNo, 40).toUpperCase()
  const snap = await db.collection('orders').where('orderNo', '==', orderNo).limit(1).get()
  if (snap.empty) throw new HttpsError('not-found', 'Order not found')

  const doc = snap.docs[0]
  const o = doc.data()
  if (o.userId !== req.auth.uid) throw new HttpsError('permission-denied', 'Not your order')
  if (o.paymentStatus === 'paid') throw new HttpsError('failed-precondition', 'Order is already paid')

  // The amount comes from the stored order, never from the browser.
  const amount = Math.round(Number(o.total) * 100)
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID.value()}:${RAZORPAY_KEY_SECRET.value()}`).toString('base64'),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount,
      currency: 'INR',
      receipt: o.orderNo,
      notes: { orderNo: o.orderNo, store: 'HR Shoe Mart Bikaner' },
    }),
  })
  const rzp = await res.json()
  if (!res.ok) throw new HttpsError('internal', rzp?.error?.description ?? 'Razorpay order failed')

  await doc.ref.update({ razorpayOrderId: rzp.id, updatedAt: admin.firestore.FieldValue.serverTimestamp() })

  return {
    keyId: RAZORPAY_KEY_ID.value(),
    razorpayOrderId: rzp.id,
    amount,
    currency: 'INR',
    orderNo: o.orderNo,
    customer: { name: o.customerName, contact: o.customerPhone, email: o.customerEmail ?? '' },
  }
})

exports.razorpayVerify = onCall({ secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET] }, async (req) => {
  if (!rzpConfigured()) throw new HttpsError('failed-precondition', 'Razorpay keys are not configured yet')
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required')

  const orderNo = clean(req.data?.orderNo, 40).toUpperCase()
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.data ?? {}
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new HttpsError('invalid-argument', 'Missing payment fields')
  }

  const snap = await db.collection('orders').where('orderNo', '==', orderNo).limit(1).get()
  if (snap.empty) throw new HttpsError('not-found', 'Order not found')
  const doc = snap.docs[0]
  const o = doc.data()
  if (o.userId !== req.auth.uid) throw new HttpsError('permission-denied', 'Not your order')
  if (o.razorpayOrderId && o.razorpayOrderId !== razorpayOrderId) {
    throw new HttpsError('invalid-argument', 'Payment does not belong to this order')
  }

  const expected = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET.value())
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex')

  const ok =
    expected.length === String(razorpaySignature).length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(razorpaySignature)))

  if (!ok) {
    await doc.ref.update({ paymentStatus: 'failed', updatedAt: admin.firestore.FieldValue.serverTimestamp() })
    throw new HttpsError('permission-denied', 'Signature mismatch')
  }

  await doc.ref.update({
    paymentStatus: 'paid',
    status: 'confirmed',
    razorpayPaymentId,
    razorpayOrderId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })

  return { verified: true, orderNo: o.orderNo }
})

// --------------------------------------------------------------- new sign-up
// Creates the profile document, and promotes the shop's own emails to admin
// using the adminEmails allowlist — the same behaviour the Postgres trigger had.
exports.onUserCreate = functionsV1
  .region('asia-south1')
  .auth.user()
  .onCreate(async (user) => {
    const email = (user.email ?? '').toLowerCase()
    const allow = email ? await db.collection('adminEmails').doc(email).get() : null
    const isAdmin = Boolean(allow?.exists)

    if (isAdmin) {
      await admin.auth().setCustomUserClaims(user.uid, { admin: true })
    }

    await db.collection('profiles').doc(user.uid).set(
      {
        email,
        fullName: user.displayName ?? '',
        phone: user.phoneNumber ?? '',
        role: isAdmin ? 'admin' : 'customer',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  })
