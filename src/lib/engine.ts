import type {
  Energy,
  Exam,
  Recommendation,
  RevisionItem,
  ScheduleEvent,
  Subject,
  Task,
  WeeklyPlanSuggestion,
} from '../types'
import { addDaysKey, daysBetween, fmtMin, freeSlots, minToTime, nowMinutes, todayKey } from './date'

// ---- Smart planning engine (pure functions, no side effects) ----

const PRIORITY_WEIGHT: Record<number, number> = { 3: 1.6, 2: 1.0, 1: 0.55 }
const DIFFICULTY_WEIGHT: Record<string, number> = { difficult: 1.25, normal: 1.0, easy: 0.8 }
const STATUS_WEIGHT: Record<string, number> = { behind: 1.3, 'on-track': 1.0, strong: 0.8 }

export function revisionDueKey(item: RevisionItem, offset: number): string {
  return item.overrides[String(offset)] ?? addDaysKey(item.learnedAt, offset)
}

export function revisionsDueOn(items: RevisionItem[], key: string): Array<{ item: RevisionItem; offset: number }> {
  const due: Array<{ item: RevisionItem; offset: number }> = []
  for (const item of items) {
    for (const offset of item.offsets) {
      if (!item.completed[String(offset)] && revisionDueKey(item, offset) === key) {
        due.push({ item, offset })
      }
    }
  }
  return due
}

export function examUrgency(exam: Exam, today: string): number {
  const d = daysBetween(today, exam.dateKey)
  if (d < 0) return 0
  if (d === 0) return 2.5
  if (d <= 2) return 2.0
  if (d <= 5) return 1.5
  if (d <= 9) return 1.0
  return 0.5
}

export function subjectScore(
  s: Subject,
  exams: Exam[],
  dueRevisions: number,
  openTasks: number,
  today: string,
): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = PRIORITY_WEIGHT[s.priority] * DIFFICULTY_WEIGHT[s.difficulty] * STATUS_WEIGHT[s.status]
  if (s.priority === 3) reasons.push('★★★ priority')
  if (s.priority === 1) reasons.push('★ priority')
  if (s.difficulty === 'difficult') reasons.push('difficult subject')
  if (s.status === 'behind') reasons.push('you feel behind here')

  const bestExam = exams
    .filter((e) => e.subjectId === s.id && daysBetween(today, e.dateKey) >= 0)
    .sort((a, b) => daysBetween(today, a.dateKey) - daysBetween(today, b.dateKey))[0]
  if (bestExam) {
    const u = examUrgency(bestExam, today)
    score *= 1 + u * 0.45
    const d = daysBetween(today, bestExam.dateKey)
    reasons.push(d === 0 ? `${bestExam.kind} is today` : `${bestExam.kind} in ${d} day${d === 1 ? '' : 's'}`)
  }
  if (dueRevisions > 0) {
    score += 0.9 * dueRevisions
    reasons.push(`${dueRevisions} revision${dueRevisions === 1 ? '' : 's'} due`)
  }
  if (openTasks > 0) {
    score += Math.min(1.2, openTasks * 0.35)
    reasons.push(`${openTasks} open task${openTasks === 1 ? '' : 's'}`)
  }
  return { score: Math.max(score, 0.05), reasons }
}

/**
 * Suggest a weekly study allocation across subjects.
 * availableMinutes: realistic free time Maryem declared for the week.
 * studiedMinutes: per-subject minutes already studied this week (respected, not repeated).
 */
export function computeWeeklyAllocation(
  subjects: Subject[],
  exams: Exam[],
  tasks: Task[],
  revisions: RevisionItem[],
  availableMinutes: number,
  _studiedMinutes: Record<string, number>,
  today = todayKey(),
): WeeklyPlanSuggestion[] {
  const active = subjects.filter((s) => !s.archived)
  if (active.length === 0 || availableMinutes <= 0) return []

  const next7 = new Set(Array.from({ length: 7 }, (_, i) => addDaysKey(today, i)))

  const scored = active.map((s) => {
    const dueRevs = revisionsDueOn(
      revisions.filter((r) => r.subjectId === s.id),
      today,
    ).length
    const openTasks = tasks.filter((t) => !t.done && t.subjectId === s.id && next7.has(t.dateKey)).length
    const { score, reasons } = subjectScore(s, exams, dueRevs, openTasks, today)
    return { subject: s, score, reasons }
  })

  const totalScore = scored.reduce((a, b) => a + b.score, 0)
  return scored
    .map(({ subject, score, reasons }) => {
      const raw = (score / totalScore) * availableMinutes
      const minutes = Math.max(30, Math.round(raw / 15) * 15) // 15-minute granularity, min 30m
      return { subjectId: subject.id, minutes, reasons: reasons.slice(0, 3) }
    })
    .sort((a, b) => b.minutes - a.minutes)
}

// ---- Free time & recommendation ----

export function busyRangesForDay(
  events: ScheduleEvent[],
  key: string,
  tasks: Task[],
): Array<{ start: number; end: number }> {
  const busy: Array<{ start: number; end: number }> = []
  for (const e of events) {
    if (e.dateKey === key || eventOccursOn(e, key)) {
      busy.push({ start: e.startMin, end: e.startMin + e.durationMin })
    }
  }
  for (const t of tasks) {
    if (!t.done && t.dateKey === key && t.timeMin !== null) {
      busy.push({ start: t.timeMin, end: t.timeMin + t.durationMin })
    }
  }
  return busy
}

export function eventOccursOn(e: ScheduleEvent, key: string): boolean {
  if (e.dateKey === key) return true
  if (e.recurring === 'none') return false
  const diff = daysBetween(e.dateKey, key)
  if (diff <= 0) return false
  if (e.recurring === 'daily') return true
  if (e.recurring === 'weekdays') {
    const dow = new Date(key + 'T12:00:00').getDay()
    return dow >= 1 && dow <= 5
  }
  if (e.recurring === 'weekly') return diff % 7 === 0
  return false
}

export function findFreeSlots(
  events: ScheduleEvent[],
  tasks: Task[],
  key: string,
  dayStart = 420,
  dayEnd = 1380,
  minLen = 20,
): Array<{ startMin: number; endMin: number }> {
  return freeSlots(busyRangesForDay(events, key, tasks), dayStart, dayEnd, minLen)
}

const ENERGY_SESSION: Record<Energy, { max: number; preferred: number }> = {
  exhausted: { max: 20, preferred: 15 },
  low: { max: 30, preferred: 25 },
  okay: { max: 50, preferred: 35 },
  focused: { max: 75, preferred: 45 },
}

export function recommendNext(
  subjects: Subject[],
  exams: Exam[],
  tasks: Task[],
  revisions: RevisionItem[],
  events: ScheduleEvent[],
  energy: Energy,
  now = nowMinutes(),
  today = todayKey(),
): Recommendation | null {
  const active = subjects.filter((s) => !s.archived)
  const slots = findFreeSlots(events, tasks, today)
  const slot = slots.find((s) => s.startMin >= now - 10) ?? slots[slots.length - 1]
  const cap = slot ? Math.min(ENERGY_SESSION[energy].max, Math.max(10, slot.endMin - Math.max(slot.startMin, now))) : ENERGY_SESSION[energy].max
  const sessionLen = Math.min(ENERGY_SESSION[energy].preferred, cap)

  // 1. Overdue high-priority tasks
  const overdue = tasks
    .filter((t) => !t.done && daysBetween(t.dateKey, today) > 0)
    .sort((a, b) => (a.priority === 'high' ? -1 : 1) - (b.priority === 'high' ? -1 : 1))[0]
  if (overdue) {
    const s = subjects.find((x) => x.id === overdue.subjectId)
    return {
      title: overdue.name,
      subjectId: overdue.subjectId,
      minutes: Math.min(sessionLen, Math.max(10, overdue.durationMin)),
      kind: 'task',
      taskId: overdue.id,
      reasons: ['this task is overdue', s ? `${s.name}` : 'important to close it'],
    }
  }

  // 2. Revisions due today
  const due = revisionsDueOn(revisions, today)[0]
  if (due) {
    return {
      title: `Review: ${due.item.title}`,
      subjectId: due.item.subjectId,
      minutes: Math.min(20, Math.max(10, sessionLen)),
      kind: 'revision',
      revisionItemId: due.item.id,
      reasons: ['revision is due today', 'quick 10–20 min review locks it in'],
    }
  }

  // 3. Tasks due today (by priority)
  const todayTasks = tasks
    .filter((t) => !t.done && t.dateKey === today)
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))
  if (todayTasks.length > 0) {
    const t = todayTasks[0]
    const s = subjects.find((x) => x.id === t.subjectId)
    const reasons = [`due today`, `${t.priority} priority`]
    if (s && s.priority === 3) reasons.push(`${s.name} is ★★★`)
    return {
      title: t.name,
      subjectId: t.subjectId,
      minutes: Math.min(sessionLen, Math.max(10, t.durationMin)),
      kind: 'task',
      taskId: t.id,
      reasons,
    }
  }

  // 4. Exam prep for the most urgent subject
  const upcoming = exams
    .filter((e) => daysBetween(today, e.dateKey) >= 0)
    .sort((a, b) => daysBetween(today, a.dateKey) - daysBetween(today, b.dateKey))
  for (const exam of upcoming) {
    const subj = active.find((x) => x.id === exam.subjectId)
    if (!subj) continue
    const d = daysBetween(today, exam.dateKey)
    if (d <= 7) {
      return {
        title: `Prepare for ${exam.title}`,
        subjectId: subj.id,
        minutes: sessionLen,
        kind: 'exam-prep',
        examId: exam.id,
        reasons: [
          `${exam.kind} in ${d === 0 ? 'less than a day' : `${d} day${d === 1 ? '' : 's'}`}`,
          subj.priority === 3 ? '★★★ priority subject' : `${subj.name}`,
        ],
      }
    }
  }

  // 5. Fallback: highest-scored subject, energy-appropriate session
  if (active.length > 0) {
    const { score } = subjectScore(active[0], exams, 0, 0, today)
    void score
    let best = active[0]
    let bestScore = score
    for (const s of active.slice(1)) {
      const dueRevs = revisionsDueOn(revisions.filter((r) => r.subjectId === s.id), today).length
      const open = tasks.filter((t) => !t.done && t.subjectId === s.id).length
      const sc = subjectScore(s, exams, dueRevs, open, today).score
      if (sc > bestScore) {
        best = s
        bestScore = sc
      }
    }
    const { reasons } = subjectScore(best, exams, 0, 0, today)
    return {
      title: `Study ${best.name}`,
      subjectId: best.id,
      minutes: sessionLen,
      kind: 'study',
      reasons: reasons.length ? reasons : ['steady progress keeps the streak alive'],
    }
  }
  return null
}

function priorityRank(p: 'high' | 'medium' | 'low'): number {
  return p === 'high' ? 0 : p === 'medium' ? 1 : 2
}

// ---- Rebalancing after missed sessions ----

export interface RebalanceSuggestion {
  dateKey: string
  subjectId: string
  minutes: number
  reason: string
}

export function suggestRebalance(
  missedMinutes: number,
  subjects: Subject[],
  exams: Exam[],
  today = todayKey(),
): RebalanceSuggestion[] {
  if (missedMinutes <= 0) return []
  const ranked = subjects
    .filter((s) => !s.archived)
    .map((s) => {
      const nextExam = exams
        .filter((e) => e.subjectId === s.id && daysBetween(today, e.dateKey) >= 0)
        .sort((a, b) => daysBetween(today, a.dateKey) - daysBetween(today, b.dateKey))[0]
      return { s, score: subjectScore(s, nextExam ? [nextExam] : [], 0, 0, today).score }
    })
    .sort((a, b) => b.score - a.score)
  if (ranked.length === 0) return []
  const top = ranked[0]
  const chunk = Math.min(30, missedMinutes)
  const rest = missedMinutes - chunk
  const out: RebalanceSuggestion[] = []
  const tomorrow = addDaysKey(today, 1)
  const dayAfter = addDaysKey(today, 2)
  out.push({ dateKey: tomorrow, subjectId: top.s.id, minutes: chunk, reason: `catch up ${fmtMin(chunk)} of ${top.s.name} tomorrow` })
  if (rest > 0) {
    out.push({ dateKey: dayAfter, subjectId: top.s.id, minutes: Math.min(30, rest), reason: `and ${fmtMin(Math.min(30, rest))} the day after — small steps add up` })
  }
  return out
}

// ---- "I only have X minutes" ----

export function quickRecommendation(
  minutes: number,
  subjects: Subject[],
  exams: Exam[],
  tasks: Task[],
  revisions: RevisionItem[],
  energy: Energy,
  today = todayKey(),
): Recommendation | null {
  const capped = Math.max(5, Math.min(minutes, ENERGY_SESSION[energy].max * (energy === 'focused' ? 1.5 : 1.3)))
  const dueRev = revisionsDueOn(revisions, today)[0]
  if (dueRev && 10 <= capped) {
    return {
      title: `Review: ${dueRev.item.title}`,
      subjectId: dueRev.item.subjectId,
      minutes: Math.min(20, Math.round(capped)),
      kind: 'revision',
      revisionItemId: dueRev.item.id,
      reasons: ['fits your time', 'revision is due today'],
    }
  }
  const fitting = tasks
    .filter((t) => !t.done && t.durationMin <= capped + 5)
    .sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority))[0]
  if (fitting) {
    return {
      title: fitting.name,
      subjectId: fitting.subjectId,
      minutes: Math.min(fitting.durationMin, Math.round(capped)),
      kind: 'task',
      taskId: fitting.id,
      reasons: ['fits your available time', `${fitting.priority} priority`],
    }
  }
  const active = subjects.filter((s) => !s.archived)
  if (active.length === 0) return null
  const best = active
    .map((s) => ({ s, sc: subjectScore(s, exams.filter((e) => e.subjectId === s.id), 0, 0, today).score }))
    .sort((a, b) => b.sc - a.sc)[0].s
  return {
    title: `Study ${best.name}`,
    subjectId: best.id,
    minutes: Math.round(capped),
    kind: 'study',
    reasons: [`${fmtMin(Math.round(capped))} is perfect for one focused block`, `${best.name} needs it most right now`],
  }
}

export function nextSlotStart(slots: Array<{ startMin: number; endMin: number }>, now = nowMinutes()): number | null {
  for (const s of slots) {
    if (s.endMin > now) return Math.max(s.startMin, now)
  }
  return null
}

export function fmtSlot(startMin: number | null): string {
  return startMin === null ? 'later today' : minToTime(startMin)
}
