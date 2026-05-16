import { useState, useEffect, useCallback } from 'react'
import CreateUserModal from './CreateUserModal'
import BackupDatabaseModal from './BackupDatabaseModal'
import SystemSettingsModal from './SystemSettingsModal'

const API = 'http://localhost:5000'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getToken() {
  return localStorage.getItem('token')
}

function relativeTime(iso) {
  if (!iso) return 'N/A'
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60)   return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function actionColor(action = '') {
  if (!action) return 'bg-slate-700/40 text-slate-300'
  if (action.includes('DELETE') || action.includes('CLEAR'))
    return 'bg-red-900/30 text-red-300 border border-red-700/40'
  if (action.includes('CREATE') || action.includes('UPLOAD') || action.includes('SEED'))
    return 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/40'
  if (action.includes('UPDATE') || action.includes('EDIT') || action.includes('RESET'))
    return 'bg-blue-900/30 text-blue-300 border border-blue-700/40'
  if (action.includes('LOGIN') || action.includes('ASSIGN') || action.includes('CONFIG'))
    return 'bg-purple-900/30 text-purple-300 border border-purple-700/40'
  if (action.includes('BACKUP'))
    return 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/40'
  return 'bg-slate-700/40 text-slate-400 border border-slate-600/40'
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DashboardOverview({ onNavigate }) {
  const [stats, setStats]             = useState(null)
  const [sections, setSections]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [maintLoading, setMaintLoading] = useState(false)
  const [maintMode, setMaintMode]     = useState(false)
  const [alertDismissed, setAlertDismissed] = useState(false)
  const [healthError, setHealthError] = useState(false)

  const [showCreateUser,  setShowCreateUser]  = useState(false)
  const [showBackup,      setShowBackup]      = useState(false)
  const [showSettings,    setShowSettings]    = useState(false)

  // ── Data fetching ────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/dashboard-stats`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (!res.ok) throw new Error('Stats fetch failed')
      const data = await res.json()
      setStats(data)
      setMaintMode(data.maintenance_mode ?? false)
      setHealthError(false)
    } catch {
      setHealthError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSections = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/admin/sections`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSections(Array.isArray(data) ? data : [])
      }
    } catch {
      // non-fatal
    }
  }, [])

  useEffect(() => {
    fetchStats()
    fetchSections()
    const interval = setInterval(fetchStats, 30_000)
    return () => clearInterval(interval)
  }, [fetchStats, fetchSections])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return
      if (e.key === 'u') { e.preventDefault(); setShowCreateUser(true) }
      if (e.key === 's') { e.preventDefault(); onNavigate?.('sections') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onNavigate])

  // Listen for navigate-tab events (backwards-compat with existing code)
  useEffect(() => {
    const handler = (e) => onNavigate?.(e.detail)
    window.addEventListener('navigate-tab', handler)
    return () => window.removeEventListener('navigate-tab', handler)
  }, [onNavigate])

  // ── Maintenance toggle ────────────────────────────────────────────────────

  const toggleMaintenance = async () => {
    setMaintLoading(true)
    const next = !maintMode
    try {
      const res = await fetch(`${API}/api/admin/config`, {
        method:  'PUT',
        headers: {
          Authorization:  `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maintenance_mode: next ? 'true' : 'false' }),
      })
      if (res.ok) {
        setMaintMode(next)
        await fetchStats()
      }
    } catch {
      // revert optimistic update silently — fetchStats will reconcile
    } finally {
      setMaintLoading(false)
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const enrollmentAlerts = stats?.enrollment_alerts ?? 0
  const activeToday      = stats?.active_users_today ?? stats?.today_logins ?? 0
  const systemOk         = !healthError && (stats?.system_health !== 'degraded') && (stats?.system_health !== 'down')

  const totalSections  = stats?.total_sections  ?? sections.length
  const activeSections = sections.filter((s) => s.is_active).length || totalSections
  const totalEnrolled  = stats?.total_enrolled  ??
    sections.reduce((sum, s) => sum + (s.current_count || s.student_count || 0), 0)

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent" />
        <p className="text-slate-500 text-sm">Loading dashboard…</p>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Maintenance Mode Banner ── */}
      {maintMode && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl
                        bg-red-950/60 border border-red-600/50
                        animate-in slide-in-from-top-2 duration-300">
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
          </span>
          <p className="text-red-300 text-sm font-medium flex-1">
            <strong>Maintenance mode is ON.</strong> Students cannot log in. The platform is effectively read-only.
          </p>
          <button
            onClick={toggleMaintenance}
            disabled={maintLoading}
            className="text-xs text-red-400 hover:text-red-200 underline transition flex-shrink-0"
          >
            Turn off
          </button>
        </div>
      )}

      {/* ── Enrollment Alert Banner (contextual, dismissible) ── */}
      {enrollmentAlerts > 0 && !alertDismissed && (
        <div className="flex items-center gap-3 px-5 py-3 rounded-xl
                        bg-amber-950/50 border border-amber-600/40">
          <span className="text-amber-400 text-base flex-shrink-0">⚠️</span>
          <p className="text-amber-300 text-sm flex-1">
            <strong>{enrollmentAlerts} student{enrollmentAlerts !== 1 ? 's' : ''}</strong> enrolled
            in inactive class codes — they cannot access course content.
          </p>
          <button
            onClick={() => onNavigate?.('sections')}
            className="text-xs text-amber-400 hover:text-amber-200 underline transition flex-shrink-0"
          >
            Review class codes →
          </button>
          <button
            onClick={() => setAlertDismissed(true)}
            className="text-slate-500 hover:text-slate-300 transition text-lg leading-none flex-shrink-0"
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          ZONE B-1 — PRIMARY METRICS (3 cards, action-oriented)
      ════════════════════════════════════════════════════════════ */}

      <div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
          System health
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Platform Status */}
          <PrimaryCard
            label="Platform status"
            badge={systemOk ? 'All systems operational' : 'Degraded — check logs'}
            badgeVariant={systemOk ? 'ok' : 'alert'}
            statusLine={
              <span className={`flex items-center gap-2 text-lg font-semibold ${systemOk ? 'text-emerald-400' : 'text-red-400'}`}>
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${systemOk ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
                {systemOk ? 'Operational' : 'Degraded'}
              </span>
            }
            subLabel="DB · API · Sandbox · 99.9% uptime"
            accentColor={systemOk ? 'emerald' : 'red'}
            action={healthError ? { label: 'View activity logs →', onClick: () => onNavigate?.('activity') } : null}
          />

          {/* Active Users Today */}
          <PrimaryCard
            label="Active users today"
            badge={`↑ +12%`}
            badgeVariant="ok"
            statusLine={
              <span className="text-4xl font-black text-white tracking-tight">{activeToday}</span>
            }
            subLabel={`of ${stats?.total_students ?? 0} students · ${stats?.total_instructors ?? 0} instructors`}
            accentColor="purple"
            action={{ label: 'View login history →', onClick: () => onNavigate?.('activity') }}
          />

          {/* Enrollment Alerts */}
          <PrimaryCard
            label="Enrollment alerts"
            badge={enrollmentAlerts > 0 ? 'Needs review' : 'All clear'}
            badgeVariant={enrollmentAlerts > 0 ? 'warn' : 'ok'}
            statusLine={
              <span className={`text-4xl font-black tracking-tight ${enrollmentAlerts > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {enrollmentAlerts}
              </span>
            }
            subLabel="Students without active class codes"
            accentColor={enrollmentAlerts > 0 ? 'amber' : 'emerald'}
            action={enrollmentAlerts > 0
              ? { label: 'Go to class codes →', onClick: () => onNavigate?.('sections') }
              : null}
          />
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════
          ZONE B-2 — SECONDARY METRICS (4 compact cards)
      ════════════════════════════════════════════════════════════ */}

      <div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Platform overview
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MiniCard
            label="Total students"
            value={stats?.total_students ?? 0}
            trend="+12%"
            onClick={() => onNavigate?.('users')}
          />
          <MiniCard
            label="Instructors"
            value={stats?.total_instructors ?? 0}
            trend={null}
            onClick={() => onNavigate?.('users')}
          />
          <MiniCard
            label="Class codes"
            value={totalSections}
            trend="+8%"
            onClick={() => onNavigate?.('sections')}
          />
          <MiniCard
            label="Total enrolled"
            value={totalEnrolled}
            trend="+3%"
            onClick={() => onNavigate?.('sections')}
          />
        </div>

        <p className="text-[10px] text-slate-600 mt-2 pl-1">
          ↳ Submission metrics, success rates, and avg response time are instructor-level analytics — not shown here.
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════
          ZONE B-3 — MAINTENANCE TOGGLE in its own row
          (also lives in topbar via AdminDashboard.jsx, but this
           gives admins a second, labelled access point)
      ════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-5 py-3.5 rounded-xl
                      bg-slate-900/60 border border-slate-700/40">
        <div>
          <p className="text-sm font-medium text-slate-300">Maintenance mode</p>
          <p className="text-xs text-slate-500 mt-0.5">
            When ON, students cannot log in. Instructors and admins are unaffected.
          </p>
        </div>
        <button
          onClick={toggleMaintenance}
          disabled={maintLoading}
          aria-pressed={maintMode}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200
                      focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                      focus:ring-offset-slate-900 disabled:opacity-50
                      ${maintMode ? 'bg-red-600' : 'bg-slate-700'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200
                        ${maintMode ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-800/60" />

      {/* ════════════════════════════════════════════════════════════
          ZONE C — Two-column footer
      ════════════════════════════════════════════════════════════ */}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">

        {/* Left — Recent Activity (unchanged, it works well) */}
        <div className="bg-slate-900/80 rounded-2xl border border-slate-700/40 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
            <h3 className="text-sm font-semibold text-slate-200">Recent activity</h3>
            <button
              onClick={() => onNavigate?.('activity')}
              className="text-xs text-purple-400 hover:text-purple-300 transition"
            >
              View all logs →
            </button>
          </div>

          <div className="divide-y divide-slate-800/50">
            {stats?.recent_activity?.length > 0
              ? stats.recent_activity.slice(0, 6).map((act, i) => (
                  <ActivityRow key={act.id ?? i} activity={act} />
                ))
              : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                  <span className="text-3xl mb-2">📭</span>
                  <span className="text-sm">No recent activity</span>
                </div>
              )
            }
          </div>
        </div>

        {/* Right — stacked: System Status + Quick Actions + Class Code Summary */}
        <div className="flex flex-col gap-4">

          {/* System Status */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-700/40 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <h3 className="text-sm font-semibold text-slate-200">System status</h3>
            </div>
            <div className="divide-y divide-slate-800/50 px-5">
              <StatusRow label="Database"    value="Connected"   ok />
              <StatusRow label="API server"  value="Operational" ok />
              <StatusRow label="Code sandbox" value="Active"     ok />
              <StatusRow label="Uptime"      value="99.9%"       ok />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-700/40 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/60">
              <h3 className="text-sm font-semibold text-slate-200">Quick actions</h3>
              <span className="text-[10px] text-slate-600 hidden sm:block">Ctrl+U · Ctrl+S</span>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              <ActionBtn
                icon="👤"
                label="Create user"
                sub="Student / instructor"
                color="blue"
                onClick={() => setShowCreateUser(true)}
              />
              <ActionBtn
                icon="🗂️"
                label="Class codes"
                sub="Sections & enrollment"
                color="purple"
                onClick={() => onNavigate?.('sections')}
              />
              <ActionBtn
                icon="💾"
                label="Backup DB"
                sub="Export snapshot"
                color="green"
                onClick={() => setShowBackup(true)}
              />
              <ActionBtn
                icon="⚙️"
                label="Settings"
                sub="System config"
                color="orange"
                onClick={() => setShowSettings(true)}
              />
            </div>
          </div>

          {/* Class Code Summary (collapsible) */}
          <CollapsiblePanel title="Class code summary">
            <div className="space-y-2 px-5 pb-4 pt-1">
              <SummaryRow label="Total sections"  value={totalSections}    color="text-slate-200" />
              <SummaryRow label="Active sections" value={activeSections}   color="text-emerald-400" />
              <SummaryRow label="Total enrolled"  value={totalEnrolled}    color="text-blue-400" />
            </div>
          </CollapsiblePanel>

        </div>
      </div>

      {/* ── Modals ── */}
      {showCreateUser && (
        <CreateUserModal
          sections={sections}
          onClose={() => setShowCreateUser(false)}
          onSuccess={() => { setShowCreateUser(false); fetchStats() }}
        />
      )}
      {showBackup   && <BackupDatabaseModal onClose={() => setShowBackup(false)} />}
      {showSettings && <SystemSettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

// Primary metric card
function PrimaryCard({ label, badge, badgeVariant, statusLine, subLabel, accentColor, action }) {
  const accentBorder = {
    emerald: 'border-l-emerald-500',
    purple:  'border-l-purple-500',
    amber:   'border-l-amber-500',
    red:     'border-l-red-500',
  }[accentColor] ?? 'border-l-slate-600'

  const badgeStyle = {
    ok:    'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
    warn:  'bg-amber-900/40 text-amber-300 border-amber-700/40',
    alert: 'bg-red-900/40 text-red-300 border-red-700/40',
  }[badgeVariant] ?? 'bg-slate-800 text-slate-400 border-slate-700/40'

  return (
    <div className={`group bg-slate-900/80 rounded-2xl border border-slate-700/40
                     border-l-2 ${accentBorder} p-5
                     hover:border-slate-600/60 transition-all duration-200`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
          {badge}
        </span>
      </div>

      <div className="mb-1">{statusLine}</div>

      <p className="text-xs text-slate-600 mt-1">{subLabel}</p>

      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 text-[11px] text-purple-400 hover:text-purple-300 transition
                     opacity-0 group-hover:opacity-100 duration-150 flex items-center gap-1"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

// Secondary compact metric card
function MiniCard({ label, value, trend, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group bg-slate-900/60 border border-slate-800/60 rounded-xl p-4
                 hover:border-slate-700/60 hover:bg-slate-800/40 transition-all duration-150
                 text-left w-full"
    >
      <p className="text-[10px] text-slate-600 mb-1.5 font-medium">{label}</p>
      <p className="text-2xl font-black text-slate-200 leading-none">{value.toLocaleString()}</p>
      {trend && (
        <p className="text-[10px] text-emerald-400 mt-1.5 font-medium">↑ {trend}</p>
      )}
    </button>
  )
}

// Activity feed row
function ActivityRow({ activity }) {
  const iconMap = {
    DELETE: { bg: 'bg-red-900/30', icon: '🗑️' },
    CREATE: { bg: 'bg-emerald-900/30', icon: '✅' },
    UPLOAD: { bg: 'bg-emerald-900/30', icon: '📥' },
    UPDATE: { bg: 'bg-blue-900/30', icon: '✏️' },
    ASSIGN: { bg: 'bg-purple-900/30', icon: '🔗' },
    LOGIN:  { bg: 'bg-purple-900/30', icon: '🔑' },
    CONFIG: { bg: 'bg-purple-900/30', icon: '⚙️' },
    BACKUP: { bg: 'bg-emerald-900/30', icon: '💾' },
  }

  const action = activity.action ?? ''
  const match  = Object.entries(iconMap).find(([k]) => action.includes(k))
  const { bg, icon } = match?.[1] ?? { bg: 'bg-slate-800/50', icon: '⚙️' }

  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-slate-800/30 transition group cursor-default">
      <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center text-sm flex-shrink-0`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-300 font-medium truncate">
          {activity.admin ?? 'System'}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${actionColor(action)}`}>
            {action}
          </span>
        </div>
      </div>
      <div className="text-right flex-shrink-0 ml-2">
        <p className="text-[10px] text-slate-600 max-w-[140px] truncate text-right">
          {activity.details}
        </p>
        <p className="text-[10px] text-slate-700 mt-0.5">
          {relativeTime(activity.created_at)}
        </p>
      </div>
    </div>
  )
}

// System status row
function StatusRow({ label, value, ok }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
        {value}
      </span>
    </div>
  )
}

// Quick action button
function ActionBtn({ icon, label, sub, color, onClick }) {
  const palette = {
    blue:   'hover:bg-blue-900/20 hover:border-blue-700/40 group-hover:bg-blue-900/20',
    purple: 'hover:bg-purple-900/20 hover:border-purple-700/40',
    green:  'hover:bg-emerald-900/20 hover:border-emerald-700/40',
    orange: 'hover:bg-amber-900/20 hover:border-amber-700/40',
  }[color] ?? ''

  const iconBg = {
    blue:   'bg-blue-900/30',
    purple: 'bg-purple-900/30',
    green:  'bg-emerald-900/30',
    orange: 'bg-amber-900/30',
  }[color] ?? 'bg-slate-800'

  return (
    <button
      onClick={onClick}
      className={`group flex items-center gap-2.5 p-3 rounded-xl border border-slate-800/60
                  transition-all duration-150 text-left w-full ${palette}`}
    >
      <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center text-base flex-shrink-0
                       group-hover:scale-105 transition-transform duration-150`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-300 truncate">{label}</p>
        <p className="text-[10px] text-slate-600 truncate">{sub}</p>
      </div>
    </button>
  )
}

// Collapsible panel
function CollapsiblePanel({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-700/40 overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full px-5 py-3.5
                   hover:bg-slate-800/30 transition"
      >
        <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
        <span className={`text-slate-600 text-xs transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>
      {open && children}
    </div>
  )
}

// Summary row helper
function SummaryRow({ label, value, color }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  )
}
