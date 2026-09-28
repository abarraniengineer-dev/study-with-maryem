import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../lib/appStore'
import type { FocusPreset } from './Home'
import { nowMinutes, todayKey } from '../lib/date'
import { newlyUnlocked } from '../lib/gamify'
import { XP_STUDY_PER_MIN } from '../types'
import { Icon } from '../components/Icon'
import { Mascot } from '../components/Mascot'
import { Empty } from '../components/ui'

const PRESETS = [15, 25, 30, 45, 60]

export function Focus() {
  const app = useApp()
  const location = useLocation()
  const preset = (location.state as { preset?: FocusPreset } | null)?.preset ?? null

  const [title, setTitle] = useState(preset?.title ?? '')
  const [subjectId, setSubjectId] = useState<string | null>(preset?.subjectId ?? null)
  const [minutes, setMinutes] = useState(preset?.minutes ?? 25)
  const [kind] = useState<FocusPreset['kind']>(preset?.kind ?? 'study')
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(minutes * 60)
  const [done, setDone] = useState(false)
  const [musicOpen, setMusicOpen] = useState(false)
  const [atmos, setAtmos] = useState<'none' | 'rain' | 'cafe' | 'library'>('none')

  const finishedRef = useRef(false)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => window.clearInterval(id)
  }, [running])

  // Completion handled outside the state updater so it can never double-fire.
  useEffect(() => {
    if (running && remaining === 0 && !finishedRef.current) {
      finishedRef.current = true
      setRunning(false)
      finish(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, running])

  useEffect(() => {
    if (!running) setRemaining(minutes * 60)
  }, [minutes, running])

  const finish = (completed: boolean) => {
    if (completed) finishedRef.current = true
    const studied = completed ? minutes : Math.round((minutes * 60 - remaining) / 60)
    if (studied >= 1) {
      app.addSession({
        subjectId, taskId: preset?.taskId ?? null, revisionItemId: preset?.revisionItemId ?? null,
        dateKey: todayKey(), startMin: nowMinutes() - studied, minutes: studied, kind, label: title || 'Focus session',
      })
      const gained = studied * XP_STUDY_PER_MIN + (completed ? 5 : 0)
      const isRest = app.profile.restDays.includes(todayKey())
      const streak = isRest ? app.profile.streak : (app.profile.lastStudyDate === todayKey() ? app.profile.streak : app.profile.streak + 1)
      app.updateProfile({ xp: app.profile.xp + gained, streak, lastStudyDate: todayKey() })
      const pts = app.garden.points + studied
      app.setGarden({ points: pts, unlocked: newlyUnlocked(pts, app.garden.unlocked) })
      setDone(true)
    } else {
      // Under a minute — nothing to save, quietly reset.
      setRemaining(minutes * 60)
    }
  }

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0')
  const ss = String(remaining % 60).padStart(2, '0')

  const ytId = useMemo(() => extractYoutubeId(app.profile.musicUrl), [app.profile.musicUrl])

  return (
    <div>
      {done ? (
        <div className="focus-stage">
          <Mascot kind={app.profile.mascot} size={110} mood="celebrating" />
          <h1 className="page-title" style={{ marginBottom: 0 }}>Beautifully done.</h1>
          <p className="muted">{title || 'Focus session'} · {minutes} min · +{minutes * XP_STUDY_PER_MIN + 5} XP</p>
          <div className="row" style={{ gap: 10 }}>
            <button className="btn btn-primary" onClick={() => { setDone(false); finishedRef.current = false; setRemaining(minutes * 60) }}>Another session</button>
            <button className="btn btn-ghost" onClick={() => window.history.back()}>Back home</button>
          </div>
        </div>
      ) : (
        <div className="focus-stage">
          <div className="tiny bold faint" style={{ letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {running ? 'Focus in progress' : 'Focus mode'}
          </div>
          <Mascot kind={app.profile.mascot} size={86} mood={running ? 'reading' : 'idle'} />

          {title ? (
            <h1 className="page-title" style={{ marginBottom: 0 }}>{title}</h1>
          ) : (
            <input className="input" style={{ maxWidth: 340, textAlign: 'center' }} placeholder="What are you studying?" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Session title" />
          )}

          <div className="row wrap" style={{ justifyContent: 'center', gap: 8 }}>
            {app.subjects.filter((s) => !s.archived).map((s) => (
              <button key={s.id} className={`chip${subjectId === s.id ? ' rose' : ''}`} style={{ cursor: 'pointer', border: 'none' }} onClick={() => setSubjectId(s.id)} aria-pressed={subjectId === s.id}>
                {s.name}
              </button>
            ))}
          </div>

          <div className="timer-big" role="timer" aria-live="off">{mm}:{ss}</div>

          {!running && (
            <div className="seg" role="group" aria-label="Session length">
              {PRESETS.map((m) => (
                <button key={m} className={minutes === m ? 'on' : ''} onClick={() => setMinutes(m)}>{m}</button>
              ))}
              <input
                type="number"
                min={1}
                max={180}
                value={minutes}
                onChange={(e) => setMinutes(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
                aria-label="Custom minutes"
                style={{ width: 74, borderRadius: 999, border: '1.5px solid var(--border)', background: 'var(--bg-2)', padding: '6px 12px', textAlign: 'center' }}
              />
            </div>
          )}

          <div className="row" style={{ gap: 10 }}>
            {!running ? (
              <>
                <button className="btn btn-primary" onClick={() => setRunning(true)} disabled={!title.trim() && app.subjects.length === 0}>
                  <Icon name="play" size={18} /> Start
                </button>
                <button className="btn btn-ghost" onClick={() => finish(false)}>End & save</button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => setRunning(false)}>
                <Icon name="pause" size={18} /> Pause
              </button>
            )}
          </div>

          <button className="btn btn-ghost btn-sm" onClick={() => setMusicOpen((v) => !v)} aria-expanded={musicOpen}>
            <Icon name="music" size={16} /> Study music {atmos !== 'none' ? '· atmosphere on' : ''}
          </button>

          {musicOpen && (
            <div className="card quiet" style={{ width: 'min(100%, 420px)' }}>
              <div className="section-label" style={{ marginTop: 0 }}>Atmosphere</div>
              <div className="seg" role="group" aria-label="Atmosphere">
                {(['none', 'rain', 'cafe', 'library'] as const).map((a) => (
                  <button key={a} className={atmos === a ? 'on' : ''} onClick={() => setAtmos(a)}>{a[0].toUpperCase() + a.slice(1)}</button>
                ))}
              </div>
              <AtmospherePlayer kind={atmos} />
              <div className="section-label">YouTube study music</div>
              <input
                className="input"
                placeholder="Paste a YouTube video or playlist URL"
                value={app.profile.musicUrl}
                onChange={(e) => app.updateProfile({ musicUrl: e.target.value })}
                aria-label="YouTube URL"
              />
              {app.profile.musicTitle && <p className="tiny faint mt8">Saved: {app.profile.musicTitle}</p>}
              {ytId && (
                <div className="mt16" style={{ aspectRatio: '16/9', borderRadius: 'var(--r-md)', overflow: 'hidden' }}>
                  <iframe
                    title="YouTube study music"
                    width="100%"
                    height="100%"
                    src={`https://www.youtube-nocookie.com/embed/${ytId.list ? 'videoseries?list=' + ytId.list : ytId.id}`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              <p className="tiny faint mt8">
                Playback follows YouTube’s embedded player rules — press play inside the player. Audio keeps playing while you study.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Atmospheres are synthesized with WebAudio — no downloads, no assets.
function AtmospherePlayer({ kind }: { kind: 'none' | 'rain' | 'cafe' | 'library' }) {
  const ctxRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef<{ src: AudioBufferSourceNode; gain: GainNode } | null>(null)

  useEffect(() => {
    const stop = () => {
      nodesRef.current?.src.stop()
      nodesRef.current = null
    }
    if (kind === 'none') {
      stop()
      return
    }
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext()
      const ctx = ctxRef.current
      void ctx.resume()
      // 2-second noise buffer, looped
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      let last = 0
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1
        if (kind === 'rain') data[i] = white * 0.6 + last * 0.2 // hissy
        else data[i] = (last + 0.02 * white) / 1.02 // brown-ish, warm
        last = data[i]
        data[i] *= kind === 'rain' ? 0.5 : 1.4
      }
      const src = ctx.createBufferSource()
      src.buffer = buffer
      src.loop = true
      const filter = ctx.createBiquadFilter()
      filter.type = kind === 'rain' ? 'highpass' : 'lowpass'
      filter.frequency.value = kind === 'rain' ? 1200 : kind === 'cafe' ? 800 : 400
      const gain = ctx.createGain()
      gain.gain.value = kind === 'library' ? 0.05 : kind === 'cafe' ? 0.1 : 0.13
      src.connect(filter).connect(gain).connect(ctx.destination)
      src.start()
      nodesRef.current = { src, gain }
      return stop
    } catch {
      return
    }
  }, [kind])

  if (kind === 'none') return null
  return <p className="tiny faint" aria-live="polite">Playing {kind} atmosphere — adjust volume with your device.</p>
}

export function extractYoutubeId(url: string): { id?: string; list?: string } {
  if (!url) return {}
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return { id: u.pathname.slice(1) }
    const id = u.searchParams.get('v')
    const list = u.searchParams.get('list') ?? undefined
    return { id: id ?? undefined, list }
  } catch {
    return {}
  }
}

export function FocusEmpty() {
  return <Empty title="No subjects yet" note="Add subjects first so sessions can be tracked." />
}
