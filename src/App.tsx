import { lazy, Suspense, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './lib/appStore'
import { Home } from './screens/Home'
import { Icon, type IconName } from './components/Icon'
import { Mascot } from './components/Mascot'

const Schedule = lazy(() => import('./screens/Schedule').then((m) => ({ default: m.Schedule })))
const Tasks = lazy(() => import('./screens/Tasks').then((m) => ({ default: m.Tasks })))
const Focus = lazy(() => import('./screens/Focus').then((m) => ({ default: m.Focus })))
const Subjects = lazy(() => import('./screens/Subjects').then((m) => ({ default: m.Subjects })))
const Revision = lazy(() => import('./screens/Revision').then((m) => ({ default: m.Revision })))
const Exams = lazy(() => import('./screens/Exams').then((m) => ({ default: m.Exams })))
const Plan = lazy(() => import('./screens/Plan').then((m) => ({ default: m.Plan })))
const Analytics = lazy(() => import('./screens/Analytics').then((m) => ({ default: m.Analytics })))
const Garden = lazy(() => import('./screens/Garden').then((m) => ({ default: m.Garden })))
const Profile = lazy(() => import('./screens/Profile').then((m) => ({ default: m.Profile })))
const Bloom = lazy(() => import('./screens/Bloom').then((m) => ({ default: m.Bloom })))

const NAV: Array<{ to: string; label: string; icon: IconName }> = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/schedule', label: 'Schedule', icon: 'calendar' },
  { to: '/tasks', label: 'Tasks', icon: 'check' },
  { to: '/focus', label: 'Focus', icon: 'timer' },
  { to: '/profile', label: 'Profile', icon: 'user' },
]

const SIDE_EXTRA: Array<{ to: string; label: string; icon: IconName }> = [
  { to: '/plan', label: 'Plan week', icon: 'sparkle' },
  { to: '/subjects', label: 'Subjects', icon: 'book' },
  { to: '/revision', label: 'Revision', icon: 'leaf' },
  { to: '/exams', label: 'Exams', icon: 'target' },
  { to: '/insights', label: 'Insights', icon: 'trophy' },
  { to: '/garden', label: 'Garden', icon: 'flower' },
]

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AppProvider>
  )
}

function Shell() {
  const app = useApp()
  const location = useLocation()
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(() => {/* offline support unavailable */ })
    }
  }, [])

  const isBloom = location.pathname === '/bloom'
  const showBloomFab = !isBloom && location.pathname !== '/focus'

  return (
    <div className={`app-shell${location.pathname === '/' ? '' : ' with-sidebar'}`}>
      <aside className="sidebar">
        <div className="brand"><Icon name="flower" className="brand-mark" /> Study With Maryem</div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name={n.icon} size={19} /> {n.label}
          </NavLink>
        ))}
        <div className="spacer" />
        {SIDE_EXTRA.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name={n.icon} size={19} /> {n.label}
          </NavLink>
        ))}
      </aside>

      <main className="main-area">
        <Suspense fallback={<div className="skeleton" style={{ height: 220 }} />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/focus" element={<Focus />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/revision" element={<Revision />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/insights" element={<Analytics />} />
            <Route path="/garden" element={<Garden />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/bloom" element={<Bloom />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

      {showBloomFab && (
        <NavLink to="/bloom" className="bloom-fab" aria-label="Open Bloom AI">
          <Mascot kind={app.profile.mascot} size={40} mood="idle" />
        </NavLink>
      )}

      <nav className="bottom-nav" aria-label="Primary">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name={n.icon} size={20} />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>

      {!online && (
        <div className="toasts"><div className="toast" role="status">You’re offline — changes are saved on this device.</div></div>
      )}
    </div>
  )
}

// Onboarding overlay lives outside providers below to keep App simple.
