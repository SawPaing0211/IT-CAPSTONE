import './admin-controls.css'
import passwordEmblem from '../../assets/account-password.png'
import exitPortal from '../../assets/account-logout.png'
import adminEmblem from '../../assets/admin/role-admin.png'
import crystal from '../../assets/landing/forge-crystal-logo.webp'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { openChangePassword } from '../../utils/accountEvents'
import AdminNavIcon from './AdminNavIcon'
import DashboardOverview from './DashboardOverview'
import UserManagement from './UserManagement'
import InstructorAssignments from './InstructorAssignments'
import ActivityLogs from './ActivityLogs'
import SectionsManagement from './SectionsManagement'
import { API_BASE, authFetch } from '../../api/client'

// Backend lives here. Change this if we are about to deploy to a real server.  
const API = `${API_BASE}/api`

function AdminBrand({ collapsed = false }) {
  return <div className="flex min-w-0 items-center gap-3">
    <img src={crystal} alt={collapsed ? "Forge.dev" : ""} width="28" height="42" className="h-[42px] w-7 shrink-0 object-contain" />
    {!collapsed && <div className="min-w-0">
      <span className="font-cinzel block whitespace-nowrap text-xl font-bold tracking-wide text-white">FORGE.DEV</span>
      <span className="block text-xs text-slate-400">Administration</span>
    </div>}
  </div>
}

// ─── TAB LIST ────────────────────────────────────────────────────────────────
// Each entry here = one tab in the sidebar and mobile bottom bar.
// Press Alt+2 through Alt+5 to jump directly to each tab.
// Badge numbers are added at runtime from the API — nothing is hardcoded here.
const TAB_DEFS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    shortLabel: 'Home',
    description: 'System overview and quick actions',
  },
  {
    id: 'sections',
    label: 'Class Codes',
    shortLabel: 'Classes',
    description: 'Manage class codes, schedules, and enrollment',
    // Badge = students enrolled in a section that got set to inactive.
    // They exist in the DB but can't access any content until you reactivate
    // their section. Fix it in the Class Codes tab.
  },
  {
    id: 'users',
    label: 'User Management',
    shortLabel: 'Users',
    description: 'Manage students, instructors, and administrators',
  },
  {
    id: 'assignments',
    label: 'Instructor Assignments',
    shortLabel: 'Assign',
    description: 'Manage instructor subject and class code assignments',
  },
  {
    id: 'activity',
    label: 'Activity Logs',
    shortLabel: 'Logs',
    description: 'Comprehensive audit trail of all administrative actions',
    // Badge = audit log entries created today (from stats.today in the API).
  },
]

// One tip shown per day in the banner strip. Rotates based on today's date.
const TIPS = [
  'Press Alt+1–5 to jump to any tab instantly.',
  'Open Activity Logs to review recorded administrative actions.',
  'Find Bulk Enrollment Upload in User Management.',
  'Enrollment alerts appear when students are stuck in inactive sections.',
]

// ─── SYSTEM HEALTH CHIP ───────────────────────────────────────────────────────
// Converts the system_health string from the API into Tailwind color classes.
// Shows as a small colored dot + label in the header and role banner.
function healthDisplay(health, maintenanceMode) {
  if (maintenanceMode)          return { color: 'bg-amber-400',  text: 'Maintenance',    textColor: 'text-amber-400',  border: 'border-amber-600/20',  bg: 'bg-amber-600/10',  pulse: false }
  if (health === 'operational') return { color: 'bg-green-400',  text: 'Database connected', textColor: 'text-green-400',  border: 'border-green-600/20',  bg: 'bg-green-600/10',  pulse: true  }
  if (health === 'degraded')    return { color: 'bg-yellow-400', text: 'Database degraded', textColor: 'text-yellow-400', border: 'border-yellow-600/20', bg: 'bg-yellow-600/10', pulse: false }
  if (!health) return { color: 'bg-slate-400', text: 'Database status unavailable', textColor: 'text-slate-300', border: 'border-slate-600/40', bg: 'bg-slate-800/30', pulse: false }
  return                               { color: 'bg-red-400',    text: 'Database unreachable', textColor: 'text-red-400',    border: 'border-red-600/20',    bg: 'bg-red-600/10',    pulse: false }
}

// ─── PROFILE DROPDOWN ─────────────────────────────────────────────────────────
// Avatar button in the top-right header.
// Click it to see your username, open keyboard shortcuts, or sign out.
function ProfileDropdown({ user, onLogout, onShortcuts }) {
  const [open, setOpen] = useState(false)
  const root = useRef(null)
  const trigger = useRef(null)
  const name = user?.full_name || user?.username || 'Admin'
  const item = 'flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-100 hover:bg-violet-950/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300'

  useEffect(() => {
    if (!open) return
    const closeOutside = event => {
      if (!root.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  const choose = action => {
    setOpen(false)
    trigger.current?.focus()
    action()
  }

  return (
    <div ref={root} className="relative" onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }} onKeyDown={event => {
      if (open && event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        setOpen(false)
        trigger.current?.focus()
      }
    }}>
      <button type="button" ref={trigger} onClick={() => setOpen(value => !value)}
        className={`flex min-h-11 items-center gap-2.5 rounded-xl border px-2.5 py-1.5 text-slate-100 hover:bg-violet-950/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${open ? 'border-amber-300/60 bg-violet-950/50' : 'border-amber-300/25'}`}
        aria-label="Admin account options" aria-expanded={open} aria-controls={open ? 'admin-account-panel' : undefined}>
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border border-amber-300/50 bg-violet-950 font-cinzel font-bold text-amber-100">
          {name[0].toUpperCase()}
        </span>
        <span className="hidden max-w-32 truncate text-sm font-semibold sm:block">{name}</span>
        <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className={`size-4 text-amber-200 ${open ? 'rotate-180' : ''}`}>
          <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <section id="admin-account-panel" aria-label="Admin account" className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-xl border border-amber-300/35 bg-[#10162b] shadow-xl shadow-black/35">
          <div className="border-b border-amber-300/20 px-4 py-4">
            <h3 className="break-words font-cinzel text-lg font-semibold text-white">{name}</h3>
            <p className="mt-1 text-xs font-medium text-amber-200">Administrator</p>
            {user?.email && <p className="mt-1 break-all text-sm text-slate-300">{user.email}</p>}
          </div>
          <div className="space-y-1 p-2">
            <button type="button" onClick={() => choose(onShortcuts)} className={item}>
              <svg aria-hidden="true" className="size-6 shrink-0 text-amber-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M7 10h.01m3.3 0h.01m3.3 0h.01m3.3 0h.01M8 14h8" /></svg>
              Keyboard shortcuts
            </button>
            <button type="button" onClick={() => choose(openChangePassword)} className={item}>
              <img src={passwordEmblem} alt="" className="size-6 shrink-0 object-contain" />
              Change password
            </button>
          </div>
          <div className="border-t border-amber-300/20 p-2">
            <button type="button" onClick={onLogout} className={item + ' text-rose-200 hover:bg-rose-950/40'}>
              <img src={exitPortal} alt="" className="size-6 shrink-0 object-contain" />
              Sign out
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

// ─── KEYBOARD SHORTCUTS MODAL ─────────────────────────────────────────────────
// Simple popup listing all keyboard shortcuts.
// Open it from: Profile menu → "Keyboard Shortcuts"
function ShortcutsModal({ open, onClose }) {
  const dialog = useRef(null)
  useEffect(() => {
    if (!open) return
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [open])
  if (!open) return null
  return (
    <dialog ref={dialog} aria-labelledby="admin-shortcuts-title" onCancel={event => { event.preventDefault(); onClose() }}
      onClick={event => { if (event.target === event.currentTarget) onClose() }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-amber-300/35 bg-[#10162b] p-0 text-slate-100 backdrop:bg-black/65">
      <div className="p-5 sm:p-6">
        <h3 id="admin-shortcuts-title" className="mb-4 font-cinzel text-lg font-semibold text-white">Keyboard shortcuts</h3>
        <ul className="space-y-2.5">
          {[
            { keys: ['Alt',  '1–5'], desc: 'Switch to tab 1–5'      },
            { keys: ['Esc'],         desc: 'Close any open popup'   },
            { keys: ['Tab'],         desc: 'Navigate sidebar items' },
            { keys: ['Enter'],       desc: 'Activate focused item'  },
          ].map(item => (
            <li key={item.desc} className="flex items-center justify-between">
              <span className="text-sm text-slate-400">{item.desc}</span>
              <span className="flex gap-1">
                {item.keys.map(k => (
                  <kbd key={k} className="px-2 py-0.5 bg-slate-800 border border-slate-600 rounded text-xs text-slate-300">{k}</kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <button onClick={onClose} className="mt-5 min-h-11 w-full rounded-lg border border-amber-300/35 text-sm text-amber-100 hover:bg-amber-300/10 focus-visible:outline focus-visible:outline-amber-300">
          Close
        </button>
      </div>
    </dialog>
  )
}

// ─── MAIN LAYOUT SHELL ────────────────────────────────────────────────────────
// Renders the sidebar, header, and routes to the correct tab component.
// Does NOT contain any dashboard metrics — those all live in DashboardOverview.
export default function AdminDashboard({ user, onLogout }) {

  const [activeTab,        setActiveTab]        = useState('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)  // desktop icon-only mode
  const [shortcutsOpen,    setShortcutsOpen]    = useState(false)
  const [tipDismissed,     setTipDismissed]     = useState(false)

  // Stats fetched from the backend
  const [dashStats,    setDashStats]    = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError,   setStatsError]   = useState(null)  // set when the API call fails
  const [lastSync,     setLastSync]     = useState(null)  // timestamp of last success
  const [syncing,      setSyncing]      = useState(false) // true while manually refreshing

  const mainRef  = useRef(null)
  const [tipIndex] = useState(() => Math.floor(Date.now() / 86400000) % TIPS.length)

  // ── FETCH STATS ──────────────────────────────────────────────────────────
  // Hits GET /api/admin/dashboard-stats and saves the result.
  // Called on first load, every 60 seconds, and when the user clicks Refresh.
  //
  // If it fails (network down, backend off, bad token):
  //   - statsError is set → "⚠ Offline" label appears in the sidebar mini-grid
  //   - All counts show 0 (the safe fallback)
  //   - Nothing crashes — it just retries on the next 60-second tick
  const fetchStats = useCallback(async (showSpinner = false) => {
    if (showSpinner) setSyncing(true)
    setStatsError(null)
    try {
      const res = await authFetch(API + '/admin/dashboard-stats')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setDashStats(data)
      setLastSync(new Date())
    } catch (err) {
      setStatsError(err.message) // triggers "⚠ Offline" in the sidebar
    } finally {
      setStatsLoading(false)
      if (showSpinner) setSyncing(false)
    }
  }, [])

  useEffect(() => {
    const initial = setTimeout(fetchStats, 0)
    const timer = setInterval(() => fetchStats(), 60_000)
    return () => { clearTimeout(initial); clearInterval(timer) }
  }, [fetchStats])

  // ── TAB BADGES ───────────────────────────────────────────────────────────
  // Merges static tab definitions with live badge counts from the API.
  const tabs = useMemo(() => TAB_DEFS.map(tab => {
    if (!dashStats) return { ...tab, badge: 0 }
    switch (tab.id) {
      case 'sections': return { ...tab, badge: dashStats.enrollment_alerts ?? 0 }
      case 'activity': return { ...tab, badge: dashStats.stats?.today ?? 0 }
      default:         return { ...tab, badge: 0 }
    }
  }), [dashStats])

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId)
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [activeTab])

  useEffect(() => {
    const handler = event => {
      if (!event.altKey || event.ctrlKey || event.metaKey || event.repeat || event.defaultPrevented) return
      if (document.querySelector('dialog[open], [aria-modal="true"]')) return
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]')) return
      const tab = TAB_DEFS[Number(event.key) - 1]
      if (!tab) return
      event.preventDefault()
      handleTabChange(tab.id)
      requestAnimationFrame(() => mainRef.current?.focus({ preventScroll: true }))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleTabChange])

  // Manually re-fetch stats and show the syncing spinner
  const handleSync = useCallback(() => fetchStats(true), [fetchStats])

  const activeTabData = useMemo(() => tabs.find(t => t.id === activeTab), [tabs, activeTab])
  const sidebarWidth  = sidebarCollapsed ? 'w-[72px]' : 'w-64'
  const mainMargin = sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-64'
  const health        = healthDisplay(dashStats?.system_health, dashStats?.maintenance_mode)

  // ── SIDEBAR NAV ITEM ─────────────────────────────────────────────────────
  const renderSidebarNavItem = tab => {
    const isActive = activeTab === tab.id
    return (
      <button
        key={tab.id}
        onClick={() => handleTabChange(tab.id)}
        aria-label={tab.badge ? `${tab.label}, ${tab.badge}` : tab.label}
        aria-current={isActive ? 'page' : undefined}
        title={sidebarCollapsed ? tab.label : undefined}
        className={`
          relative min-h-11 w-full flex items-center rounded-xl transition-all duration-200
          ${sidebarCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5'}
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 focus:ring-offset-slate-900
          ${isActive
            ? 'bg-violet-950 text-amber-50 ring-1 ring-inset ring-violet-400/45'
            : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }
        `}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-amber-300 rounded-full" />
        )}
        <span className="flex-shrink-0"><AdminNavIcon name={tab.id} className="size-6" /></span>
        {!sidebarCollapsed && (
          <span className="font-medium text-sm whitespace-nowrap flex-1 text-left">{tab.label}</span>
        )}
        {tab.badge > 0 && !sidebarCollapsed && (
          <span className="ml-auto text-xs bg-pink-500 text-white font-bold rounded-full px-1.5 py-0.5 leading-none">
            {tab.badge}
          </span>
        )}
        {tab.badge > 0 && sidebarCollapsed && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-amber-300 rounded-full" />
        )}
      </button>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="admin-workspace min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">

      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

        <aside
          className={`fixed left-0 top-0 h-full bg-[#080b1d] border-r border-amber-300/20 z-50 hidden flex-col lg:flex ${sidebarWidth}`}
          aria-label="Sidebar navigation"
        >
          <div className="flex min-h-[82px] items-center border-b border-amber-300/15 px-5 py-3">
            <AdminBrand collapsed={sidebarCollapsed} />
          </div>

          {/* Tab links */}
          <nav id="admin-sidebar-navigation" className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" role="navigation" aria-label="Main navigation">
            {tabs.map(renderSidebarNavItem)}
          </nav>

          {/* 4-number stats grid at the bottom of the expanded sidebar.
              Shows live numbers from the last API fetch.
              "⚠ Offline" appears here when fetchStats() fails — your backend is
              unreachable or returned an error. Numbers fall back to 0. */}
          {!sidebarCollapsed && (
            <div className="px-4 py-3 border-t border-slate-800/60 flex-shrink-0">
              <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                <span>Platform Stats</span>
                {statsError && <span className="text-red-400 text-[10px]">⚠ Offline</span>}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { key: 'total_students',     label: 'Students'    },
                  { key: 'total_instructors',  label: 'Instructors' },
                  { key: 'active_users_today', label: 'Active Today' },
                  { key: 'enrollment_alerts',  label: 'Alerts',      highlight: true },
                ].map(({ key, label, highlight }) => (
                  <div key={key} className="bg-slate-800/50 rounded-lg px-2 py-1.5 text-center">
                    {statsLoading
                      ? <div className="h-4 w-8 bg-slate-700 rounded animate-pulse mx-auto mb-0.5" />
                      : <p className={`text-sm font-bold ${highlight && (dashStats?.[key] ?? 0) > 0 ? 'text-pink-400' : 'text-white'}`}>
                          {dashStats?.[key]?.toLocaleString() ?? '—'}
                        </p>
                    }
                    <p className="text-[9px] text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collapse / expand toggle */}
          <div className="px-3 py-3 border-t border-slate-800/60 flex-shrink-0">
            <button
              type="button"
              onClick={() => setSidebarCollapsed(c => !c)}
              aria-expanded={!sidebarCollapsed}
              aria-controls="admin-sidebar-navigation"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : undefined}
              className="admin-button admin-sidebar-toggle"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="size-5 shrink-0" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M9 5v14" />
                <path d={sidebarCollapsed ? 'm14 9 3 3-3 3' : 'm17 9-3 3 3 3'} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {!sidebarCollapsed && <span>Collapse sidebar</span>}
            </button>
          </div>
        </aside>
        <nav className="admin-mobile-nav fixed inset-x-0 bottom-0 z-30 flex border-t border-amber-300/25 bg-[#080b1d] lg:hidden" role="navigation" aria-label="Bottom navigation">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              aria-label={tab.badge ? `${tab.label}, ${tab.badge}` : tab.label}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`relative flex min-h-[58px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors ${activeTab === tab.id ? 'bg-violet-950/70 text-amber-100' : 'text-slate-300'}`}
            >
              {activeTab === tab.id && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-amber-300 rounded-full" />
              )}
              <AdminNavIcon name={tab.id} className="size-6" />
              <span className="text-[10px] font-medium">{tab.shortLabel}</span>
              {tab.badge > 0 && (
                <span className="absolute top-1 right-1 rounded-full bg-violet-700 px-1 text-[10px] font-bold leading-4 text-white" aria-hidden="true">{tab.badge > 99 ? '99+' : tab.badge}</span>
              )}
            </button>
          ))}
        </nav>
      <main className={`admin-main ${mainMargin} min-h-screen min-w-0 flex flex-col`}>
        {/* Sticky header bar */}
        <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/60 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40 gap-3" role="banner">
          <div className="flex items-center gap-3 min-w-0">
            <img src={crystal} alt="Forge.dev" width="19" height="30" className="h-[30px] w-[19px] shrink-0 object-contain lg:hidden" />
            <div className="min-w-0">
              <h1 className="font-cinzel text-base sm:text-xl font-semibold text-white leading-tight">{activeTabData?.label}</h1>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate hidden sm:block mt-0.5">{activeTabData?.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Health dot — green/yellow/red/amber */}
            <div className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${health.bg} border ${health.border}`}>
              <span className={`w-1.5 h-1.5 ${health.color} rounded-full ${health.pulse ? 'animate-pulse' : ''}`} />
              <span className={`text-[11px] ${health.textColor} font-medium whitespace-nowrap`}>
                {statsLoading ? 'Checking…' : statsError ? 'Status unavailable' : health.text}
              </span>
            </div>

            <ProfileDropdown user={user} onLogout={onLogout} onShortcuts={() => setShortcutsOpen(true)} />
          </div>
        </header>

        {/* Role banner — who is logged in + system health at a glance */}
        {activeTab === 'dashboard' && <div className="px-4 pt-5 sm:px-6">
          <div className="rounded-xl border border-amber-300/25 bg-[#111832] overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-4 flex-wrap">
              <img src={adminEmblem} alt="" className="h-11 w-11 shrink-0 object-contain" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-cinzel text-lg font-semibold text-white">Administration</h3>
                </div>
                <p className="text-slate-300 text-xs mt-1">
                  User management · Academic structure · System configuration · Audit logs
                </p>
              </div>
            </div>

            {/* Daily tip — click ✕ to hide it for the rest of the session */}
            {!tipDismissed && (
              <div className="flex items-center gap-3 px-5 py-2.5 border-t border-white/5 bg-black/10">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex-shrink-0">Tip</span>
                <p className="text-xs text-slate-400 flex-1">{TIPS[tipIndex]}</p>
                <button onClick={() => setTipDismissed(true)} className="size-11 shrink-0 text-sm text-slate-300 hover:text-white" aria-label="Dismiss tip">✕</button>
              </div>
            )}
          </div>
        </div>}

        {/* The actual tab content */}
        <div ref={mainRef} tabIndex={-1} className="min-w-0 flex-1 px-4 py-5 sm:px-6">

          {activeTab === 'dashboard' && <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {lastSync
                ? `Updated ${lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : statsLoading ? 'Loading…' : 'Not yet synced'
              }
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="admin-button flex items-center gap-2 px-3 text-xs"
              aria-label="Sync metrics"
            >
              <span className={syncing ? 'animate-spin inline-block' : ''}>↻</span>
              {syncing ? 'Syncing…' : 'Sync metrics'}
            </button>
          </div>}

          {activeTab === 'dashboard'   && <DashboardOverview onNavigate={handleTabChange} stats={dashStats} loading={statsLoading} healthError={Boolean(statsError)} fetchStats={fetchStats} />}
          {activeTab === 'users'       && <UserManagement />}
          {activeTab === 'assignments' && <InstructorAssignments />}
          {activeTab === 'sections'    && <SectionsManagement />}
          {activeTab === 'activity'    && <ActivityLogs />}
        </div>
      </main>
    </div>    
  )
}

