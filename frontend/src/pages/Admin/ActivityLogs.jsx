import { useState, useEffect, useRef, useCallback } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTION_META = {
  // 🔴 Critical / Destructive
  USER_DELETED:       { color: 'red',    icon: '🗑️',  label: 'User Deleted',       tier: 'critical' },
  SUBJECT_DELETED:    { color: 'red',    icon: '📚',  label: 'Subject Deleted',    tier: 'critical' },
  SECTION_DELETED:    { color: 'red',    icon: '🏫',  label: 'Section Deleted',    tier: 'critical' },

  DATABASE_BACKUP:    { color: 'red',    icon: '💾',  label: 'DB Backup',          tier: 'critical' },

  // 🟡 Important / Structural
  INSTRUCTOR_ASSIGNED:           { color: 'amber',  icon: '👨‍🏫', label: 'Instructor Assigned',    tier: 'important' },
  INSTRUCTOR_UNASSIGNED:         { color: 'amber',  icon: '👤',  label: 'Instructor Removed',     tier: 'important' },
  INSTRUCTOR_ASSIGNMENT_UPDATED: { color: 'amber',  icon: '🔄',  label: 'Assignment Updated',     tier: 'important' },
  BULK_ENROLLMENT_UPLOAD:        { color: 'amber',  icon: '📤',  label: 'Bulk Enrollment',        tier: 'important' },
  SECTIONS_BULK_UPLOAD:          { color: 'amber',  icon: '📋',  label: 'Sections Bulk Upload',   tier: 'important' },
  CONFIG_UPDATED:                { color: 'amber',  icon: '⚙️',  label: 'Config Updated',         tier: 'important' },
  SUBJECTS_SEEDED:               { color: 'amber',  icon: '🌱',  label: 'Subjects Seeded',        tier: 'important' },

  // 🔵 Routine / User management
  USER_CREATED:       { color: 'blue',   icon: '👤',  label: 'User Created',       tier: 'routine' },
  USER_UPDATED:       { color: 'blue',   icon: '✏️',  label: 'User Updated',       tier: 'routine' },
  BULK_USER_UPLOAD:   { color: 'blue',   icon: '👥',  label: 'Bulk User Upload',   tier: 'routine' },
  PASSWORD_RESET:     { color: 'blue',   icon: '🔑',  label: 'Password Reset',     tier: 'routine' },
  SECTION_CREATED:    { color: 'blue',   icon: '🏫',  label: 'Section Created',    tier: 'routine' },
  SECTION_UPDATED:    { color: 'blue',   icon: '🏫',  label: 'Section Updated',    tier: 'routine' },
  SUBJECT_CREATED:    { color: 'blue',   icon: '📚',  label: 'Subject Created',    tier: 'routine' },
  SUBJECT_UPDATED:    { color: 'blue',   icon: '📚',  label: 'Subject Updated',    tier: 'routine' },

  // 🟢 Info / Positive
  USER_UNLOCKED:      { color: 'green',  icon: '🔓',  label: 'User Unlocked',      tier: 'info' },
  EMAIL_UPDATED:      { color: 'green',  icon: '📧',  label: 'Email Updated',      tier: 'info' },
}

const TIER_COLORS = {
  critical:  { badge: 'bg-red-500/20 text-red-300 border border-red-500/40 ring-1 ring-red-500/20',  dot: 'bg-red-500',   glow: 'shadow-red-500/10' },
  important: { badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',                    dot: 'bg-amber-400', glow: 'shadow-amber-500/10' },
  routine:   { badge: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',                       dot: 'bg-blue-400',  glow: '' },
  info:      { badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',              dot: 'bg-emerald-400', glow: '' },
  unknown:   { badge: 'bg-slate-700/60 text-slate-300 border border-slate-600/40',                    dot: 'bg-slate-500', glow: '' },
}

const ALL_ACTION_TYPES = Object.keys(ACTION_META)

const DATE_PRESETS = [
  { label: 'All Time',    value: 'all' },
  { label: 'Today',       value: 'today' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days',value: '30d' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMeta(action) {
  return ACTION_META[action] || { color: 'unknown', icon: '⚙️', label: action, tier: 'unknown' }
}

function getTierColors(tier) {
  return TIER_COLORS[tier] || TIER_COLORS.unknown
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'N/A'
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60)    return 'Just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function formatExactTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function getInitials(name) {
  if (!name) return '?'
  return name.split('.').map(p => p[0]?.toUpperCase()).slice(0, 2).join('')
}

function getAvatarColor(name) {
  const colors = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#db2777','#0891b2']
  const idx = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length
  return colors[idx]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color, tooltip }) {
  const colorMap = {
    purple: 'border-purple-600/40 text-purple-400 bg-purple-500/5',
    blue:   'border-blue-600/40   text-blue-400   bg-blue-500/5',
    green:  'border-green-600/40  text-green-400  bg-green-500/5',
    amber:  'border-amber-600/40  text-amber-400  bg-amber-500/5',
    red:    'border-red-600/40    text-red-400    bg-red-500/5',
  }
  const cls = colorMap[color] || colorMap.purple
  return (
    <div className={`relative rounded-xl border p-4 ${cls} transition-all hover:scale-[1.02]`} title={tooltip}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-xs font-medium uppercase tracking-widest mb-1">{label}</p>
          <p className={`text-2xl font-black ${cls.split(' ')[1]}`}>{value}</p>
        </div>
        <span className="text-xl opacity-80">{icon}</span>
      </div>
    </div>
  )
}

function ActionBadge({ action }) {
  const meta = getMeta(action)
  const tc = getTierColors(meta.tier)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold tracking-wide ${tc.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tc.dot} shrink-0`} />
      {meta.icon} {meta.label}
    </span>
  )
}

function ExpandedRow({ log, onClose }) {
  const meta = getMeta(log.action)
  const tc = getTierColors(meta.tier)
  return (
    <tr>
      <td colSpan="5" className="px-4 pb-4 pt-0">
        <div className={`rounded-xl border ${tc.badge.includes('red') ? 'border-red-500/30 bg-red-950/20' : 'border-slate-700/50 bg-slate-800/40'} p-4`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Full Details</p>
              <p className="text-slate-200 break-words">{log.details || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">Exact Timestamp</p>
              <p className="text-slate-200 font-mono text-xs">{formatExactTime(log.created_at)}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-widest mb-1">IP Address</p>
              <p className="text-slate-200 font-mono">{log.ip || 'N/A'}</p>
              {log.ip && log.ip !== '127.0.0.1' && (
                <p className="text-slate-500 text-xs mt-1">External IP</p>
              )}
              {log.ip === '127.0.0.1' && (
                <p className="text-slate-500 text-xs mt-1">localhost</p>
              )}
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300 transition">
              ▲ Collapse
            </button>
          </div>
        </div>
      </td>
    </tr>
  )
}

function MultiSelect({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val])
  }

  const label = selected.length === 0 ? placeholder
    : selected.length === 1 ? getMeta(selected[0]).label
    : `${selected.length} actions selected`

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 hover:border-slate-500 rounded-xl px-4 py-2.5 text-sm text-white transition min-w-[200px] justify-between"
      >
        <span className={selected.length ? 'text-white' : 'text-slate-400'}>{label}</span>
        <span className="text-slate-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-2 border-b border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-400">Filter by action type</span>
            {selected.length > 0 && (
              <button onClick={() => onChange([])} className="text-xs text-purple-400 hover:text-purple-300">Clear all</button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {/* Group by tier */}
            {[['critical','🔴 Critical'], ['important','🟡 Important'], ['routine','🔵 Routine'], ['info','🟢 Info']].map(([tier, tierLabel]) => {
              const actions = options.filter(a => getMeta(a).tier === tier)
              if (!actions.length) return null
              return (
                <div key={tier}>
                  <p className="px-3 py-1 text-xs text-slate-500 font-semibold uppercase tracking-widest">{tierLabel}</p>
                  {actions.map(action => {
                    const meta = getMeta(action)
                    const checked = selected.includes(action)
                    return (
                      <button
                        key={action}
                        onClick={() => toggle(action)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-800 transition ${checked ? 'text-white' : 'text-slate-400'}`}
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs shrink-0 ${checked ? 'bg-purple-600 border-purple-600 text-white' : 'border-slate-600'}`}>
                          {checked && '✓'}
                        </span>
                        <span>{meta.icon}</span>
                        <span>{meta.label}</span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ActivityLogs() {
  const [logs, setLogs]               = useState([])
  const [loading, setLoading]         = useState(true)
  const [page, setPage]               = useState(1)
  const [totalPages, setTotalPages]   = useState(1)
  const [total, setTotal]             = useState(0)
  const [actionFilters, setActionFilters] = useState([])   // multi-select
  const [search, setSearch]           = useState('')
  const [datePreset, setDatePreset]   = useState('all')
  const [sortDir, setSortDir]         = useState('desc')   // asc | desc
  const [expandedId, setExpandedId]   = useState(null)

  const [stats, setStats]             = useState({ total: 0, today: 0, unique_admins: 0, critical_actions: 0, last_activity: null, most_active_admin: null })
  const [toast, setToast]             = useState(null)

  const searchDebounce = useRef(null)

  // ── Derived: quick filters ───────────────────────────────────────────
  const criticalActions = ['USER_DELETED', 'SUBJECT_DELETED', 'SECTION_DELETED', 'DATABASE_BACKUP']

  // ── Fetch ────────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const params = new URLSearchParams({
        page,
        limit: 20,
        sort: sortDir,
      })
      // Multi-action filter: send as comma-separated
      if (actionFilters.length > 0) params.set('action', actionFilters.join(','))
      if (search) params.set('search', search)
      // Date preset
      const today = new Date()
      if (datePreset === 'today') {
        params.set('date_from', today.toISOString().split('T')[0])
      } else if (datePreset === '7d') {
        const d = new Date(today); d.setDate(d.getDate() - 7)
        params.set('date_from', d.toISOString().split('T')[0])
      } else if (datePreset === '30d') {
        const d = new Date(today); d.setDate(d.getDate() - 30)
        params.set('date_from', d.toISOString().split('T')[0])
      }

      const res = await fetch(`http://localhost:5000/api/admin/audit-logs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
        setTotalPages(data.pages || 1)
        setTotal(data.total || 0)

        // Compute enhanced stats from what backend returns
        const s = data.stats || {}
        // Count critical actions from this page (approx) – backend should ideally return this
        const criticalCount = (data.logs || []).filter(l => criticalActions.includes(l.action)).length
        setStats({
          total:             s.total || 0,
          today:             s.today || 0,
          // "Unique Admins" instead of vague "Unique Users"
          unique_admins:     s.unique_users || 0,
          critical_actions:  s.critical_total ?? criticalCount,
          last_activity:     s.last_activity || null,
          most_active_admin: s.most_active_admin || null,
        })
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err)
      showToast('Failed to load logs', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, actionFilters, search, datePreset, sortDir])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  // Debounce search
  const handleSearchChange = (val) => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    searchDebounce.current = setTimeout(() => {
      setSearch(val)
      setPage(1)
    }, 350)
  }

  // ── Toast ────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Export ───────────────────────────────────────────────────────────
  const exportCSV = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/reports?format=csv', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        showToast('CSV exported successfully')
      }
    } catch {
      showToast('Export failed', 'error')
    }
  }

  // ── Quick filters ─────────────────────────────────────────────────────
  const applyQuickFilter = (type) => {
    if (type === 'critical') { setActionFilters(criticalActions); setPage(1) }
    if (type === 'clear')    { setActionFilters([]); setDatePreset('all'); setSearch(''); setPage(1) }
    if (type === 'today')    { setDatePreset('today'); setPage(1) }
  }

  const toggleSort = () => {
    setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    setPage(1)
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const activeFilterCount = actionFilters.length + (datePreset !== 'all' ? 1 : 0) + (search ? 1 : 0)

  return (
    <div className="space-y-5 relative">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[999] px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 transition-all ${
          toast.type === 'error' ? 'bg-red-900 text-red-100 border border-red-700' : 'bg-emerald-900 text-emerald-100 border border-emerald-700'
        }`}>
          <span>{toast.type === 'error' ? '✗' : '✓'}</span>
          {toast.msg}
        </div>
      )}

      {/* ── Stats Row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Actions"
          value={stats.total.toLocaleString()}
          icon="📋"
          color="purple"
          tooltip="All-time audit log entries"
        />
        <StatCard
          label="Actions Today"
          value={stats.today}
          icon="📅"
          color="blue"
          tooltip="Actions logged since midnight"
        />
        <StatCard
          label="Active Admins"
          value={stats.unique_admins}
          icon="🛡️"
          color="green"
          tooltip="Unique administrator accounts that have performed at least one action"
        />
        <StatCard
          label="Critical Actions"
          value={stats.critical_actions}
          icon="🚨"
          color="red"
          tooltip="Deletions, config changes, and log clears — high-impact operations"
        />
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="text"
            placeholder="Search actions, users, details, IP…"
            defaultValue={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-700 hover:border-slate-600 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:border-purple-500 outline-none transition"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
        </div>

        {/* Multi-select action filter */}
        <MultiSelect
          options={ALL_ACTION_TYPES}
          selected={actionFilters}
          onChange={(v) => { setActionFilters(v); setPage(1) }}
          placeholder="All Action Types"
        />

        {/* Date preset */}
        <div className="flex rounded-xl border border-slate-700 overflow-hidden">
          {DATE_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => { setDatePreset(p.value); setPage(1) }}
              className={`px-3 py-2.5 text-xs font-medium transition ${
                datePreset === p.value
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Quick filters */}
        <button
          onClick={() => applyQuickFilter('critical')}
          className="px-3 py-2.5 bg-red-950/50 border border-red-600/40 text-red-300 hover:bg-red-900/40 rounded-xl text-xs font-semibold transition"
        >
          🚨 Critical Only
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={() => applyQuickFilter('clear')}
            className="px-3 py-2.5 bg-slate-800 border border-slate-600 text-slate-400 hover:text-white rounded-xl text-xs transition flex items-center gap-1"
          >
            ✕ Clear filters <span className="bg-purple-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{activeFilterCount}</span>
          </button>
        )}

        {/* Actions */}
        <div className="ml-auto flex gap-2">
          <button
            onClick={exportCSV}
            className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium transition flex items-center gap-1.5"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-700/50 overflow-hidden">

        {/* Table header */}
        <div className="bg-slate-800/60 border-b border-slate-700/50 px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {loading ? 'Loading…' : `${total.toLocaleString()} entries`}
            {activeFilterCount > 0 && <span className="ml-2 text-purple-400">(filtered)</span>}
          </p>
          <button
            onClick={toggleSort}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <span>Time</span>
            <span>{sortDir === 'desc' ? '↓ Newest' : '↑ Oldest'}</span>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-500 text-sm">Loading activity logs…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-5xl opacity-30">📭</span>
            <p className="text-slate-400 font-medium">No logs match your filters</p>
            {activeFilterCount > 0 && (
              <button onClick={() => applyQuickFilter('clear')} className="text-purple-400 text-sm hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="px-4 py-3 text-slate-500 text-xs font-semibold uppercase tracking-widest w-56">Action</th>
                  <th className="px-4 py-3 text-slate-500 text-xs font-semibold uppercase tracking-widest w-40">Admin</th>
                  <th className="px-4 py-3 text-slate-500 text-xs font-semibold uppercase tracking-widest">Details</th>
                  <th className="px-4 py-3 text-slate-500 text-xs font-semibold uppercase tracking-widest w-32">IP</th>
                  <th className="px-4 py-3 text-slate-500 text-xs font-semibold uppercase tracking-widest w-32">Time</th>
                  <th className="px-4 py-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {logs.map(log => {
                  const isExpanded = expandedId === log.id
                  const meta = getMeta(log.action)
                  const tc = getTierColors(meta.tier)
                  const isCritical = meta.tier === 'critical'

                  return (
                    <>
                      <tr
                        key={log.id}
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className={`cursor-pointer transition-colors ${
                          isExpanded
                            ? 'bg-slate-800/60'
                            : isCritical
                              ? 'hover:bg-red-950/20'
                              : 'hover:bg-slate-800/30'
                        } ${isCritical && !isExpanded ? 'border-l-2 border-red-500/40' : ''}`}
                      >
                        {/* Action */}
                        <td className="px-4 py-3.5">
                          <ActionBadge action={log.action} />
                        </td>

                        {/* Admin */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                              style={{ background: getAvatarColor(log.admin) }}
                            >
                              {getInitials(log.admin)}
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium leading-tight">{log.admin}</p>
                              <p className="text-slate-500 text-xs">#{log.id}</p>
                            </div>
                          </div>
                        </td>

                        {/* Details */}
                        <td className="px-4 py-3.5 max-w-xs">
                          <p className="text-slate-300 text-sm truncate">{log.details || '—'}</p>
                        </td>

                        {/* IP */}
                        <td className="px-4 py-3.5">
                          <span className="text-slate-400 font-mono text-xs">{log.ip || 'N/A'}</span>
                        </td>

                        {/* Time */}
                        <td className="px-4 py-3.5">
                          <p className="text-slate-300 text-sm" title={formatExactTime(log.created_at)}>
                            {formatRelativeTime(log.created_at)}
                          </p>
                          <p className="text-slate-500 text-xs">
                            {log.created_at ? new Date(log.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                          </p>
                        </td>

                        {/* Expand chevron */}
                        <td className="px-3 py-3.5 text-slate-600 hover:text-slate-400 transition text-xs select-none">
                          {isExpanded ? '▲' : '▼'}
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <ExpandedRow key={`${log.id}-expanded`} log={log} onClose={() => setExpandedId(null)} />
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────────── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800/60">
            <p className="text-slate-500 text-xs">
              {total === 0 ? 0 : (page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                «
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Prev
              </button>

              {/* Page number buttons */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`w-8 h-8 text-xs rounded-lg transition ${
                      pageNum === page
                        ? 'bg-purple-600 text-white font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Legend ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="font-medium text-slate-400">Action severity:</span>
        {[['critical','red','🔴 Critical — deletions & config changes'],
          ['important','amber','🟡 Important — bulk ops, assignments'],
          ['routine','blue','🔵 Routine — user & section management'],
          ['info','green','🟢 Info — unlocks, email updates']
        ].map(([tier, , label]) => (
          <span key={tier} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${getTierColors(tier).badge}`}>
            {label}
          </span>
        ))}
        <span className="ml-auto text-slate-600">Click any row to expand full details</span>
      </div>
    </div>
  )
}
