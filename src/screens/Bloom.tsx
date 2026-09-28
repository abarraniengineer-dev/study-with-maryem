import { useEffect, useRef, useState } from 'react'
import { useApp } from '../lib/appStore'
import { askBloom, BLOOM_SUGGESTIONS } from '../lib/bloom'
import { Icon } from '../components/Icon'
import { Mascot } from '../components/Mascot'

export function Bloom() {
  const app = useApp()
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastQuestion, setLastQuestion] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const endpoint = import.meta.env.VITE_BLOOM_ENDPOINT as string | undefined

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [app.chat, busy])

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    setError(null)
    setLastQuestion(q)
    const userMsg = { id: crypto.randomUUID(), role: 'user' as const, content: q, createdAt: new Date().toISOString() }
    app.setChatMessages([...app.chat, userMsg])
    setInput('')
    setBusy(true)
    try {
      const ctx = app.settings.bloomUseContext
        ? {
            subjects: app.subjects, tasks: app.tasks, exams: app.exams,
            revisions: app.revisions, events: app.events, energy: app.profile.energy,
          }
        : null
      const reply = await askBloom(q, ctx, app.chat, endpoint)
      app.setChatMessages([...app.chat, userMsg, { id: crypto.randomUUID(), role: 'bloom', content: reply, createdAt: new Date().toISOString() }])
    } catch {
      setError('Bloom is resting right now. Please try again in a moment.')
      app.setChatMessages([...app.chat, userMsg])
    } finally {
      setBusy(false)
    }
  }

  const retry = () => lastQuestion && send(lastQuestion)

  const clearAll = () => {
    if (confirm('Clear this conversation?')) app.setChatMessages([])
  }

  return (
    <div className="chat-wrap">
      <div className="row between">
        <div className="row" style={{ gap: 12 }}>
          <Mascot kind={app.profile.mascot} size={46} mood="idle" />
          <div>
            <h1 className="page-title" style={{ fontSize: 24, marginBottom: 0 }}>Bloom AI</h1>
            <div className="tiny faint">
              {app.settings.bloomUseContext ? 'Using your study data' : 'Not using your study data'}
              {' · '}
              {endpoint ? 'connected' : 'on-device planner'}
            </div>
          </div>
        </div>
        {app.chat.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={clearAll}>
            <Icon name="trash" size={15} /> Clear
          </button>
        )}
      </div>

      <div className="chat-log" ref={logRef} aria-live="polite">
        {app.chat.length === 0 && !busy && (
          <div className="center" style={{ padding: '28px 10px' }}>
            <Mascot kind={app.profile.mascot} size={110} mood="reading" />
            <p className="muted" style={{ maxWidth: 320, margin: '10px auto 0' }}>
              Ask me anything about your studies — I can explain, plan, and help you decide what to do next.
            </p>
          </div>
        )}
        {app.chat.map((m) => (
          <div key={m.id} className={`bubble ${m.role === 'bloom' ? 'bloom-bubble' : 'user-bubble'}`} dir="auto">
            {m.content}
          </div>
        ))}
        {busy && (
          <div className="bubble bloom-bubble" aria-label="Bloom is thinking">
            <span className="typing"><i /><i /><i /></span>
          </div>
        )}
        {error && (
          <div className="error-note" role="alert">
            {error}{' '}
            <button className="link-btn" onClick={retry}>Retry</button>
          </div>
        )}
      </div>

      <div className="suggest-row" role="group" aria-label="Suggested questions">
        {BLOOM_SUGGESTIONS.slice(0, 3).map((s) => (
          <button key={s} onClick={() => send(s)} disabled={busy}>{s}</button>
        ))}
      </div>

      <div className="chat-bar">
        <input
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="Ask Bloom anything…"
          aria-label="Message Bloom"
        />
        <button className="btn btn-primary" onClick={() => send(input)} disabled={busy || !input.trim()} aria-label="Send">
          <Icon name="send" size={18} />
        </button>
      </div>
    </div>
  )
}
