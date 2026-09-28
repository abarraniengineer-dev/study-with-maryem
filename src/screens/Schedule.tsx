import { useMemo, useState } from 'react'
import { useApp } from '../lib/appStore'
import { addDaysKey, fmtMin, minToTime, timeToMin, todayKey, weekdayShort } from '../lib/date'
import { eventOccursOn } from '../lib/engine'
import { Icon } from '../components/Icon'
import { Empty, Sheet, Seg } from '../components/ui'
import type { EventType, Recurrence, ScheduleEvent } from '../types'

const TYPE_LABEL: Record<EventType, string> = {
  school: 'School', study: 'Study', break: 'Break', free: 'Free time', assignment: 'Assignment', other: 'Other',
}
const TYPE_COLOR: Record<EventType, string> = {
  school: 'var(--lavender)', study: 'var(--rose)', break: 'var(--sage)', free: 'var(--sage-soft)', assignment: 'var(--blush)', other: 'var(--line-strong)',
}

export function Schedule() {
  const app = useApp()
  const today = todayKey()
  const [view, setView] = useState<'day' | 'week'>('day')
  const [anchor, setAnchor] = useState(today)
  const [editing, setEditing] = useState<ScheduleEvent | null>(null)
  const [open, setOpen] = useState(false)

  const weekKeys = useMemo(() => {
    const d = new Date(anchor + 'T12:00:00')
    const dow = d.getDay()
    const monday = new Date(d)
    monday.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(monday)
      x.setDate(monday.getDate() + i)
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
    })
  }, [anchor])

  const dayEvents = (key: string) =>
    app.events.filter((e) => eventOccursOn(e, key)).sort((a, b) => a.startMin - b.startMin)

  const conflicts = (list: ScheduleEvent[]) =>
    list.filter((e, i) => {
      const next = list[i + 1]
      return next && next.startMin < e.startMin + e.durationMin
    })

  return (
    <div>
      <div className="row between">
        <div>
          <h1 className="page-title">Schedule</h1>
          <p className="page-sub">Your day, beautifully arranged.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true) }}>
          <Icon name="plus" size={17} /> Event
        </button>
      </div>

      <div className="row between wrap" style={{ gap: 10, marginBottom: 14 }}>
        <Seg
          options={[{ value: 'day' as const, label: 'Day' }, { value: 'week' as const, label: 'Week' }]}
          value={view}
          onChange={setView}
          ariaLabel="Schedule view"
        />
        <div className="row" style={{ gap: 6 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setAnchor(addDaysKey(anchor, view === 'day' ? -1 : -7))} aria-label="Previous day">‹</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setAnchor(today)}>Today</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setAnchor(addDaysKey(anchor, view === 'day' ? 1 : 7))} aria-label="Next day">›</button>
        </div>
      </div>

      {view === 'day' ? (
        <div className="card quiet">
          {dayEvents(anchor).length === 0 ? (
            <Empty icon="calendar" title="Nothing scheduled" note="A calm day. Add school, study or break blocks." />
          ) : (
            <div className="timeline">
              {dayEvents(anchor).map((e) => {
                const cs = conflicts(dayEvents(anchor))
                const conflict = cs.includes(e)
                return (
                  <div key={e.id} className="tl-item">
                    <div className="row" style={{ gap: 10 }}>
                      <span className="tl-time">{minToTime(e.startMin)}</span>
                      <span className="task-dot" style={{ background: TYPE_COLOR[e.type] }} aria-hidden="true" />
                      <div className="grow">
                        <div className="bold">{e.name} {!conflict && <span className="tiny faint">· {TYPE_LABEL[e.type]} · {fmtMin(e.durationMin)}</span>}</div>
                        {conflict && (
                          <div className="tiny" style={{ color: '#b3564f' }}>
                            Overlaps with another event — you may want to move one of them.
                          </div>
                        )}
                        {e.recurring !== 'none' && <div className="tiny faint">Repeats {e.recurring}</div>}
                      </div>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(e); setOpen(true) }} aria-label={`Edit ${e.name}`}><Icon name="edit" size={15} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="stack">
          {weekKeys.map((k) => {
            const evs = dayEvents(k)
            const cs = conflicts(evs)
            return (
              <div key={k} className="card quiet" style={{ padding: 16 }}>
                <div className="row between mb8">
                  <div className="bold">{weekdayShort(k)}{k === today ? ' · today' : ''}</div>
                  <button className="link-btn" onClick={() => { setAnchor(k); setView('day') }}>Open day</button>
                </div>
                {evs.length === 0 ? (
                  <div className="small faint">Free</div>
                ) : (
                  evs.map((e) => (
                    <div key={e.id} className="row small" style={{ gap: 8, padding: '4px 0' }}>
                      <span className="tl-time">{minToTime(e.startMin)}</span>
                      <span className="task-dot" style={{ background: TYPE_COLOR[e.type] }} aria-hidden="true" />
                      <span className="grow truncate">{e.name}</span>
                      {cs.includes(e) && <span className="tiny" style={{ color: '#b3564f' }}>conflict</span>}
                    </div>
                  ))
                )}
              </div>
            )
          })}
        </div>
      )}

      {open && <EventSheet event={editing} onClose={() => setOpen(false)} />}
    </div>
  )
}

function EventSheet({ event, onClose }: { event: ScheduleEvent | null; onClose: () => void }) {
  const app = useApp()
  const [name, setName] = useState(event?.name ?? '')
  const [type, setType] = useState<EventType>(event?.type ?? 'study')
  const [dateKey, setDateKey] = useState(event?.dateKey ?? todayKey())
  const [start, setStart] = useState(event ? minToTime(event.startMin) : '16:00')
  const [duration, setDuration] = useState(event?.durationMin ?? 60)
  const [recurring, setRecurring] = useState<Recurrence>(event?.recurring ?? 'none')
  const [subjectId, setSubjectId] = useState<string>(event?.subjectId ?? '')
  const [error, setError] = useState('')

  const save = () => {
    if (!name.trim()) return setError('Give the event a name.')
    if (duration < 5 || duration > 720) return setError('Duration must be 5–720 minutes.')
    const payload = { name: name.trim(), type, dateKey, startMin: timeToMin(start), durationMin: duration, recurring, subjectId: subjectId || null, reminder: false }
    if (event) app.updateEvent(event.id, payload)
    else app.addEvent(payload)
    onClose()
  }

  return (
    <Sheet title={event ? 'Edit event' : 'New event'} onClose={onClose}>
      <div className="field">
        <label htmlFor="e-name">Name</label>
        <input id="e-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Math class" />
      </div>
      <div className="field">
        <span className="label" style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--text-soft)', marginBottom: 6 }}>Type</span>
        <div className="seg" role="group" aria-label="Event type">
          {(Object.keys(TYPE_LABEL) as EventType[]).map((t) => (
            <button key={t} type="button" className={type === t ? 'on' : ''} onClick={() => setType(t)}>{TYPE_LABEL[t]}</button>
          ))}
          <span className="chip" style={{ background: TYPE_COLOR[type] }}> </span>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="e-date">Date</label>
          <input id="e-date" className="input" type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="e-start">Start</label>
          <input id="e-start" className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="e-dur">Duration (min)</label>
          <input id="e-dur" className="input" type="number" min={5} max={720} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="e-rec">Repeat</label>
          <select id="e-rec" className="select" value={recurring} onChange={(e) => setRecurring(e.target.value as Recurrence)}>
            <option value="none">No repeat</option>
            <option value="daily">Daily</option>
            <option value="weekdays">Weekdays</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="e-subject">Subject (optional)</label>
        <select id="e-subject" className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">None</option>
          {app.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      {error && <p className="field-error">{error}</p>}
      <div className="row mt16" style={{ gap: 10 }}>
        <button className="btn btn-primary grow" onClick={save}>Save event</button>
        {event && <button className="btn btn-danger" onClick={() => { app.deleteEvent(event.id); onClose() }} aria-label="Delete event"><Icon name="trash" size={17} /></button>}
      </div>
    </Sheet>
  )
}
