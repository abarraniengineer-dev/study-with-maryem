// Bloom, the study mascot — a tiny blob with petals, pure inline SVG.
import type { MascotKind } from '../types'

export type MascotMood = 'idle' | 'reading' | 'celebrating' | 'sleeping' | 'preparing'

export function Mascot({ kind = 'cat', size = 92, mood = 'idle' }: { kind?: MascotKind; size?: number; mood?: MascotMood }) {
  const float = mood === 'idle' ? ' float-slow' : ''
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={float} role="img" aria-label={`Bloom the ${kind} mascot, ${mood}`}>
      {ears(kind)}
      <ellipse cx="50" cy="56" rx="27" ry="25" fill="var(--card)" stroke="var(--accent)" strokeWidth="2.4" />
      {/* petals crown for flower/cat */}
      {(kind === 'flower' || kind === 'cat') && (
        <g stroke="var(--accent)" strokeWidth="2" fill="var(--accent-soft)">
          <circle cx="50" cy="27" r="5" />
          <circle cx="41" cy="31" r="4.4" />
          <circle cx="59" cy="31" r="4.4" />
        </g>
      )}
      {/* eyes */}
      {mood === 'sleeping' ? (
        <g stroke="var(--text)" strokeWidth="2.4" strokeLinecap="round">
          <path d="M40 55q3.4 3 6.8 0M53.2 55q3.4 3 6.8 0" />
        </g>
      ) : (
        <g className="mascot-eye" fill="var(--text)">
          <ellipse cx="43" cy="55" rx="3.1" ry={mood === 'celebrating' ? 2.2 : 3.8} />
          <ellipse cx="57" cy="55" rx="3.1" ry={mood === 'celebrating' ? 2.2 : 3.8} />
        </g>
      )}
      {/* blush */}
      <ellipse cx="38" cy="61" rx="3.4" ry="2" fill="var(--blush)" opacity="0.9" />
      <ellipse cx="62" cy="61" rx="3.4" ry="2" fill="var(--blush)" opacity="0.9" />
      {/* mouth */}
      {mood === 'celebrating' ? (
        <path d="M45 62q5 6 10 0" stroke="var(--text)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      ) : mood === 'sleeping' ? (
        <circle cx="50" cy="63" r="1.6" fill="var(--text)" opacity="0.7" />
      ) : (
        <path d="M46.5 62.5q3.5 3 7 0" stroke="var(--text)" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      )}
      {mood === 'reading' && (
        <path d="M36 72q14 -6 28 0l-2.5 6q-11.5 -4.5 -23 0z" fill="var(--lavender)" stroke="var(--accent-deep)" strokeWidth="1.6" />
      )}
      {mood === 'celebrating' && (
        <g stroke="var(--accent-deep)" strokeWidth="2" strokeLinecap="round">
          <path d="M30 40l-5-6M70 40l5-6M50 22v-7" />
        </g>
      )}
      {mood === 'sleeping' && (
        <text x="66" y="38" fontSize="11" fill="var(--text-soft)" fontFamily="var(--font-body)">z z</text>
      )}
    </svg>
  )
}

function ears(kind: MascotKind) {
  if (kind === 'cat') {
    return (
      <path d="M30 44l-4-15 13 7M70 44l4-15-13 7" fill="var(--card)" stroke="var(--accent)" strokeWidth="2.4" strokeLinejoin="round" />
    )
  }
  if (kind === 'bunny') {
    return (
      <g fill="var(--card)" stroke="var(--accent)" strokeWidth="2.4">
        <ellipse cx="40" cy="27" rx="6.5" ry="14" transform="rotate(-8 40 27)" />
        <ellipse cx="60" cy="27" rx="6.5" ry="14" transform="rotate(8 60 27)" />
      </g>
    )
  }
  if (kind === 'panda') {
    return (
      <g fill="var(--text)" opacity="0.85">
        <circle cx="34" cy="38" r="7.5" />
        <circle cx="66" cy="38" r="7.5" />
      </g>
    )
  }
  return null
}
