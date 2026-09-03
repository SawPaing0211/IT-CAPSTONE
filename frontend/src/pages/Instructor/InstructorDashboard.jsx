// instructor shell — sidebar + outlet. matches admin visual language exactly.
// uses <Outlet/> so all child routes (classes, problems, etc) render inside it.
// sidebar is collapsible, purple/pink brand, platform stats at bottom like admin.
//
// only 3 nav items shown by default (dashboard, classes, achievements) because
// the other pages (problems, announcements, materials) are accessed from inside
// the class detail view — not top-level nav items. if that ever changes, add
// them to menuItems below.

import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'

export default function InstructorDashboard({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sidebarStats, setSidebarStats] = useState({ students: 0, problems: 0, classes: 0 })
  const navigate = useNavigate()
  const location = useLocation()

  // fetch just enough for the sidebar stat strip — same pattern as admin
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:5000/api/instructor/dashboard-stats', {
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
    { path: '/instructor',              label: 'Dashboard',    icon: '📊', exact: true },
    { path: '/instructor/classes',      label: 'My Classes',   icon: '🏫' },
    { path: '/instructor/achievements', label: 'Achievements', icon: '🏆' },
  ]

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside className={`fixed h-full bg-slate-900 border-r border-purple-900/40 transition-all duration-300 z-50 flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'}`}>

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

        {/* User + Logout */}
        <div className="p-4 border-t border-purple-900/40 shrink-0">
          <div className={`flex items-center gap-3 ${!sidebarOpen ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 shadow shadow-purple-600/30">
              {(user?.full_name || user?.username || 'I')[0].toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white truncate">{user?.full_name || user?.username}</p>
                <p className="text-xs text-purple-400">Instructor</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={onLogout}
              className="w-full mt-3 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 rounded-lg text-sm text-red-400 transition flex items-center justify-center gap-2"
            >
              <span>🚪</span> Sign Out
            </button>
          )}
        </div>

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
      <main className={`flex-1 transition-all duration-300 min-h-screen ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>

        {/* Top Bar */}
        <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-purple-900/40 flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            {/* current page title derived from path */}
            <div>
              <p className="text-white font-bold text-sm">
                {location.pathname === '/instructor' && 'Dashboard'}
                {location.pathname.startsWith('/instructor/classes') && 'My Classes'}
                {location.pathname.startsWith('/instructor/class/') && 'Class Detail'}
                {location.pathname.startsWith('/instructor/problems') && 'Activities'}
                {location.pathname.startsWith('/instructor/create-problem') && 'Create Activity'}
                {location.pathname.startsWith('/instructor/problem/') && 'Activity Submissions'}
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
              <p className="text-slate-500 text-xs">Forge.dev Instructor Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* system status pill — same as admin */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-xs font-semibold">All Systems OK</span>
            </div>
            {/* user badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg">
              <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-pink-600 rounded-md flex items-center justify-center text-xs font-bold">
                {(user?.full_name || user?.username || 'I')[0].toUpperCase()}
              </div>
              <span className="text-white text-xs font-medium hidden sm:block">
                {user?.full_name || user?.username}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
