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
  const backgroundRef = useRef(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const name = user?.full_name || user?.username || 'Instructor'
  const activePath = pathname === '/instructor' || pathname === '/instructor/'
    ? '/instructor'
    : pathname.startsWith('/instructor/achievements') ? '/instructor/achievements' : '/instructor/classes'

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    let frame = 0
    const reset = () => {
      cancelAnimationFrame(frame)
      if (backgroundRef.current) backgroundRef.current.style.transform = ''
    }
    const move = event => {
      if (motion.matches || !pointer.matches) return
      const x = Math.max(-24, Math.min(24, (event.clientX - window.innerWidth / 2) / 50))
      const y = Math.max(-24, Math.min(24, (event.clientY - window.innerHeight / 2) / 50))
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (backgroundRef.current) backgroundRef.current.style.transform = `translate(${x}px, ${y}px)`
      })
    }
    window.addEventListener('mousemove', move, { passive: true })
    window.addEventListener('blur', reset)
    motion.addEventListener('change', reset)
    pointer.addEventListener('change', reset)
    return () => {
      reset()
      window.removeEventListener('mousemove', move)
      window.removeEventListener('blur', reset)
      motion.removeEventListener('change', reset)
      pointer.removeEventListener('change', reset)
    }
  }, [])

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
      <div className="ir-atmosphere-viewport" aria-hidden="true">
        <div className="ir-atmosphere" ref={backgroundRef}>
          <div className="ir-nebula ir-nebula-one" />
          <div className="ir-nebula ir-nebula-two" />
          <div className="ir-nebula ir-nebula-three" />
          {Array.from({ length: 50 }, (_, i) => (
            <span key={i} className={`ir-particle${i % 7 === 0 ? ' ir-particle-gold' : ''}`}
              style={{ left: `${(i * 67 + 13) % 100}%`, top: `${(i * 43 + 7) % 100}%`, animationDelay: `${i % 5}s`, animationDuration: `${3 + i % 5}s` }} />
          ))}
        </div>
      </div>
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
