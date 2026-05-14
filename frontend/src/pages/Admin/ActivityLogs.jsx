import { useState, useEffect } from 'react'

export default function ActivityLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [actionFilter, setActionFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [stats, setStats] = useState({ total: 0, today: 0, unique_users: 0, last_activity: null })

  useEffect(() => {
    fetchLogs()
  }, [page, actionFilter, search])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const url = `http://localhost:5000/api/admin/audit-logs?page=${page}&limit=20&action=${actionFilter}&search=${search}`
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        // Backend now returns { logs, stats, total, pages }
        setLogs(data.logs || [])
        setStats(data.stats || { total: 0, today: 0, unique_users: 0, last_activity: null })
        setTotalPages(data.pages || 1)
        setTotal(data.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    } finally {
      setLoading(false)
    }
  }

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
        a.download = `activity_logs_${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error('Failed to export logs:', err)
    }
  }

  const clearOldLogs = async () => {
    if (!confirm('Delete activity logs older than 30 days? This cannot be undone.')) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/audit-logs/clear', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        alert(`✅ ${data.message}`)
        fetchLogs()
      }
    } catch (err) {
      console.error('Failed to clear logs:', err)
    }
  }

  const formatRelativeTime = (dateStr) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diff = Math.floor((now - date) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const getActionStyle = (action) => {
    if (!action) return 'bg-slate-600/30 text-slate-300'
    if (action.includes('DELETE') || action.includes('CLEAR')) return 'bg-red-600/30 text-red-300 border border-red-600/40'
    if (action.includes('CREATE') || action.includes('ADD')) return 'bg-green-600/30 text-green-300 border border-green-600/40'
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-blue-600/30 text-blue-300 border border-blue-600/40'
    if (action.includes('LOGIN') || action.includes('CONFIG')) return 'bg-purple-600/30 text-purple-300 border border-purple-600/40'
    return 'bg-slate-600/30 text-slate-300 border border-slate-600/40'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-slate-400">Comprehensive audit trail of all administrative actions</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={exportCSV}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition flex items-center gap-2"
          >
            <span>📥</span> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 rounded-xl border border-purple-600/30 p-4 hover:border-purple-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">Total Actions</p>
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-3xl font-black text-purple-400">{stats.total}</p>
        </div>
        <div className="bg-slate-900/80 rounded-xl border border-blue-600/30 p-4 hover:border-blue-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">Today</p>
            <span className="text-2xl">📅</span>
          </div>
          <p className="text-3xl font-black text-blue-400">{stats.today}</p>
        </div>
        <div className="bg-slate-900/80 rounded-xl border border-green-600/30 p-4 hover:border-green-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">Unique Users</p>
            <span className="text-2xl">👥</span>
          </div>
          <p className="text-3xl font-black text-green-400">{stats.unique_users}</p>
        </div>
        <div className="bg-slate-900/80 rounded-xl border border-yellow-600/30 p-4 hover:border-yellow-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">Last Activity</p>
            <span className="text-2xl">⏱️</span>
          </div>
          <p className="text-lg font-black text-yellow-400">
            {stats.last_activity ? formatRelativeTime(stats.last_activity) : 'N/A'}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by user, action, details, or IP..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:border-purple-500 outline-none transition"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        </div>
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1) }}
          className="bg-slate-900/80 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 outline-none transition"
        >
          <option value="all">All Actions</option>
          <option value="USER_CREATED">User Created</option>
          <option value="USER_UPDATED">User Updated</option>
          <option value="USER_DELETED">User Deleted</option>
          <option value="CONFIG_UPDATED">Config Updated</option>
          <option value="LOGS_CLEARED">Logs Cleared</option>
        </select>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="bg-slate-900/80 rounded-2xl border border-purple-600/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/80">
                <tr>
                  <th className="text-left p-4 text-slate-400 font-medium text-sm">ACTION</th>
                  <th className="text-left p-4 text-slate-400 font-medium text-sm">USER</th>
                  <th className="text-left p-4 text-slate-400 font-medium text-sm">DETAILS</th>
                  <th className="text-left p-4 text-slate-400 font-medium text-sm">IP ADDRESS</th>
                  <th className="text-left p-4 text-slate-400 font-medium text-sm">TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-slate-400">
                      <div className="text-4xl mb-3">📭</div>
                      No activity logs found
                    </td>
                  </tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">⚙️</span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${getActionStyle(log.action)}`}>
                              {log.action}
                            </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-white">{log.admin}</p>
                        <p className="text-slate-400 text-xs">ID: {log.id}</p>
                      </td>
                      <td className="p-4 text-slate-300 max-w-md truncate">
                        {log.details}
                      </td>
                      <td className="p-4 text-slate-400 font-mono text-sm">
                        {log.ip || 'N/A'}
                      </td>
                      <td className="p-4">
                        <p className="text-slate-300">{new Date(log.created_at).toLocaleTimeString()}</p>
                        <p className="text-slate-500 text-xs">{new Date(log.created_at).toLocaleDateString()}</p>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center p-4 border-t border-slate-800">
              <p className="text-slate-400 text-sm">
                Showing {total === 0 ? 0 : (page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} entries
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 bg-purple-600 rounded">{page}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}