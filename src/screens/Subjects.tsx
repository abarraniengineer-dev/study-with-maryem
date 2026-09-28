import { useState } from 'react'
import { useApp } from '../lib/appStore'
import { Icon } from '../components/Icon'
import { Empty, Sheet, Seg } from '../components/ui'
import type { Difficulty, Priority1to3, ProgressStatus, Subject } from '../types'

const COLORS = ['#c98a94', '#a48ac2', '#8aa6c2', '#8fbf9f', '#d9a066', '#c2b28a']

export function Subjects() {
  const app = useApp()
  const [editing, setEditing] = useState<Subject | null>(null)
  const [open, setOpen] = useState(false)

  const active = app.subjects.filter((s) => !s.archived)
  const archived = app.subjects.filter((s) => s.archived)

  return (
    <div>
      <div className="row between">
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="page-sub">Your priorities, your rules.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true) }}>
          <Icon name="plus" size={17} /> Subject
        </button>
      </div>

      {active.length === 0 ? (
        <Empty
          icon="book"
          title="No subjects yet"
          note="Add the subjects you're studying — in any language."
          action={<button className="btn btn-primary" onClick={() => setOpen(true)}>Add your first subject</button>}
        />
      ) : (
        <div className="stack">
          {active.map((s) => (
            <div key={s.id} className="card quiet row between" style={{ padding: 16 }}>
              <div className="row" style={{ gap: 12, minWidth: 0 }}>
                <span style={{ width: 14, height: 14, borderRadius: 6, background: s.color, flex: 'none' }} aria-hidden="true" />
                <div style={{ minWidth: 0 }}>
                  <div className="bold truncate" dir="auto">{s.name}</div>
                  <div className="tiny faint" dir="auto">
                    {'★'.repeat(s.priority)}{'☆'.repeat(3 - s.priority)} · {s.difficulty} · {s.status}
                  </div>
                </div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(s); setOpen(true) }} aria-label={`Edit ${s.name}`}><Icon name="edit" size={15} /></button>
                <button className="btn btn-ghost btn-sm" onClick={() => app.updateSubject(s.id, { archived: true })} aria-label={`Archive ${s.name}`}><Icon name="close" size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {archived.length > 0 && (
        <>
          <div className="section-label">Archived</div>
          <div className="stack">
            {archived.map((s) => (
              <div key={s.id} className="card quiet row between" style={{ padding: 14, opacity: 0.7 }}>
                <span className="bold" dir="auto">{s.name}</span>
                <button className="link-btn" onClick={() => app.updateSubject(s.id, { archived: false })}>Restore</button>
              </div>
            ))}
          </div>
        </>
      )}

      {open && <SubjectSheet subject={editing} onClose={() => setOpen(false)} />}
    </div>
  )
}

function SubjectSheet({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const app = useApp()
  const [name, setName] = useState(subject?.name ?? '')
  const [color, setColor] = useState(subject?.color ?? COLORS[app.subjects.length % COLORS.length])
  const [priority, setPriority] = useState<Priority1to3>(subject?.priority ?? 2)
  const [difficulty, setDifficulty] = useState<Difficulty>(subject?.difficulty ?? 'normal')
  const [status, setStatus] = useState<ProgressStatus>(subject?.status ?? 'on-track')
  const [error, setError] = useState('')

  const save = () => {
    if (!name.trim()) return setError('Give the subject a name.')
    const payload = { name: name.trim(), color, priority, difficulty, status, archived: false, notes: '' }
    if (subject) app.updateSubject(subject.id, payload)
    else app.addSubject(payload)
    onClose()
  }

  return (
    <Sheet title={subject ? 'Edit subject' : 'New subject'} onClose={onClose}>
      <div className="field">
        <label htmlFor="s-name">Name (any language)</label>
        <input id="s-name" className="input" dir="auto" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Mathematics · الرياضيات" />
      </div>
      <div className="field">
        <span className="label" style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--text-soft)', marginBottom: 6 }}>Color</span>
        <div className="row" role="group" aria-label="Color">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-pressed={color === c}
              aria-label={`Color ${c}`}
              style={{ width: 34, height: 34, borderRadius: 999, background: c, border: color === c ? '3px solid var(--text)' : '3px solid transparent', cursor: 'pointer' }}
            />
          ))}
        </div>
      </div>
      <div className="field">
        <span className="label" style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--text-soft)', marginBottom: 6 }}>Priority</span>
        <div className="seg" role="group" aria-label="Priority">
          {([1, 2, 3] as Priority1to3[]).map((p) => (
            <button key={p} type="button" className={priority === p ? 'on' : ''} onClick={() => setPriority(p)} aria-pressed={priority === p}>
              {'★'.repeat(p)}{'☆'.repeat(3 - p)}
            </button>
          ))}
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Difficulty</label>
          <Seg
            options={[{ value: 'easy' as const, label: 'Easy' }, { value: 'normal' as const, label: 'Normal' }, { value: 'difficult' as const, label: 'Difficult' }]}
            value={difficulty}
            onChange={setDifficulty}
            ariaLabel="Difficulty"
          />
        </div>
        <div className="field">
          <label>Progress status</label>
          <Seg
            options={[{ value: 'behind' as const, label: 'Behind' }, { value: 'on-track' as const, label: 'On track' }, { value: 'strong' as const, label: 'Strong' }]}
            value={status}
            onChange={setStatus}
            ariaLabel="Progress status"
          />
        </div>
      </div>
      {error && <p className="field-error">{error}</p>}
      <div className="row mt16" style={{ gap: 10 }}>
        <button className="btn btn-primary grow" onClick={save}>Save subject</button>
        {subject && <button className="btn btn-danger" onClick={() => { app.deleteSubject(subject.id); onClose() }} aria-label="Delete subject"><Icon name="trash" size={17} /></button>}
      </div>
      <p className="tiny faint mt16">Priority and difficulty gently shape the smart planner — you always have the final say.</p>
    </Sheet>
  )
}
