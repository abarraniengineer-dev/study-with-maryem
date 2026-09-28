// ---- Global app store: state + actions ----

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { todayKey } from './date'
import type { ReactNode } from 'react'
import type {
  ChatMessage,
  Exam,
  FocusSession,
  Profile,
  RevisionItem,
  ScheduleEvent,
  Settings,
  Subject,
  Task,
} from '../types'
import { lsGet, lsSet, loadLocal, saveLocal } from './persist'
import { XP_REVISION, XP_TASK } from '../types'

export interface GardenLocal {
  points: number
  unlocked: string[]
}

export interface AppStore {
  profile: Profile
  subjects: Subject[]
  tasks: Task[]
  events: ScheduleEvent[]
  sessions: FocusSession[]
  revisions: RevisionItem[]
  exams: Exam[]
  settings: Settings
  garden: GardenLocal
  chat: ChatMessage[]
  onboarded: boolean

  updateProfile: (patch: Partial<Profile>) => void
  setEnergy: (energy: Profile['energy']) => void
  setSettings: (patch: Partial<Settings>) => void
  setOnboarded: (v: boolean) => void

  addSubject: (s: Omit<Subject, 'id'>) => Subject
  updateSubject: (id: string, patch: Partial<Subject>) => void
  deleteSubject: (id: string) => void

  addTask: (t: Omit<Task, 'id' | 'done' | 'doneAt'>) => Task
  updateTask: (id: string, patch: Partial<Task>) => void
  deleteTask: (id: string) => void
  completeTask: (id: string, complete: boolean) => void

  addEvent: (e: Omit<ScheduleEvent, 'id'>) => ScheduleEvent
  updateEvent: (id: string, patch: Partial<ScheduleEvent>) => void
  deleteEvent: (id: string) => void

  addSession: (s: Omit<FocusSession, 'id'>) => FocusSession
  addRevision: (r: Omit<RevisionItem, 'id'>) => RevisionItem
  updateRevision: (id: string, markOffset: number | null, patch?: Partial<RevisionItem>) => void
  deleteRevision: (id: string) => void

  addExam: (e: Omit<Exam, 'id'>) => Exam
  updateExam: (id: string, patch: Partial<Exam>) => void
  deleteExam: (id: string) => void

  setChatMessages: (msgs: ChatMessage[]) => void
  setGarden: (g: GardenLocal) => void
}

function useProvideApp(): AppStore {
  const initial = useMemo(() => loadLocal(), [])
  const [profile, setProfile] = useState<Profile>(initial.profile)
  const [subjects, setSubjects] = useState<Subject[]>(initial.subjects)
  const [tasks, setTasks] = useState<Task[]>(initial.tasks)
  const [events, setEvents] = useState<ScheduleEvent[]>(initial.events)
  const [sessions, setSessions] = useState<FocusSession[]>(initial.sessions)
  const [revisions, setRevisions] = useState<RevisionItem[]>(initial.revisions)
  const [exams, setExams] = useState<Exam[]>(initial.exams)
  const [settings, setSettingsState] = useState<Settings>(initial.settings)
  const [garden, setGardenState] = useState<GardenLocal>(() => lsGet<GardenLocal>('swm.garden', { points: 0, unlocked: [] }))
  const [chat, setChatState] = useState<ChatMessage[]>(() => lsGet<ChatMessage[]>('swm.chat', []))
  const [onboarded, setOnboardedState] = useState<boolean>(() => lsGet<boolean>('swm.onboarded', false))

  // Persist locally on every change (offline-first).
  useEffect(() => {
    saveLocal({ profile, subjects, tasks, events, sessions, revisions, exams, settings })
  }, [profile, subjects, tasks, events, sessions, revisions, exams, settings])
  useEffect(() => lsSet('swm.garden', garden), [garden])
  useEffect(() => lsSet('swm.chat', chat.filter((m) => !m.pending && !m.error)), [chat])
  useEffect(() => lsSet('swm.onboarded', onboarded), [onboarded])

  // Theme (light / dark / system).
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => root.classList.toggle('dark', settings.theme === 'dark' || (settings.theme === 'system' && mq.matches))
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [settings.theme])

  // Reduced motion.
  useEffect(() => {
    document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion === true)
  }, [settings.reducedMotion])

  const updateProfile = useCallback((patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch })), [])
  const setEnergy = useCallback(
    (energy: Profile['energy']) => setProfile((p) => ({ ...p, energy, energyUpdatedAt: new Date().toISOString() })),
    [],
  )
  const setSettings = useCallback((patch: Partial<Settings>) => setSettingsState((s) => ({ ...s, ...patch })), [])
  const setOnboarded = useCallback((v: boolean) => setOnboardedState(v), [])

  const addSubject = useCallback((s: Omit<Subject, 'id'>) => {
    const item: Subject = { ...s, id: crypto.randomUUID() }
    setSubjects((arr) => [...arr, item])
    return item
  }, [])

  const updateSubject = useCallback((id: string, patch: Partial<Subject>) => {
    setSubjects((arr) => arr.map((s) => (s.id === id ? { ...s, ...patch } : s)))
  }, [])

  const deleteSubject = useCallback((id: string) => {
    setSubjects((arr) => arr.filter((s) => s.id !== id))
    setTasks((arr) => arr.map((t) => (t.subjectId === id ? { ...t, subjectId: null } : t)))
    setEvents((arr) => arr.map((e) => (e.subjectId === id ? { ...e, subjectId: null } : e)))
  }, [])

  const addTask = useCallback((t: Omit<Task, 'id' | 'done' | 'doneAt'>) => {
    const item: Task = { ...t, id: crypto.randomUUID(), done: false, doneAt: null }
    setTasks((arr) => [...arr, item])
    return item
  }, [])

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((arr) => arr.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  }, [])

  const deleteTask = useCallback((id: string) => {
    setTasks((arr) => arr.filter((t) => t.id !== id))
  }, [])

  const completeTask = useCallback((id: string, complete: boolean) => {
    setTasks((arr) =>
      arr.map((t) => (t.id === id ? { ...t, done: complete, doneAt: complete ? new Date().toISOString() : null } : t)),
    )
    if (complete) setProfile((p) => ({ ...p, xp: p.xp + XP_TASK }))
  }, [])

  const addEvent = useCallback((e: Omit<ScheduleEvent, 'id'>) => {
    const item: ScheduleEvent = { ...e, id: crypto.randomUUID() }
    setEvents((arr) => [...arr, item])
    return item
  }, [])

  const updateEvent = useCallback((id: string, patch: Partial<ScheduleEvent>) => {
    setEvents((arr) => arr.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }, [])

  const deleteEvent = useCallback((id: string) => {
    setEvents((arr) => arr.filter((e) => e.id !== id))
  }, [])

  const addSession = useCallback((s: Omit<FocusSession, 'id'>) => {
    const item: FocusSession = { ...s, id: crypto.randomUUID() }
    setSessions((arr) => [...arr, item])
    return item
  }, [])

  const addRevision = useCallback((r: Omit<RevisionItem, 'id'>) => {
    const item: RevisionItem = { ...r, id: crypto.randomUUID() }
    setRevisions((arr) => [...arr, item])
    return item
  }, [])

  const updateRevision = useCallback((id: string, markOffset: number | null, patch?: Partial<RevisionItem>) => {
    setRevisions((arr) =>
      arr.map((r) => {
        if (r.id !== id) return r
        const next = { ...r, ...patch }
        if (markOffset !== null) {
          const nextCompleted = { ...r.completed }
          nextCompleted[String(markOffset)] = todayKey()
          next.completed = nextCompleted
        }
        return next
      }),
    )
    if (markOffset !== null) setProfile((p) => ({ ...p, xp: p.xp + XP_REVISION }))
  }, [])

  const deleteRevision = useCallback((id: string) => {
    setRevisions((arr) => arr.filter((r) => r.id !== id))
  }, [])

  const addExam = useCallback((e: Omit<Exam, 'id'>) => {
    const item: Exam = { ...e, id: crypto.randomUUID() }
    setExams((arr) => [...arr, item])
    return item
  }, [])

  const updateExam = useCallback((id: string, patch: Partial<Exam>) => {
    setExams((arr) => arr.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }, [])

  const deleteExam = useCallback((id: string) => {
    setExams((arr) => arr.filter((e) => e.id !== id))
  }, [])

  const setChatMessages = useCallback((msgs: ChatMessage[]) => setChatState(msgs), [])
  const setGarden = useCallback((g: GardenLocal) => setGardenState(g), [])

  return {
    profile, subjects, tasks, events, sessions, revisions, exams, settings, garden, chat, onboarded,
    updateProfile, setEnergy, setSettings, setOnboarded,
    addSubject, updateSubject, deleteSubject,
    addTask, updateTask, deleteTask, completeTask,
    addEvent, updateEvent, deleteEvent,
    addSession, addRevision, updateRevision, deleteRevision,
    addExam, updateExam, deleteExam,
    setChatMessages, setGarden,
  }
}

export const AppContext = createContext<AppStore | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const value = useProvideApp()
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppStore {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
