import { useState, useEffect } from 'react'

export default function Leaderboard({ currentUsername }) {
  const [champions, setChampions] = useState([])
  const [loading, setLoading] = useState(true)
  const [hoveredRank, setHoveredRank] = useState(null)

  useEffect(() => { fetchHall() }, [])

  const fetchHall = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/leaderboard')
      if (!res.ok) throw new Error('Failed to fetch champions')
      setChampions(await res.json())
    } catch (err) { console.error('Failed to load champions:', err) }
    finally { setLoading(false) }
  }

  const getThrone = (rank) => {
    switch(rank) {
      case 1: return {title:'👑 Grand Champion',gradient:'from-yellow-600/35 via-amber-500/25 to-orange-600/35',border:'border-yellow-500',glow:'shadow-yellow-500/60',crown:'👑',aura:'animate-pulse-gold'}
      case 2: return {title:'⚔️ Vice Champion',gradient:'from-slate-400/35 via-gray-300/25 to-slate-500/35',border:'border-slate-400',glow:'shadow-slate-400/60',crown:'🥈',aura:'animate-pulse-silver'}
      case 3: return {title:'🛡️ Third Champion',gradient:'from-orange-700/35 via-amber-600/25 to-orange-800/35',border:'border-orange-600',glow:'shadow-orange-600/60',crown:'🥉',aura:'animate-pulse-bronze'}
      default: return {title:`Rank #${rank}`,gradient:'from-slate-800/35 to-slate-900/35',border:'border-slate-700',glow:'shadow-slate-700/40',crown:`#${rank}`,aura:''}
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center pb-4 border-b border-purple-600/40">
        <h2 className="text-3xl font-black bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-transparent drop-shadow-lg">👑 Hall of Champions</h2>
        <p className="text-slate-300 text-sm mt-1 font-medium">The mightiest coders of the realm</p>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="text-center py-16">
          <div className="relative mx-auto mb-6"><div className="animate-spin rounded-full h-16 w-16 border-4 border-yellow-600 border-t-transparent"></div><div className="absolute inset-0 flex items-center justify-center"><span className="text-2xl animate-pulse">👑</span></div></div>
          <p className="text-yellow-300 font-mono animate-pulse drop-shadow">Consulting the ancient scrolls...</p>
          <p className="text-slate-400 text-sm mt-2 font-medium">The oracle is determining the realm's champions</p>
        </div>
      ) : champions.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-b from-slate-900/90 to-purple-900/50 rounded-2xl border border-purple-600/40 backdrop-blur-sm">
          <div className="text-6xl mb-4 animate-bounce">🏆</div>
          <p className="text-white text-lg font-bold mb-2 drop-shadow-lg">The hall awaits its first champions</p>
          <p className="text-slate-300 text-sm font-medium">Be the first to earn XP and claim your throne!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top 3 Thrones */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {champions[1] && <ChampionThrone champion={champions[1]} rank={2} style={getThrone(2)} isCurrent={champions[1].username===currentUsername} isHovered={hoveredRank===2} onHover={setHoveredRank} position="left"/>}
            {champions[0] && <ChampionThrone champion={champions[0]} rank={1} style={getThrone(1)} isCurrent={champions[0].username===currentUsername} isHovered={hoveredRank===1} onHover={setHoveredRank} position="center"/>}
            {champions[2] && <ChampionThrone champion={champions[2]} rank={3} style={getThrone(3)} isCurrent={champions[2].username===currentUsername} isHovered={hoveredRank===3} onHover={setHoveredRank} position="right"/>}
          </div>

          {/* Guild Members */}
          {champions.length>3 && (
            <div className="bg-gradient-to-b from-slate-900/90 to-purple-900/30 rounded-2xl border border-purple-600/50 p-4 shadow-lg shadow-purple-600/15">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-300 drop-shadow"><span>📜</span> Guild Members</h3>
              <div className="space-y-2">
                {champions.slice(3).map((champ,index)=>{
                  const rank=index+4, style=getThrone(rank), isCurrent=champ.username===currentUsername
                  return (
                    <div key={champ.rank} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${isCurrent?'bg-purple-600/25 border-purple-500/60 ring-2 ring-purple-400/60':'bg-slate-800/40 border-slate-700 hover:border-purple-500/60 hover:bg-slate-800/60'}`} onMouseEnter={()=>setHoveredRank(rank)} onMouseLeave={()=>setHoveredRank(null)}>
                      <div className="flex items-center gap-4">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isCurrent?'bg-purple-600 text-white':'bg-slate-700 text-slate-400'}`}>#{rank}</span>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-2 ${isCurrent?'bg-gradient-to-br from-purple-600 to-pink-600 border-purple-400 text-white':'bg-slate-700 border-slate-600 text-slate-300'}`}>{champ.username[0].toUpperCase()}</div>
                          <div><p className={`font-semibold ${isCurrent?'text-purple-300 drop-shadow':'text-slate-300 drop-shadow'}`}>{champ.username}{isCurrent && <span className="ml-2 text-xs text-purple-400 font-medium">(You)</span>}</p><p className="text-xs text-slate-500 font-medium">Guild Member</p></div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="px-3 py-1 bg-purple-600/25 text-purple-300 rounded-lg text-sm font-bold drop-shadow">Lv.{champ.level}</span>
                        <span className="text-yellow-300 font-bold font-mono drop-shadow">{champ.xp} XP</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Your Rank */}
          {currentUsername && (
            <div className="bg-gradient-to-r from-purple-600/25 to-pink-600/25 rounded-xl border border-purple-600/50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎯</span>
                  <div><p className="font-semibold text-purple-300 drop-shadow">Your Standing</p><p className="text-sm text-slate-400 font-medium">{currentUsername}</p></div>
                </div>
                <div className="text-right">
                  {(()=>{const r=champions.findIndex(c=>c.username===currentUsername)+1;return r>0?<><p className="text-2xl font-bold text-yellow-300 drop-shadow">#{r}</p><p className="text-xs text-slate-400 font-medium">Keep climbing!</p></>:<><p className="text-lg font-bold text-slate-400 drop-shadow">Unranked</p><p className="text-xs text-slate-400 font-medium">Complete quests to rank up!</p></>})()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse-gold{0%,100%{box-shadow:0 0 12px rgba(234,179,8,0.4)}50%{box-shadow:0 0 35px rgba(234,179,8,0.9),0 0 60px rgba(251,191,36,0.6)}}.animate-pulse-gold{animation:pulse-gold 2.5s ease-in-out infinite}
        @keyframes pulse-silver{0%,100%{box-shadow:0 0 12px rgba(148,163,184,0.4)}50%{box-shadow:0 0 30px rgba(148,163,184,0.9),0 0 50px rgba(203,213,225,0.5)}}.animate-pulse-silver{animation:pulse-silver 2.5s ease-in-out infinite}
        @keyframes pulse-bronze{0%,100%{box-shadow:0 0 12px rgba(180,83,9,0.4)}50%{box-shadow:0 0 30px rgba(180,83,9,0.9),0 0 50px rgba(234,88,12,0.5)}}.animate-pulse-bronze{animation:pulse-bronze 2.5s ease-in-out infinite}
        @keyframes float-throne{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}.animate-float-throne{animation:float-throne 3s ease-in-out infinite}
        @keyframes sparkle{0%,100%{opacity:0.4;transform:scale(1)}50%{opacity:1;transform:scale(1.4)}}.animate-sparkle{animation:sparkle 1.5s ease-in-out infinite}
      `}</style>
    </div>
  )
}

function ChampionThrone({champion,rank,style,isCurrent,isHovered,onHover,position}){
  const isCenter=position==='center'
  return (
    <div className={`relative bg-gradient-to-b ${style.gradient} backdrop-blur-sm rounded-2xl border-2 ${style.border} p-5 transition-all duration-300 cursor-pointer ${style.aura||''} ${isHovered?'transform scale-105 ring-2 ring-purple-400/60':''} ${isCenter?'md:-mt-4 shadow-2xl':''}`} onMouseEnter={()=>onHover(rank)} onMouseLeave={()=>onHover(null)}>
      {rank<=3 && <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">{[...Array(5)].map((_,i)=><div key={i} className="absolute w-2 h-2 bg-yellow-400/70 rounded-full animate-sparkle" style={{left:`${20+i*15}%`,top:`${10+Math.random()*20}%`,animationDelay:`${i*0.3}s`}}/>)}</div>}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className={`text-3xl ${rank===1?'animate-bounce':''}`}>{style.crown}</span></div>
      <div className="text-center mb-4 pt-2"><p className={`font-black text-sm ${rank===1?'text-yellow-300 drop-shadow':rank===2?'text-slate-300 drop-shadow':rank===3?'text-orange-300 drop-shadow':'text-slate-400 drop-shadow'}`}>{style.title}</p></div>
      <div className="flex flex-col items-center mb-4">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-black border-4 mb-3 ${isCurrent?'bg-gradient-to-br from-purple-600 to-pink-600 border-purple-400 text-white shadow-lg shadow-purple-600/60':rank===1?'bg-gradient-to-br from-yellow-500 to-amber-400 border-yellow-300 text-slate-900':rank===2?'bg-gradient-to-br from-slate-300 to-gray-200 border-slate-200 text-slate-800':rank===3?'bg-gradient-to-br from-orange-500 to-amber-600 border-orange-400 text-slate-900':'bg-slate-700 border-slate-500 text-slate-300'}`}>{champion.username[0].toUpperCase()}</div>
        <p className={`font-bold text-lg text-center drop-shadow ${isCurrent?'text-purple-300':'text-white'}`}>{champion.username}{isCurrent && <span className="block text-xs text-purple-400 mt-1 font-medium">(You)</span>}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="bg-slate-900/70 backdrop-blur-sm rounded-lg p-2 border border-slate-700/60"><p className="text-xs text-slate-400 font-medium mb-1">Level</p><p className="font-bold text-purple-300 drop-shadow text-lg">{champion.level}</p></div>
        <div className="bg-slate-900/70 backdrop-blur-sm rounded-lg p-2 border border-slate-700/60"><p className="text-xs text-slate-400 font-medium mb-1">XP</p><p className="font-bold text-yellow-300 drop-shadow text-lg">{champion.xp}</p></div>
      </div>
      {isHovered && rank<=3 && <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600/15 to-pink-600/15 animate-pulse pointer-events-none"></div>}
    </div>
  )
}