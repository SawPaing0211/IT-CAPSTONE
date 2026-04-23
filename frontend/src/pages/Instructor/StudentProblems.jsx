import { useState, useEffect } from 'react'

export default function StudentProblems({ userBlockId }) {
  const [problems, setProblems] = useState([])
  const [filter, setFilter] = useState('all') // 'all', 'coding', 'debugging'
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProblems()
  }, [filter])

  const fetchProblems = async () => {
    try {
      const token = localStorage.getItem('token')
      const typeParam = filter === 'all' ? '' : `&type=${filter}`
      const blockParam = userBlockId ? `&block_id=${userBlockId}` : ''
      
      const res = await fetch(`http://localhost:5000/api/problems?${typeParam}${blockParam}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setProblems(await res.json())
    } catch (err) {
      console.error('Failed to fetch problems:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Available Problems</h2>
        <div className="flex gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {['all', 'coding', 'debugging'].map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                filter === type 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {type === 'all' ? 'All' : type === 'coding' ? '💻 Coding' : '🐛 Debugging'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : problems.length === 0 ? (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-slate-400 text-lg">No problems available</p>
          <p className="text-slate-500 text-sm">Check back later or contact your instructor</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {problems.map(prob => (
            <div 
              key={prob.id} 
              className={`bg-slate-900 border rounded-2xl p-6 hover:scale-[1.02] transition cursor-pointer relative overflow-hidden ${
                prob.is_event_quest 
                  ? 'border-yellow-600/40 shadow-lg shadow-yellow-600/10' 
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Event Quest Ribbon */}
              {prob.is_event_quest && (
                <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-600 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  🎉 EVENT QUEST
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  prob.problem_type === 'coding' ? 'bg-blue-600/20 text-blue-400' : 'bg-purple-600/20 text-purple-400'
                }`}>
                  {prob.problem_type === 'coding' ? '💻 Coding' : '🐛 Debugging'}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  prob.difficulty === 'Easy' ? 'bg-green-600/20 text-green-400' :
                  prob.difficulty === 'Medium' ? 'bg-yellow-600/20 text-yellow-400' :
                  'bg-red-600/20 text-red-400'
                }`}>
                  {prob.difficulty}
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-2">{prob.title}</h3>
              <p className="text-slate-400 text-sm mb-4 line-clamp-2">{prob.description}</p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div className="flex gap-2">
                  {prob.languages?.map(lang => (
                    <span key={lang} className="text-lg" title={lang}>
                      {lang === 'python' ? '🐍' : lang === 'java' ? '☕' : '🔷'}
                    </span>
                  ))}
                </div>
                <div className="text-right">
                  <p className="text-yellow-400 font-bold">{prob.xp_reward} XP</p>
                  {prob.is_event_quest && (
                    <p className="text-yellow-500 text-xs">+Bonus Credit</p>
                  )}
                </div>
              </div>

              {prob.estimated_time && (
                <div className="mt-3 flex items-center gap-2 text-slate-500 text-xs">
                  <span>⏱️</span> {prob.estimated_time}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}