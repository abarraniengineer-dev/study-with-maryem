import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type {
  Exam,
  FocusSession,
  Profile,
  RevisionItem,
  ScheduleEvent,
  Settings,
  Subject,
  Task,
} from '../types'

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabase: SupabaseClient | null = URL && KEY ? createClient(URL, KEY) : null
export const usingSupabase = supabase !== null

// ---- Local storage fallback (offline + no-config mode) ----

export const LS = {
  profile: 'swm.profile',
  subjects: 'swm.subjects',
  tasks: 'swm.tasks',
  events: 'swm.events',
  sessions: 'swm.sessions',
  revisions: 'swm.revisions',
  exams: 'swm.exams',
  settings: 'swm.settings',
  garden: 'swm.garden',
  chat: 'swm.chat',
  onboarded: 'swm.onboarded',
} as const

export function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function lsSet(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable — keep app running
  }
}

export const DEFAULT_PROFILE: Profile = {
  name: 'Maryem',
  xp: 0,
  streak: 0,
  lastStudyDate: null,
  restDays: [],
  energy: 'okay',
  energyUpdatedAt: null,
  mascot: 'cat',
  mascotName: 'Bloom',
  weeklyGoalMinutes: 600,
  dailyGoalMinutes: 120,
  musicUrl: '',
  musicTitle: '',
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  notifications: false,
  bloomUseContext: true,
  reducedMotion: null,
}

export interface AllData {
  profile: Profile
  subjects: Subject[]
  tasks: Task[]
  events: ScheduleEvent[]
  sessions: FocusSession[]
  revisions: RevisionItem[]
  exams: Exam[]
  settings: Settings
}

export function loadLocal(): AllData {
  return {
    profile: { ...DEFAULT_PROFILE, ...lsGet<Partial<Profile>>(LS.profile, {}) },
    subjects: lsGet<Subject[]>(LS.subjects, []),
    tasks: lsGet<Task[]>(LS.tasks, []),
    events: lsGet<ScheduleEvent[]>(LS.events, []),
    sessions: lsGet<FocusSession[]>(LS.sessions, []),
    revisions: lsGet<RevisionItem[]>(LS.revisions, []),
    exams: lsGet<Exam[]>(LS.exams, []),
    settings: { ...DEFAULT_SETTINGS, ...lsGet<Partial<Settings>>(LS.settings, {}) },
  }
}

export function saveLocal(data: Partial<AllData>) {
  if (data.profile) lsSet(LS.profile, data.profile)
  if (data.subjects) lsSet(LS.subjects, data.subjects)
  if (data.tasks) lsSet(LS.tasks, data.tasks)
  if (data.events) lsSet(LS.events, data.events)
  if (data.sessions) lsSet(LS.sessions, data.sessions)
  if (data.revisions) lsSet(LS.revisions, data.revisions)
  if (data.exams) lsSet(LS.exams, data.exams)
  if (data.settings) lsSet(LS.settings, data.settings)
}

// ---- Supabase persistence (used when configured + authenticated) ----

const TABLES = {
  profile: 'profile',
  subjects: 'subjects',
  tasks: 'tasks',
  events: 'schedule_events',
  sessions: 'focus_sessions',
  revisions: 'revision_items',
  exams: 'exams',
  settings: 'user_settings',
} as const

type TableName = (typeof TABLES)[keyof typeof TABLES]

/** camelCase -> snake_case for one entity. */
export function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    out[k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())] = v
  }
  return out
}

/** snake_case row -> camelCase entity of type T. */
export function fromSnake<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (k === 'user_id') continue
    const camel = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
    out[camel] = v
  }
  return out as T
}

async function remoteGetAll(uid: string): Promise<Partial<AllData>> {
  if (!supabase) return {}
  const [profile, subjects, tasks, events, sessions, revisions, exams, settings] = await Promise.all([
    supabase.from(TABLES.profile).select('*').eq('user_id', uid).maybeSingle(),
    supabase.from(TABLES.subjects).select('*').eq('user_id', uid),
    supabase.from(TABLES.tasks).select('*').eq('user_id', uid),
    supabase.from(TABLES.events).select('*').eq('user_id', uid),
    supabase.from(TABLES.sessions).select('*').eq('user_id', uid),
    supabase.from(TABLES.revisions).select('*').eq('user_id', uid),
    supabase.from(TABLES.exams).select('*').eq('user_id', uid),
    supabase.from(TABLES.settings).select('*').eq('user_id', uid).maybeSingle(),
  ])
  const err = [profile, subjects, tasks, events, sessions, revisions, exams, settings].find((r) => r.error)?.error
  if (err) throw err
  const out: Partial<AllData> = {}
  if (profile.data) out.profile = { ...DEFAULT_PROFILE, ...fromSnake(profile.data as Record<string, unknown>) }
  if (subjects.data) out.subjects = (subjects.data as Record<string, unknown>[]).map((r) => fromSnake<Subject>(r))
  if (tasks.data) out.tasks = (tasks.data as Record<string, unknown>[]).map((r) => fromSnake<Task>(r))
  if (events.data) out.events = (events.data as Record<string, unknown>[]).map((r) => fromSnake<ScheduleEvent>(r))
  if (sessions.data) out.sessions = (sessions.data as Record<string, unknown>[]).map((r) => fromSnake<FocusSession>(r))
  if (revisions.data) out.revisions = (revisions.data as Record<string, unknown>[]).map((r) => fromSnake<RevisionItem>(r))
  if (exams.data) out.exams = (exams.data as Record<string, unknown>[]).map((r) => fromSnake<Exam>(r))
  if (settings.data) out.settings = { ...DEFAULT_SETTINGS, ...fromSnake(settings.data as Record<string, unknown>) }
  return out
}

async function remoteUpsert(table: TableName, uid: string, entity: Record<string, unknown>) {
  if (!supabase) return
  const row = { ...toSnake(entity), user_id: uid }
  const { error } = await supabase.from(table).upsert(row)
  if (error) throw error
}

async function remoteDelete(table: TableName, uid: string, id: string) {
  if (!supabase) return
  const { error } = await supabase.from(table).delete().eq('user_id', uid).eq('id', id)
  if (error) throw error
}

// ---- Public persistence API used by the app store ----

export interface PersistHooks {
  getAll: () => Promise<Partial<AllData>>
  upsert: (table: TableName, entity: Record<string, unknown>) => Promise<void>
  remove: (table: TableName, id: string) => Promise<void>
}

export async function createPersistHooks(): Promise<PersistHooks> {
  if (!supabase) {
    return {
      getAll: async () => ({}),
      upsert: async () => {},
      remove: async () => {},
    }
  }
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) {
    return { getAll: async () => ({}), upsert: async () => {}, remove: async () => {} }
  }
  return {
    getAll: () => remoteGetAll(uid),
    upsert: (table, entity) => remoteUpsert(table, uid, entity),
    remove: (table, id) => remoteDelete(table, uid, id),
  }
}
