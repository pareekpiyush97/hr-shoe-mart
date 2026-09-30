import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions'

// These values are meant to be public — Firestore security rules and the
// Cloud Functions are what actually protect the data. Fill them from
// Firebase console → Project settings → Your apps → Web app, into .env
// (see .env.example).
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

/**
 * With VITE_USE_EMULATOR=true the whole backend runs on this machine through
 * the Firebase emulator suite — no Google account, no Blaze plan, same code
 * that will later be deployed. That is how the order flow is tested before
 * the real project exists.
 */
const useEmulator = import.meta.env.VITE_USE_EMULATOR === 'true'

export const firebaseReady = useEmulator || Boolean(config.apiKey && config.projectId)

/**
 * Firestore and Auth run on the free Spark plan, but Cloud Functions need
 * Blaze. Until they are deployed there is no server to price an order, so
 * checkout composes a WhatsApp message instead. Flip VITE_FUNCTIONS_READY to
 * true after `firebase deploy --only functions`.
 */
export const functionsReady =
  useEmulator || (firebaseReady && import.meta.env.VITE_FUNCTIONS_READY === 'true')

if (!firebaseReady && import.meta.env.DEV) {
  console.warn('[HR Shoe Mart] Firebase config missing — copy .env.example to .env and fill it in.')
}

const app = initializeApp(
  useEmulator
    ? { apiKey: 'demo', projectId: 'demo-hr-shoe-mart', appId: 'demo' }
    : firebaseReady
      ? config
      : { apiKey: 'missing', projectId: 'missing', appId: 'missing' },
)

export const auth = getAuth(app)
export const db = getFirestore(app)

// Same region the functions are deployed to, otherwise calls 404.
export const functions = getFunctions(app, 'asia-south1')

if (useEmulator) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)
}

/** Typed wrapper so pages call the server the same way everywhere. */
export async function call<TIn extends object, TOut>(name: string, payload: TIn): Promise<TOut> {
  const fn = httpsCallable<TIn, TOut>(functions, name)
  const res = await fn(payload)
  return res.data
}
