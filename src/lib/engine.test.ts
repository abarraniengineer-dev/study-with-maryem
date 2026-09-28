import { describe, expect, it } from 'vitest'
import {
  computeWeeklyAllocation,
  eventOccursOn,
  findFreeSlots,
  quickRecommendation,
  recommendNext,
  revisionsDueOn,
  revisionDueKey,
  suggestRebalance,
  examUrgency,
} from './engine'
import type { Exam, RevisionItem, ScheduleEvent, Subject, Task } from '../types'

const T = '2026-09-28' // a Monday

function subject(partial: Partial<Subject> = {}): Subject {
  return { id: 's1', name: 'Math', color: '#c98a94', priority: 2, difficulty: 'normal', status: 'on-track', archived: false, notes: '', ...partial }
}
function task(partial: Partial<Task> = {}): Task {
  return { id: 't1', name: 'Worksheet', subjectId: 's1', dateKey: T, timeMin: null, durationMin: 30, priority: 'medium', reminder: false, recurrence: 'none', notes: '', done: false, doneAt: null, ...partial }
}
function exam(partial: Partial<Exam> = {}): Exam {
  return { id: 'e1', subjectId: 's1', title: 'Midterm', kind: 'exam', dateKey: '2026-10-04', timeMin: null, notes: '', ...partial }
}
function revision(partial: Partial<RevisionItem> = {}): RevisionItem {
  return { id: 'r1', subjectId: 's1', title: 'Quadratics', learnedAt: '2026-09-27', offsets: [1, 3, 7, 14, 30], completed: {}, overrides: {}, ...partial }
}

describe('revisionDueKey / revisionsDueOn', () => {
  it('computes spaced dates from learnedAt', () => {
    const r = revision()
    expect(revisionDueKey(r, 1)).toBe('2026-09-28')
    expect(revisionDueKey(r, 3)).toBe('2026-09-30')
    expect(revisionDueKey(r, 30)).toBe('2026-10-27')
  })
  it('honors overrides and completed marks', () => {
    const r = revision({ overrides: { '1': '2026-10-02' } })
    expect(revisionDueKey(r, 1)).toBe('2026-10-02')
    const done = revision({ completed: { '1': '2026-09-28' } })
    expect(revisionsDueOn([done], T)).toHaveLength(0)
  })
  it('detects due today', () => {
    expect(revisionsDueOn([revision()], T)).toHaveLength(1)
  })
})

describe('examUrgency', () => {
  it('grows as the exam approaches', () => {
    expect(examUrgency(exam({ dateKey: T }), T)).toBeGreaterThan(examUrgency(exam({ dateKey: '2026-11-15' }), T))
    expect(examUrgency(exam({ dateKey: '2026-01-01' }), T)).toBe(0)
  })
})

describe('findFreeSlots', () => {
  it('finds gaps between events', () => {
    const events: ScheduleEvent[] = [
      { id: 'a', name: 'School', subjectId: null, dateKey: T, startMin: 480, durationMin: 300, type: 'school', recurring: 'none', reminder: false },
      { id: 'b', name: 'Lunch', subjectId: null, dateKey: T, startMin: 810, durationMin: 45, type: 'break', recurring: 'none', reminder: false },
    ]
    const slots = findFreeSlots(events, [], T)
    expect(slots[0]).toEqual({ startMin: 420, endMin: 480 })
    expect(slots.some((s) => s.startMin === 780 && s.endMin === 810)).toBe(true)
    expect(slots[slots.length - 1].endMin).toBe(1380)
  })
  it('excludes scheduled task times', () => {
    const slots = findFreeSlots([], [task({ timeMin: 600, durationMin: 60 })], T)
    expect(slots.some((s) => s.startMin < 600 && s.endMin > 600)).toBe(false)
  })
  it('never returns overlapping events twice', () => {
    const events: ScheduleEvent[] = [
      { id: 'a', name: 'A', subjectId: null, dateKey: T, startMin: 500, durationMin: 100, type: 'study', recurring: 'none', reminder: false },
      { id: 'b', name: 'B', subjectId: null, dateKey: T, startMin: 550, durationMin: 100, type: 'study', recurring: 'none', reminder: false },
    ]
    const slots = findFreeSlots(events, [], T)
    // busy block spans 500–650; no free slot may intersect it
    for (const s of slots) {
      expect(s.endMin <= 500 || s.startMin >= 650).toBe(true)
    }
  })
})

describe('eventOccursOn', () => {
  const daily: ScheduleEvent = { id: 'd', name: 'D', subjectId: null, dateKey: '2026-09-28', startMin: 600, durationMin: 30, type: 'study', recurring: 'daily', reminder: false }
  it('matches recurring events', () => {
    expect(eventOccursOn(daily, '2026-09-29')).toBe(true)
    expect(eventOccursOn({ ...daily, recurring: 'none' }, '2026-09-29')).toBe(false)
    expect(eventOccursOn({ ...daily, recurring: 'weekly' }, '2026-10-05')).toBe(true)
    expect(eventOccursOn({ ...daily, recurring: 'weekly' }, '2026-10-06')).toBe(false)
  })
})

describe('computeWeeklyAllocation', () => {
  it('gives high-priority subjects more time', () => {
    const subjects = [subject({ id: 'a', priority: 3, name: 'Math' }), subject({ id: 'b', priority: 1, name: 'Art' })]
    const plan = computeWeeklyAllocation(subjects, [], [], [], 600, {}, T)
    const math = plan.find((p) => p.subjectId === 'a')!
    const art = plan.find((p) => p.subjectId === 'b')!
    expect(math.minutes).toBeGreaterThan(art.minutes)
    expect(plan.reduce((a, p) => a + p.minutes, 0)).toBeLessThanOrEqual(700)
  })
  it('boosts subjects with imminent exams', () => {
    const subjects = [subject({ id: 'a', priority: 1 }), subject({ id: 'b', priority: 1 })]
    const exams = [exam({ subjectId: 'b', dateKey: '2026-09-29' })]
    const plan = computeWeeklyAllocation(subjects, exams, [], [], 600, {}, T)
    expect(plan.find((p) => p.subjectId === 'b')!.minutes).toBeGreaterThan(plan.find((p) => p.subjectId === 'a')!.minutes)
  })
  it('returns nothing without subjects or time', () => {
    expect(computeWeeklyAllocation([], [], [], [], 600, {}, T)).toHaveLength(0)
    expect(computeWeeklyAllocation([subject()], [], [], [], 0, {}, T)).toHaveLength(0)
  })
})

describe('recommendNext', () => {
  it('prefers overdue tasks first', () => {
    const rec = recommendNext([subject()], [], [task({ dateKey: '2026-09-26' })], [], [], 'okay', 900, T)
    expect(rec?.kind).toBe('task')
    expect(rec?.reasons[0]).toContain('overdue')
  })
  it('suggests revision due today', () => {
    const rec = recommendNext([subject()], [], [], [revision()], [], 'okay', 900, T)
    expect(rec?.kind).toBe('revision')
  })
  it('suggests exam prep within a week', () => {
    const rec = recommendNext([subject()], [exam({ dateKey: '2026-10-02' })], [], [], [], 'focused', 900, T)
    expect(rec?.kind).toBe('exam-prep')
  })
  it('caps session length for exhausted energy', () => {
    const rec = recommendNext([subject()], [], [], [], [], 'exhausted', 900, T)
    expect(rec?.minutes ?? 0).toBeLessThanOrEqual(20)
  })
  it('falls back to studying the top subject', () => {
    const rec = recommendNext([subject()], [], [], [], [], 'okay', 900, T)
    expect(rec?.kind).toBe('study')
  })
})

describe('quickRecommendation', () => {
  it('fits the available minutes', () => {
    const rec = quickRecommendation(30, [subject()], [], [task({ durationMin: 90 })], [], 'okay', T)
    expect(rec).not.toBeNull()
    expect(rec!.minutes).toBeLessThanOrEqual(39)
  })
  it('picks a fitting task when one exists', () => {
    const rec = quickRecommendation(30, [subject()], [], [task({ durationMin: 25, priority: 'high' })], [], 'okay', T)
    expect(rec?.kind).toBe('task')
  })
})

describe('suggestRebalance', () => {
  it('splits catch-up into small chunks', () => {
    const out = suggestRebalance(75, [subject()], [], T)
    expect(out.length).toBe(2)
    expect(out[0].minutes).toBe(30)
    expect(out[0].dateKey).toBe('2026-09-29')
    expect(out[1].minutes).toBeLessThanOrEqual(30)
  })
  it('returns nothing for zero missed time', () => {
    expect(suggestRebalance(0, [subject()], [], T)).toHaveLength(0)
  })
})
