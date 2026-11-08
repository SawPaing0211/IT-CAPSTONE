import { Fragment, useState, useEffect, useRef, useCallback } from 'react'
import { API_BASE, authFetch } from '../../api/client'
import { parseApiTimestamp } from '../../utils/apiTimestamp'

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

const CRITICAL_ACTIONS = Object.keys(ACTION_META).filter(action => ACTION_META[action].tier === 'critical')

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
  const date = parseApiTimestamp(dateStr)
  if (!date) return 'Time unavailable'
  const diff = Math.floor((Date.now() - date) / 1000)
  if (diff < 60)    return 'Just now'
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return date.toLocaleDateString()
}

function formatExactTime(dateStr) {
  return parseApiTimestamp(dateStr)?.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) ?? 'Time unavailable'
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

function ExpandedRow({ log }) {
  const meta = getMeta(log.action)
  const tc = getTierColors(meta.tier)
  return (
    <tr role="row" id={`audit-detail-${log.id}`}>
      <td role="cell" colSpan="6" className="px-4 pb-4 pt-0">
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
              {/* Label the IP as external or localhost */}
              {log.ip && log.ip !== '127.0.0.1' && (
                <p className="text-slate-500 text-xs mt-1">External IP</p>
              )}
              {log.ip === '127.0.0.1' && (
                <p className="text-slate-500 text-xs mt-1">localhost</p>
              )}
            </div>
          </div>
        </div>
      </td>
    </tr>
  )
}

function MultiSelect({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false)
  const ref = useRef()

  // Close the dropdown when clicking outside it
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Add or remove an action type from the selected filters
  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val])
  }

  // Build the label shown on the filter button
  const label = selected.length === 0 ? placeholder
    : selected.length === 1 ? getMeta(selected[0]).label
    : `${selected.length} actions selected`

  return (
    <div className="relative w-full sm:w-auto" ref={ref} onKeyDown={event => { if (open && event.key === 'Escape') { setOpen(false); ref.current.querySelector('button')?.focus() } }}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="admin-button flex items-center gap-2 border rounded-xl px-4 py-2.5 text-sm text-white transition w-full justify-between sm:min-w-[200px]"
      >
        <span className={selected.length ? 'text-white' : 'text-slate-400'}>{label}</span>
        <span className="text-slate-500 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-full sm:w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
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
                        aria-pressed={checked}
                        onClick={() => toggle(action)}
                        className={`w-full min-h-11 flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-800 transition ${checked ? 'text-white' : 'text-slate-400'}`}
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

  const [stats, setStats] = useState(null)
  const [loadError, setLoadError] = useState(false)
  const [retry, setRetry] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [toast, setToast] = useState(null)
  const [searchInput, setSearchInput] = useState('')

  useEffect(() => {
    if (searchInput === search) return
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
      setExpandedId(null)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput, search])

  const filterParams = useCallback(() => {
    const params = new URLSearchParams()
    if (actionFilters.length) params.set('action', actionFilters.join(','))
    if (search.trim()) params.set('search', search.trim())
    if (datePreset !== 'all') {
      const daysAgo = datePreset === 'today' ? 0 : datePreset === '7d' ? 6 : 29
      const from = new Date()
      from.setUTCDate(from.getUTCDate() - daysAgo)
      params.set('date_from', from.toISOString().slice(0, 10))
    }
    return params
  }, [actionFilters, search, datePreset])

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true)
      setLoadError(false)
      try {
        const params = filterParams()
        params.set('page', page)
        params.set('limit', 20)
        params.set('sort', sortDir)
        const res = await authFetch(`${API_BASE}/api/admin/audit-logs?${params}`, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (controller.signal.aborted) return
        if (!Array.isArray(data.logs) || !Number.isInteger(data.total)) throw new Error('Invalid log response')
        setLogs(data.logs)
        setTotalPages(data.pages || 1)
        setTotal(data.total)
        setStats(data.stats)
      } catch {
        if (!controller.signal.aborted) setLoadError(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    load()
    return () => controller.abort()
  }, [page, sortDir, filterParams, retry])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

  const exportCSV = async () => {
    setExporting(true)
    try {
      const res = await authFetch(`${API_BASE}/api/admin/audit-logs/export?${filterParams()}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const url = URL.createObjectURL(await res.blob())
      const link = document.createElement('a')
      link.href = url
      link.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setToast({ msg: 'CSV exported successfully', type: 'success' })
    } catch {
      setToast({ msg: 'Export failed', type: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const clearFilters = () => {
    setActionFilters([])
    setDatePreset('all')
    setSearchInput('')
    setSearch('')
    setPage(1)
    setExpandedId(null)
  }

  // Flip the sort direction and jump back to page one
  const toggleSort = () => {
    setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    setPage(1)
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const activeFilterCount = actionFilters.length + (datePreset !== 'all' ? 1 : 0) + (searchInput.trim() ? 1 : 0)

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
          value={stats?.total?.toLocaleString() ?? '—'}
          icon="📋"
          color="purple"
          tooltip="All-time audit log entries"
        />
        <StatCard
          label="Actions Today"
          value={stats?.today ?? '—'}
          icon="📅"
          color="blue"
          tooltip="Actions logged since midnight"
        />
        <StatCard
          label="Active Admins"
          value={stats?.unique_users ?? '—'}
          icon="🛡️"
          color="green"
          tooltip="Unique administrator accounts that have performed at least one action"
        />
        <StatCard
          label="Critical Actions"
          value={stats?.critical_total ?? '—'}
          icon="🚨"
          color="red"
          tooltip="Deletions, config changes, and log clears — high-impact operations"
        />
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative min-w-0 basis-full sm:flex-1 sm:basis-56">
          <input
            type="text"
            placeholder="Search actions, details, or IP…"
            aria-label="Search activity logs"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
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
        <div role="group" aria-label="Date range" className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-700 bg-slate-700 sm:flex sm:w-auto">
          {DATE_PRESETS.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => { setDatePreset(p.value); setPage(1) }}
              aria-pressed={datePreset === p.value}
              className={`min-h-11 px-3 py-2.5 text-xs font-medium transition focus-visible:-outline-offset-2 ${
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
          type="button"
          onClick={() => { setActionFilters(CRITICAL_ACTIONS); setPage(1); setExpandedId(null) }}
          className="min-h-11 px-3 py-2.5 bg-red-950/50 border border-red-600/40 text-red-300 hover:bg-red-900/40 rounded-xl text-xs font-semibold transition"
        >
          🚨 Critical Only
        </button>

        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="admin-button px-3 py-2.5 border text-slate-400 rounded-xl text-xs transition flex items-center gap-1"
          >
            ✕ Clear filters <span className="bg-purple-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{activeFilterCount}</span>
          </button>
        )}

        {/* Actions */}
        <div className="ml-auto flex gap-2">
          <button
            onClick={exportCSV}
            disabled={exporting || loading || loadError || searchInput !== search}
            className="admin-button px-3 py-2.5 border text-slate-300 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
          >
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <div className="bg-slate-900/80 rounded-2xl border border-slate-700/50 overflow-hidden">

        {/* Table header */}
        <div className="bg-slate-800/60 border-b border-slate-700/50 px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {loading ? 'Loading…' : loadError ? 'Logs unavailable' : `${total.toLocaleString()} entries`}
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
        ) : loadError ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 p-4 text-sm text-amber-100">
            <span>Activity logs could not be loaded.</span>
            <button type="button" onClick={() => setRetry(value => value + 1)} className="admin-button px-4">Retry</button>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-5xl opacity-30">📭</span>
            <p className="text-slate-400 font-medium">No logs match your filters</p>
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-purple-400 text-sm hover:underline">
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table role="table" aria-label="Activity log entries" className="admin-record-table w-full">
              <thead role="rowgroup">
                <tr role="row" className="text-left">
                  <th scope="col" role="columnheader" className="px-4 py-3 text-slate-500 text-xs font-semibold uppercase tracking-widest w-56">Action</th>
                  <th scope="col" role="columnheader" className="px-4 py-3 text-slate-500 text-xs font-semibold uppercase tracking-widest w-40">Admin</th>
                  <th scope="col" role="columnheader" className="px-4 py-3 text-slate-500 text-xs font-semibold uppercase tracking-widest">Details</th>
                  <th scope="col" role="columnheader" className="px-4 py-3 text-slate-500 text-xs font-semibold uppercase tracking-widest w-32">IP</th>
                  <th scope="col" role="columnheader" className="px-4 py-3 text-slate-500 text-xs font-semibold uppercase tracking-widest w-32">Time</th>
                  <th scope="col" role="columnheader" className="px-4 py-3 w-8">Details</th>
                </tr>
              </thead>
              <tbody role="rowgroup" className="divide-y divide-slate-800/60">
                {logs.map(log => {
                  const isExpanded = expandedId === log.id
                  const meta = getMeta(log.action)
                  const isCritical = meta.tier === 'critical'

                  return (
                    <Fragment key={log.id}>
                      <tr
                        role="row"
                        className={`transition-colors ${
                          isExpanded
                            ? 'bg-slate-800/60'
                            : isCritical
                              ? 'hover:bg-red-950/20'
                              : 'hover:bg-slate-800/30'
                        } ${isCritical && !isExpanded ? 'border-l-2 border-red-500/40' : ''}`}
                      >
                        {/* Action */}
                        <td role="cell" className="admin-record-heading px-4 py-3.5">
                          <ActionBadge action={log.action} />
                        </td>

                        {/* Admin */}
                        <td role="cell" data-label="Admin" className="px-4 py-3.5">
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
                        <td role="cell" data-label="Summary" className="px-4 py-3.5 max-w-xs">
                          <p className="text-slate-300 text-sm truncate">{log.details || '—'}</p>
                        </td>

                        {/* IP */}
                        <td role="cell" data-label="IP address" className="px-4 py-3.5">
                          <span className="text-slate-400 font-mono text-xs">{log.ip || 'N/A'}</span>
                        </td>

                        {/* Time */}
                        <td role="cell" data-label="Time" className="px-4 py-3.5">
                          <p className="text-slate-300 text-sm" title={formatExactTime(log.created_at)}>
                            {formatRelativeTime(log.created_at)}
                          </p>
                          <p className="text-slate-500 text-xs">
                            {parseApiTimestamp(log.created_at)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        </td>

                        {/* Expand chevron */}
                        <td role="cell" className="admin-record-actions px-3 py-3.5">
                          <button type="button" className="admin-button px-3 text-xs" aria-expanded={isExpanded}
                            aria-controls={isExpanded ? `audit-detail-${log.id}` : undefined}
                            onClick={() => setExpandedId(isExpanded ? null : log.id)}>
                            {isExpanded ? 'Hide details' : 'View details'}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <ExpandedRow key={`${log.id}-expanded`} log={log} />
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ────────────────────────────────────────────── */}
        {!loading && !loadError && totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t border-slate-800/60">
            <p className="text-slate-500 text-xs">
              {total === 0 ? 0 : (page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total.toLocaleString()}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="admin-button px-2 py-1.5 text-xs rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                «
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="admin-button px-3 py-1.5 text-xs rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
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
                    className={`min-h-11 min-w-11 text-xs rounded-lg transition ${
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
                className="admin-button px-3 py-1.5 text-xs rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                Next
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="admin-button px-2 py-1.5 text-xs rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition"
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
