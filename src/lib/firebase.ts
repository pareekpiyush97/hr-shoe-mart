import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions, httpsCallable } from 'firebase/functions'

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

export const firebaseReady = Boolean(config.apiKey && config.projectId)

if (!firebaseReady && import.meta.env.DEV) {
  console.warn('[HR Shoe Mart] Firebase config missing — copy .env.example to .env and fill it in.')
}

const app = initializeApp(
  firebaseReady ? config : { apiKey: 'missing', projectId: 'missing', appId: 'missing' },
)

export const auth = getAuth(app)
export const db = getFirestore(app)

// Same region the functions are deployed to, otherwise calls 404.
export const functions = getFunctions(app, 'asia-south1')

/** Typed wrapper so pages call the server the same way everywhere. */
export async function call<TIn extends object, TOut>(name: string, payload: TIn): Promise<TOut> {
  const fn = httpsCallable<TIn, TOut>(functions, name)
  const res = await fn(payload)
  return res.data
}
