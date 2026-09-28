// Bloom AI client. Talks to a serverless endpoint (Netlify function) that holds
// the AI key. If the endpoint is not configured, Bloom falls back to a local
// planner-based answer so the feature degrades gracefully, never faked as AI.
import type { ChatMessage, Energy, Exam, RevisionItem, ScheduleEvent, Subject, Task } from '../types'
import { revisionsDueOn, findFreeSlots, fmtSlot, nextSlotStart } from './engine'
import { fmtMin, todayKey, nowMinutes } from './date'

export interface BloomContext {
  subjects: Subject[]
  tasks: Task[]
  exams: Exam[]
  revisions: RevisionItem[]
  events: ScheduleEvent[]
  energy: Energy
}

export function buildContextSummary(ctx: BloomContext): string {
  const today = todayKey()
  const now = nowMinutes()
  const lines: string[] = []
  const active = ctx.subjects.filter((s) => !s.archived)

  const due = revisionsDueOn(ctx.revisions, today)
  if (due.length) lines.push(`Revisions due today: ${due.map((d) => d.item.title).join(', ')}`)

  const todayTasks = ctx.tasks.filter((t) => !t.done && t.dateKey === today)
  if (todayTasks.length) {
    lines.push(`Tasks due today: ${todayTasks.map((t) => `${t.name} (${t.priority})`).join('; ')}`)
  }
  const overdue = ctx.tasks.filter((t) => !t.done && t.dateKey < today)
  if (overdue.length) lines.push(`Overdue tasks: ${overdue.length}`)

  const upcomingExams = ctx.exams
    .filter((e) => e.dateKey >= today)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .slice(0, 3)
  for (const e of upcomingExams) {
    const s = ctx.subjects.find((x) => x.id === e.subjectId)
    const days = Math.round((new Date(e.dateKey + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 86400000)
    lines.push(`Upcoming ${e.kind}: ${e.title}${s ? ` (${s.name})` : ''} in ${days} day(s)`)
  }

  const slots = findFreeSlots(ctx.events, ctx.tasks, today)
  const next = nextSlotStart(slots, now)
  if (slots.length) lines.push(`Free today: ${fmtMin(slots.reduce((a, s) => a + (s.endMin - s.startMin), 0))} total; next usable slot around ${fmtSlot(next)}`)

  lines.push(`Energy: ${ctx.energy}`)
  if (active.length) {
    lines.push(`Subjects: ${active.map((s) => `${s.name} (priority ${'★'.repeat(s.priority)}, ${s.difficulty}${s.status === 'behind' ? ', behind' : ''})`).join('; ')}`)
  }
  return lines.join('\n')
}

export async function askBloom(
  question: string,
  ctx: BloomContext | null,
  history: ChatMessage[],
  endpoint: string | undefined,
): Promise<string> {
  const contextBlock = ctx ? buildContextSummary(ctx) : ''

  if (endpoint) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question,
        context: contextBlock || undefined,
        history: history.slice(-8).map((m) => ({ role: m.role === 'bloom' ? 'assistant' : 'user', content: m.content })),
      }),
    })
    if (!res.ok) throw new Error(`Bloom service error (${res.status})`)
    const data = (await res.json()) as { reply?: string }
    if (!data.reply) throw new Error('Bloom service returned no reply')
    return data.reply
  }

  // No endpoint configured: honest local fallback powered by the planning engine.
  return localBloom(question, ctx)
}

function localBloom(question: string, ctx: BloomContext | null): string {
  const q = question.toLowerCase()
  if (!ctx) return "I'm running without your study data right now, so I can't see your plan — but I'm still here. Tell me what you're working on and I'll help you think it through."
  const today = todayKey()
  const subjects = ctx.subjects.filter((s) => !s.archived)

  if (/what should i study|study now|study tonight|tonight|what next/.test(q)) {
    const slots = findFreeSlots(ctx.events, ctx.tasks, today)
    const start = nextSlotStart(slots, nowMinutes())
    const due = revisionsDueOn(ctx.revisions, today)
    if (due.length) {
      return `You have a revision due today: “${due[0].item.title}”. A 10–20 minute review around ${fmtSlot(start)} would be a great start. After that, ${examLine(ctx) ?? subjectLine(subjects)}.`
    }
    return `I’d suggest ${examLine(ctx) ?? (subjects[0] ? subjects[0].name : 'a short session')}. You have free time around ${fmtSlot(start)}. Keep the session short and kind — ${fmtMin(30)} is plenty.`
  }
  if (/tired|exhausted/.test(q)) {
    return 'Rest counts as showing up for yourself. If you have a little energy, do one 10-minute revision of your oldest topic — that’s it. Your streak is safe.'
  }
  if (/due tomorrow|tomorrow/.test(q)) {
    const tmr = ctx.tasks.filter((t) => !t.done && t.dateKey === addOneDay(today))
    if (!tmr.length) return 'Nothing is scheduled for tomorrow yet — a calm evening. Want to add a small task or a revision?'
    return `Tomorrow: ${tmr.map((t) => t.name).join(', ')}. ${examLine(ctx) ? 'Also, ' + examLine(ctx) : ''}`
  }
  return "I can explain concepts, help you plan sessions, or organize your tasks. Try asking “What should I study tonight?” or tell me what you're working on and I'll help you break it down."
}

function examLine(ctx: BloomContext): string | null {
  const today = todayKey()
  const e = ctx.exams
    .filter((e) => e.dateKey >= today)
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))[0]
  if (!e) return null
  const days = Math.round((new Date(e.dateKey + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 86400000)
  const s = ctx.subjects.find((x) => x.id === e.subjectId)
  return `${s ? s.name : 'your subject'} would be smart — your ${e.kind} “${e.title}” is in ${days} day(s)`
}

function subjectLine(subjects: Subject[]): string {
  if (!subjects.length) return 'any subject you like'
  const top = [...subjects].sort((a, b) => b.priority - a.priority)[0]
  return `${top.name} — it’s ${'★'.repeat(top.priority)} priority`
}

function addOneDay(key: string): string {
  const d = new Date(key + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export const BLOOM_SUGGESTIONS = [
  'What should I study tonight?',
  'I only have 30 minutes.',
  'What is due tomorrow?',
  "I'm tired today.",
  'Help me organize my tasks.',
]
