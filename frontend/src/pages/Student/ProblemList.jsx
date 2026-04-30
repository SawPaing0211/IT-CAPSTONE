import { useState, useEffect } from 'react'

export default function ProblemList({ onSelectQuest, currentLevel, blockId, subjectId }) {
  console.log('🎯 ProblemList received:', { blockId, subjectId })
  const [quests, setQuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    setAnimated(true)
    fetchQuests()
  }, [filter, blockId, subjectId]) 

  const fetchQuests = async () => {
    try {      
      const token = localStorage.getItem('token')
      let url = 'http://localhost:5000/api/problems'
      
      // Build query params
      const params = []
      if (blockId) params.push(`block_id=${blockId}`)
      if (subjectId) params.push(`subject_id=${subjectId}`) 
      if (filter === 'coding' || filter === 'debugging') {
        params.push(`type=${filter}`)
      }
      
      if (params.length > 0) {
        url += '?' + params.join('&')
      }
      
            const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      console.log('📡 Fetched from URL:', url, '- Status:', res.status)

      if (res.ok) {
        const data = await res.json()
        console.log('📡 Fetched from URL:', url, '- Status:', res.status)
        const filtered = filter === 'event'
          ? data.filter(q => q.is_event_quest)
          : data
        // Add rarity based on difficulty
        const withRarity = filtered.map(q => ({
          ...q,
          rarity: q.difficulty === 'Easy' ? 'common' :
                  q.difficulty === 'Medium' ? 'rare' : 'legendary',
          completed: false
        }))
        setQuests(withRarity)
      }
    } catch (err) {
      console.error('Failed to fetch quests:', err)
    } finally {
      setLoading(false)
    }
  }

  // Rarity styling
  const rarityStyles = {
    common: {
      border: 'border-slate-600',
      bg: 'bg-slate-800/40',
      glow: '',
      hoverGlow: 'hover:shadow-slate-500/20'
    },
    rare: {
      border: 'border-blue-600',
      bg: 'bg-blue-900/20',
      glow: 'shadow-blue-500/10',
      hoverGlow: 'hover:shadow-blue-500/30'
    },
    epic: {
      border: 'border-purple-600',
      bg: 'bg-purple-900/20',
      glow: 'shadow-purple-500/10 animate-pulse-slow',
      hoverGlow: 'hover:shadow-purple-500/40'
    },
    legendary: {
      border: 'border-yellow-600',
      bg: 'bg-gradient-to-br from-yellow-900/30 to-orange-900/30',
      glow: 'shadow-yellow-500/20 animate-pulse',
      hoverGlow: 'hover:shadow-yellow-500/50'
    }
  }

  const difficultyStyles = {
    Easy: 'bg-green-600/20 text-green-400 border-green-600/40',
    Medium: 'bg-yellow-600/20 text-yellow-400 border-yellow-600/40',
    Hard: 'bg-red-600/20 text-red-400 border-red-600/40'
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-slate-800/40 border border-slate-700 rounded-xl p-5 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-3/4 mb-3"></div>
            <div className="h-3 bg-slate-700 rounded w-full mb-2"></div>
            <div className="h-3 bg-slate-700 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: '🗡️ All Quests' },
          { id: 'coding', label: '⚔️ Coding' },
          { id: 'debugging', label: '🐛 Debugging' },
          { id: 'event', label: '🎉 Event Quests' }
        ].map(btn => (
          <button
            key={btn.id}
            onClick={() => setFilter(btn.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 border-2 ${
              filter === btn.id
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 border-purple-400 text-white shadow-lg transform scale-105'
                : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-white hover:border-purple-500/60 hover:scale-105'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Quest Grid */}
      {quests.length === 0 ? (
        <div className="text-center py-12 bg-slate-900/40 border-2 border-dashed border-slate-700 rounded-2xl">
          <div className="text-5xl mb-4 animate-bounce">🗝️</div>
          <p className="text-slate-300 text-lg font-medium">No quests available</p>
          <p className="text-slate-500 text-sm mt-1">Check back later or ask your instructor for new challenges!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quests.map((quest, index) => {
            const style = rarityStyles[quest.rarity]
            return (
              <div 
                key={quest.id}
                onClick={() => !quest.completed && onSelectQuest(quest)}
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: animated ? 'slideInUp 0.5s ease-out forwards' : 'none',
                  opacity: 0,
                  transform: 'translateY(20px)'
                }}
                className={`
                  relative p-5 rounded-xl border-2 cursor-pointer 
                  transition-all duration-300 group
                  ${style.bg} ${style.border} ${style.glow}
                  hover:scale-[1.02] hover:shadow-xl ${style.hoverGlow}
                  ${quest.completed ? 'opacity-60 cursor-default' : ''}
                `}
              >
                {/* Event Quest Badge */}
                {quest.is_event_quest && (
                  <div className="absolute -top-2 -right-2 px-2 py-1 bg-gradient-to-r from-yellow-600 to-purple-600 text-white text-[10px] font-bold rounded-full shadow-lg animate-pulse z-10">
                    🎉 EVENT
                  </div>
                )}

                {/* Quest Header */}
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-white text-lg leading-tight group-hover:text-purple-300 transition-colors">
                    {quest.title}
                  </h3>
                  <span className={`px-2 py-1 rounded text-[10px] font-bold border ${difficultyStyles[quest.difficulty]}`}>
                    {quest.difficulty}
                  </span>
                </div>

                {/* Description */}
                <p className="text-slate-300 text-sm mb-4 line-clamp-2">{quest.description}</p>

                {/* Instructor & Block Info */}
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-3 pb-3 border-b border-slate-700/50">
                  <span>👨‍🏫 {quest.instructor_name}</span>
                  {/* ✅ Only show block name if NOT in course context */}
                  {!blockId && (
                    <>
                      <span>•</span>
                      <span>🏛️ {quest.block_names?.[0] || 'All Blocks'}</span>
                    </>
                  )}
                  {quest.due_date && (
                    <>
                      <span>•</span>
                      <span className="text-orange-400">Due: {new Date(quest.due_date).toLocaleDateString()}</span>
                    </>
                  )}
                </div>

                {/* Quest Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {quest.languages.slice(0, 3).map(lang => (
                      <span key={lang} className="text-lg group-hover:scale-110 transition-transform" title={lang}>
                        {lang === 'python' ? '🐍' : lang === 'java' ? '☕' : '🔷'}
                      </span>
                    ))}
                    {quest.languages.length > 3 && (
                      <span className="text-xs text-slate-500">+{quest.languages.length - 3}</span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 font-bold text-sm group-hover:animate-pulse">{quest.xp_reward} XP</p>
                    <p className="text-[10px] text-slate-500 capitalize">{quest.rarity}</p>
                  </div>
                </div>

                {/* Hover Overlay Button */}
                {!quest.completed && (
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-900/60 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4 pointer-events-none z-20">
                    <button className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-lg shadow-lg pointer-events-auto transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2 hover:scale-105">
                      <span>⚔️</span> Start Quest
                    </button>
                  </div>
                )}
                
                {/* Completed Overlay */}
                {quest.completed && (
                  <div className="absolute inset-0 bg-slate-900/60 rounded-xl flex items-center justify-center z-20">
                    <span className="text-green-400 font-bold flex items-center gap-2 animate-bounce">
                      ✅ Completed
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* CSS for Quest Card Animations */}
      <style>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; box-shadow: 0 0 10px rgba(168, 85, 247, 0.2); }
          50% { opacity: 0.8; box-shadow: 0 0 20px rgba(168, 85, 247, 0.4); }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}