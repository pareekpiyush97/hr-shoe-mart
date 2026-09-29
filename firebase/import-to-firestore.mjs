/**
 * Loads firebase/seed/catalogue.json into Firestore.
 *
 *   node firebase/import-to-firestore.mjs
 *
 * Credentials, in order of preference:
 *   1. firebase/service-account.json  (Firebase console → Project settings →
 *      Service accounts → Generate new private key). Git-ignored.
 *   2. GOOGLE_APPLICATION_CREDENTIALS, or `gcloud auth application-default login`.
 *
 * Safe to run more than once — every document is written by a fixed id, so a
 * second run updates rather than duplicates. Pass --wipe-orders to also clear
 * test orders.
 */

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const here = dirname(fileURLToPath(import.meta.url))
const keyPath = join(here, 'service-account.json')

const projectId = process.env.FIREBASE_PROJECT_ID ?? null
initializeApp(
  existsSync(keyPath)
    ? { credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) }
    : { credential: applicationDefault(), ...(projectId ? { projectId } : {}) },
)

const db = getFirestore()
const data = JSON.parse(readFileSync(join(here, 'seed', 'catalogue.json'), 'utf8'))

/** Firestore caps a batch at 500 writes. */
async function writeAll(collection, docs) {
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch()
    for (const doc of docs.slice(i, i + 400)) {
      const { id, ...rest } = doc
      batch.set(db.collection(collection).doc(String(id)), rest, { merge: true })
    }
    await batch.commit()
  }
  console.log(`  ${collection}: ${docs.length}`)
}

console.log('Importing into Firestore…')

await writeAll('categories', data.categories)
await writeAll('brands', data.brands)
await writeAll('products', data.products)
await writeAll('coupons', data.coupons)

const settingsDocs = Object.entries(data.settings).map(([id, value]) => ({ id, ...value }))
await writeAll('settings', settingsDocs)

// Emails here become admins the moment they register — the onUserCreate
// function reads this list. Not readable from the browser.
await writeAll('adminEmails', [{ id: 'pareekpiyush97@gmail.com', note: 'Shop owner' }])

// Order numbers continue from where Supabase left off, so no number repeats.
await db.collection('counters').doc('orders').set({ value: 1003 }, { merge: true })
console.log('  counters/orders: 1003')

if (process.argv.includes('--wipe-orders')) {
  const snap = await db.collection('orders').get()
  const batch = db.batch()
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
  console.log(`  orders wiped: ${snap.size}`)
}

await db.collection('settings').doc('_meta').set(
  { importedAt: FieldValue.serverTimestamp(), source: 'firebase/seed/catalogue.json' },
  { merge: true },
)

console.log('\nDone. Next: firebase deploy --only firestore:rules,firestore:indexes')
process.exit(0)
