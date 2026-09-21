// instructor shell — sidebar + outlet. matches admin visual language exactly.
// uses <Outlet/> so all child routes (classes, problems, etc) render inside it.
// sidebar is collapsible, purple/pink brand, platform stats at bottom like admin.

// only 3 nav items shown by default (dashboard, classes, achievements) because
// the other pages (problems, announcements, materials) are accessed from inside
// the class detail view — not top-level nav items. if that ever changes, add
// them to menuItems below.

// mobile: the sidebar is desktop-only (hidden below sm:) — on a phone there's
// no room for a permanent 64/20-wide column, so navigation moves to a bottom
// tab bar instead (same BottomNav component the student side uses).

import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import BottomNav from '../../components/BottomNav'
import MobileSheet from '../../components/MobileSheet'
import { API_BASE } from '../../api/client'

export default function InstructorDashboard({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarStats, setSidebarStats] = useState({ students: 0, problems: 0, classes: 0 })
  // account menu — on mobile the sidebar (and its Sign Out button) is hidden,
  // so this is the only way to sign out from a phone. Tapping the header
  // user badge opens it (bottom sheet on mobile, dropdown on desktop).
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const accountMenuRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()

  // fetch just enough for the sidebar stat strip — same pattern as admin
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${API_BASE}/api/instructor/dashboard-stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setSidebarStats({
            students: data.total_students ?? 0,
            problems: data.total_problems ?? 0,
            classes:  (data.assigned_sections ?? []).length,
          })
        }
      } catch { /* sidebar stats failing silently is fine */ }
    }
    fetchStats()
  }, [])

  const menuItems = [
    { path: '/instructor',              label: 'Dashboard',    shortLabel: 'Home',    icon: '📊', exact: true },
    { path: '/instructor/classes',      label: 'My Classes',   shortLabel: 'Classes', icon: '🏫' },
    { path: '/instructor/achievements', label: 'Achievements', shortLabel: 'Awards',  icon: '🏆' },
  ]

  // Check whether a nav item matches the current route
  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  const activeTabId = [...menuItems].reverse().find(item => isActive(item.path, item.exact))?.path

  return (
    <div className="min-h-screen max-w-screen overflow-x-hidden bg-slate-950 text-slate-100 flex">

      {/* ── Sidebar (desktop only — mobile nav is the bottom tab bar) ───── */}
      <aside className={`hidden sm:flex fixed h-full bg-slate-900 border-r border-purple-900/40 transition-all duration-300 z-50 flex-col ${sidebarOpen ? 'w-64' : 'w-20'}`}>

        {/* Brand */}
        <div className="p-5 border-b border-purple-900/40 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-purple-600/30 shrink-0">
            📚
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="font-black text-base text-white leading-tight">Forge.Instructor</h1>
              <p className="text-xs text-slate-500">Teaching Panel</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="p-4 space-y-1 flex-1">
          {menuItems.map(item => {
            const active = isActive(item.path, item.exact)
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={!sidebarOpen ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-gradient-to-r from-purple-600/20 to-pink-600/10 text-white border border-purple-600/30 shadow-sm shadow-purple-600/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <span className="text-lg shrink-0">{item.icon}</span>
                {sidebarOpen && (
                  <span className={`font-medium text-sm whitespace-nowrap ${active ? 'text-white' : ''}`}>
                    {item.label}
                  </span>
                )}
                {/* active left indicator */}
                {active && sidebarOpen && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Platform Stats — same strip as admin sidebar */}
        {sidebarOpen && (
          <div className="px-4 pb-3 shrink-0">
            <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold mb-2 px-1">My Stats</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Students', value: sidebarStats.students },
                { label: 'Problems', value: sidebarStats.problems },
                { label: 'Classes',  value: sidebarStats.classes },
              ].map(s => (
                <div key={s.label} className="bg-slate-800/60 rounded-lg px-3 py-2 text-center border border-slate-700/40">
                  <p className="text-white font-bold text-sm">{s.value}</p>
                  <p className="text-slate-500 text-[10px]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sign Out lives only in the header's account menu now (top-right,
            reachable on mobile and desktop alike) — see below. */}

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 w-6 h-6 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition shadow-lg text-xs"
          title={sidebarOpen ? 'Collapse' : 'Expand'}
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────────── */}
      <main className={`flex-1 min-w-0 transition-all duration-300 min-h-screen ${sidebarOpen ? 'sm:ml-64' : 'sm:ml-20'}`}>

        {/* Top Bar */}
        <header className="min-h-14 sm:h-16 bg-slate-900/80 backdrop-blur border-b border-purple-900/40 flex items-center justify-between gap-3 px-3 sm:px-6 py-2 sm:py-0 sticky top-0 z-40">
          <div className="flex items-center gap-3 min-w-0">
            {/* current page title derived from path */}
            <div className="min-w-0">
              <p className="text-white font-bold text-sm truncate">
                {location.pathname === '/instructor' && 'Dashboard'}
                {location.pathname.startsWith('/instructor/classes') && 'My Classes'}
                {location.pathname.startsWith('/instructor/class/') && 'Class Detail'}
                {location.pathname.startsWith('/instructor/problems') && 'Quests'}
                {location.pathname.startsWith('/instructor/create-problem') && 'Create Quest'}
                {location.pathname.startsWith('/instructor/problem/') && 'Quest Submissions'}
                {location.pathname.startsWith('/instructor/announcements') && 'Announcements'}
                {location.pathname.startsWith('/instructor/materials') && 'Course Materials'}
                {location.pathname.startsWith('/instructor/achievements') && 'Achievements'}
                {location.pathname.startsWith('/instructor/analytics') && 'Analytics'}
                {location.pathname.startsWith('/instructor/plagiarism') && 'Plagiarism Check'}
                {/* fallback — catches any path not listed above */}
                {![
                  '/instructor',
                  '/instructor/classes', '/instructor/class/',
                  '/instructor/problems', '/instructor/create-problem',
                  '/instructor/problem/', '/instructor/announcements',
                  '/instructor/materials', '/instructor/achievements',
                  '/instructor/analytics', '/instructor/plagiarism',
                ].some(p => location.pathname === p || location.pathname.startsWith(p + '/') || location.pathname.startsWith(p)) && 'Instructor Panel'}
              </p>
              <p className="text-slate-500 text-xs hidden sm:block">Forge.dev Instructor Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* system status pill — same as admin, hidden on small screens to save space */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs font-semibold">All Systems OK</span>
            </div>
            {/* user badge — tappable so Sign Out is reachable on mobile too */}
            <div ref={accountMenuRef} className="relative">
              <button
                onClick={() => setShowAccountMenu(v => !v)}
                className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition"
              >
                <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-md flex items-center justify-center text-xs font-bold shrink-0">
                  {(user?.full_name || user?.username || 'I')[0].toUpperCase()}
                </div>
                <span className="text-white text-xs font-medium hidden sm:block">
                  {user?.full_name || user?.username}
                </span>
                <span className="text-slate-500 text-[10px]">▼</span>
              </button>
              <MobileSheet show={showAccountMenu} onClose={() => setShowAccountMenu(false)} widthClass="sm:w-56" anchorRef={accountMenuRef}>
                <div className="p-4 border-b border-purple-600/30">
                  <p className="font-bold text-white text-sm truncate">{user?.full_name || user?.username}</p>
                  <p className="text-xs text-purple-300 mt-0.5">Instructor</p>
                </div>
                <div className="py-2">
                  <button
                    onClick={() => { setShowAccountMenu(false); onLogout() }}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:text-red-300 hover:bg-red-600/10 transition flex items-center gap-3"
                  >
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              </MobileSheet>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 sm:p-6 pb-24 sm:pb-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <BottomNav
        tabs={menuItems.map(item => ({ id: item.path, icon: item.icon, shortLabel: item.shortLabel }))}
        activeId={activeTabId}
        onSelect={(path) => navigate(path)}
      />
    </div>
  )
}
