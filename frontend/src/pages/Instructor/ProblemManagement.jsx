import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ProblemManagement({ classId }) {
  const navigate = useNavigate()
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProblems()
  }, [])

  const fetchProblems = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/instructor/problems', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        // ✅ Filter problems by classId (block_id)
        const filtered = classId 
            ? data.filter(p => !p.visible_to_blocks || p.visible_to_blocks.includes(parseInt(classId)))
            : data
        setProblems(filtered)
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
      if (res.ok) {
        setProblems(problems.filter(p => p.id !== id))
      }
    } catch (err) {
      console.error('Failed to delete problem:', err)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-400">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
        Loading problems...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Problem Management</h1>
          <p className="text-slate-400">Create and manage coding challenges for your students</p>
        </div>
        <button 
          onClick={() => navigate('/instructor/create-problem')}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-600/20 flex items-center gap-2"
        >
          ➕ Create Quest
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Problems</p>
          <p className="text-2xl font-bold text-white">{problems.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Coding</p>
          <p className="text-2xl font-bold text-blue-400">{problems.filter(p => p.problem_type === 'coding').length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Debugging</p>
          <p className="text-2xl font-bold text-purple-400">{problems.filter(p => p.problem_type === 'debugging').length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Event Quests</p>
          <p className="text-2xl font-bold text-yellow-400">{problems.filter(p => p.is_event_quest).length}</p>
        </div>
      </div>

      {/* Problems Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-800/50 text-slate-400 text-sm">
            <tr>
              <th className="p-4 font-medium">Problem Title</th>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium">Languages</th>
              <th className="p-4 font-medium">Difficulty</th>
              <th className="p-4 font-medium">XP</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {problems.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-500">
                  <div className="flex flex-col items-center gap-3">
                    <div className="text-5xl">📝</div>
                    <p>{classId ? 'No problems for this class yet' : 'No problems created yet'}</p>
                    <button 
                      onClick={() => navigate('/instructor/create-problem')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition"
                    >
                      Create Your First Quest
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              problems.map(problem => (
                <tr key={problem.id} className="hover:bg-slate-800/30 transition cursor-pointer" onClick={() => navigate(`/instructor/problem/${problem.id}/submissions`)}>
                  {/* ✅ Clickable Title - Navigates to Submissions */}
                  <td className="p-4">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/instructor/problem/${problem.id}/submissions`)
                      }}
                      className="font-bold text-blue-400 hover:text-blue-300 text-left hover:underline"
                    >
                      {problem.title}
                    </button>
                    {problem.is_event_quest && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded text-[10px] font-bold border border-yellow-600/30">
                        EVENT
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      problem.problem_type === 'coding' ? 'bg-blue-600/20 text-blue-400' : 'bg-purple-600/20 text-purple-400'
                    }`}>
                      {problem.problem_type === 'coding' ? '💻 Coding' : '🐛 Debugging'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1 flex-wrap">
                      {problem.languages.map(lang => (
                        <span key={lang} className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">
                          {lang === 'python' ? '🐍' : lang === 'java' ? '☕' : '🔷'} {lang}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      problem.difficulty === 'Easy' ? 'bg-green-600/20 text-green-400' :
                      problem.difficulty === 'Medium' ? 'bg-yellow-600/20 text-yellow-400' :
                      'bg-red-600/20 text-red-400'
                    }`}>
                      {problem.difficulty}
                    </span>
                  </td>
                  <td className="p-4 text-yellow-400 font-mono font-bold">{problem.xp_reward} XP</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      problem.is_published ? 'bg-green-600/20 text-green-400' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {problem.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  {/* ✅ Actions - Stop propagation so they don't trigger row click */}
                  <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => navigate(`/instructor/create-problem?id=${problem.id}`)}
                        className="p-2 hover:bg-blue-600/20 rounded-lg transition text-blue-400 hover:text-blue-300"
                        title="Edit Problem"
                      >
                        ✏️
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(problem.id)
                        }}
                        className="p-2 hover:bg-red-600/20 rounded-lg transition text-red-400 hover:text-red-300"
                        title="Delete Problem"
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}