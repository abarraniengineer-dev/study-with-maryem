import { useMemo, useState } from 'react'
import { useApp } from '../lib/appStore'
import { fmtMin, todayKey, addDaysKey } from '../lib/date'
import { computeWeeklyAllocation, quickRecommendation, suggestRebalance } from '../lib/engine'
import { subjectName } from './Home'
import { Icon } from '../components/Icon'
import { Empty } from '../components/ui'

const QUICK = [10, 20, 30, 45, 60, 90]

export function Plan() {
  const app = useApp()
  const today = todayKey()
  const [available, setAvailable] = useState(720)
  const [plan, setPlan] = useState<ReturnType<typeof computeWeeklyAllocation> | null>(null)
  const [quick, setQuick] = useState<number | null>(null)
  const [rebalance, setRebalance] = useState<ReturnType<typeof suggestRebalance> | null>(null)

  const generate = () => {
    const studied: Record<string, number> = {}
    const weekStart = today.slice(0, 8)
    for (const s of app.sessions) {
      if (s.dateKey >= weekStart + '01') {
        const id = s.subjectId ?? 'general'
        studied[id] = (studied[id] ?? 0) + s.minutes
      }
    }
    setPlan(computeWeeklyAllocation(app.subjects, app.exams, app.tasks, app.revisions, available, studied, today))
  }

  const acceptPlan = () => {
    if (!plan) return
    let day = addDaysKey(today, 1)
    for (const p of plan) {
      let remainingMin = p.minutes
      let startMin = 16 * 60
      while (remainingMin > 0) {
        const chunk = Math.min(60, remainingMin)
        app.addEvent({
          name: `Study ${subjectName(p.subjectId, app.subjects) || 'session'}`,
          subjectId: p.subjectId,
          dateKey: day,
          startMin,
          durationMin: chunk,
          type: 'study',
          recurring: 'none',
          reminder: false,
        })
        remainingMin -= chunk
        startMin += chunk + 10
        day = addDaysKey(day, 1)
      }
    }
    setPlan(null)
  }

  const acceptRebalance = () => {
    if (!rebalance) return
    for (const s of rebalance) {
      app.addEvent({
        name: `Catch-up ${subjectName(s.subjectId, app.subjects)}`,
        subjectId: s.subjectId,
        dateKey: s.dateKey,
        startMin: 17 * 60,
        durationMin: s.minutes,
        type: 'study',
        recurring: 'none',
        reminder: false,
        })
    }
    setRebalance(null)
  }

  const quickRec = useMemo(
    () => (quick === null ? null : quickRecommendation(quick, app.subjects, app.exams, app.tasks, app.revisions, app.profile.energy, today)),
    [quick, app.subjects, app.exams, app.tasks, app.revisions, app.profile.energy, today],
  )

  return (
    <div>
      <h1 className="page-title">Plan my week</h1>
      <p className="page-sub">You decide how much time — I’ll suggest how to spread it.</p>

      <div className="card">
        <div className="field">
          <label htmlFor="p-avail">Time available this week: {fmtMin(available)}</label>
          <input
            id="p-avail" type="range" min={60} max={1800} step={30} value={available}
            onChange={(e) => setAvailable(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
        </div>
        <button className="btn btn-primary" onClick={generate}>
          <Icon name="sparkle" size={17} /> Suggest my plan
        </button>
      </div>

      {plan && (
        plan.length === 0 ? (
          <Empty icon="leaf" title="Add subjects first" note="The plan spreads time across your subjects." />
        ) : (
          <div className="card mt16" style={{ background: 'var(--lav-soft)', borderColor: 'transparent' }}>
            <h2 style={{ fontSize: 20 }}>Your suggested week</h2>
            <p className="small muted" style={{ margin: '4px 0 14px' }}>{fmtMin(available)} available</p>
            <div className="stack">
              {plan.map((p) => (
                <div key={p.subjectId} className="row between">
                  <div>
                    <div className="bold" dir="auto">{subjectName(p.subjectId, app.subjects)}</div>
                    <div className="tiny faint">{p.reasons.join(' · ')}</div>
                  </div>
                  <span className="chip rose">{fmtMin(p.minutes)}</span>
                </div>
              ))}
            </div>
            <div className="row mt16" style={{ gap: 10 }}>
              <button className="btn btn-primary grow" onClick={acceptPlan}>Accept plan</button>
              <button className="btn btn-ghost" onClick={() => setPlan(null)}>Customize later</button>
            </div>
            <p className="tiny faint mt8">Accepting adds study blocks to your schedule starting tomorrow. You can edit or delete any of them.</p>
          </div>
        )
      )}

      <div className="section-label">I only have X minutes</div>
      <div className="seg" role="group" aria-label="Quick session">
        {QUICK.map((m) => (
          <button key={m} className={quick === m ? 'on' : ''} onClick={() => setQuick(m)}>{m} min</button>
        ))}
      </div>
      {quickRec && quick !== null && (
        <div className="card mt16" style={{ background: 'var(--accent-soft)', borderColor: 'transparent' }}>
          <div className="bold" style={{ fontSize: 17 }} dir="auto">{quickRec.title}</div>
          <div className="small muted" style={{ margin: '4px 0 12px' }}>{quickRec.reasons.join(' · ')} · {fmtMin(quickRec.minutes)}</div>
          <button className="btn btn-primary">Start session</button>
        </div>
      )}

      <div className="section-label">Fell behind?</div>
      <div className="card quiet">
        <p className="small muted" style={{ margin: '0 0 12px' }}>
          Missed sessions happen. I can suggest a gentle catch-up without overloading your week.
        </p>
        <button className="btn btn-soft" onClick={() => setRebalance(suggestRebalance(45, app.subjects, app.exams, today))}>
          <Icon name="leaf" size={16} /> Suggest a catch-up plan
        </button>
        {rebalance && (
          <div className="mt16">
            {rebalance.map((s) => (
              <div key={s.dateKey} className="row between small" style={{ padding: '6px 0' }}>
                <span>{fmtMin(s.minutes)} · {s.reason}</span>
                <span className="faint tiny">{s.dateKey}</span>
              </div>
            ))}
            <div className="row mt8" style={{ gap: 10 }}>
              <button className="btn btn-primary btn-sm" onClick={acceptRebalance}>Add to schedule</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setRebalance(null)}>No thanks</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
