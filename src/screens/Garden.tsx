import { useApp } from '../lib/appStore'
import { GARDEN_ITEMS, gardenStage } from '../lib/gamify'
import { GardenStage } from '../components/Garden'
import { fmtMin } from '../lib/date'

export function Garden() {
  const app = useApp()
  const stage = gardenStage(app.garden.points)
  const nextItem = GARDEN_ITEMS.find((g) => app.garden.points < g.points)

  return (
    <div>
      <h1 className="page-title">Your garden</h1>
      <p className="page-sub">Every focused minute plants something.</p>

      <GardenStage points={app.garden.points} mascot={app.profile.mascot} />

      <div className="card quiet mt16">
        <div className="row between">
          <span className="bold">{stage.label}</span>
          <span className="chip sage">{app.garden.points} growth points</span>
        </div>
        {nextItem && (
          <p className="small muted" style={{ margin: '8px 0 0' }}>
            {nextItem.points - app.garden.points} more minutes until your {nextItem.name.toLowerCase()} blooms.
          </p>
        )}
        {app.sessions.length > 0 && (
          <p className="tiny faint mt8">
            {fmtMin(app.sessions.reduce((a, s) => a + s.minutes, 0))} studied in total — that’s {app.garden.points} points of growth.
          </p>
        )}
      </div>

      <div className="section-label">Unlocks</div>
      <div className="stack">
        {GARDEN_ITEMS.map((g) => {
          const owned = app.garden.points >= g.points
          return (
            <div key={g.id} className="card quiet row between" style={{ padding: 14, opacity: owned ? 1 : 0.55 }}>
              <div className="row" style={{ gap: 12 }}>
                <span style={{ fontSize: 22 }} aria-hidden="true">{owned ? '🌱' : '🔒'}</span>
                <div>
                  <div className="bold small">{g.name}</div>
                  <div className="tiny faint">{g.points} points</div>
                </div>
              </div>
              {owned && <span className="chip sage">Unlocked</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
