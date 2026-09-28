import { LEVELS } from '../types'
import { addDaysKey, todayKey } from './date'

/** Level name + XP range for the current level. */
export function levelFor(xp: number): { index: number; name: string; min: number; next: number | null } {
  let i = 0
  for (let k = 0; k < LEVELS.length; k++) {
    if (xp >= LEVELS[k].minXp) i = k
  }
  const next = LEVELS[i + 1]?.minXp ?? null
  return { index: i, name: LEVELS[i].name, min: LEVELS[i].minXp, next }
}

/** Streak logic after studying today. */
export function streakAfterStudy(lastStudyDate: string | null, streak: number, today = todayKey()): number {
  if (lastStudyDate === today) return streak
  if (lastStudyDate && addDaysKey(lastStudyDate, 1) === today) return streak + 1
  return 1
}

/** A protected rest day freezes (does not reset) the streak. */
export function applyRestDay(streak: number): number {
  return streak
}

export const ACHIEVEMENTS = [
  { id: 'first-session', name: 'First Study Session', desc: 'Complete your first focus session', check: (st: AchievementStats) => st.sessions >= 1 },
  { id: 'streak-7', name: '7-Day Streak', desc: 'Study 7 days in a row', check: (st: AchievementStats) => st.streak >= 7 },
  { id: 'streak-30', name: '30-Day Streak', desc: 'Study 30 days in a row', check: (st: AchievementStats) => st.streak >= 30 },
  { id: 'hours-10', name: '10 Hours Studied', desc: 'Reach 10 total focus hours', check: (st: AchievementStats) => st.minutes >= 600 },
  { id: 'daily-goal', name: 'Daily Goal', desc: 'Hit your daily goal once', check: (st: AchievementStats) => st.dailyGoalHits >= 1 },
  { id: 'night-owl', name: 'Night Owl', desc: 'Finish a session after 22:00', check: (st: AchievementStats) => st.nightSession >= 1 },
  { id: 'early-bird', name: 'Early Bird', desc: 'Finish a session before 07:00', check: (st: AchievementStats) => st.earlySession >= 1 },
  { id: 'garden-bloom', name: 'First Flowers', desc: 'Reach your garden’s first bloom', check: (st: AchievementStats) => st.gardenPoints >= 60 },
] as const

export interface AchievementStats {
  sessions: number
  minutes: number
  streak: number
  dailyGoalHits: number
  nightSession: number
  earlySession: number
  gardenPoints: number
}

export function earnedAchievements(stats: AchievementStats, owned: string[]): string[] {
  return ACHIEVEMENTS.filter((a) => !owned.includes(a.id) && a.check(stats)).map((a) => a.id)
}

// ---- Garden: 1 point per focus minute, thresholds unlock items ----

export const GARDEN_ITEMS = [
  { id: 'sprout', name: 'Little Sprout', points: 10, kind: 'plant' as const },
  { id: 'daisy', name: 'Daisy', points: 40, kind: 'flower' as const },
  { id: 'tulip', name: 'Tulip', points: 90, kind: 'flower' as const },
  { id: 'rose', name: 'Rose Bush', points: 160, kind: 'flower' as const },
  { id: 'tree', name: 'Young Tree', points: 260, kind: 'plant' as const },
  { id: 'butterfly', name: 'Butterfly', points: 400, kind: 'decoration' as const },
  { id: 'lantern', name: 'Garden Lantern', points: 600, kind: 'decoration' as const },
  { id: 'fountain', name: 'Fountain', points: 900, kind: 'decoration' as const },
]

export function gardenStage(points: number): { stage: number; label: string } {
  if (points >= 900) return { stage: 5, label: 'Full Garden' }
  if (points >= 300) return { stage: 4, label: 'Blooming Garden' }
  if (points >= 120) return { stage: 3, label: 'First Flowers' }
  if (points >= 30) return { stage: 2, label: 'Sprout' }
  return { stage: 1, label: 'Seed' }
}

export function newlyUnlocked(points: number, owned: string[]): string[] {
  return GARDEN_ITEMS.filter((g) => points >= g.points && !owned.includes(g.id)).map((g) => g.id)
}
