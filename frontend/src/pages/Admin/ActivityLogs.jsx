import { useState, useEffect } from 'react'

export default function ActivityLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [actionFilter, setActionFilter] = useState('all')

  useEffect(() => {
    fetchLogs()
  }, [page, actionFilter])

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('token')
      const url = `http://localhost:5000/api/admin/audit-logs?page=${page}&limit=20&action=${actionFilter}`
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setLogs(data)
        // Calculate total pages (assuming 20 per page)
        setTotalPages(Math.ceil(data.length / 20))
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
      const res = await fetch('http://localhost:5000/api/admin/export-activity-logs', {
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
    if (!confirm('Delete activity logs older than 30 days?')) return
    
    // This would need a backend endpoint
    alert('This feature will be implemented in the next update')
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
          <button 
            onClick={clearOldLogs}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-600/50 rounded-lg transition flex items-center gap-2 text-red-300"
          >
            <span>🗑️</span> Clear Old Logs
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 rounded-xl border border-purple-600/30 p-4">
          <p className="text-slate-400 text-sm mb-1">Total Actions</p>
          <p className="text-2xl font-black text-purple-400">{logs.length}</p>
        </div>
        <div className="bg-slate-900/80 rounded-xl border border-blue-600/30 p-4">
          <p className="text-slate-400 text-sm mb-1">Today</p>
          <p className="text-2xl font-black text-blue-400">
            {logs.filter(log => new Date(log.created_at).toDateString() === new Date().toDateString()).length}
          </p>
        </div>
        <div className="bg-slate-900/80 rounded-xl border border-green-600/30 p-4">
          <p className="text-slate-400 text-sm mb-1">Unique Users</p>
          <p className="text-2xl font-black text-green-400">
            {new Set(logs.map(log => log.user)).size}
          </p>
        </div>
        <div className="bg-slate-900/80 rounded-xl border border-yellow-600/30 p-4">
          <p className="text-slate-400 text-sm mb-1">Last Activity</p>
          <p className="text-2xl font-black text-yellow-400">
            {logs.length > 0 ? 'Just now' : 'N/A'}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search by user, action, details, or IP..."
          className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white focus:border-purple-500 outline-none transition"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
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
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            log.action === 'UPDATE_USER' ? 'bg-blue-600/30 text-blue-300' :
                            log.action === 'CREATE_BLOCK' ? 'bg-green-600/30 text-green-300' :
                            log.action === 'DELETE_BLOCK' ? 'bg-red-600/30 text-red-300' :
                            log.action === 'CONFIG_UPDATED' ? 'bg-purple-600/30 text-purple-300' :
                            'bg-slate-600/30 text-slate-300'
                          }`}>
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
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, logs.length)} of {logs.length} entries
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