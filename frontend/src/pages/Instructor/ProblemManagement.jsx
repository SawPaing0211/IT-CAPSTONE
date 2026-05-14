import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ProblemManagement({ classId }) {
  const navigate = useNavigate()
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { fetchProblems() }, [classId])

  const fetchProblems = async () => {
    try {
      const token = localStorage.getItem('token')
      const url = classId
        ? `http://localhost:5000/api/instructor/classes/${classId}/problems`
        : 'http://localhost:5000/api/instructor/problems'
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setProblems(data)
      }
    } catch (err) {
      console.error('Failed to fetch problems:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this problem?')) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/problems/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setProblems(problems.filter(p => p.id !== id))
    } catch (err) {
      console.error('Failed to delete problem:', err)
    }
  }

  const filtered = problems.filter(p =>
    p.title.toLowerCase().includes(search.toLowerCase())
  )

  const difficultyConfig = {
    Easy:   { color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
    Medium: { color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20',  dot: 'bg-yellow-400' },
    Hard:   { color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20',     dot: 'bg-red-400' },
  }

  const langConfig = {
    python: { icon: '🐍', label: 'Python' },
    java:   { icon: '☕', label: 'Java' },
    csharp: { icon: '🔷', label: 'C#' },
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        <p className="text-slate-500 text-sm animate-pulse">Loading activities...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Activity Management</h1>
          <p className="text-slate-400 mt-1 text-sm">Create and manage coding activities for your students</p>
        </div>
        <button
          onClick={() => navigate('/instructor/create-problem')}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-600/20 flex items-center gap-2 text-sm"
        >
          ➕ Create Quest
        </button>
      </div>

      {/* Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: problems.length,                                          color: 'text-white',       bg: 'bg-slate-800' },
          { label: 'Coding',    value: problems.filter(p => p.problem_type === 'coding').length,    color: 'text-blue-400',    bg: 'bg-blue-500/10' },
          { label: 'Debugging', value: problems.filter(p => p.problem_type === 'debugging').length, color: 'text-purple-400',  bg: 'bg-purple-500/10' },
          { label: 'Events',    value: problems.filter(p => p.is_event_quest).length,               color: 'text-yellow-400',  bg: 'bg-yellow-500/10' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.bg} border border-slate-800 rounded-xl p-4`}>
            <p className={`text-2xl font-black ${stat.color} tabular-nums`}>{stat.value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-base pointer-events-none">🔍</span>
        <input
          type="text"
          placeholder="Search activities..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 pl-11 text-white placeholder-slate-600 focus:border-blue-500/60 focus:outline-none transition text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-800/50 text-slate-500 text-xs uppercase tracking-wider">
              <th className="px-5 py-3.5 font-semibold">Activity</th>
              <th className="px-5 py-3.5 font-semibold">Type</th>
              <th className="px-5 py-3.5 font-semibold hidden md:table-cell">Languages</th>
              <th className="px-5 py-3.5 font-semibold">Difficulty</th>
              <th className="px-5 py-3.5 font-semibold hidden sm:table-cell">XP</th>
              <th className="px-5 py-3.5 font-semibold">Status</th>
              <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-slate-500">
                    <span className="text-5xl">📝</span>
                    <p className="font-medium">No activities found</p>
                    <button
                      onClick={() => {
            const from = classId ? `/instructor/class/${classId}` : '/instructor/problems'
            navigate(`/instructor/create-problem?from=${encodeURIComponent(from)}`)
          }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold transition mt-1"
                    >
                      Create Your First Quest
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(problem => {
                const diff = difficultyConfig[problem.difficulty] || difficultyConfig.Easy
                return (
                  <tr
                    key={problem.id}
                    className="hover:bg-slate-800/30 transition cursor-pointer group"
                    onClick={() => navigate(`/instructor/problem/${problem.id}/submissions`)}
                  >
                    {/* Title */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); navigate(`/instructor/problem/${problem.id}/submissions`) }}
                          className="font-semibold text-blue-400 hover:text-blue-300 text-left group-hover:underline underline-offset-2 transition"
                        >
                          {problem.title}
                        </button>
                        {problem.is_event_quest && (
                          <span className="w-fit px-2 py-0.5 bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 rounded text-xs font-bold">
                            ⭐ EVENT
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        problem.problem_type === 'coding'
                          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                      }`}>
                        {problem.problem_type === 'coding' ? '💻' : '🐛'}
                        {problem.problem_type === 'coding' ? 'Coding' : 'Debug'}
                      </span>
                    </td>

                    {/* Languages */}
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {problem.languages.map(lang => {
                          const l = langConfig[lang] || { icon: '📄', label: lang }
                          return (
                            <span key={lang} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-md text-xs text-slate-300 flex items-center gap-1">
                              <span>{l.icon}</span> {l.label}
                            </span>
                          )
                        })}
                      </div>
                    </td>

                    {/* Difficulty */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${diff.bg} ${diff.color} border ${diff.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`}></span>
                        {problem.difficulty}
                      </span>
                    </td>

                    {/* XP */}
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <span className="text-yellow-400 font-black tabular-nums text-sm">{problem.xp_reward}</span>
                      <span className="text-yellow-600 text-xs ml-1">XP</span>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        problem.is_published
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                          : 'bg-slate-700/50 text-slate-400 border border-slate-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${problem.is_published ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`}></span>
                        {problem.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            const from = classId ? `/instructor/class/${classId}` : '/instructor/problems'
                            navigate(`/instructor/create-problem?edit=${problem.id}&from=${encodeURIComponent(from)}`)
                          }}
                          title="Edit Activity"
                          className="p-2 hover:bg-blue-500/10 rounded-lg transition text-slate-400 hover:text-blue-400"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(problem.id)}
                          title="Delete Activity"
                          className="p-2 hover:bg-red-500/10 rounded-lg transition text-slate-400 hover:text-red-400"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer count */}
      {filtered.length > 0 && (
        <p className="text-slate-600 text-xs text-right">
          Showing {filtered.length} of {problems.length} activities
        </p>
      )}
    </div>
  )
}
