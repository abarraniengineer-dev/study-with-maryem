// ---- Core domain types for Study With Maryem ----

export type Energy = 'exhausted' | 'low' | 'okay' | 'focused'
export type Priority1to3 = 1 | 2 | 3
export type Difficulty = 'easy' | 'normal' | 'difficult'
export type ProgressStatus = 'behind' | 'on-track' | 'strong'
export type TaskPriority = 'high' | 'medium' | 'low'
export type Recurrence = 'none' | 'daily' | 'weekdays' | 'weekly'
export type EventType = 'school' | 'study' | 'break' | 'free' | 'assignment' | 'other'
export type ExamKind = 'exam' | 'assignment' | 'project' | 'deadline'
export type MascotKind = 'panda' | 'bunny' | 'cat' | 'flower'
export type ThemeMode = 'light' | 'dark' | 'system'

export interface Subject {
  id: string
  name: string
  color: string
  priority: Priority1to3
  difficulty: Difficulty
  status: ProgressStatus
  archived: boolean
  notes: string
}

export interface Task {
  id: string
  name: string
  subjectId: string | null
  dateKey: string
  timeMin: number | null // minutes from midnight, optional
  durationMin: number
  priority: TaskPriority
  reminder: boolean
  recurrence: Recurrence
  notes: string
  done: boolean
  doneAt: string | null
}

export interface ScheduleEvent {
  id: string
  name: string
  subjectId: string | null
  dateKey: string
  startMin: number // minutes from midnight
  durationMin: number
  type: EventType
  recurring: Recurrence
  reminder: boolean
}

export interface FocusSession {
  id: string
  subjectId: string | null
  taskId: string | null
  revisionItemId: string | null
  dateKey: string
  startMin: number
  minutes: number
  kind: 'study' | 'revision' | 'task' | 'exam-prep'
  label: string
}

export interface RevisionItem {
  id: string
  subjectId: string | null
  title: string
  learnedAt: string // dateKey
  /** Scheduled review offsets in days from learnedAt; default 1,3,7,14,30 */
  offsets: number[]
  /** dateKeys of completed reviews (offset -> dateKey actually done) */
  completed: Record<string, string>
  /** Manual overrides of scheduled dateKeys, keyed by offset */
  overrides: Record<string, string>
}

export interface Exam {
  id: string
  subjectId: string | null
  title: string
  kind: ExamKind
  dateKey: string
  timeMin: number | null
  notes: string
}

export interface Profile {
  name: string
  xp: number
  streak: number
  lastStudyDate: string | null
  restDays: string[] // dateKeys protected as rest days
  energy: Energy
  energyUpdatedAt: string | null
  mascot: MascotKind
  mascotName: string
  weeklyGoalMinutes: number
  dailyGoalMinutes: number
  musicUrl: string
  musicTitle: string
}

export interface GardenState {
  points: number
  unlocked: string[] // item ids
}

export interface WeeklyPlanSuggestion {
  subjectId: string
  minutes: number
  reasons: string[]
}

export interface Recommendation {
  title: string
  subjectId: string | null
  minutes: number
  kind: 'revision' | 'exam-prep' | 'task' | 'study'
  reasons: string[]
  taskId?: string
  revisionItemId?: string
  examId?: string
}

export interface FreeSlot {
  startMin: number
  endMin: number
}

export interface Settings {
  theme: ThemeMode
  notifications: boolean
  bloomUseContext: boolean
  reducedMotion: boolean | null // null = follow system
}

export interface ChatMessage {
  id: string
  role: 'user' | 'bloom'
  content: string
  createdAt: string
  pending?: boolean
  error?: boolean
}

// XP awards
export const XP_TASK = 10
export const XP_REVISION = 5
export const XP_STUDY_PER_MIN = 1
export const XP_DAILY_GOAL_BONUS = 20

export const REVISION_OFFSETS = [1, 3, 7, 14, 30] as const

export const LEVELS = [
  { name: 'Beginner', minXp: 0 },
  { name: 'Learner', minXp: 150 },
  { name: 'Scholar', minXp: 500 },
  { name: 'Study Master', minXp: 1200 },
  { name: 'Knowledge Master', minXp: 2500 },
] as const

export const ENERGY_LABELS: Record<Energy, string> = {
  exhausted: 'Exhausted',
  low: 'Low Energy',
  okay: 'Okay',
  focused: 'Focused',
}
