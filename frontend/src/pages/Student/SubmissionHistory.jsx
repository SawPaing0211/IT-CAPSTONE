import { useState, useEffect } from 'react'

export default function SubmissionHistory() {
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => { fetchHistory() }, [page, filter])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/student/submissions?page=${page}&limit=12`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch chronicle')
      const data = await res.json()
      setSubmissions(data.submissions)
      setTotalPages(data.pages)
    } catch (err) { console.error('History error:', err) }
    finally { setLoading(false) }
  }

  const filtered = filter === 'all' ? submissions : submissions.filter(s => s.status === filter)

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent drop-shadow-lg">📜 Submission Chronicle</h2>
          <p className="text-slate-300 text-sm font-medium">Track your coding journey and past attempts</p>
        </div>
        <div className="flex gap-2 bg-slate-800/70 p-1 rounded-lg border border-slate-700">
          {[{id:'all',label:'All'},{id:'accepted',label:'✅ Victory'},{id:'wrong_answer',label:'❌ Failed'},{id:'error',label:'⚠️ Error'}].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${filter===f.id?'bg-purple-600 text-white shadow':'text-slate-400 hover:text-white hover:bg-slate-700'}`}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-purple-300 font-mono animate-pulse drop-shadow">Consulting the archives...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/80 rounded-2xl border border-slate-800">
          <div className="text-5xl mb-3">📭</div>
          <p className="text-slate-300 font-medium mb-1">No submissions found</p>
          <p className="text-slate-500 text-sm">Start your first quest to build your chronicle!</p>
        </div>
      ) : (
        <div className="bg-gradient-to-b from-slate-900/80 to-purple-900/20 rounded-2xl border border-purple-600/40 overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-800/90 border-b border-purple-600/30">
                <tr>
                  <th className="text-left p-4 font-bold text-slate-300 text-xs uppercase tracking-wider">Quest</th>
                  <th className="text-left p-4 font-bold text-slate-300 text-xs uppercase tracking-wider">Result</th>
                  <th className="text-left p-4 font-bold text-slate-300 text-xs uppercase tracking-wider">XP</th>
                  <th className="text-left p-4 font-bold text-slate-300 text-xs uppercase tracking-wider">Language</th>
                  <th className="text-left p-4 font-bold text-slate-300 text-xs uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filtered.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-4">
                      <p className="font-semibold text-white drop-shadow">{sub.problem_title}</p>
                      <p className="text-[10px] text-slate-500 font-mono">ID: #{sub.problem_id}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                        sub.status === 'accepted' ? 'bg-green-500/20 text-green-300 border-green-500/40' :
                        sub.status === 'wrong_answer' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                        'bg-orange-500/20 text-orange-300 border-orange-500/40'
                      }`}>
                        {sub.status === 'accepted' ? '🏆 Victory' : sub.status === 'wrong_answer' ? '💀 Failed' : '⚠️ Error'}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-yellow-300 font-bold drop-shadow">{sub.score}</td>
                    <td className="p-4 text-slate-400 capitalize text-sm">{sub.language}</td>
                    <td className="p-4 text-slate-400 text-xs font-mono">{new Date(sub.submitted_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 p-4 border-t border-slate-800">
              <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1.5 bg-slate-800 rounded-lg disabled:opacity-40 text-slate-300 hover:text-white transition text-sm">← Prev</button>
              <span className="text-slate-400 text-sm font-medium">Page {page} of {totalPages}</span>
              <button disabled={page===totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1.5 bg-slate-800 rounded-lg disabled:opacity-40 text-slate-300 hover:text-white transition text-sm">Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}