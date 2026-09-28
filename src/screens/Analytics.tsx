import { useMemo } from 'react'
import { useApp } from '../lib/appStore'
import { addDaysKey, fmtMin, todayKey, weekdayShort } from '../lib/date'
import { subjectName } from './Home'
import { Icon } from '../components/Icon'

export function Analytics() {
  const app = useApp()
  const today = todayKey()

  const week = useMemo(() => {
    const d = new Date(today + 'T12:00:00')
    const dow = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(monday)
      x.setDate(monday.getDate() + i)
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
    })
  }, [today])

  const byDay = week.map((k) => ({
    key: k,
    minutes: app.sessions.filter((s) => s.dateKey === k).reduce((a, s) => a + s.minutes, 0),
  }))
  const total = byDay.reduce((a, d) => a + d.minutes, 0)
  const lastWeekKeys = week.map((k) => addDaysKey(k, -7))
  const lastWeekTotal = app.sessions.filter((s) => lastWeekKeys.includes(s.dateKey)).reduce((a, s) => a + s.minutes, 0)
  const diff = total - lastWeekTotal
  const tasksDone = app.tasks.filter((t) => t.done && t.doneAt && t.doneAt.slice(0, 10) >= week[0]).length

  const bySubject = useMemo(() => {
    const map: Record<string, number> = {}
    for (const s of app.sessions) {
      if (week.includes(s.dateKey)) {
        const id = s.subjectId ?? 'general'
        map[id] = (map[id] ?? 0) + s.minutes
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [app.sessions, week])
  const maxSubject = bySubject[0]?.[1] ?? 1
  const best = [...byDay].sort((a, b) => b.minutes - a.minutes)[0]

  return (
    <div>
      <h1 className="page-title">Weekly insights</h1>
      <p className="page-sub">Progress, not pressure.</p>

      <div className="row wrap" style={{ gap: 12 }}>
        <Stat label="This week" value={fmtMin(total)} icon="clock" />
        <Stat label="Tasks done" value={String(tasksDone)} icon="check" />
        <Stat label="Streak" value={`${app.profile.streak} days`} icon="flame" />
        <Stat label="XP" value={String(app.profile.xp)} icon="sparkle" />
      </div>

      <div className="card mt16">
        <div className="section-label" style={{ marginTop: 0 }}>Study minutes per day</div>
        <div className="row" style={{ alignItems: 'flex-end', gap: 10, height: 150 }}>
          {byDay.map((d) => (
            <div key={d.key} style={{ flex: 1, textAlign: 'center' }} aria-label={`${weekdayShort(d.key)}: ${fmtMin(d.minutes)}`}>
              <div style={{
                height: Math.max(4, (d.minutes / Math.max(total, 60)) * 120),
                background: d.key === today ? 'var(--accent)' : 'var(--lavender)',
                borderRadius: 8,
                margin: '0 auto 6px',
                width: '70%',
                transition: 'height 0.5s ease',
              }} />
              <div className="tiny faint">{weekdayShort(d.key)[0]}</div>
            </div>
          ))}
        </div>
        {best && best.minutes > 0 && (
          <p className="small muted mt8">Most productive day: <strong>{weekdayShort(best.key)}</strong> with {fmtMin(best.minutes)}.</p>
        )}
      </div>

      <div className="section-label">By subject</div>
      {bySubject.length === 0 ? (
        <p className="muted small">No sessions yet this week — your breakdown will appear after your first focus session.</p>
      ) : (
        <div className="stack">
          {bySubject.map(([id, min]) => (
            <div key={id} className="card quiet" style={{ padding: 14 }}>
              <div className="row between small">
                <span className="bold" dir="auto">{id === 'general' ? 'General' : subjectName(id, app.subjects)}</span>
                <span className="faint">{fmtMin(min)}</span>
              </div>
              <div style={{ height: 8, borderRadius: 999, background: 'var(--border)', marginTop: 8 }}>
                <div style={{ height: '100%', width: `${(min / maxSubject) * 100}%`, borderRadius: 999, background: 'var(--accent)', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card quiet mt16">
        <div className="row">
          <Icon name="leaf" />
          <p className="small muted" style={{ margin: 0 }}>
            {diff > 0
              ? `You studied ${fmtMin(diff)} more than last week. Lovely.`
              : diff < 0
                ? `${fmtMin(-diff)} less than last week — and that’s okay. New week, fresh start.`
                : 'Same as last week — consistency is its own win.'}
          </p>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon: Parameters<typeof Icon>[0]['name'] }) {
  return (
    <div className="card quiet" style={{ flex: '1 1 140px', padding: 16 }}>
      <Icon name={icon} size={20} />
      <div className="display" style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{value}</div>
      <div className="tiny faint">{label}</div>
    </div>
  )
}
