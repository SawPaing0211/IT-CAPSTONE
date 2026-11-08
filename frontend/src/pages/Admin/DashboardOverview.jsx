import createUsers from '../../assets/admin/create-users.png'
import classCodes from '../../assets/admin/class-codes.png'
import databaseBackup from '../../assets/admin/database-backup.png'
import systemSettings from '../../assets/admin/system-settings.png'
import { useState, useEffect, useCallback } from 'react'
import CreateUserModal from './CreateUserModal'
import BackupDatabaseModal from './BackupDatabaseModal'
import SystemSettingsModal from './SystemSettingsModal'
import { API_BASE, authFetch } from '../../api/client'

const API = API_BASE

// ─── Helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso) {
  if (!iso) return 'N/A'
  const diff = Math.floor((Date.now() - new Date(iso)) / 1000)
  if (diff < 60)   return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// Pick a badge color based on the audit action's keyword
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

export default function DashboardOverview({ onNavigate, stats, loading, healthError, fetchStats }) {
  const [sections, setSections]       = useState(null)
  const [maintenanceError, setMaintenanceError] = useState(false)
  const maintMode = stats?.maintenance_mode ?? false
  const [maintLoading, setMaintLoading] = useState(false)
  const [alertDismissed, setAlertDismissed] = useState(false)

  const [showCreateUser,  setShowCreateUser]  = useState(false)
  const [showBackup,      setShowBackup]      = useState(false)
  const [showSettings,    setShowSettings]    = useState(false)

  // ── Data fetching ────────────────────────────────────────────────────────

  // Fetch class code sections for the enrollment totals
  const fetchSections = useCallback(async () => {
    try {
      const res = await authFetch(`${API}/api/admin/sections`)
      if (res.ok) {
        const data = await res.json()
        setSections(Array.isArray(data) ? data : [])
      }
    } catch {
      // non-fatal
    }
  }, [])

  useEffect(() => {
    fetchSections()
  }, [fetchSections])

  // ── Maintenance toggle ────────────────────────────────────────────────────

  const toggleMaintenance = async () => {
    setMaintenanceError(false)
    setMaintLoading(true)
    const next = !maintMode
    try {
      const res = await authFetch(`${API}/api/admin/config`, {
        method:  'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ maintenance_mode: next ? 'true' : 'false' }),
      })
      if (!res.ok) throw new Error("Maintenance update failed")
      await fetchStats()
    } catch {
      setMaintenanceError(true)
    } finally {
      setMaintLoading(false)
    }
  }

  // ── Derived values ────────────────────────────────────────────────────────

  const enrollmentAlerts = stats?.enrollment_alerts ?? 0
  const activeToday      = stats?.active_users_today ?? stats?.today_logins ?? 0
  const systemOk         = !healthError && (stats?.system_health !== 'degraded') && (stats?.system_health !== 'down')

  const totalSections = sections?.length ?? '—'
  const activeSections = stats?.total_sections ?? sections?.filter(section => section.is_active).length ?? '—'
  const totalEnrolled  = stats?.total_enrolled  ??
    sections?.filter(section => section.is_active).reduce((sum, section) => sum + (section.current_count ?? section.student_count ?? 0), 0) ?? '—'

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
    <div className="space-y-6">
      {healthError && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/30 bg-[#141a30] px-4 py-3 text-sm text-amber-100">
          <p>{stats ? "Could not refresh dashboard. Showing the last available data." : "Could not load dashboard metrics."}</p>
          <button type="button" onClick={() => fetchStats(true)} className="min-h-10 rounded-lg border border-amber-300/35 px-4 font-semibold focus-visible:outline focus-visible:outline-amber-300">Retry</button>
        </div>
      )}

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
            <strong>Maintenance status is ON.</strong> This is a status flag only; sign-in and features are not restricted.
          </p>
          <button
            onClick={toggleMaintenance}
            disabled={maintLoading || !stats}
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
        <h3 className="font-cinzel text-lg font-semibold text-white mb-3">
          System health
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Platform Status */}
          <PrimaryCard
            label="Platform status"
            badge={systemOk ? 'Database reachable' : 'Check failed'}
            badgeVariant={systemOk ? 'ok' : 'alert'}
            statusLine={
              <span className={`flex items-center gap-2 text-lg font-semibold ${systemOk ? 'text-emerald-400' : 'text-red-400'}`}>
                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${systemOk ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
                {systemOk ? 'Database connected' : 'Database check failed'}
              </span>
            }
            subLabel="Result of the last database connection check. Sandbox and uptime are not monitored here."
            action={healthError ? { label: 'View activity logs →', onClick: () => onNavigate?.('activity') } : null}
          />

          {/* Active Users Today */}
          <PrimaryCard
            label="Active users today"
            badge="Today"
            badgeVariant="ok"
            statusLine={
              <span className="text-4xl font-black text-white tracking-tight">{stats ? activeToday : "—"}</span>
            }
            subLabel={stats ? `of ${stats.total_students ?? 0} students · ${stats.total_instructors ?? 0} instructors` : "User totals unavailable"}
            action={{ label: 'View login history →', onClick: () => onNavigate?.('activity') }}
          />

          {/* Enrollment Alerts */}
          <PrimaryCard
            label="Enrollment alerts"
            badge={!stats ? "Unavailable" : enrollmentAlerts > 0 ? 'Needs review' : 'All clear'}
            badgeVariant={enrollmentAlerts > 0 ? 'warn' : 'ok'}
            statusLine={
              <span className={`text-4xl font-black tracking-tight ${enrollmentAlerts > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                {stats ? enrollmentAlerts : "—"}
              </span>
            }
            subLabel="Students without active class codes"
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
        <h3 className="font-cinzel text-lg font-semibold text-white mb-3">
          Platform overview
        </h3>

        <div className="grid grid-cols-2 divide-amber-300/20 rounded-xl border border-amber-300/25 bg-[#111832] p-1 md:grid-cols-4 md:divide-x">
          <MiniCard
            label="Total students"
            value={stats?.total_students ?? "—"}
            trend={null}
            onClick={() => onNavigate?.('users')}
          />
          <MiniCard
            label="Instructors"
            value={stats?.total_instructors ?? "—"}
            trend={null}
            onClick={() => onNavigate?.('users')}
          />
          <MiniCard
            label="Active class codes"
            value={activeSections}
            trend={null}
            onClick={() => onNavigate?.('sections')}
          />
          <MiniCard
            label="Class enrollments"
            value={totalEnrolled}
            trend={null}
            onClick={() => onNavigate?.('sections')}
          />
        </div>

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
          {maintenanceError && <p role="alert" className="mt-1 text-sm text-rose-300">Could not update maintenance mode. Try again.</p>}
          <p className="text-xs text-slate-500 mt-0.5">
            When ON, a Maintenance status is shown. It is a status flag only and does not block sign-in.
          </p>
        </div>
        <button
          onClick={toggleMaintenance}
          disabled={maintLoading || !stats}
          aria-label="Maintenance mode" aria-pressed={maintMode}
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
        <div className="bg-[#111832] rounded-xl border border-amber-300/20 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
            <h3 className="font-cinzel text-base font-semibold text-white">Recent activity</h3>
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
                          <span className="text-sm text-slate-300">{stats ? "No recent activity" : "Activity unavailable"}</span>
                </div>
              )
            }
          </div>
        </div>

        {/* Right — stacked: System Status + Quick Actions + Class Code Summary */}
        <div className="flex flex-col gap-4">

          {/* System Status */}
          <div className="bg-[#111832] rounded-xl border border-amber-300/20 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800/60">
              <h3 className="font-cinzel text-base font-semibold text-white">System status</h3>
            </div>
            <div className="divide-y divide-slate-800/50 px-5">
              <StatusRow label="Database"    value={systemOk ? 'Connected' : 'Check failed'} ok={systemOk} />
              <StatusRow label="API server"  value={healthError ? 'Not responding' : 'Responding'} ok={!healthError} />
              <p className="text-[11px] text-slate-500 py-2.5">The code sandbox and uptime are not monitored from this page.</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#111832] rounded-xl border border-amber-300/20 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-amber-300/15">
              <h3 className="font-cinzel text-base font-semibold text-white">Quick actions</h3>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-2 p-3">
              <ActionBtn
                emblem={createUsers}
                label="Create user"
                sub="Student / instructor"
                onClick={() => setShowCreateUser(true)}
              />
              <ActionBtn
                emblem={classCodes}
                label="Class codes"
                sub="Sections & enrollment"
                onClick={() => onNavigate?.('sections')}
              />
              <ActionBtn
                emblem={databaseBackup}
                label="Database backup"
                sub="Export SQL"
                onClick={() => setShowBackup(true)}
              />
              <ActionBtn
                emblem={systemSettings}
                label="System settings"
                sub="Platform configuration"
                onClick={() => setShowSettings(true)}
              />
            </div>
          </div>

          {/* Class Code Summary (collapsible) */}
          <CollapsiblePanel title="Class code summary">
            <div className="space-y-2 px-5 pb-4 pt-1">
              <SummaryRow label="Total sections"  value={totalSections}    color="text-slate-200" />
              <SummaryRow label="Active sections" value={activeSections}   color="text-emerald-400" />
              <SummaryRow label="Class enrollments"  value={totalEnrolled}    color="text-blue-400" />
            </div>
          </CollapsiblePanel>

        </div>
      </div>

      {/* ── Modals ── */}
      {showCreateUser && (
        <CreateUserModal
          sections={sections ?? []}
          onClose={() => setShowCreateUser(false)}
          onSuccess={() => { setShowCreateUser(false); fetchStats() }}
        />
      )}
      {showBackup   && <BackupDatabaseModal onClose={() => setShowBackup(false)} />}
      {showSettings && <SystemSettingsModal onClose={() => setShowSettings(false)} onSaved={fetchStats} />}
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

// Primary metric card
function PrimaryCard({ label, badge, badgeVariant, statusLine, subLabel, action }) {
  const badgeStyle = {
    ok:    'bg-emerald-900/40 text-emerald-300 border-emerald-700/40',
    warn:  'bg-amber-900/40 text-amber-300 border-amber-700/40',
    alert: 'bg-red-900/40 text-red-300 border-red-700/40',
  }[badgeVariant] ?? 'bg-slate-800 text-slate-400 border-slate-700/40'

  return (
    <div className="rounded-xl border border-amber-300/20 bg-[#111832] p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-slate-200 font-medium">{label}</p>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
          {badge}
        </span>
      </div>

      <div className="mb-1">{statusLine}</div>

      <p className="text-xs leading-relaxed text-slate-300 mt-1">{subLabel}</p>

      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 min-h-9 rounded text-sm text-amber-200 hover:text-amber-100 focus-visible:outline focus-visible:outline-amber-300"
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
      className="w-full rounded-lg p-4 text-left hover:bg-violet-950/45 focus-visible:outline focus-visible:outline-amber-300"
    >
      <p className="text-xs text-slate-300 mb-2 font-medium">{label}</p>
      <p className="text-2xl font-semibold tabular-nums text-amber-100 leading-none">{value.toLocaleString()}</p>
      {trend && (
        <p className="text-[10px] text-emerald-400 mt-1.5 font-medium">↑ {trend}</p>
      )}
    </button>
  )
}

// Activity feed row
function ActivityRow({ activity }) {
  // Pick an icon based on which keyword the action contains
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
        <p className="text-xs text-slate-300 max-w-56 break-words text-right">
          {activity.details}
        </p>
        <p className="text-xs text-slate-300 mt-0.5">
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
function ActionBtn({ emblem, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      type="button"
      className="admin-button flex min-w-0 w-full items-center gap-3 p-3 text-left"
    >
      <img src={emblem} alt="" className="size-11 shrink-0 object-contain" width="44" height="44" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-amber-100">{label}</p>
        <p className="text-xs text-slate-300">{sub}</p>
      </div>
    </button>
  )
}

// Collapsible panel
function CollapsiblePanel({ title, children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-[#111832] rounded-xl border border-amber-300/20 overflow-hidden">
      <button
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full px-5 py-3.5
                   hover:bg-slate-800/30 transition"
      >
        <h3 className="font-cinzel text-base font-semibold text-white">{title}</h3>
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
