import { useMemo, useState } from 'react'
import { useApp } from '../lib/appStore'
import { addDaysKey, fmtMin, minToTime, timeToMin, todayKey } from '../lib/date'
import { subjectName } from './Home'
import { Icon } from '../components/Icon'
import { Checkbox, Empty, Sheet } from '../components/ui'
import type { Recurrence, Task, TaskPriority } from '../types'

type Tab = 'today' | 'upcoming' | 'important'

export function Tasks() {
  const app = useApp()
  const today = todayKey()
  const [tab, setTab] = useState<Tab>('today')
  const [quick, setQuick] = useState('')
  const [editing, setEditing] = useState<Task | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const sections = useMemo(() => {
    const open = app.tasks.filter((t) => !t.done)
    return {
      today: open.filter((t) => t.dateKey <= today),
      upcoming: open.filter((t) => t.dateKey > today),
      important: open.filter((t) => t.priority === 'high'),
    }
  }, [app.tasks, today])

  const doneToday = app.tasks.filter((t) => t.done && t.doneAt?.slice(0, 10) === today)

  const quickAdd = () => {
    const name = quick.trim()
    if (!name) return
    app.addTask({ name, subjectId: app.subjects[0]?.id ?? null, dateKey: today, timeMin: null, durationMin: 30, priority: 'medium', reminder: false, recurrence: 'none', notes: '' })
    setQuick('')
  }

  return (
    <div>
      <h1 className="page-title">Tasks</h1>
      <p className="page-sub">One thing at a time, {app.profile.name}.</p>

      <div className="seg" role="tablist" aria-label="Task sections">
        {(['today', 'upcoming', 'important'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)} role="tab" aria-selected={tab === t}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="card quiet mt16">
        {sections[tab].length === 0 && tab !== 'upcoming' ? (
          <Empty icon="check" title={tab === 'today' ? 'Today is clear' : 'No important tasks'} note="Add one below — small steps count." />
        ) : sections[tab].length === 0 ? (
          <Empty icon="calendar" title="Nothing upcoming" note="Your future self says thanks." />
        ) : (
          sections[tab].map((t) => <TaskRow key={t.id} task={t} onEdit={() => { setEditing(t); setSheetOpen(true) }} />)
        )}
      </div>

      {doneToday.length > 0 && (
        <div className="mt24">
          <div className="section-label">Completed today ({doneToday.length})</div>
          <div className="card quiet">
            {doneToday.map((t) => (
              <div key={t.id} className="task-row done">
                <Checkbox done onChange={() => app.completeTask(t.id, false)} label={`Uncomplete ${t.name}`} />
                <span className="task-dot" style={{ background: colorOf(t.subjectId, app.subjects) }} aria-hidden="true" />
                <div className="grow name">{t.name}</div>
                <span className="tiny faint">+10 XP</span>
              </div
              >
            ))}
          </div>
        </div>
      )}

      {/* Quick add */}
      <div className="mt24">
        <div className="section-label">Quick add</div>
        <div className="row" style={{ gap: 10 }}>
          <input
            className="input grow"
            placeholder="e.g. Math exercises p.42"
            value={quick}
            onChange={(e) => setQuick(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && quickAdd()}
            aria-label="New task name"
          />
          <button className="btn btn-primary" onClick={quickAdd} disabled={!quick.trim()} aria-label="Add task">
            <Icon name="plus" size={18} /> Add
          </button>
        </div>
        <button className="link-btn" style={{ marginTop: 10 }} onClick={() => { setEditing(null); setSheetOpen(true) }}>
          More options…
        </button>
      </div>

      {sheetOpen && (
        <TaskSheet
          task={editing}
          onClose={() => { setSheetOpen(false); setEditing(null) }}
        />
      )}
    </div>
  )
}

function colorOf(id: string | null, subjects: Array<{ id: string; color: string }>): string {
  if (!id) return 'var(--line-strong)'
  return subjects.find((s) => s.id === id)?.color ?? 'var(--line-strong)'
}

function TaskRow({ task, onEdit }: { task: Task; onEdit: () => void }) {
  const app = useApp()
  const today = todayKey()
  const overdue = task.dateKey < today
  return (
    <div className="task-row">
      <Checkbox done={task.done} onChange={() => app.completeTask(task.id, true)} label={`Mark ${task.name} done`} />
      <span className="task-dot" style={{ background: colorOf(task.subjectId, app.subjects) }} aria-hidden="true" />
      <div className="grow">
        <div className="name">{task.name}</div>
        <div className="tiny faint">
          {subjectName(task.subjectId, app.subjects) || 'General'} · {fmtMin(task.durationMin)}
          {task.timeMin !== null ? ` · ${minToTime(task.timeMin)}` : ''}
          {overdue ? ' · overdue' : ''}
        </div>
      </div>
      {task.priority === 'high' && <span className="chip rose">High</span>}
      <button className="btn btn-ghost btn-sm" onClick={onEdit} aria-label={`Edit ${task.name}`}>
        <Icon name="edit" size={16} />
      </button>
      <button className="btn btn-ghost btn-sm" onClick={() => app.deleteTask(task.id)} aria-label={`Delete ${task.name}`}>
        <Icon name="trash" size={16} />
      </button>
    </div>
  )
}

function TaskSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const app = useApp()
  const [name, setName] = useState(task?.name ?? '')
  const [subjectId, setSubjectId] = useState<string>(task?.subjectId ?? app.subjects[0]?.id ?? '')
  const [dateKey, setDateKey] = useState(task?.dateKey ?? todayKey())
  const [time, setTime] = useState(task?.timeMin !== null && task !== null ? minToTime(task.timeMin) : '')
  const [duration, setDuration] = useState(task?.durationMin ?? 30)
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'medium')
  const [recurrence, setRecurrence] = useState<Recurrence>(task?.recurrence ?? 'none')
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [error, setError] = useState('')
  const [advanced, setAdvanced] = useState(false)

  const save = () => {
    if (!name.trim()) return setError('Give the task a name.')
    if (duration < 5 || duration > 300) return setError('Duration must be 5–300 minutes.')
    const timeMin = time ? timeToMin(time) : null
    if (task) {
      app.updateTask(task.id, { name: name.trim(), subjectId: subjectId || null, dateKey, timeMin, durationMin: duration, priority, recurrence, notes })
    } else {
      app.addTask({ name: name.trim(), subjectId: subjectId || null, dateKey, timeMin, durationMin: duration, priority, reminder: false, recurrence, notes })
    }
    onClose()
  }

  return (
    <Sheet title={task ? 'Edit task' : 'New task'} onClose={onClose}>
      <div className="field">
        <label htmlFor="t-name">Task</label>
        <input id="t-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="What needs doing?" />
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="t-subject">Subject</label>
          <select id="t-subject" className="select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">General</option>
            {app.subjects.filter((s) => !s.archived).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="t-date">Date</label>
          <input id="t-date" className="input" type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="t-time">Start time (optional)</label>
          <input id="t-time" className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="t-dur">Duration (min)</label>
          <input id="t-dur" className="input" type="number" min={5} max={300} step={5} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
        </div>
      </div>
      <div className="field">
        <span className="label" style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--text-soft)', marginBottom: 6 }}>Priority</span>
        <div className="seg" role="group" aria-label="Priority">
          {(['low', 'medium', 'high'] as TaskPriority[]).map((p) => (
            <button key={p} type="button" className={priority === p ? 'on' : ''} onClick={() => setPriority(p)}>{p[0].toUpperCase() + p.slice(1)}</button>
          ))}
        </div>
      </div>

      <button className="link-btn" onClick={() => setAdvanced((v) => !v)} aria-expanded={advanced}>
        {advanced ? 'Hide advanced options' : 'Advanced options'}
      </button>
      {advanced && (
        <div className="mt16">
          <div className="field">
            <label htmlFor="t-rec">Repeat</label>
            <select id="t-rec" className="select" value={recurrence} onChange={(e) => setRecurrence(e.target.value as Recurrence)}>
              <option value="none">No repeat</option>
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="t-notes">Notes</label>
            <textarea id="t-notes" className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to remember…" />
          </div>
        </div>
      )}

      {error && <p className="field-error">{error}</p>}
      <div className="row mt16" style={{ gap: 10 }}>
        <button className="btn btn-primary grow" onClick={save}>Save task</button>
        {task && (
          <>
            <button className="btn btn-ghost" onClick={() => { app.updateTask(task.id, { dateKey: addDaysKey(todayKey(), 1) }); onClose() }}>Snooze</button>
            <button
              className="btn btn-danger"
              onClick={() => { app.deleteTask(task.id); onClose() }}
              aria-label="Delete task"
            >
              <Icon name="trash" size={17} />
            </button>
          </>
        )}
      </div>
    </Sheet>
  )
}
