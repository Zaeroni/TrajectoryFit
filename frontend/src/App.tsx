import { useState } from 'react'
import { HomeIcon, LogIcon, PersonIcon, TrendsIcon, TrainIcon } from './components/Icons'
import { Dashboard } from './screens/Dashboard'
import { FactorDetail } from './screens/FactorDetail'
import { HowItWorks } from './screens/HowItWorks'
import { Log } from './screens/Log'
import { Onboarding } from './screens/Onboarding'
import { Settings } from './screens/Settings'
import { Terms } from './screens/Terms'
import { Train } from './screens/Train'
import { Trends } from './screens/Trends'
import { useApp } from './state/AppContext'
import type { FactorKey, Nav, Screen } from './nav'

const NAV_ITEMS: { screen: Screen; label: string; Icon: typeof HomeIcon }[] = [
  { screen: 'home', label: 'Home', Icon: HomeIcon },
  { screen: 'log', label: 'Log', Icon: LogIcon },
  { screen: 'trends', label: 'Trends', Icon: TrendsIcon },
  { screen: 'train', label: 'Train', Icon: TrainIcon },
]

export default function App() {
  const { users, currentUser, setCurrentUserId, loadingUsers, usersError, toastMessage } = useApp()
  const [screen, setScreen] = useState<Screen>('home')
  const [prevScreen, setPrevScreen] = useState<Screen>('home')
  const [factorKey, setFactorKey] = useState<FactorKey>('protein')

  // With no users at all there is nothing to show but setup.
  const noUsers = !loadingUsers && !usersError && users.length === 0
  const activeScreen: Screen = noUsers ? 'onboarding' : screen

  const nav: Nav = {
    go: (s) => { setPrevScreen(screen); setScreen(s) },
    openFactor: (k) => { setPrevScreen(screen); setFactorKey(k); setScreen('factor') },
    back: () => setScreen(prevScreen === 'factor' || prevScreen === screen ? 'home' : prevScreen),
  }

  return (
    <div className={`app${activeScreen === 'onboarding' ? ' app-bare' : ''}`}>
      <header className="frame-header">
        <span className="brand">TrajectoryFit</span>
        <div className="user-switch">
          <button className="icon-btn" onClick={() => nav.go('settings')} aria-label="Settings">
            <PersonIcon style={{ width: 16, height: 16 }} />
          </button>
          <select
            className="user-select"
            value={currentUser?.id ?? ''}
            onChange={(e) => setCurrentUserId(e.target.value)}
            aria-label="Select user"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}{u.expectedBand ? ` · ${u.expectedBand}` : ''}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="content">
        {loadingUsers && <div className="spinner" />}
        {usersError && <div className="center-note">Couldn’t reach the API: {usersError}</div>}
        {!loadingUsers && !usersError && (
          <>
            {activeScreen === 'home' && <Dashboard nav={nav} />}
            {activeScreen === 'factor' && <FactorDetail factorKey={factorKey} nav={nav} />}
            {activeScreen === 'log' && <Log />}
            {activeScreen === 'trends' && <Trends />}
            {activeScreen === 'train' && <Train nav={nav} />}
            {activeScreen === 'howitworks' && <HowItWorks nav={nav} />}
            {activeScreen === 'settings' && <Settings nav={nav} />}
            {activeScreen === 'terms' && <Terms nav={nav} />}
            {activeScreen === 'onboarding' && <Onboarding nav={nav} canCancel={!noUsers} />}
          </>
        )}
      </main>

      {activeScreen !== 'onboarding' && <nav className="bottom-nav">
        <span className="sidebar-brand">TrajectoryFit</span>
        {NAV_ITEMS.map(({ screen: s, label, Icon }) => {
          const active = screen === s || (s === 'home' && (screen === 'factor' || screen === 'howitworks'))
          return (
            <button key={s} className={`nav-item${active ? ' active' : ''}`} onClick={() => nav.go(s)}>
              <Icon style={{ width: 20, height: 20 }} />
              {label}
            </button>
          )
        })}
      </nav>}

      <div className={`toast${toastMessage ? ' show' : ''}`}>{toastMessage}</div>
    </div>
  )
}
