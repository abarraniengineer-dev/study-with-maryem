import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-grab" aria-hidden="true" />
        <div className="row between mb16">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">
            <Icon name="close" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Ring({ pct, label, sub }: { pct: number; label: string; sub?: string }) {
  const [anim, setAnim] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAnim(pct), 80)
    return () => clearTimeout(t)
  }, [pct])
  const R = 54
  const C = 2 * Math.PI * R
  return (
    <div style={{ position: 'relative', width: 132, height: 132 }} role="img" aria-label={`${label}: ${sub ?? ''}`}>
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle className="ring-track" cx="66" cy="66" r={R} fill="none" strokeWidth="11" />
        <circle
          className="ring-fill"
          cx="66" cy="66" r={R} fill="none" strokeWidth="11"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - anim / 100)}
          transform="rotate(-90 66 66)"
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div className="display" style={{ fontSize: 30, fontWeight: 700 }}>{label}</div>
        {sub && <div className="small faint">{sub}</div>}
    </div>
    </div>
  )
}

export function Empty({ icon = 'flower', title, note, action }: { icon?: Parameters<typeof Icon>[0]['name']; title: string; note?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="big" aria-hidden="true"><Icon name={icon} size={38} /></div>
      <h3>{title}</h3>
      {note && <p className="small" style={{ margin: '2px 0 14px' }}>{note}</p>}
      {action}
    </div>
  )
}

export function Seg<T extends string>({ options, value, onChange, ariaLabel }: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (v: T) => void
  ariaLabel?: string
}) {
  return (
    <div className="seg" role="group" aria-label={ariaLabel}>
      {options.map((o) => (
        <button key={o.value} type="button" className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)} aria-pressed={o.value === value}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Checkbox({ done, onChange, label }: { done: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      className={`check${done ? ' done' : ''}`}
      onClick={() => onChange(!done)}
      role="checkbox"
      aria-checked={done}
      aria-label={label}
    >
      <svg viewBox="0 0 24 24" width="22" height="22"><path d="M5.5 12.5l4 4 9-9.5" /></svg>
    </button>
  )
}
