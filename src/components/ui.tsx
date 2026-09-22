import { useEffect, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { cx } from '../lib/format'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-inksoft">
      <Loader2 className="animate-spin text-clay" size={26} />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function Empty({ title, note, action }: { title: string; note?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      {note && <p className="max-w-md text-sm text-inksoft">{note}</p>}
      {action}
    </div>
  )
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'ok'; children: ReactNode }) {
  const ok = kind === 'ok'
  return (
    <div
      className={cx(
        'flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm',
        ok ? 'bg-moss/10 text-moss' : 'bg-clay/10 text-claydeep',
      )}
    >
      {ok ? (
        <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
      ) : (
        <AlertCircle size={17} className="mt-0.5 shrink-0" />
      )}
      <span>{children}</span>
    </div>
  )
}

export function ProductSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-4/5 rounded-2xl bg-sand" />
      <div className="mt-3 h-3 w-16 rounded bg-sand" />
      <div className="mt-2 h-4 w-3/4 rounded bg-sand" />
      <div className="mt-2 h-4 w-20 rounded bg-sand" />
    </div>
  )
}

/** Tiny bottom-right toast used after "added to bag" style actions. */
export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const a = setTimeout(() => setLeaving(true), 2200)
    const b = setTimeout(onDone, 2600)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [onDone])

  return (
    <div
      className={cx(
        'fixed right-4 bottom-4 z-60 flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm text-bone shadow-xl transition-all duration-400',
        leaving ? 'translate-y-3 opacity-0' : 'opacity-100',
      )}
      role="status"
    >
      <CheckCircle2 size={16} className="text-brass" />
      {message}
    </div>
  )
}
