import { useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppContext, useApp } from '../lib/appStore'
import { fmtDateLong, greeting, fmtMin, minToTime, nowMinutes, todayKey } from '../lib/date'
import { findFreeSlots, nextSlotStart, fmtSlot, recommendNext, revisionsDueOn } from '../lib/engine'
import { levelFor } from '../lib/gamify'
import { ENERGY_LABELS, XP_DAILY_GOAL_BONUS } from '../types'
import type { Energy } from '../types'
import { Icon } from '../components/Icon'
import { Mascot } from '../components/Mascot'
import { Checkbox, Ring } from '../components/ui'

export interface FocusPreset {
  title: string
  subjectId: string | null
  minutes: number
  kind: 'study' | 'revision' | 'task' | 'exam-prep'
  taskId?: string
  revisionItemId?: string
  revisionOffset?: number
}

export function Home() {
  const app = useApp()
  const nav = useNavigate()
  const today = todayKey()
  const [recOpen, setRecOpen] = useState(false)

  const { profile, subjects, tasks, exams, revisions, events, sessions } = app

  const todayTasks = useMemo(
    () => tasks.filter((t) => t.dateKey === today || (t.done && t.doneAt?.slice(0, 10) === today)),
    [tasks, today],
  )
  const open = todayTasks.filter((t) => !t.done)
  const doneCount = todayTasks.length - open.length
  const pct = todayTasks.length ? Math.round((doneCount / todayTasks.length) * 100) : 0

  const rec = useMemo(() => recommendNext(subjects, exams, tasks, revisions, events, profile.energy), [subjects, exams, tasks, revisions, events, profile.energy])
  const slots = useMemo(() => findFreeSlots(events, tasks, today), [events, tasks, today])
  const slotStart = nextSlotStart(slots, nowMinutes())
  const dueRevs = revisionsDueOn(revisions, today)
  const lvl = levelFor(profile.xp)
  const studiedToday = sessions.filter((s) => s.dateKey === today).reduce((a, s) => a + s.minutes, 0)

  const startFocus = (preset: FocusPreset) => nav('/focus', { state: { preset } })

  return (
    <div>
      <div className="row between">
        <div>
          <h1 className="page-title">{greeting()}</h1>
          <p className="page-sub">{fmtDateLong(today)} · Let’s make today count.</p>
        </div>
        <Mascot kind={profile.mascot} size={72} mood={open.length === 0 && doneCount > 0 ? 'celebrating' : 'idle'} />
      </div>

      <div className="row wrap" style={{ gap: 8, marginBottom: 22 }}>
        <span className="chip rose"><Icon name="flame" size={14} /> {profile.streak} day streak</span>
        <span className="chip"><Icon name="sparkle" size={14} /> {profile.xp} XP · {lvl.name}</span>
        <span className="chip sage"><Icon name="droplet" size={14} /> {ENERGY_LABELS[profile.energy]}</span>
      </div>

      {/* Today's progress + energy check-in */}
      <div className="card row" style={{ gap: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Ring pct={pct} label={`${pct}%`} sub={`${doneCount} / ${todayTasks.length} done`} />
        <div className="grow" style={{ minWidth: 200 }}>
          <div className="section-label" style={{ marginTop: 0 }}>Energy check-in</div>
          <EnergyPicker />
          <p className="small muted mt8">
            Studied {fmtMin(studiedToday)} today{profile.dailyGoalMinutes > 0 && studiedToday >= profile.dailyGoalMinutes ? ` — daily goal reached! +${XP_DAILY_GOAL_BONUS} XP bonus` : ''}
          </p>
        </div>
      </div>

      {/* Next mission */}
      <div className="section-label">Next mission</div>
      {rec ? (
        <div className="card pad-lg" style={{ background: 'var(--accent-soft)', borderColor: 'transparent' }}>
          <div className="tiny bold faint" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {rec.kind === 'revision' ? 'Revision due' : rec.kind === 'exam-prep' ? 'Exam preparation' : rec.kind === 'task' ? 'Task' : 'Suggested study'}
          </div>
          <h2 style={{ fontSize: 26, margin: '6px 0 2px' }}>{subjectName(rec.subjectId, subjects) !== '' ? `${subjectName(rec.subjectId, subjects)} · ` : ''}{rec.title}</h2>
          <p className="muted" style={{ margin: '0 0 16px' }}>{fmtMin(rec.minutes)} · free around {fmtSlot(slotStart)}</p>
          <div className="row wrap" style={{ gap: 10 }}>
            <button className="btn btn-primary" onClick={() => startFocus(presetFromRec(rec))}>
              <Icon name="play" size={18} /> Start
            </button>
            <button className="btn btn-ghost" onClick={() => setRecOpen((v) => !v)} aria-expanded={recOpen}>
              Why this? <Icon name={recOpen ? 'chevron-left' : 'chevron-right'} size={16} />
            </button>
          </div>
          {recOpen && (
            <ul className="small muted mt16" style={{ margin: '14px 0 0', paddingLeft: 18 }}>
              {rec.reasons.map((r) => <li key={r}>{r}</li>)}
            </ul>
          )}
        </div>
      ) : (
        <div className="empty">
          <div className="big"><Icon name="sparkle" size={34} /></div>
          <h3>Add a subject to begin</h3>
          <p className="small">Once you have subjects and tasks, I’ll suggest what to study next.</p>
          <button className="btn btn-primary" onClick={() => nav('/subjects')}>Set up subjects</button>
        </div>
      )}

      {/* Smart recommendation */}
      <div className="section-label">Smart recommendation</div>
      <div className="card quiet row between wrap" style={{ gap: 12 }}>
        <div>
          <div className="bold">What should I study now?</div>
          <div className="small muted">
            {dueRevs.length > 0
              ? `${dueRevs.length} revision${dueRevs.length === 1 ? '' : 's'} due today · ${open.length} open task${open.length === 1 ? '' : 's'}`
              : `${open.length} open task${open.length === 1 ? '' : 's'} · next free slot ${fmtSlot(slotStart)}`}
          </div>
        </div>
        <button className="btn btn-soft" onClick={() => setRecOpen(true)}>
          <Icon name="sparkle" size={17} /> Ask
        </button>
      </div>
      {recOpen && rec && (
        <div className="card mt16" style={{ background: 'var(--lav-soft)', borderColor: 'transparent' }}>
          <p style={{ margin: '0 0 4px', fontSize: 17 }}>
            I’d go with <strong>{rec.kind === 'revision' ? 'a revision' : subjectName(rec.subjectId, subjects) || rec.title}</strong> — {rec.reasons[0]}.
          </p>
          <p className="small muted" style={{ margin: '0 0 14px' }}>
            {rec.reasons.slice(1).join(' · ')} · estimated session {fmtMin(rec.minutes)}
          </p>
          <button className="btn btn-primary" onClick={() => { startFocus(presetFromRec(rec)); setRecOpen(false) }}>
            Start session
          </button>
        </div>
      )}

      {/* Today's tasks */}
      <div className="section-label">Today’s tasks</div>
      <div className="card quiet">
        {todayTasks.length === 0 ? (
          <p className="muted center" style={{ margin: '8px 0' }}>Nothing planned yet — add a task or enjoy the calm.</p>
        ) : (
          [...open, ...todayTasks.filter((t) => t.done)].map((t) => (
            <div key={t.id} className={`task-row${t.done ? ' done' : ''}`}>
              <Checkbox done={t.done} label={`Mark ${t.name} ${t.done ? 'not done' : 'done'}`} onChange={(v) => app.completeTask(t.id, v)} />
              <span className="task-dot" style={{ background: subjectColor(t.subjectId) }} aria-hidden="true" />
              <div className="grow">
                <div className="name">{t.name}</div>
                <div className="tiny faint">
                  {t.timeMin !== null ? minToTime(t.timeMin) + ' · ' : ''}{fmtMin(t.durationMin)}{t.priority !== 'medium' ? ` · ${t.priority} priority` : ''}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Upcoming */}
      <UpcomingStrip onOpenSchedule={() => nav('/schedule')} />
    </div>
  )
}

function EnergyPicker() {
  const app = useApp()
  const options: Array<{ v: Energy; label: string }> = [
    { v: 'exhausted', label: 'Exhausted' },
    { v: 'low', label: 'Low' },
    { v: 'okay', label: 'Okay' },
    { v: 'focused', label: 'Focused' },
  ]
  return (
    <div className="seg" role="group" aria-label="How are you feeling today?">
      {options.map((o) => (
        <button key={o.v} className={app.profile.energy === o.v ? 'on' : ''} aria-pressed={app.profile.energy === o.v} onClick={() => app.setEnergy(o.v)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

function UpcomingStrip({ onOpenSchedule }: { onOpenSchedule: () => void }) {
  const app = useApp()
  const today = todayKey()
  const exams = app.exams
    .filter((e) => e.dateKey >= today)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(0, 2)
  if (!exams.length) return null
  return (
    <>
      <div className="section-label">Coming up</div>
      <button className="card quiet btn-block row between" style={{ textAlign: 'left', cursor: 'pointer' }} onClick={onOpenSchedule}>
        <div>
          {exams.map((e) => {
            const days = Math.round((new Date(e.dateKey + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 86400000)
            const s = app.subjects.find((x) => x.id === e.subjectId)
            return (
              <div key={e.id} className="mb8">
                <span className="bold">{s ? s.name + ' · ' : ''}{e.title}</span>
                <span className="muted small"> — {days === 0 ? 'today' : `in ${days} day${days === 1 ? '' : 's'}`}</span>
              </div>
            )
          })}
        </div>
        <Icon name="chevron-right" />
      </button>
    </>
  )
}

export function subjectName(id: string | null, subjects: Array<{ id: string; name: string }>): string {
  if (!id) return ''
  return subjects.find((s) => s.id === id)?.name ?? ''
}

export function subjectColor(id: string | null): string {
  const app = useContext(AppContext)
  if (!id) return 'var(--line-strong)'
  return app?.subjects.find((s) => s.id === id)?.color ?? 'var(--line-strong)'
}

export function presetFromRec(rec: NonNullable<ReturnType<typeof recommendNext>>): FocusPreset {
  return {
    title: rec.title,
    subjectId: rec.subjectId,
    minutes: rec.minutes,
    kind: rec.kind,
    taskId: rec.taskId,
    revisionItemId: rec.revisionItemId,
  }
}
