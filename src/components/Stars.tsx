import { Star } from 'lucide-react'
import { cx } from '../lib/format'

export default function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={cx(i <= Math.round(value) ? 'fill-brass text-brass' : 'text-ink/20')}
        />
      ))}
    </span>
  )
}
