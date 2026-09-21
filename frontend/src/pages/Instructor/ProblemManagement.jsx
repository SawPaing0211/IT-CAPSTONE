// quests list for a class — shows all problems the instructor created.
// if classId is passed in (from ClassDetail tab), fetches problems scoped to
// that class. if no classId (accessed directly), fetches all instructor problems.
//
// clicking a row goes to submissions view for that problem.
// edit button navigates to CreateProblem with ?edit=id so it pre-fills the form.
// delete hits /api/problems/:id and removes from local state on success.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ProblemManagement({ classId, subjectId }) {
  const navigate = useNavigate()
  const [problems, setProblems] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [success, setSuccess]   = useState(null)
  const [deleteError, setDeleteError] = useState(null)

  // Load quests whenever the class changes
  useEffect(() => { fetchProblems() }, [classId])

  // From inside a class tab, subjectId is already known — go straight to the
  // locked-subject wizard. Reached standalone (no class context), route
  // through the class picker first instead of dropping straight into a bare
  // subject dropdown.
  const goToCreateQuest = () => {
    if (subjectId) {
      navigate(`/instructor/create-problem?from=${encodeURIComponent(fromPath)}&subject_id=${subjectId}`)
    } else {
      navigate('/instructor/create-problem/pick-class')
    }
  }

  // Fetch quests for this class, or all instructor quests if none specified
  const fetchProblems = async () => {
    try {
      const token = localStorage.getItem('token')
      const url = classId
        ? `http://localhost:5000/api/instructor/classes/${classId}/problems`
        : 'http://localhost:5000/api/instructor/problems'
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) setProblems(await res.json())
    } catch (err) {
      console.error('Failed to fetch problems:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = (problem) => {
    setDeleteTarget(problem)
  }

  // Delete the selected quest and remove it from the local list. A failed
  // request used to close the confirm dialog silently, with no sign the
  // quest was still sitting in the database — this now surfaces that instead
  // of leaving the instructor to assume it worked.
  const confirmDelete = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/problems/${target.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setProblems(problems.filter(p => p.id !== target.id))
        setSuccess('Quest deleted.')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const error = await res.json().catch(() => ({}))
        setDeleteError(error.error || `Couldn't delete "${target.title}". Please try again.`)
        setTimeout(() => setDeleteError(null), 5000)
      }
    } catch (err) {
      console.error('Failed to delete problem:', err)
      setDeleteError(`Couldn't delete "${target.title}" — check your connection and try again.`)
      setTimeout(() => setDeleteError(null), 5000)
    }
  }

  // Filter quests by title search
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

  // where to go back to after editing — depends on whether we're inside a class or standalone
  const fromPath = classId
    ? `/instructor/class/${classId}`
    : '/instructor/problems'

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent" />
      <p className="text-slate-500 text-sm animate-pulse">Loading quests...</p>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Quests</h2>
          <p className="text-slate-400 mt-0.5 text-sm">Create and manage coding quests for your students</p>
        </div>
        <button
          onClick={goToCreateQuest}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold transition shadow-lg shadow-purple-600/20 flex items-center gap-2 text-sm"
        >
          ⚔️ Create Quest
        </button>
      </div>

      {success && (
        <div className="p-4 bg-green-900/30 border border-green-600/40 rounded-xl text-green-300 text-sm flex items-center gap-2">
          ✅ {success}
        </div>
      )}

      {deleteError && (
        <div className="p-4 bg-red-900/30 border border-red-600/40 rounded-xl text-red-300 text-sm flex items-center gap-2">
          ⚠️ {deleteError}
        </div>
      )}

      {/* Stat Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: problems.length,                                             border: 'border-l-slate-500',   text: 'text-white' },
          { label: 'Coding',    value: problems.filter(p => p.problem_type === 'coding').length,    border: 'border-l-purple-500',  text: 'text-purple-400' },
          { label: 'Debugging', value: problems.filter(p => p.problem_type === 'debugging').length, border: 'border-l-blue-500',    text: 'text-blue-400' },
          { label: 'Events',    value: problems.filter(p => p.is_event_quest).length,               border: 'border-l-yellow-500',  text: 'text-yellow-400' },
        ].map(stat => (
          <div key={stat.label} className={`bg-slate-900 border border-slate-800 border-l-4 ${stat.border} rounded-xl p-4`}>
            <p className={`text-2xl font-black ${stat.text} tabular-nums`}>{stat.value}</p>
            <p className="text-slate-500 text-xs mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
        <input
          type="text"
          placeholder="Search quests..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 pl-11 text-white placeholder-slate-600 focus:border-purple-500/60 focus:outline-none transition text-sm"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-slate-800/60 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-800">
              <th className="px-5 py-3.5 font-semibold">Quest</th>
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
                    <p className="font-medium text-slate-300">
                      {search ? 'No quests match your search' : 'No quests yet'}
                    </p>
                    {!search && (
                      <button
                        onClick={goToCreateQuest}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition mt-1"
                      >
                        Create Your First Quest
                      </button>
                    )}
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
                    onClick={() => navigate(`/instructor/problem/${problem.id}/submissions?from=${encodeURIComponent(fromPath)}`)}
                  >
                    {/* Title */}
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-purple-400 group-hover:text-purple-300 transition group-hover:underline underline-offset-2">
                          {problem.title}
                        </span>
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
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {problem.problem_type === 'coding' ? '💻 Coding' : '🐛 Debug'}
                      </span>
                    </td>

                    {/* Languages */}
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {(problem.languages || []).map(lang => {
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
                        <span className={`w-1.5 h-1.5 rounded-full ${diff.dot}`} />
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
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                        problem.is_published
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-slate-700/50 text-slate-400 border-slate-700'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${problem.is_published ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
                        {problem.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>

                    {/* Actions — always visible, not hover-only. hover-only means
                        on mobile/touch the buttons are completely unreachable */}
                    <td className="px-5 py-4 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => navigate(`/instructor/create-problem?edit=${problem.id}&from=${encodeURIComponent(fromPath)}`)}
                          title="Edit"
                          className="p-2 hover:bg-purple-500/10 rounded-lg transition text-slate-500 hover:text-purple-400"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(problem)}
                          title="Delete"
                          className="p-2 hover:bg-red-500/10 rounded-lg transition text-slate-500 hover:text-red-400"
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

      {filtered.length > 0 && (
        <p className="text-slate-600 text-xs text-right">
          Showing {filtered.length} of {problems.length} quests
        </p>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border-2 border-red-600/40 rounded-2xl w-full max-w-sm shadow-2xl shadow-red-900/30 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl">
                🗑️
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Delete Quest?</h3>
              <p className="text-slate-400 text-sm">
                Delete <span className="text-white font-semibold">"{deleteTarget.title}"</span>? This also removes all student submissions for it.
              </p>
            </div>
            <div className="flex gap-3 p-4 pt-0">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold transition text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
