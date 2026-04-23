import { useState, useEffect } from 'react'
import ProblemList from './ProblemList'
import CodeEditor from './CodeEditor'
import Leaderboard from './components/Leaderboard'
import ProgressStats from './components/ProgressStats'

export default function StudentDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('quests')
  const [selectedQuest, setSelectedQuest] = useState(null)
  const [heroStats, setHeroStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchHeroStats() }, [])

  const fetchHeroStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/student/stats', { headers: { 'Authorization': `Bearer ${token}` }})
      if (!res.ok) throw new Error('Failed to fetch stats')
      setHeroStats(await res.json())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleQuestSelect = (quest) => { setSelectedQuest(quest); setActiveTab('spellforge') }
  const handleVictory = () => { fetchHeroStats() }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/30 to-slate-950 text-white relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(60)].map((_, i) => (
          <div key={i} className="absolute w-1 h-1 bg-white/40 rounded-full animate-twinkle"
            style={{ left: `${Math.random()*100}%`, top: `${Math.random()*100}%`, animationDelay: `${Math.random()*4}s` }} />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 bg-slate-900/90 backdrop-blur border-b border-purple-600/40 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-purple-600/50 animate-pulse-glow">🧙</div>
          <div>
            <h1 className="font-black text-lg bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent drop-shadow-lg">⚔️ Adventure Realm</h1>
            <p className="text-slate-300 text-xs font-medium drop-shadow">Welcome, <span className="text-purple-300 font-semibold">{user.username}</span></p>
          </div>
        </div>
        
        {heroStats && (
          <div className="flex items-center gap-4 bg-gradient-to-r from-slate-800/90 to-purple-900/40 px-5 py-3 rounded-xl border border-purple-600/50 shadow-lg">
            <div className="text-center"><p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Level</p><p className="font-black text-purple-300 text-xl drop-shadow">{heroStats.level}</p></div>
            <div className="w-px h-12 bg-gradient-to-b from-transparent via-purple-600/60 to-transparent"></div>
            <div className="text-center"><p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">XP</p><p className="font-black text-yellow-300 text-xl drop-shadow">{heroStats.total_xp}</p></div>
            <div className="w-px h-12 bg-gradient-to-b from-transparent via-purple-600/60 to-transparent"></div>
            <div className="text-center"><p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Streak</p><p className="font-black text-orange-300 text-xl flex items-center gap-1 drop-shadow">🔥 {Math.floor(heroStats.total_xp/50)+1}</p></div>
            <div className="hidden md:block w-32"><div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all" style={{width:`${heroStats.total_xp%100}%`}}/></div><p className="text-[10px] text-slate-400 text-center mt-1">{100-(heroStats.total_xp%100)} XP to next</p></div>
          </div>
        )}
        <button onClick={onLogout} className="px-5 py-2.5 bg-red-600/30 hover:bg-red-600/50 border border-red-600/60 rounded-lg text-sm transition flex items-center gap-2 hover:shadow-lg hover:shadow-red-600/40 text-white font-medium">🚪 Exit</button>
      </header>

      {/* Main */}
      <main className="relative z-10 container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-purple-600/40 pb-2 overflow-x-auto">
          {[{id:'quests',label:'🗺️ Quest Board'},{id:'spellforge',label:'🔮 Spellforge',disabled:!selectedQuest},{id:'hall',label:'👑 Hall of Champions'},{id:'hero',label:'🧙 Hero Sheet'}].map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)} disabled={tab.disabled}
              className={`px-5 py-2.5 rounded-lg font-semibold transition whitespace-nowrap border-2 ${tab.disabled?'text-slate-500 border-slate-800 cursor-not-allowed opacity-50':activeTab===tab.id?'bg-gradient-to-r from-purple-600 to-pink-600 border-purple-400 text-white shadow-lg shadow-purple-600/50 transform scale-105 font-bold':'text-slate-300 border-slate-700 hover:text-white hover:border-purple-500/60 hover:bg-slate-800/80'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab==='quests' && <ProblemList onSelectQuest={handleQuestSelect} currentLevel={heroStats?.level||1}/>}
        {activeTab==='spellforge' && selectedQuest && <CodeEditor quest={selectedQuest} onVictory={handleVictory} onReturn={()=>{setSelectedQuest(null);setActiveTab('quests');}} heroLevel={heroStats?.level||1}/>}
        {activeTab==='hall' && <Leaderboard currentUsername={user.username}/>}
        {activeTab==='hero' && heroStats && <ProgressStats stats={heroStats} username={user.username}/>}

        {loading && <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"><div className="text-center"><div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div><p className="text-white font-mono text-lg drop-shadow-lg animate-pulse">Summoning your adventure...</p></div></div>}
      </main>

      <style>{`
        @keyframes twinkle{0%,100%{opacity:0.3;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}.animate-twinkle{animation:twinkle 2s ease-in-out infinite}
        @keyframes pulse-glow{0%,100%{box-shadow:0 0 12px rgba(168,85,247,0.4)}50%{box-shadow:0 0 30px rgba(168,85,247,0.9),0 0 50px rgba(236,72,153,0.5)}}.animate-pulse-glow{animation:pulse-glow 2.5s ease-in-out infinite}
      `}</style>
    </div>
  )
}