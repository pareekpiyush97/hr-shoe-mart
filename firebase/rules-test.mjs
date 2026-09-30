/**
 * Exercises firestore.rules against the emulator with the ordinary client SDK
 * — the same code path a browser takes, so a rule that only looks right is
 * caught here.
 *
 *   npm run emu       # terminal 1
 *   npm run emu:seed  # terminal 2
 *   node firebase/rules-test.mjs
 *
 * The interesting case is the last block. On the Spark plan there are no Cloud
 * Functions, so isAdmin() falls back to reading role:'admin' off the profile
 * document. That is only safe if a customer cannot write that word themselves,
 * which is what these assertions are for.
 */

import { initializeApp, deleteApp } from 'firebase/app'
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
} from 'firebase/auth'
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
  updateDoc,
} from 'firebase/firestore'

const PROJECT = 'demo-hr-shoe-mart'
const FS_REST = `http://127.0.0.1:8080/v1/projects/${PROJECT}/databases/(default)/documents`

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099'

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

/** True when the promise was refused by the rules. */
async function denied(p) {
  try {
    await p
    return false
  } catch (e) {
    return String(e.code ?? e.message).includes('permission-denied')
  }
}

async function allowed(p) {
  try {
    await p
    return true
  } catch {
    return false
  }
}

/**
 * Writes past the rules, the way the console or the Admin SDK would. The
 * emulator applies rules to unauthenticated REST as well, and takes the
 * literal bearer token "owner" to mean the Admin SDK.
 */
const OWNER = { 'content-type': 'application/json', authorization: 'Bearer owner' }

async function writeAsOwner(path, fields) {
  const res = await fetch(`${FS_REST}/${path}`, {
    method: 'PATCH',
    headers: OWNER,
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) throw new Error(`owner write failed: ${res.status} ${await res.text()}`)
}

async function deleteAsOwner(path) {
  await fetch(`${FS_REST}/${path}`, { method: 'DELETE', headers: OWNER })
}

/** onUserCreate races the browser to write the profile; wait it out. */
async function waitForTrigger(path, ms = 4000) {
  const until = Date.now() + ms
  while (Date.now() < until) {
    const res = await fetch(`${FS_REST}/${path}`, { headers: OWNER })
    if (res.ok) return true
    await new Promise((r) => setTimeout(r, 150))
  }
  return false
}

const app = initializeApp({ apiKey: 'fake-api-key', projectId: PROJECT, appId: 'test' }, `rules-${Date.now()}`)
const auth = getAuth(app)
const db = getFirestore(app)
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
connectFirestoreEmulator(db, '127.0.0.1', 8080)

console.log('Security rules (emulator)\n')

// -------------------------------------------------------------- logged out
console.log('a visitor who is not logged in')
ok('can read the catalogue', await allowed(getDocs(collection(db, 'products'))))
ok('can read settings', await allowed(getDoc(doc(db, 'settings', 'delivery'))))
ok('cannot edit a product', await denied(setDoc(doc(db, 'products', 'anything'), { price: 1 })))
ok('cannot read coupons', await denied(getDoc(doc(db, 'coupons', 'HRSM10'))))
ok('cannot read the admin list', await denied(getDoc(doc(db, 'adminEmails', 'x@y.com'))))
ok('cannot read order numbers', await denied(getDoc(doc(db, 'counters', 'orders'))))

// ------------------------------------------------------------- a customer
const email = `rules-${Date.now()}@example.com`
const password = `pw-${Math.random().toString(36).slice(2)}-${Date.now()}`
const cred = await createUserWithEmailAndPassword(auth, email, password)
const uid = cred.user.uid

// The functions emulator runs onUserCreate, which writes this same document.
// Let it land, then clear it, so the create and update paths are each tested
// on purpose instead of whichever won the race.
const triggerRan = await waitForTrigger(`profiles/${uid}`)
await deleteAsOwner(`profiles/${uid}`)

console.log('\na signed-in customer')
ok('onUserCreate wrote a profile', triggerRan)
ok(
  'cannot sign up as an admin',
  await denied(
    setDoc(doc(db, 'profiles', uid), { role: 'admin', fullName: 'Sneaky' }, { merge: true }),
  ),
)
ok(
  'can create their own customer profile',
  await allowed(
    setDoc(doc(db, 'profiles', uid), { role: 'customer', fullName: 'Asha' }, { merge: true }),
  ),
)
ok(
  'cannot promote themselves afterwards',
  await denied(updateDoc(doc(db, 'profiles', uid), { role: 'admin' })),
)
// What signUp() actually does when the trigger got there first.
await writeAsOwner(`profiles/${uid}`, {
  role: { stringValue: 'customer' },
  email: { stringValue: email },
})
ok(
  'can merge their name over the profile the trigger wrote',
  await allowed(
    setDoc(doc(db, 'profiles', uid), { fullName: 'Asha', phone: '9876543210' }, { merge: true }),
  ),
)
// A profile with no role at all must not lock its owner out.
await deleteAsOwner(`profiles/${uid}`)
await writeAsOwner(`profiles/${uid}`, { email: { stringValue: email } })
ok(
  'a profile written without a role is still editable by its owner',
  await allowed(updateDoc(doc(db, 'profiles', uid), { fullName: 'Asha' })),
)
ok('can fix their own name', await allowed(updateDoc(doc(db, 'profiles', uid), { fullName: 'Asha P' })))
ok(
  "cannot read somebody else's profile",
  await denied(getDoc(doc(db, 'profiles', 'some-other-uid'))),
)
ok('cannot write an order directly', await denied(setDoc(doc(db, 'orders', 'forged'), { total: 1 })))
ok('still cannot read coupons', await denied(getDoc(doc(db, 'coupons', 'HRSM10'))))
ok('still cannot edit a product', await denied(setDoc(doc(db, 'products', 'anything'), { price: 1 })))

// ---------------------------------------------------- the Spark admin path
console.log('\nan owner promoted from the console')
await writeAsOwner(`profiles/${uid}`, {
  role: { stringValue: 'admin' },
  fullName: { stringValue: 'Asha P' },
})
ok(
  'can now edit a product',
  await allowed(setDoc(doc(db, 'products', 'rules-test-shoe'), { title: 'Test', price: 999, isActive: false })),
)
ok('can now read coupons', await allowed(getDoc(doc(db, 'coupons', 'HRSM10'))))
ok('still cannot read the admin list', await denied(getDoc(doc(db, 'adminEmails', 'x@y.com'))))

await signOut(auth)
await deleteApp(app)

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail === 0 ? 0 : 1)
