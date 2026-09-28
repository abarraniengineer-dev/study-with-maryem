import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../lib/appStore'
import { fmtMin, todayKey } from '../lib/date'
import { levelFor, ACHIEVEMENTS, earnedAchievements, type AchievementStats } from '../lib/gamify'
import { usingSupabase } from '../lib/persist'
import { Mascot } from '../components/Mascot'
import { Icon } from '../components/Icon'
import { Seg, Sheet } from '../components/ui'
import type { MascotKind, ThemeMode } from '../types'
import { GardenStage } from '../components/Garden'

export function Profile() {
  const app = useApp()
  const nav = useNavigate()
  const lvl = levelFor(app.profile.xp)
  const totalMin = app.sessions.reduce((a, s) => a + s.minutes, 0)
  const today = todayKey()
  const isRestDay = app.profile.restDays.includes(today)
  const [notifState, setNotifState] = useState<NotificationPermission | 'unsupported'>(
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  )
  const [pickMascot, setPickMascot] = useState(false)

  const earnedStats: AchievementStats = {
    sessions: app.sessions.length,
    minutes: totalMin,
    streak: app.profile.streak,
    dailyGoalHits: app.sessions.filter((s) => s.dateKey === today).reduce((a, s) => a + s.minutes, 0) >= app.profile.dailyGoalMinutes ? 1 : 0,
    nightSession: app.sessions.some((s) => s.dateKey === today && s.startMin >= 22 * 60) ? 1 : 0,
    earlySession: app.sessions.some((s) => s.dateKey === today && s.startMin < 7 * 60) ? 1 : 0,
    gardenPoints: app.garden.points,
  }
  const earnedIds = earnedAchievements(earnedStats, [])

  const requestNotifications = async () => {
    if (typeof Notification === 'undefined') return
    try {
      const p = await Notification.requestPermission()
      setNotifState(p)
      if (p === 'granted') {
        app.setSettings({ notifications: true })
        new Notification('Study With Maryem', { body: 'Reminders are on. I’ll nudge you gently.' })
      }
    } catch {
      /* permission request failed — stay quiet */
    }
  }

  return (
    <div>
      <div className="card row" style={{ gap: 18 }}>
        <Mascot kind={app.profile.mascot} size={84} mood="idle" />
        <div className="grow">
          <h1 className="page-title" style={{ fontSize: 26 }}>{app.profile.name}</h1>
          <p className="small muted" style={{ margin: 0 }}>
            {lvl.name} · {app.profile.xp} XP
            {lvl.next !== null && ` · ${lvl.next - app.profile.xp} XP to next level`}
          </p>
          <div className="row wrap mt8" style={{ gap: 8 }}>
            <span className="chip rose"><Icon name="flame" size={13} /> {app.profile.streak}-day streak</span>
            <span className="chip sage"><Icon name="clock" size={13} /> {fmtMin(totalMin)} studied</span>
          </div>
        </div>
      </div>

      <div className="section-label">Everything else</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
        {([
          { to: '/subjects', label: 'Subjects', icon: 'book' as const },
          { to: '/revision', label: 'Revision', icon: 'leaf' as const },
          { to: '/exams', label: 'Exams', icon: 'target' as const },
          { to: '/plan', label: 'Plan week', icon: 'sparkle' as const },
          { to: '/insights', label: 'Insights', icon: 'trophy' as const },
          { to: '/garden', label: 'Garden', icon: 'flower' as const },
        ]).map((l) => (
          <button
            key={l.to}
            className="card quiet"
            style={{ padding: 14, textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text)', fontFamily: 'inherit' }}
            onClick={() => nav(l.to)}
          >
            <Icon name={l.icon} size={19} />
            <span className="small bold">{l.label}</span>
          </button>
        ))}
      </div>

      <div className="section-label">Study garden</div>
      <GardenStage points={app.garden.points} mascot={app.profile.mascot} />

      <div className="section-label">Mascot</div>
      <div className="card quiet row between" style={{ padding: 16 }}>
        <div>
          <div className="bold">{app.profile.mascotName}</div>
          <div className="tiny faint capitalize">{app.profile.mascot} · keeps you company while you study</div>
        </div>
        <button className="btn btn-soft btn-sm" onClick={() => setPickMascot(true)}>Change</button>
      </div>

      <div className="section-label">Achievements</div>
      <div className="stack">
        {ACHIEVEMENTS.map((a) => {
          const earned = earnedIds.includes(a.id)
          return (
            <div key={a.id} className="card quiet row" style={{ padding: 14, gap: 12, opacity: earned ? 1 : 0.6 }}>
              <Icon name="trophy" size={20} />
              <div className="grow">
                <div className="bold small">{a.name}</div>
                <div className="tiny faint">{a.desc}</div>
              </div>
              {earned && <span className="chip sage">Earned</span>}
            </div>
          )
        })}
      </div>

      <div className="section-label">Goals</div>
      <div className="card">
        <div className="field">
          <label htmlFor="g-daily">Daily goal: {fmtMin(app.profile.dailyGoalMinutes)}</label>
          <input id="g-daily" type="range" min={15} max={480} step={15} value={app.profile.dailyGoalMinutes}
            onChange={(e) => app.updateProfile({ dailyGoalMinutes: Number(e.target.value) })}
            style={{ width: '100%', accentColor: 'var(--accent)' }} />
        </div>
        <div className="field">
          <label htmlFor="g-weekly">Weekly goal: {fmtMin(app.profile.weeklyGoalMinutes)}</label>
          <input id="g-weekly" type="range" min={60} max={2400} step={30} value={app.profile.weeklyGoalMinutes}
            onChange={(e) => app.updateProfile({ weeklyGoalMinutes: Number(e.target.value) })}
            style={{ width: '100%', accentColor: 'var(--accent)' }} />
        </div>
      </div>

      <div className="section-label">Appearance</div>
      <div className="card">
        <div className="field">
          <label>Theme</label>
          <Seg
            options={[{ value: 'light' as const, label: 'Light' }, { value: 'dark' as const, label: 'Dark' }, { value: 'system' as const, label: 'System' }]}
            value={app.settings.theme}
            onChange={(v: ThemeMode) => app.setSettings({ theme: v })}
            ariaLabel="Theme"
          />
        </div>
        <div className="field">
          <label>Reduce motion</label>
          <Seg
            options={[{ value: 'system', label: 'System' }, { value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
            value={app.settings.reducedMotion === null ? 'system' : app.settings.reducedMotion ? 'on' : 'off'}
            onChange={(v) => app.setSettings({ reducedMotion: v === 'on' ? true : v === 'off' ? false : null })}
            ariaLabel="Reduce motion"
          />
        </div>
      </div>

      <div className="section-label">Reminders</div>
      <div className="card quiet row between" style={{ padding: 16 }}>
        <div>
          <div className="bold small">Notifications</div>
          <div className="tiny faint">
            {notifState === 'granted' ? 'On — gentle nudges when you allow them.' : notifState === 'denied' ? 'Blocked in browser settings.' : notifState === 'unsupported' ? 'Not supported here.' : 'Ask permission'}
          </div>
        </div>
        {notifState !== 'granted' && notifState !== 'denied' && notifState !== 'unsupported' && (
          <button className="btn btn-soft btn-sm" onClick={requestNotifications}>Enable</button>
        )}
      </div>

      <div className="section-label">Reminders</div>
      <div className="card quiet row between" style={{ padding: 16 }}>
        <div>
          <div className="bold small">Rest day</div>
          <div className="tiny faint">Protect your streak today — rest counts, no guilt.</div>
        </div>
        <button
          className={`btn ${isRestDay ? 'btn-primary' : 'btn-soft'} btn-sm`}
          aria-pressed={isRestDay}
          onClick={() =>
            app.updateProfile({
              restDays: isRestDay ? app.profile.restDays.filter((d) => d !== today) : [...app.profile.restDays, today],
            })
          }
        >
          {isRestDay ? 'Resting today' : 'Mark rest day'}
        </button>
      </div>

      <div className="section-label">Bloom AI</div>
      <div className="card quiet row between" style={{ padding: 16 }}>
        <div>
          <div className="bold small">Use my study data</div>
          <div className="tiny faint">When on, Bloom can see tasks, exams and schedule to give personal advice.</div>
        </div>
        <button
          className="btn btn-soft btn-sm"
          aria-pressed={app.settings.bloomUseContext}
          onClick={() => app.setSettings({ bloomUseContext: !app.settings.bloomUseContext })}
        >
          {app.settings.bloomUseContext ? 'On' : 'Off'}
        </button>
      </div>

      <div className="section-label">Data</div>
      <div className="card quiet" style={{ padding: 16 }}>
        <div className="tiny faint">
          {usingSupabase
            ? 'Synced with your Supabase account — data follows you across devices.'
            : 'Saved locally on this device. Connect Supabase to sync across devices.'}
        </div>
        <button
          className="btn btn-danger btn-sm mt16"
          onClick={() => {
            if (confirm('Reset all Study With Maryem data on this device?')) {
              localStorage.clear()
              location.reload()
            }
          }}
        >
          Reset local data
        </button>
      </div>

      {pickMascot && (
        <Sheet title="Choose your companion" onClose={() => setPickMascot(false)}>
          <div className="row wrap" style={{ gap: 14, justifyContent: 'center' }}>
            {(['panda', 'bunny', 'cat', 'flower'] as MascotKind[]).map((k) => (
              <button
                key={k}
                onClick={() => { app.updateProfile({ mascot: k }); setPickMascot(false) }}
                aria-pressed={app.profile.mascot === k}
                style={{
                  background: 'var(--bg-2)',
                  border: app.profile.mascot === k ? '2.5px solid var(--accent)' : '1.5px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  padding: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  color: 'var(--text)',
                }}
              >
                <Mascot kind={k} size={64} />
                <span className="small bold capitalize">{k}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  )
}
