import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'

interface Profile {
  fullName: string | null
  phone: string | null
  role: 'customer' | 'admin'
}

interface AuthValue {
  user: User | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<void>
  signOut: () => Promise<void>
}

const Ctx = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u)
      setLoading(false)
      if (!u) {
        setProfile(null)
        setIsAdmin(false)
        return
      }

      // Staff are marked with an `admin` custom claim, set server side from the
      // adminEmails allowlist — so nobody can promote themselves from here.
      const token = await u.getIdTokenResult()
      setIsAdmin(token.claims.admin === true)

      const snap = await getDoc(doc(db, 'profiles', u.uid))
      setProfile(
        snap.exists()
          ? ({
              fullName: snap.data().fullName ?? null,
              phone: snap.data().phone ?? null,
              role: snap.data().role ?? 'customer',
            } satisfies Profile)
          : { fullName: u.displayName, phone: null, role: 'customer' },
      )
    })
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      profile,
      loading,
      isAdmin,
      async signIn(email, password) {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      },
      async signUp(email, password, fullName, phone) {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
        await updateProfile(cred.user, { displayName: fullName })
        // onUserCreate writes this too; doing it here as well means the name
        // and phone are there immediately, and a trigger failure never leaves
        // a customer without a profile. Rules pin role to 'customer'.
        await setDoc(
          doc(db, 'profiles', cred.user.uid),
          { fullName, phone, email: email.trim().toLowerCase(), role: 'customer' },
          { merge: true },
        ).catch(() => {})
        // onUserCreate may have just granted an admin claim; the token minted
        // a moment ago does not carry it, so refresh before the app reads it.
        await new Promise((r) => setTimeout(r, 1200))
        await cred.user.getIdToken(true).catch(() => {})

        // Verification is optional for shopping — it never blocks checkout.
        sendEmailVerification(cred.user).catch(() => {})
      },
      async signOut() {
        await fbSignOut(auth)
      },
    }),
    [user, profile, loading, isAdmin],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used inside AuthProvider')
  return v
}

/** Firebase's error codes are not for customers. */
export function authMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Email ya password galat hai.',
    'auth/invalid-email': 'Email sahi nahi hai.',
    'auth/user-not-found': 'Is email se koi account nahi mila.',
    'auth/wrong-password': 'Password galat hai.',
    'auth/email-already-in-use': 'Is email se account pehle se hai — Login kijiye.',
    'auth/weak-password': 'Password kam se kam 6 characters ka rakhiye.',
    'auth/too-many-requests': 'Bahut baar koshish ho gayi. Thodi der baad try kijiye.',
    'auth/network-request-failed': 'Internet connection check kijiye.',
  }
  return map[code] ?? (e as Error)?.message ?? 'Kuch gadbad ho gayi.'
}
