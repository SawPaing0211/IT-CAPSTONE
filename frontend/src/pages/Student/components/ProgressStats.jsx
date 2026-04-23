export default function ProgressStats({ stats, username }) {
  const xpForLevel = stats.level * 100
  const xpIntoNext = stats.total_xp - xpForLevel
  const progress = Math.min((xpIntoNext / 100) * 100, 100)
  const xpNeeded = 100 - xpIntoNext

  const achievements = [
    {id:1,name:"First Blood",icon:"🗡️",unlocked:stats.total_submissions>=1,desc:"Submit your first code"},
    {id:2,name:"Persistent Coder",icon:"🔥",unlocked:stats.total_submissions>=10,desc:"Submit 10 times"},
    {id:3,name:"Bug Slayer",icon:"🐛",unlocked:stats.success_rate>=50,desc:"50% success rate"},
    {id:4,name:"Code Master",icon:"👑",unlocked:stats.level>=5,desc:"Reach Level 5"},
    {id:5,name:"Perfectionist",icon:"✨",unlocked:stats.success_rate>=90,desc:"90% success rate"},
    {id:6,name:"Legend",icon:"🌟",unlocked:stats.level>=10,desc:"Reach Level 10"},
  ]

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pb-4 border-b border-purple-600/40">
        <div className="relative">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center text-4xl shadow-lg shadow-purple-600/60 animate-pulse-glow">🧙</div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs">✨</div>
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-black bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent drop-shadow-lg">🧙 {username}'s Hero Sheet</h2>
          <p className="text-slate-300 text-sm font-medium">Track your coding adventure progress</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-3 py-1 bg-purple-600/30 border border-purple-600/60 rounded-full text-xs font-bold text-purple-300 drop-shadow">🐍 Code Mage</span>
            <span className="px-3 py-1 bg-blue-600/30 border border-blue-600/60 rounded-full text-xs font-bold text-blue-300 drop-shadow">🎯 Problem Solver</span>
          </div>
        </div>
      </div>

      {/* Attributes */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AttributeCard title="Total XP" value={stats.total_xp.toLocaleString()} icon="⭐" color="yellow" description="Mana earned from quests" glow={stats.total_xp>500}/>
        <AttributeCard title="Hero Level" value={stats.level} icon="🎯" color="purple" description="Your power rank" glow={stats.level>=5}/>
        <AttributeCard title="Spells Cast" value={stats.total_submissions} icon="📜" color="blue" description="Total code submissions" glow={stats.total_submissions>=10}/>
        <AttributeCard title="Success Rate" value={`${stats.success_rate}%`} icon="✅" color="green" description="Spells that worked" glow={stats.success_rate>=75}/>
      </div>

      {/* Level Progress */}
      <div className="bg-gradient-to-b from-slate-900/90 to-purple-900/30 rounded-2xl border border-purple-600/50 p-6 shadow-lg shadow-purple-600/15">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2 text-white drop-shadow"><span className="text-xl">⚡</span> Power Level Progress</h3>
          <span className="text-sm text-purple-300 font-mono drop-shadow">{xpIntoNext}/100 XP</span>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400 flex items-center gap-1 font-medium"><span className="w-2 h-2 bg-slate-500 rounded-full"></span> Level {stats.level}</span>
            <span className="text-purple-300 font-bold flex items-center gap-1 drop-shadow">Level {stats.level+1}<span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span></span>
          </div>
          <div className="relative w-full bg-slate-800 h-5 rounded-full overflow-hidden border border-slate-700">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/25 to-pink-600/25 animate-pulse"></div>
            <div className="h-full bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 transition-all duration-500 relative overflow-hidden" style={{width:`${progress}%`}}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer"></div>
            </div>
            {progress>0 && <div className="absolute top-1/2 -translate-y-1/2 text-xs animate-float drop-shadow" style={{left:`calc(${progress}% - 10px)`}}>✨</div>}
          </div>
          <p className="text-xs text-slate-400 text-center font-medium">{xpNeeded>0?`🔮 ${xpNeeded} XP needed to reach Level ${stats.level+1}`:`🎉 Level ${stats.level+1} unlocked!`}</p>
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-gradient-to-b from-slate-900/90 to-purple-900/30 rounded-2xl border border-purple-600/50 p-6 shadow-lg shadow-purple-600/15">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-white drop-shadow"><span className="text-xl">🎖️</span> Achievements Unlocked</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {achievements.map(ach=>(
            <div key={ach.id} className={`p-4 rounded-xl border-2 transition-all ${ach.unlocked?'bg-gradient-to-b from-yellow-600/25 to-orange-600/25 border-yellow-600/60 shadow-lg shadow-yellow-600/25 hover:transform hover:scale-105':'bg-slate-800/40 border-slate-700 opacity-60 grayscale'}`}>
              <div className="text-2xl mb-2 text-center">{ach.icon}</div>
              <p className={`text-sm font-bold text-center ${ach.unlocked?'text-yellow-300 drop-shadow':'text-slate-500'}`}>{ach.name}</p>
              <p className="text-xs text-slate-500 text-center mt-1 font-medium">{ach.desc}</p>
              {ach.unlocked && <div className="mt-2 flex justify-center"><span className="text-xs text-green-300 font-medium flex items-center gap-1 drop-shadow">✓ Unlocked</span></div>}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-slate-900/70 rounded-xl border border-slate-800 p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-2xl font-bold text-purple-300 drop-shadow">{stats.level}</p><p className="text-xs text-slate-400 font-medium">Current Level</p></div>
          <div><p className="text-2xl font-bold text-yellow-300 drop-shadow">{stats.total_xp}</p><p className="text-xs text-slate-400 font-medium">Total XP</p></div>
          <div><p className="text-2xl font-bold text-green-300 drop-shadow">{stats.accepted_submissions}</p><p className="text-xs text-slate-400 font-medium">Quests Completed</p></div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-glow{0%,100%{box-shadow:0 0 12px rgba(168,85,247,0.4)}50%{box-shadow:0 0 30px rgba(168,85,247,0.9),0 0 50px rgba(236,72,153,0.5)}}.animate-pulse-glow{animation:pulse-glow 2.5s ease-in-out infinite}
        @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}.animate-shimmer{animation:shimmer 2s ease-in-out infinite}
        @keyframes float{0%,100%{transform:translateY(0) translateX(-50%)}50%{transform:translateY(-8px) translateX(-50%)}}.animate-float{animation:float 2s ease-in-out infinite}
      `}</style>
    </div>
  )
}

function AttributeCard({title,value,icon,color,description,glow}){
  const colors={yellow:'from-yellow-600/25 to-orange-600/25 border-yellow-600/50',purple:'from-purple-600/25 to-pink-600/25 border-purple-600/50',blue:'from-blue-600/25 to-cyan-600/25 border-blue-600/50',green:'from-green-600/25 to-emerald-600/25 border-green-600/50'}
  return (
    <div className={`relative bg-gradient-to-b ${colors[color]} backdrop-blur-sm p-5 rounded-xl border-2 transition-all duration-300 ${glow?'hover:transform hover:scale-105 hover:shadow-xl hover:shadow-purple-600/40':''}`}>
      {glow && <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-600/15 to-pink-600/15 animate-pulse pointer-events-none"></div>}
      <div className="relative z-10">
        <div className="text-3xl mb-2">{icon}</div>
        <p className="text-slate-400 text-xs uppercase tracking-wider mb-1 font-medium">{title}</p>
        <p className="text-2xl font-black mb-1 text-white drop-shadow">{value}</p>
        <p className="text-xs text-slate-400 font-medium">{description}</p>
      </div>
    </div>
  )
}