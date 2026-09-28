import { useState } from 'react'
import { useApp } from '../lib/appStore'
import { fmtDateLong, todayKey } from '../lib/date'
import { Icon } from '../components/Icon'
import { Empty, Sheet } from '../components/ui'
import type { ExamKind } from '../types'

const KINDS: ExamKind[] = ['exam', 'assignment', 'project', 'deadline']
const LABEL: Record<ExamKind, string> = { exam: 'Exam', assignment: 'Assignment', project: 'Project', deadline: 'Deadline' }

export function Exams() {
  const app = useApp()
  const today = todayKey()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  const upcoming = app.exams.filter((e) => e.dateKey >= today).sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  const past = app.exams.filter((e) => e.dateKey < today).sort((a, b) => b.dateKey.localeCompare(a.dateKey))

  return (
    <div>
      <div className="row between">
        <div>
          <h1 className="page-title">Exams & deadlines</h1>
          <p className="page-sub">Know what’s coming, calmly.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setOpen(true) }}>
          <Icon name="plus" size={17} /> Add
        </button>
      </div>

      {upcoming.length === 0 ? (
        <Empty icon="target" title="No exams or deadlines" note="Add one and the planner will gently prioritize it." />
      ) : (
        <div className="stack">
          {upcoming.map((e) => {
            const days = Math.round((new Date(e.dateKey + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 86400000)
            const s = app.subjects.find((x) => x.id === e.subjectId)
            return (
              <div key={e.id} className="card quiet row between" style={{ padding: 16 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="bold truncate" dir="auto">{s ? s.name + ' · ' : ''}{e.title}</div>
                  <div className="tiny faint">{LABEL[e.kind]} · {fmtDateLong(e.dateKey)}</div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <span className={`chip ${days <= 3 ? 'rose' : days <= 7 ? '' : 'sage'}`}>
                    {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`}
                  </span>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(e.id); setOpen(true) }} aria-label={`Edit ${e.title}`}><Icon name="edit" size={15} /></button>
                  <button className="btn btn-ghost btn-sm" onClick={() => app.deleteExam(e.id)} aria-label={`Delete ${e.title}`}><Icon name="trash" size={15} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {past.length > 0 && (
        <>
          <div className="section-label">Past</div>
          <div className="stack">
            {past.slice(0, 5).map((e) => (
              <div key={e.id} className="card quiet row between" style={{ padding: 14, opacity: 0.65 }}>
                <span className="bold truncate" dir="auto">{e.title}</span>
                <span className="tiny faint">{fmtDateLong(e.dateKey)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {open && (
        <ExamSheet
          exam={app.exams.find((e) => e.id === editing) ?? null}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}

function ExamSheet({ exam, onClose }: { exam: import('../types').Exam | null; onClose: () => void }) {
  const app = useApp()
  const [title, setTitle] = useState(exam?.title ?? '')
  const [kind, setKind] = useState<ExamKind>(exam?.kind ?? 'exam')
  const [subjectId, setSubjectId] = useState(exam?.subjectId ?? app.subjects[0]?.id ?? '')
  const [dateKey, setDateKey] = useState(exam?.dateKey ?? todayKey())
  const [error, setError] = useState('')

  const save = () => {
    if (!title.trim()) return setError('Give it a title.')
    if (!dateKey) return setError('Choose a date.')
    const payload = { title: title.trim(), kind, subjectId: subjectId || null, dateKey, timeMin: null, notes: '' }
    if (exam) app.updateExam(exam.id, payload)
    else app.addExam(payload)
    onClose()
  }

  return (
    <Sheet title={exam ? 'Edit' : 'New exam or deadline'} onClose={onClose}>
      <div className="field">
        <label htmlFor="x-title">Title</label>
        <input id="x-title" className="input" dir="auto" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Mathematics Midterm" />
      </div>
      <div className="field">
        <span className="label" style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--text-soft)', marginBottom: 6 }}>Kind</span>
        <div className="seg" role="group" aria-label="Kind">
          {KINDS.map((k) => (
            <button key={k} type="button" className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>{LABEL[k]}</button>
          ))}
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="x-subject">Subject</label>
          <select id="x-subject" className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">General</option>
            {app.subjects.filter((s) => !s.archived).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="x-date">Date</label>
          <input id="x-date" className="input" type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
        </div>
      </div>
      {error && <p className="field-error">{error}</p>}
      <button className="btn btn-primary btn-block mt16" onClick={save}>Save</button>
      {exam && (
        <button className="btn btn-danger btn-block mt8" onClick={() => { app.deleteExam(exam.id); onClose() }}>Delete</button>
      )}
    </Sheet>
  )
}
