import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function ProblemManagement() {
  const navigate = useNavigate()
  const [problems, setProblems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    fetchProblems()
  }, [])

  const fetchProblems = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/instructor/problems', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setProblems(await res.json())
    } catch (err) {
      console.error('Failed to fetch problems:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredProblems = filter === 'All' ? problems : problems.filter(p => p.problem_type === filter)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Problem Management</h1>
          <p className="text-slate-400">Create and manage coding challenges for your students</p>
        </div>
        <button 
          onClick={() => navigate('/instructor/create-problem')}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-600/20 flex items-center gap-2"
        >
          <span>➕</span> Create Problem
        </button>
      </div>

      {/* Stats Cards */}
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

      {/* Filters & Search */}
      <div className="flex gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <input 
          type="text" 
          placeholder="Search by title..." 
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-blue-500 outline-none"
        />
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none"
        >
          <option value="All">All Types</option>
          <option value="coding">Coding</option>
          <option value="debugging">Debugging</option>
        </select>
      </div>

      {/* Problem List */}
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
            {loading ? (
              <tr><td colSpan="7" className="p-8 text-center text-slate-500">Loading...</td></tr>
            ) : filteredProblems.length === 0 ? (
              <tr><td colSpan="7" className="p-12 text-center text-slate-500">No problems found. Create your first one!</td></tr>
            ) : (
              filteredProblems.map(prob => (
                <tr key={prob.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white">{prob.title}</p>
                      {prob.is_event_quest && (
                        <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-600/20 to-purple-600/20 border border-yellow-600/40 text-yellow-400 rounded-full text-xs font-bold">
                          🎉 EVENT
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      prob.problem_type === 'coding' ? 'bg-blue-600/20 text-blue-400' : 'bg-purple-600/20 text-purple-400'
                    }`}>
                      {prob.problem_type === 'coding' ? '💻 Coding' : '🐛 Debugging'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1">
                      {prob.languages?.map(lang => (
                        <span key={lang} className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300 capitalize">
                          {lang === 'python' ? '🐍' : lang === 'java' ? '☕' : '🔷'} {lang}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      prob.difficulty === 'Easy' ? 'bg-green-600/20 text-green-400' :
                      prob.difficulty === 'Medium' ? 'bg-yellow-600/20 text-yellow-400' :
                      'bg-red-600/20 text-red-400'
                    }`}>
                      {prob.difficulty}
                    </span>
                  </td>
                  <td className="p-4 text-yellow-400 font-mono font-bold">{prob.xp_reward} XP</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      prob.is_published ? 'bg-green-600/20 text-green-400' : 'bg-slate-600/20 text-slate-400'
                    }`}>
                      {prob.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-slate-400 hover:text-white transition px-2">✏️</button>
                    <button className="text-slate-400 hover:text-red-400 transition px-2">🗑️</button>
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