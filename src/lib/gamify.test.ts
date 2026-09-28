import { describe, expect, it } from 'vitest'
import { earnedAchievements, gardenStage, levelFor, newlyUnlocked, streakAfterStudy, GARDEN_ITEMS } from './gamify'

describe('levelFor', () => {
  it('assigns levels by XP', () => {
    expect(levelFor(0).name).toBe('Beginner')
    expect(levelFor(150).name).toBe('Learner')
    expect(levelFor(999).name).toBe('Scholar')
    expect(levelFor(99999).name).toBe('Knowledge Master')
    expect(levelFor(100).next).toBe(150)
  })
})

describe('streakAfterStudy', () => {
  it('continues a streak on consecutive days', () => {
    expect(streakAfterStudy('2026-09-27', 4, '2026-09-28')).toBe(5)
  })
  it('keeps the streak when already studied today', () => {
    expect(streakAfterStudy('2026-09-28', 4, '2026-09-28')).toBe(4)
  })
  it('restarts after a gap', () => {
    expect(streakAfterStudy('2026-09-20', 4, '2026-09-28')).toBe(1)
  })
  it('starts at 1 with no history', () => {
    expect(streakAfterStudy(null, 0, '2026-09-28')).toBe(1)
  })
})

describe('garden', () => {
  it('progresses through stages', () => {
    expect(gardenStage(0).label).toBe('Seed')
    expect(gardenStage(50).label).toBe('Sprout')
    expect(gardenStage(200).label).toBe('First Flowers')
    expect(gardenStage(500).label).toBe('Blooming Garden')
    expect(gardenStage(1200).label).toBe('Full Garden')
  })
  it('unlocks items at thresholds', () => {
    expect(newlyUnlocked(45, [])).toEqual(['sprout', 'daisy'])
    expect(newlyUnlocked(45, ['sprout', 'daisy'])).toHaveLength(0)
    expect(GARDEN_ITEMS.length).toBeGreaterThanOrEqual(6)
  })
})

describe('achievements', () => {
  it('earn on thresholds', () => {
    const stats = { sessions: 1, minutes: 30, streak: 7, dailyGoalHits: 1, nightSession: 0, earlySession: 0, gardenPoints: 10 }
    const earned = earnedAchievements(stats, [])
    expect(earned).toContain('first-session')
    expect(earned).toContain('streak-7')
    expect(earned).toContain('daily-goal')
    expect(earned).not.toContain('streak-30')
  })
  it('does not re-earn owned ones', () => {
    const stats = { sessions: 1, minutes: 30, streak: 7, dailyGoalHits: 1, nightSession: 0, earlySession: 0, gardenPoints: 10 }
    expect(earnedAchievements(stats, ['first-session'])).not.toContain('first-session')
  })
})
