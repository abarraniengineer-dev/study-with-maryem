// Study Garden: SVG plants/decorations that unlock as Maryem studies.
import { GARDEN_ITEMS, gardenStage } from '../lib/gamify'
import { Mascot } from './Mascot'

export function GardenStage({ points, mascot }: { points: number; mascot: 'panda' | 'bunny' | 'cat' | 'flower' }) {
  const stage = gardenStage(points)
  const owned = GARDEN_ITEMS.filter((g) => points >= g.points)
  return (
    <div className="garden-stage" role="img" aria-label={`Your study garden: ${stage.label}`}>
      <div className="garden-ground" />
      {owned.map((g, i) => (
        <div key={g.id} className="garden-item" style={{ left: `${14 + ((i * 17) % 74)}%`, animationDelay: `${i * 0.12}s` }}>
          <Plant id={g.id} />
        </div>
      ))}
      <div style={{ position: 'absolute', right: 18, top: 14 }}>
        <Mascot kind={mascot} size={64} mood={points > 0 ? 'idle' : 'sleeping'} />
      </div>
      <div className="chip sage" style={{ position: 'absolute', left: 14, top: 14 }}>
        {stage.label}
      </div>
    </div>
  )
}

export function Plant({ id, size = 64 }: { id: string; size?: number }) {
  const c = { stroke: 'var(--sage-deep)', strokeWidth: 2.2, fill: 'none', strokeLinecap: 'round' as const }
  const f = { fill: 'var(--rose)' }
  const f2 = { fill: 'var(--lavender)' }
  switch (id) {
    case 'sprout':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" {...{}}>
          <path d="M32 52V34" {...c} />
          <path d="M32 36c-8 0-11-5-11-11 7 0 11 4 11 11zM32 32c8 0 11-5 11-11-7 0-11 4-11 11z" {...c} />
        </svg>
      )
    case 'daisy':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64">
          <path d="M32 54V30" {...c} />
          <g {...f2}>
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <ellipse key={a} cx="32" cy="18" rx="4.4" ry="9" transform={`rotate(${a} 32 24)`} />
            ))}
          </g>
          <circle cx="32" cy="24" r="5" fill="var(--accent)" />
        </svg>
      )
    case 'tulip':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64">
          <path d="M32 54V26M32 40c-6-1-9-4-10-9M32 44c6-1 9-4 10-9" {...c} />
          <path d="M24 26c0-8 3-12 8-14 5 2 8 6 8 14 0 5-3.5 8-8 8s-8-3-8-8z" {...f} />
        </svg>
      )
    case 'rose':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64">
          <path d="M32 54V28M32 38c-7-1-11-5-12-11M32 42c7-1 11-5 12-11" {...c} />
          <circle cx="32" cy="20" r="9" {...f} />
          <path d="M32 13a7 7 0 0 1 7 7 7 7 0 0 1-7 7 5 5 0 0 1-5-5 4 4 0 0 1 4-4" fill="none" stroke="var(--rose-deep)" strokeWidth="1.6" />
        </svg>
      )
    case 'tree':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64">
          <path d="M32 54V34" {...c} />
          <circle cx="32" cy="22" r="12" fill="var(--sage)" />
          <circle cx="22" cy="28" r="7" fill="var(--sage)" />
          <circle cx="42" cy="28" r="7" fill="var(--sage)" />
        </svg>
      )
    case 'butterfly':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64">
          <path d="M32 26v18" {...c} />
          <ellipse cx="24" cy="24" rx="9" ry="7" transform="rotate(-20 24 24)" {...f2} />
          <ellipse cx="40" cy="24" rx="9" ry="7" transform="rotate(20 40 24)" {...f2} />
        </svg>
      )
    case 'lantern':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64">
          <path d="M32 52V30" {...c} />
          <rect x="24" y="16" width="16" height="14" rx="5" fill="var(--lavender)" stroke="var(--accent-deep)" strokeWidth="1.8" />
          <circle cx="32" cy="23" r="3" fill="var(--accent)" />
        </svg>
      )
    case 'fountain':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64">
          <path d="M16 50h32M22 50c0-10 4-14 10-14s10 4 10 14M32 36V22M32 22c-3 0-5-2-5-5M32 22c3 0 5-2 5-5" {...c} />
          <circle cx="27" cy="14" r="2" fill="var(--lavender)" />
          <circle cx="37" cy="14" r="2" fill="var(--lavender)" />
        </svg>
      )
    default:
      return null
  }
}
