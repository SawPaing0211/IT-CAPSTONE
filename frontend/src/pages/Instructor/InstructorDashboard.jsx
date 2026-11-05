import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { openChangePassword } from '../../utils/accountEvents'
import BottomNav from '../../components/BottomNav'
import MobileSheet from '../../components/MobileSheet'
import crystal from '../../assets/landing/forge-crystal-logo.webp'
import homeIcon from '../../assets/instructor/nav-home.svg'
import bookIcon from '../../assets/instructor/nav-book.svg'
import trophyIcon from '../../assets/instructor/nav-trophy.svg'
import './InstructorRefined.css'

const menuItems = [
  { path: '/instructor', label: 'Dashboard', shortLabel: 'Home', icon: homeIcon },
  { path: '/instructor/classes', label: 'My Classes', shortLabel: 'Classes', icon: bookIcon },
  { path: '/instructor/achievements', label: 'Achievements', shortLabel: 'Awards', icon: trophyIcon },
]

export default function InstructorDashboard({ user, onLogout }) {
  const [showAccount, setShowAccount] = useState(false)
  const accountAnchor = useRef(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const name = user?.full_name || user?.username || 'Instructor'
  const activePath = pathname === '/instructor' || pathname === '/instructor/'
    ? '/instructor'
    : pathname.startsWith('/instructor/achievements') ? '/instructor/achievements' : '/instructor/classes'

  useEffect(() => {
    if (!showAccount) return
    const close = event => {
      if (event.key === 'Escape') {
        setShowAccount(false)
        accountAnchor.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [showAccount])

  return (
    <div className="instructor-shell">
      <aside className="ir-sidebar">
        <div className="ir-brand"><img src={crystal} alt="" /><span>FORGE.DEV</span></div>
        <nav aria-label="Instructor navigation">
          {menuItems.map(item => (
            <button key={item.path} aria-current={activePath === item.path ? 'page' : undefined} onClick={() => navigate(item.path)}>
              <img src={item.icon} alt="" /><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="ir-sidebar-footer"><strong>Shadow Citadel</strong><p>Your teaching journey</p></div>
      </aside>
      <main className="ir-main">
        <header className="ir-topbar">
          <div className="ir-mobile-brand"><img src={crystal} alt="" /><span>FORGE.DEV</span></div>
          <div className="ir-identity"><strong>{name}</strong><span>Instructor workspace</span></div>
          <div ref={accountAnchor}>
            <button className="ir-account-trigger" aria-label="Open instructor account menu" aria-expanded={showAccount} onClick={() => setShowAccount(value => !value)}>{name}<span aria-hidden="true">⌄</span></button>
            <MobileSheet show={showAccount} onClose={() => setShowAccount(false)} anchorRef={accountAnchor} widthClass="sm:w-64" panelClassName="ir-account-panel">
              <div className="p-4 border-b border-amber-200/20"><strong>{name}</strong><p className="text-xs text-slate-300 mt-1">Instructor</p></div>
              <div className="p-2">
                <button className="ir-menu-option" onClick={() => { setShowAccount(false); openChangePassword() }}>Change password</button>
                <button className="ir-menu-option" onClick={() => { setShowAccount(false); onLogout() }}>Sign out</button>
              </div>
            </MobileSheet>
          </div>
        </header>
        <div className="instructor-content"><Outlet /></div>
      </main>
      <BottomNav tabs={menuItems.map(item => ({ id: item.path, icon: <img src={item.icon} alt="" width="22" height="22" />, shortLabel: item.shortLabel }))} activeId={activePath} onSelect={navigate} />
    </div>
  )
}
