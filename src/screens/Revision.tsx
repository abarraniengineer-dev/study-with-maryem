import { useState } from 'react'
import { useApp } from '../lib/appStore'
import { fmtDateShort, todayKey } from '../lib/date'
import { revisionDueKey, revisionsDueOn } from '../lib/engine'
import { subjectName } from './Home'
import { Icon } from '../components/Icon'
import { Empty, Sheet } from '../components/ui'

export function Revision() {
  const app = useApp()
  const today = todayKey()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState<string>(app.subjects[0]?.id ?? '')
  const [error, setError] = useState('')

  const due = revisionsDueOn(app.revisions, today)
  const upcoming = app.revisions
    .flatMap((r) => r.offsets.filter((o) => !r.completed[String(o)] && revisionDueKey(r, o) > today).map((o) => ({ item: r, offset: o })))
    .sort((a, b) => revisionDueKey(a.item, a.offset).localeCompare(revisionDueKey(b.item, b.offset)))

  const learn = () => {
    if (!title.trim()) return setError('What did you learn?')
    app.addRevision({
      subjectId: subjectId || null,
      title: title.trim(),
      learnedAt: today,
      offsets: [1, 3, 7, 14, 30],
      completed: {},
      overrides: {},
    })
    app.updateProfile({ xp: app.profile.xp + 2 })
    setTitle('')
    setError('')
    setOpen(false)
  }

  const completeRevision = (itemId: string, offset: number) => {
    app.updateRevision(itemId, offset)
  }

  return (
    <div>
      <div className="row between">
        <div>
          <h1 className="page-title">Revision</h1>
          <p className="page-sub">Learned once, remembered always.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setOpen(true)}>
          <Icon name="plus" size={17} /> Learned today
        </button>
      </div>

      <div className="section-label">Revision due today</div>
      {due.length === 0 ? (
        <Empty icon="leaf" title="Nothing due today" note="Your future self is grateful." />
      ) : (
        <div className="card quiet">
          {due.map(({ item, offset }) => (
            <div key={item.id + offset} className="task-row">
              <button className="check" onClick={() => completeRevision(item.id, offset)} aria-label={`Mark ${item.title} reviewed`} />
              <div className="grow">
                <div className="name" dir="auto">{item.title}</div>
                <div className="tiny faint">{subjectName(item.subjectId, app.subjects) || 'General'} · day {offset} review</div>
              </div>
              <button className="btn btn-soft btn-sm" onClick={() => completeRevision(item.id, offset)}>Review done</button>
            </div>
        ))}
        </div>
      )}

      <div className="section-label">Coming up</div>
      {upcoming.length === 0 ? (
        <Empty icon="book" title="No revisions scheduled" note="Mark lessons as “learned” and reviews appear here automatically." />
      ) : (
        <div className="card quiet">
          {upcoming.slice(0, 12).map(({ item, offset }) => (
            <div key={item.id + offset} className="task-row">
              <span className="task-dot" style={{ background: 'var(--lavender)' }} aria-hidden="true" />
              <div className="grow">
                <div className="name" dir="auto">{item.title}</div>
                <div className="tiny faint">{subjectName(item.subjectId, app.subjects) || 'General'} · day {offset} · {fmtDateShort(revisionDueKey(item, offset))}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-label">All learned lessons</div>
      {app.revisions.length === 0 ? (
        <Empty icon="book" title="Nothing learned yet" note='Tap "Learned today" after a study session.' />
      ) : (
        <div className="stack">
          {app.revisions.map((r) => (
            <div key={r.id} className="card quiet" style={{ padding: 16 }}>
              <div className="row between">
                <div className="bold" dir="auto">{r.title}</div>
                <button className="btn btn-ghost btn-sm" onClick={() => app.deleteRevision(r.id)} aria-label={`Delete ${r.title}`}><Icon name="trash" size={15} /></button>
              </div>
              <div className="row wrap mt8" style={{ gap: 6 }}>
                {r.offsets.map((o) => {
                  const done = !!r.completed[String(o)]
                  const dueKey = revisionDueKey(r, o)
                  return (
                    <span key={o} className={`chip${done ? ' sage' : dueKey <= today ? ' rose' : ''}`}>
                      D{o}: {fmtDateShort(dueKey)}{done ? ' ✓' : ''}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </div
      >
      )}

      {open && (
        <Sheet title="What did you learn today?" onClose={() => setOpen(false)}>
          <div className="field">
            <label htmlFor="r-title">Lesson</label>
            <input id="r-title" className="input" dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Quadratic equations" />
          </div>
          <div className="field">
            <label htmlFor="r-subject">Subject</label>
            <select id="r-subject" className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">General</option>
              {app.subjects.filter((s) => !s.archived).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <p className="tiny faint">Reviews will be scheduled on days 1, 3, 7, 14 and 30. You can complete them here any time.</p>
          {error && <p className="field-error">{error}</p>}
          <button className="btn btn-primary btn-block mt16" onClick={learn}>Save lesson</button>
        </Sheet>
      )}
    </div>
  )
}
