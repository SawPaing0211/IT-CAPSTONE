import { useState, useEffect } from 'react'

export default function ProblemList({ onSelectQuest, currentLevel }) {
  const [quests, setQuests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [hoveredQuest, setHoveredQuest] = useState(null)

  useEffect(() => { fetchQuests() }, [])

  const fetchQuests = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/student/problems')
      if (!res.ok) throw new Error('Failed to fetch quests')
      setQuests(await res.json())
    } catch (err) { console.error('Failed to load quests:', err) }
    finally { setLoading(false) }
  }

  const filteredQuests = filter === 'all' ? quests : quests.filter(q => q.difficulty.toLowerCase() === filter)

  const getRarity = (difficulty) => {
    switch(difficulty) {
      case 'Easy': return {name:'Common',color:'from-slate-600/30 to-slate-700/30',border:'border-slate-500/60',glow:'shadow-slate-500/30',icon:'⚪'}
      case 'Medium': return {name:'Rare',color:'from-blue-600/30 to-cyan-600/30',border:'border-blue-500/60',glow:'shadow-blue-500/30',icon:'🔵'}
      case 'Hard': return {name:'Epic',color:'from-purple-600/30 to-pink-600/30',border:'border-purple-500/60',glow:'shadow-purple-500/30',icon:'🟣'}
      default: return {name:'Common',color:'from-slate-600/30 to-slate-700/30',border:'border-slate-500/60',glow:'shadow-slate-500/30',icon:'⚪'}
    }
  }

  const getLore = (title, difficulty) => {
    const lore = {
      Easy: ["A gentle breeze carries the whispers of syntax...","The village elder seeks a simple solution...","Begin your journey with this humble task..."],
      Medium: ["The forest of logic grows dense with nested loops...","A mysterious bug lurks in the shadows...","Only those who master conditionals may pass..."],
      Hard: ["The dragon of recursion guards the ancient algorithm...","Beware: time complexity shall be tested...","This challenge separates novices from masters..."]
    }
    const pool = lore[difficulty] || lore.Easy
    return pool[Math.floor(Math.random() * pool.length)]
  }

  const isUnlocked = (difficulty) => {
    const min = {'Easy':1,'Medium':5,'Hard':10}
    return currentLevel >= (min[difficulty] || 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent drop-shadow-lg">🗺️ Quest Board</h2>
          <p className="text-slate-300 text-sm font-medium">Choose your next adventure, brave coder</p>
        </div>
        <div className="flex gap-2 bg-slate-800/70 p-1 rounded-lg border border-slate-700">
          {[{id:'all',label:'All',icon:'🌍'},{id:'easy',label:'Common',icon:'⚪'},{id:'medium',label:'Rare',icon:'🔵'},{id:'hard',label:'Epic',icon:'🟣'}].map(diff=>(
            <button key={diff.id} onClick={()=>setFilter(diff.id)} className={`px-4 py-2 rounded-md text-sm font-medium transition flex items-center gap-1 ${filter===diff.id?'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg':'text-slate-300 hover:text-white hover:bg-slate-700/70'}`}>
              <span>{diff.icon}</span> {diff.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-16">
          <div className="relative mx-auto mb-6"><div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent"></div><div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl animate-pulse">✨</span></div></div>
          <p className="text-purple-300 font-mono animate-pulse drop-shadow">Scrying for quests...</p>
          <p className="text-slate-400 text-sm mt-2">The oracle is consulting the ancient code scrolls</p>
        </div>
      ) : filteredQuests.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-b from-slate-900/90 to-purple-900/50 rounded-2xl border border-purple-600/40 backdrop-blur-sm">
          <div className="text-6xl mb-4 animate-bounce">🗝️</div>
          <p className="text-white text-lg font-bold mb-2 drop-shadow-lg">No quests available</p>
          <p className="text-slate-300 text-sm font-medium mb-1">The quest board is empty... for now.</p>
          <p className="text-slate-400 text-xs">Return later when the realm has new challenges!</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredQuests.map(quest => {
            const rarity = getRarity(quest.difficulty)
            const unlocked = isUnlocked(quest.difficulty)
            const isHovered = hoveredQuest === quest.id
            return (
              <div key={quest.id} className={`relative bg-gradient-to-b ${rarity.color} backdrop-blur-sm rounded-2xl border-2 ${rarity.border} p-5 transition-all duration-300 cursor-pointer group ${unlocked?'hover:transform hover:scale-105 hover:shadow-2xl '+rarity.glow:'opacity-70 cursor-not-allowed grayscale'} ${isHovered?'ring-2 ring-purple-400/60':''}`}
                onClick={()=>unlocked&&onSelectQuest(quest)} onMouseEnter={()=>setHoveredQuest(quest.id)} onMouseLeave={()=>setHoveredQuest(null)}>
                {!unlocked && <div className="absolute inset-0 bg-black/70 rounded-2xl flex flex-col items-center justify-center z-10"><span className="text-4xl mb-2">🔒</span><p className="text-white font-semibold drop-shadow">Level Required</p><p className="text-purple-300 font-bold drop-shadow">Level {rarity.name==='Common'?1:rarity.name==='Rare'?5:10}</p></div>}
                <div className="absolute -top-2 -right-2"><span className={`px-3 py-1 rounded-full text-xs font-black border ${rarity.border} bg-slate-900/90 backdrop-blur flex items-center gap-1 text-white drop-shadow`}>{rarity.icon} {rarity.name}</span></div>
                <h3 className={`font-black text-lg mb-2 pr-16 text-white drop-shadow ${unlocked?'group-hover:text-purple-300 transition':''}`}>{quest.title}</h3>
                <p className={`text-slate-300 text-sm mb-4 italic border-l-2 ${rarity.border} pl-3 ${unlocked?'':'text-slate-500'}`}>"{getLore(quest.title, quest.difficulty)}"</p>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className={`px-2 py-1 rounded bg-slate-800/70 ${unlocked?'text-slate-300':'text-slate-500'}`}>🏷️ {quest.category}</span>
                    <span className={`font-black flex items-center gap-1 ${unlocked?'text-yellow-300':'text-slate-500'} drop-shadow`}>💎 +{quest.xp_reward} XP</span>
                  </div>
                  {unlocked && <div className="flex items-center gap-2 text-xs text-slate-400"><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span><span>Ready to embark</span></div>}
                </div>
                <button className={`w-full py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${unlocked?'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg hover:shadow-purple-600/50':'bg-slate-700/70 text-slate-500 cursor-not-allowed'}`} disabled={!unlocked}>
                  {unlocked?<><span>⚔️</span> Accept Quest</>:<><span>🔒</span> Locked</>}
                </button>
                {unlocked && isHovered && <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 animate-pulse pointer-events-none"></div>}
              </div>
            )
          })}
        </div>
      )}
      <style>{`@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}.animate-float{animation:float 3s ease-in-out infinite}`}</style>
    </div>
  )
}