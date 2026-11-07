import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { openChangePassword } from '../../utils/accountEvents'
import BottomNav from '../../components/BottomNav'
import MobileSheet from '../../components/MobileSheet'
import crystal from '../../assets/landing/forge-crystal-logo.webp'
import homeIcon from '../../assets/instructor/nav-home.svg'
import bookIcon from '../../assets/instructor/nav-book.svg'
import trophyIcon from '../../assets/instructor/nav-trophy.svg'
import passwordEmblem from '../../assets/account-password.png'
import exitPortal from '../../assets/account-logout.png'
import './InstructorRefined.css'
import '../../components/AccountPanels.css'

const menuItems = [
  { path: '/instructor', label: 'Dashboard', shortLabel: 'Home', icon: homeIcon },
  { path: '/instructor/classes', label: 'My Classes', shortLabel: 'Classes', icon: bookIcon },
  { path: '/instructor/achievements', label: 'Achievements', shortLabel: 'Awards', icon: trophyIcon },
]

export default function InstructorDashboard({ user, onLogout }) {
  const [showAccount, setShowAccount] = useState(false)
  const accountAnchor = useRef(null)
  const accountTrigger = useRef(null)
  const firstAccountAction = useRef(null)
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
    firstAccountAction.current?.focus({ preventScroll: true })
    const close = event => {
      if (event.key === 'Escape') {
        setShowAccount(false)
        accountTrigger.current?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [showAccount])

  const closeAccount = () => {
    setShowAccount(false)
    accountTrigger.current?.focus({ preventScroll: true })
  }

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
            <button ref={accountTrigger} type="button" className="ir-account-trigger focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-200" aria-label="Open instructor account menu" aria-expanded={showAccount}
              aria-controls={showAccount ? 'instructor-account-panel' : undefined} onClick={() => setShowAccount(value => !value)}>
              {name}
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-amber-200"><path d="m4 6 4 4 4-4" /></svg>
            </button>
            <MobileSheet show={showAccount} onClose={closeAccount} anchorRef={accountAnchor} widthClass="sm:w-72" panelClassName="forge-account-sheet">
              <section id="instructor-account-panel" aria-labelledby="instructor-account-name">
                <div className="forge-account-identity">
                  <h2 id="instructor-account-name" className="font-cinzel">{name}</h2>
                  <p><span className="forge-account-emblem forge-account-emblem-id" aria-hidden="true" />Instructor</p>
                </div>
                <div className="forge-account-actions">
                  <button ref={firstAccountAction} type="button" onClick={() => { closeAccount(); openChangePassword() }}>
                    <img src={passwordEmblem} alt="" />Change password
                  </button>
                  <button type="button" className="forge-account-sign-out" onClick={() => { setShowAccount(false); onLogout() }}>
                    <img src={exitPortal} alt="" />Sign out
                  </button>
                </div>
              </section>
            </MobileSheet>
          </div>
        </header>
        <div className="instructor-content"><Outlet context={user} /></div>
      </main>
      <BottomNav tabs={menuItems.map(item => ({ id: item.path, icon: <img src={item.icon} alt="" width="22" height="22" />, shortLabel: item.shortLabel }))} activeId={activePath} onSelect={navigate} />
    </div>
  )
}
