import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import DashboardOverview from './DashboardOverview'
import UserManagement from './UserManagement'
import InstructorAssignments from './InstructorAssignments'
import ActivityLogs from './ActivityLogs'
import SubjectsManagement from './SubjectsManagement'
import SectionsManagement from './SectionsManagement'

// Backend lives here. Change this if we are about to deploy to a real server.  
const API = 'http://localhost:5000/api'

// Reads the login token from localStorage and adds it to every API request.
// Also Without this the backend rejects requests with 401 Unauthorized.
function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
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
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M2 10a8 8 0 1116 0 8 8 0 01-16 0zm8-3a1 1 0 00-.867.5L7.469 10H6a1 1 0 000 2h2a1 1 0 00.867-.5L10 9.732l1.633 2.768A1 1 0 0012.535 13l1.932-3.866A1 1 0 1012.6 8.268L11.07 11.4 9.4 8.5A1 1 0 0010 8V7a1 1 0 00-1-1H7a1 1 0 000 2h1z" />
      </svg>
    ),
    description: 'System overview and quick actions',
    contextAction: { label: 'Sync Metrics', icon: '↻' },
  },
  {
    id: 'sections',
    label: 'Class Codes',
    shortLabel: 'Classes',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
      </svg>
    ),
    description: 'Manage class codes, schedules, and enrollment',
    contextAction: { label: 'Export Enrollment', icon: '↓' },
    // Badge = students enrolled in a section that got set to inactive.
    // They exist in the DB but can't access any content until you reactivate
    // their section. Fix it in the Class Codes tab.
  },
  {
    id: 'users',
    label: 'User Management',
    shortLabel: 'Users',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
      </svg>
    ),
    description: 'Manage students, instructors, and administrators',
    contextAction: { label: 'Bulk Import', icon: '↑' },
  },
  {
    id: 'assignments',
    label: 'Instructor Assignments',
    shortLabel: 'Assign',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
      </svg>
    ),
    description: 'Manage instructor subject and class code assignments',
    contextAction: { label: 'Export Report', icon: '↓' },
  },
  {
    id: 'activity',
    label: 'Activity Logs',
    shortLabel: 'Logs',
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
    ),
    description: 'Comprehensive audit trail of all administrative actions',
    contextAction: { label: 'Export Logs', icon: '↓' },
    // Badge = audit log entries created today (from stats.today in the API).
  },
]

// One tip shown per day in the banner strip. Rotates based on today's date.
const TIPS = [
  'Press Alt+1–5 to jump to any tab instantly.',
  'Press Ctrl+K to open the command palette for quick navigation.',
  'The Activity Log records every admin action with full timestamps.',
  'Bulk import users from CSV via User Management → Bulk Import.',
  'Enrollment alerts appear when students are stuck in inactive sections.',
]

// ─── SYSTEM HEALTH CHIP ───────────────────────────────────────────────────────
// Converts the system_health string from the API into Tailwind color classes.
// Shows as a small colored dot + label in the header and role banner.
function healthDisplay(health, maintenanceMode) {
  if (maintenanceMode)          return { color: 'bg-amber-400',  text: 'Maintenance',    textColor: 'text-amber-400',  border: 'border-amber-600/20',  bg: 'bg-amber-600/10',  pulse: false }
  if (health === 'operational') return { color: 'bg-green-400',  text: 'All Systems OK', textColor: 'text-green-400',  border: 'border-green-600/20',  bg: 'bg-green-600/10',  pulse: true  }
  if (health === 'degraded')    return { color: 'bg-yellow-400', text: 'Degraded',        textColor: 'text-yellow-400', border: 'border-yellow-600/20', bg: 'bg-yellow-600/10', pulse: false }
  return                               { color: 'bg-red-400',    text: 'System Down',     textColor: 'text-red-400',    border: 'border-red-600/20',    bg: 'bg-red-600/10',    pulse: false }
}

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
// A small label that pops up to the right when you hover.
// Used on collapsed sidebar icons so you know what each one does.
function Tooltip({ text, children }) {
  const [show, setShow] = useState(false)
  return (
    <span className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <span className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-[9999] whitespace-nowrap rounded-lg bg-slate-800 border border-purple-600/40 px-3 py-1.5 text-xs font-medium text-white shadow-xl pointer-events-none">
          {text}
        </span>
      )}
    </span>
  )
}

// ─── COMMAND PALETTE ─────────────────────────────────────────────────────────
// Search popup that opens with Ctrl+K.
// Type to filter tabs, press Enter to jump to the first result.
function CommandPalette({ open, onClose, onNavigate, tabs }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)

  // Auto-focus the text input every time the palette opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Re-filter the list on every keystroke
  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return tabs.filter(t =>
      t.label.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    )
  }, [query, tabs])

  if (!open) return null

  return (
    // Clicking the dark backdrop closes the palette
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-28 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-slate-900 border border-purple-500/50 rounded-2xl shadow-2xl shadow-purple-900/50 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/60">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-slate-400 flex-shrink-0">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search tabs, actions…"
            className="flex-1 bg-transparent text-white placeholder-slate-500 outline-none text-sm"
            onKeyDown={e => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'Enter' && filtered[0]) { onNavigate(filtered[0].id); onClose() }
            }}
          />
          <kbd className="px-2 py-0.5 bg-slate-700 text-slate-400 text-xs rounded-md">Esc</kbd>
        </div>
        <ul className="py-2 max-h-72 overflow-y-auto">
          {filtered.map(tab => (
            <li key={tab.id}>
              <button
                onClick={() => { onNavigate(tab.id); onClose() }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-600/20 text-left transition-colors"
              >
                <span className="text-purple-400 flex-shrink-0">{tab.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white">{tab.label}</p>
                  <p className="text-xs text-slate-500 truncate">{tab.description}</p>
                </div>
                {tab.badge > 0 && (
                  <span className="ml-auto text-xs bg-pink-500 text-white font-bold rounded-full px-1.5 py-0.5 leading-none flex-shrink-0">
                    {tab.badge}
                  </span>
                )}
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-slate-500 text-sm">No results found.</li>
          )}
        </ul>
      </div>
    </div>
  )
}

// ─── LOADING SKELETON ─────────────────────────────────────────────────────────
// Gray animated placeholder shown for 150ms during tab switches.
// Prevents a blank white flash between tabs.
function TabSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-slate-800/60 rounded-xl w-1/3" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-slate-800/40 rounded-2xl" />)}
      </div>
      <div className="h-48 bg-slate-800/30 rounded-2xl" />
    </div>
  )
}

// ─── PROFILE DROPDOWN ─────────────────────────────────────────────────────────
// Avatar button in the top-right header.
// Click it to see your username, open keyboard shortcuts, or sign out.
function ProfileDropdown({ user, onLogout, onShortcuts }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close when clicking anywhere outside this component
  useEffect(() => {
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-800/70 transition-colors border border-transparent hover:border-purple-600/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
        aria-label="User menu"
        aria-expanded={open}
      >
        {/* Circle avatar — shows the first letter of the username */}
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-bold text-sm shadow-md flex-shrink-0">
          {user?.username?.[0]?.toUpperCase() || 'A'}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-semibold text-white leading-none">{user?.username || 'Admin'}</p>
          <p className="text-xs text-slate-400 mt-0.5">Administrator</p>
        </div>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-slate-900 border border-purple-600/30 rounded-xl shadow-2xl shadow-purple-900/40 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-slate-700/50">
            <p className="text-xs text-slate-500">Signed in as</p>
            <p className="text-sm font-semibold text-white truncate">{user?.username || 'Admin'}</p>
            {user?.email && <p className="text-xs text-slate-500 truncate">{user.email}</p>}
          </div>
          <button
            onClick={() => { onShortcuts(); setOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span>⌨️</span> Keyboard Shortcuts
          </button>
          <div className="border-t border-slate-700/50">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-600/10 transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
              </svg>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── KEYBOARD SHORTCUTS MODAL ─────────────────────────────────────────────────
// Simple popup listing all keyboard shortcuts.
// Open it from: Profile menu → "Keyboard Shortcuts"
function ShortcutsModal({ open, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4" onClick={onClose}>
      <div className="bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-bold text-lg mb-4">⌨️ Keyboard Shortcuts</h3>
        <ul className="space-y-2.5">
          {[
            { keys: ['Ctrl', 'K'],   desc: 'Open command palette'   },
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
        <button onClick={onClose} className="mt-5 w-full py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 rounded-xl text-sm text-purple-300 transition-colors">
          Close
        </button>
      </div>
    </div>
  )
}

// ─── MAIN LAYOUT SHELL ────────────────────────────────────────────────────────
// Renders the sidebar, header, and routes to the correct tab component.
// Does NOT contain any dashboard metrics — those all live in DashboardOverview.
export default function AdminDashboard({ user, onLogout }) {

  const [activeTab,        setActiveTab]        = useState('dashboard')
  const [sidebarOpen,      setSidebarOpen]      = useState(true)   // mobile drawer toggle
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)  // desktop icon-only mode
  const [isMobile,         setIsMobile]         = useState(false)
  const [commandOpen,      setCommandOpen]      = useState(false)
  const [shortcutsOpen,    setShortcutsOpen]    = useState(false)
  const [tipDismissed,     setTipDismissed]     = useState(false)
  const [transitioning,    setTransitioning]    = useState(false)  // true during tab fade

  // Stats fetched from the backend
  const [dashStats,    setDashStats]    = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError,   setStatsError]   = useState(null)  // set when the API call fails
  const [lastSync,     setLastSync]     = useState(null)  // timestamp of last success
  const [syncing,      setSyncing]      = useState(false) // true while manually refreshing

  const mainRef  = useRef(null)
  const tipIndex = useMemo(() => Math.floor(Date.now() / 86400000) % TIPS.length, [])

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
      const res = await fetch(`${API}/admin/dashboard-stats`, { headers: authHeaders() })
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
    fetchStats()
    const timer = setInterval(() => fetchStats(), 60_000)
    return () => clearInterval(timer)
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

  // ── RESPONSIVE ───────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      setSidebarOpen(!mobile)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── CROSS-COMPONENT NAVIGATION ────────────────────────────────────────────
  // Any child component can switch tabs by firing:
  //   window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'users' }))
  useEffect(() => {
    const handler = e => handleTabChange(e.detail)
    window.addEventListener('navigate-tab', handler)
    return () => window.removeEventListener('navigate-tab', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── KEYBOARD SHORTCUTS ────────────────────────────────────────────────────
  // Alt+1–5  →  jump to that tab
  // Ctrl+K   →  open command palette
  // Escape   →  close any open popup
  //
  // WHY Alt and not Ctrl:
  // Browsers already use Ctrl+1 through Ctrl+8 to switch between browser tabs.
  // You can't override that without a browser extension. Alt+number is free.
  useEffect(() => {
    const handler = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setCommandOpen(true)
        return
      }
      if (e.altKey) {
        const idx = parseInt(e.key, 10) - 1  // Alt+1 → index 0, Alt+2 → index 1, etc.
        if (!isNaN(idx) && idx >= 0 && idx < tabs.length) {
          e.preventDefault()
          handleTabChange(tabs[idx].id)
        }
        return
      }
      if (e.key === 'Escape') {
        setCommandOpen(false)
        setShortcutsOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [tabs]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── TAB SWITCH ───────────────────────────────────────────────────────────
  // Fades the content area out (150ms), swaps to the new tab, fades back in.
  const handleTabChange = useCallback((tabId) => {
    if (tabId === activeTab) return
    setTransitioning(true)
    setTimeout(() => {
      setActiveTab(tabId)
      setTransitioning(false)
      // Move keyboard focus to the first interactive element in the new tab
      setTimeout(() => {
        const first = mainRef.current?.querySelector('button, a, input, [tabindex="0"]')
        first?.focus({ preventScroll: true })
      }, 50)
    }, 150)
    if (isMobile) setSidebarOpen(false)
  }, [activeTab, isMobile])

  const handleSync = useCallback(() => fetchStats(true), [fetchStats])

  const activeTabData = useMemo(() => tabs.find(t => t.id === activeTab), [tabs, activeTab])
  const sidebarWidth  = sidebarCollapsed ? 'w-[72px]' : 'w-64'
  const mainMargin    = isMobile ? 'ml-0 mb-16' : sidebarCollapsed ? 'ml-[72px]' : 'ml-64'
  const health        = healthDisplay(dashStats?.system_health, dashStats?.maintenance_mode)

  // ── SIDEBAR NAV ITEM ─────────────────────────────────────────────────────
  // Single button in the sidebar list. Wraps in Tooltip when collapsed.
  const SidebarNavItem = useCallback(({ tab }) => {
    const isActive = activeTab === tab.id
    const btn = (
      <button
        onClick={() => handleTabChange(tab.id)}
        aria-current={isActive ? 'page' : undefined}
        className={`
          relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 focus:ring-offset-slate-900
          ${isActive
            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-700/40'
            : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }
        `}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white rounded-full -ml-px opacity-80" />
        )}
        <span className="flex-shrink-0">{tab.icon}</span>
        {!sidebarCollapsed && (
          <span className="font-medium text-sm whitespace-nowrap flex-1 text-left">{tab.label}</span>
        )}
        {tab.badge > 0 && !sidebarCollapsed && (
          <span className="ml-auto text-xs bg-pink-500 text-white font-bold rounded-full px-1.5 py-0.5 leading-none">
            {tab.badge}
          </span>
        )}
        {tab.badge > 0 && sidebarCollapsed && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full" />
        )}
      </button>
    )
    return sidebarCollapsed ? <Tooltip text={tab.label}>{btn}</Tooltip> : btn
  }, [activeTab, sidebarCollapsed, handleTabChange])

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">

      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={handleTabChange} tabs={tabs} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Dark overlay behind the mobile slide-in drawer */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}

      {/* ── DESKTOP SIDEBAR ────────────────────────────────────────────── */}
      {!isMobile && (
        <aside
          className={`fixed left-0 top-0 h-full bg-slate-900/95 backdrop-blur-xl border-r border-purple-600/20 z-50 flex flex-col transition-all duration-300 ease-in-out ${sidebarWidth}`}
          aria-label="Sidebar navigation"
        >
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800/60 flex-shrink-0">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-700/40 flex-shrink-0 text-xl">
              👑
            </div>
            {!sidebarCollapsed && (
              <div className="overflow-hidden">
                <h1 className="font-black text-sm bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent leading-tight">
                  Forge.Administrator
                </h1>
                <p className="text-[10px] text-slate-500 mt-0.5">Control Panel</p>
              </div>
            )}
          </div>

          {/* Ctrl+K search button */}
          <div className="px-3 pt-4 pb-2 flex-shrink-0">
            {sidebarCollapsed ? (
              <Tooltip text="Command Palette (Ctrl+K)">
                <button
                  onClick={() => setCommandOpen(true)}
                  aria-label="Command palette"
                  className="w-full p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-white transition flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </button>
              </Tooltip>
            ) : (
              <button
                onClick={() => setCommandOpen(true)}
                aria-label="Command palette"
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
                <span className="text-xs flex-1 text-left">Search or jump to…</span>
                <kbd className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-400">Ctrl+K</kbd>
              </button>
            )}
          </div>

          {/* Tab links */}
          <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto" role="navigation" aria-label="Main navigation">
            {tabs.map(tab => <SidebarNavItem key={tab.id} tab={tab} />)}
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
                          {(dashStats?.[key] ?? 0).toLocaleString()}
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
            <Tooltip text={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <button
                onClick={() => setSidebarCollapsed(c => !c)}
                aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-0' : 'rotate-180'}`}>
                  <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {!sidebarCollapsed && <span>Collapse</span>}
              </button>
            </Tooltip>
          </div>
        </aside>
      )}

      {/* ── MOBILE SLIDE-IN DRAWER ──────────────────────────────────────── */}
      {isMobile && (
        <aside
          className={`fixed left-0 top-0 h-full w-72 bg-slate-900/98 backdrop-blur-xl border-r border-purple-600/20 z-50 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          aria-label="Sidebar navigation"
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-xl">👑</div>
              <h1 className="font-black text-sm bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Forge.Administrator</h1>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400" aria-label="Close sidebar">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
            {tabs.map(tab => <SidebarNavItem key={tab.id} tab={tab} />)}
          </nav>
          <div className="p-4 border-t border-slate-800/60">
            <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-600/40 rounded-xl text-sm text-red-400 transition">
              Sign Out
            </button>
          </div>
        </aside>
      )}

      {/* ── MOBILE BOTTOM NAV ───────────────────────────────────────────── */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-purple-600/20 flex" role="navigation" aria-label="Bottom navigation">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors relative ${activeTab === tab.id ? 'text-purple-400' : 'text-slate-500'}`}
            >
              {activeTab === tab.id && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
              )}
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.shortLabel}</span>
              {tab.badge > 0 && (
                <span className="absolute top-2 right-[calc(50%-10px)] w-1.5 h-1.5 bg-pink-500 rounded-full" />
              )}
            </button>
          ))}
        </nav>
      )}

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <main className={`transition-all duration-300 ${mainMargin} min-h-screen flex flex-col`}>

        {/* Sticky header bar */}
        <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/60 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40 gap-3" role="banner">
          <div className="flex items-center gap-3 min-w-0">
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-purple-500" aria-label="Open sidebar">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            )}
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-black text-white truncate leading-tight">{activeTabData?.label}</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 truncate hidden sm:block mt-0.5">{activeTabData?.description}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Health dot — green/yellow/red/amber */}
            <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${health.bg} border ${health.border}`}>
              <span className={`w-1.5 h-1.5 ${health.color} rounded-full ${health.pulse ? 'animate-pulse' : ''}`} />
              <span className={`text-[11px] ${health.textColor} font-medium whitespace-nowrap`}>
                {statsLoading ? 'Checking…' : health.text}
              </span>
            </div>

            <button onClick={() => setCommandOpen(true)} className="hidden sm:flex p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition focus:outline-none focus:ring-2 focus:ring-purple-500" aria-label="Open command palette (Ctrl+K)">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </button>

            {/* Per-tab action button — label comes from TAB_DEFS.contextAction */}
            {activeTabData?.contextAction && (
              <button
                onClick={handleSync}
                disabled={syncing}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/40 rounded-lg text-xs text-purple-300 font-medium transition focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-60"
              >
                <span className={syncing ? 'animate-spin inline-block' : ''}>{activeTabData.contextAction.icon}</span>
                <span className="hidden md:inline">{activeTabData.contextAction.label}</span>
              </button>
            )}

            <ProfileDropdown user={user} onLogout={onLogout} onShortcuts={() => setShortcutsOpen(true)} />
          </div>
        </header>

        {/* Role banner — who is logged in + system health at a glance */}
        <div className="px-4 sm:px-6 pt-5">
          <div className="rounded-2xl bg-gradient-to-r from-purple-900/50 via-pink-900/30 to-purple-900/50 border border-purple-500/30 shadow-lg shadow-purple-900/20 overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-4 flex-wrap">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-xl shadow-md flex-shrink-0">🛡️</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-white text-sm">Administrator</h3>
                  <span className="text-[10px] bg-purple-600/30 border border-purple-500/40 px-2 py-0.5 rounded-full text-purple-300">Full Access</span>
                </div>
                <p className="text-purple-300/70 text-xs mt-0.5 hidden sm:block">
                  User management · Academic structure · System configuration · Audit logs
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {lastSync && (
                  <div className="hidden sm:block text-right">
                    <p className="text-[10px] text-slate-500">Last sync</p>
                    <p className="text-[11px] text-slate-400 font-medium">
                      {lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
                <div className={`flex items-center gap-1.5 px-2.5 py-1 ${health.bg} border ${health.border} rounded-lg`}>
                  <span className={`w-1.5 h-1.5 ${health.color} rounded-full ${health.pulse ? 'animate-pulse' : ''}`} />
                  <span className={`text-[10px] ${health.textColor} font-bold hidden sm:inline`}>
                    {statsLoading ? '…' : health.text}
                  </span>
                </div>
              </div>
            </div>

            {/* Daily tip — click ✕ to hide it for the rest of the session */}
            {!tipDismissed && (
              <div className="flex items-center gap-3 px-5 py-2.5 border-t border-white/5 bg-black/10">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex-shrink-0">Tip</span>
                <p className="text-xs text-slate-400 flex-1">{TIPS[tipIndex]}</p>
                <button onClick={() => setTipDismissed(true)} className="text-slate-600 hover:text-slate-400 text-sm flex-shrink-0 focus:outline-none" aria-label="Dismiss tip">✕</button>
              </div>
            )}
          </div>
        </div>

        {/* The actual tab content */}
        <div ref={mainRef} className="flex-1 px-4 sm:px-6 py-5">

          {/* Tiny timestamp + manual refresh */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[11px] text-slate-600">
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
              className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-300 transition disabled:opacity-50 focus:outline-none"
              aria-label="Refresh data"
            >
              <span className={syncing ? 'animate-spin inline-block' : ''}>↻</span>
              {syncing ? 'Syncing…' : 'Refresh'}
            </button>
          </div>

          {/* Fades out on tab switch, skeleton shows briefly, then new tab fades in */}
          <div className={`transition-opacity duration-150 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
            {transitioning ? (
              <TabSkeleton />
            ) : (
              <>
                {activeTab === 'dashboard'   && <DashboardOverview onNavigate={tab => handleTabChange(tab)} />}
                {activeTab === 'users'       && <UserManagement />}
                {activeTab === 'assignments' && <InstructorAssignments />}
                {activeTab === 'subjects'    && <SubjectsManagement />}
                {activeTab === 'sections'    && <SectionsManagement />}
                {activeTab === 'activity'    && <ActivityLogs />}
              </>
            )}
          </div>
        </div>
      </main>
    </div>    
  )
}

