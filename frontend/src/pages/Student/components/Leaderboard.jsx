import { useState, useEffect } from 'react'

export default function Leaderboard({ currentUsername }) {
  const [filter, setFilter] = useState('block')
  const [animated, setAnimated] = useState(false)

  // Trigger animations on mount
  useEffect(() => {
    setAnimated(true)
  }, [])

  // MOCK DATA for Panel Demo
  const mockLeaders = [
    { id: 1, rank: 1, username: 'Gojo Satoru', xp: 2450, level: 12, avatar: 'G', color: 'from-purple-600 to-blue-600' },
    { id: 2, rank: 2, username: 'Levi Ackerman', xp: 2100, level: 11, avatar: 'L', color: 'from-slate-600 to-slate-700' },
    { id: 3, rank: 3, username: 'Naruto Uzumaki', xp: 1850, level: 10, avatar: 'N', color: 'from-orange-500 to-yellow-500' },
    { id: 4, rank: 4, username: 'Zoro Roronoa', xp: 1620, level: 9, avatar: 'Z', color: 'from-green-600 to-emerald-600' },
    { id: 5, rank: 5, username: 'Mikasa Ackerman', xp: 1450, level: 8, avatar: 'M', color: 'from-red-600 to-pink-600' },
    { id: 6, rank: 6, username: 'Luffy Monkey', xp: 1280, level: 8, avatar: 'L', color: 'from-red-500 to-orange-500' },
    { id: 7, rank: 7, username: 'Tanjiro Kamado', xp: 1150, level: 7, avatar: 'T', color: 'from-green-500 to-teal-500' },
    { id: 8, rank: 8, username: 'Eren Yeager', xp: 980, level: 6, avatar: 'E', color: 'from-amber-700 to-yellow-700' },
    { id: 9, rank: 9, username: 'Light Yagami', xp: 850, level: 6, avatar: 'L', color: 'from-purple-700 to-indigo-700' },
    { id: 10, rank: 10, username: currentUsername, xp: 0, level: 1, avatar: currentUsername?.[0] || 'S', color: 'from-purple-600 to-pink-600' }
  ]

  // Sort by XP
  const sortedLeaders = [...mockLeaders].sort((a, b) => b.xp - a.xp).map((leader, idx) => ({
    ...leader,
    rank: idx + 1
  }))

  const topThree = sortedLeaders.slice(0, 3)
  const currentUser = sortedLeaders.find(u => u.username === currentUsername) || sortedLeaders[9]

  return (
    <div className="space-y-6">
      {/* Header with Animation */}
      <div className={`text-center mb-8 transition-all duration-700 ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent mb-2 animate-pulse">
          👑 Hall of Champions
        </h2>
        <p className="text-slate-400">The mightiest coders of the realm</p>
      </div>

      {/* Filter Tabs */}
      <div className={`flex justify-center gap-2 mb-8 transition-all duration-700 delay-100 ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <button
          onClick={() => setFilter('block')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
            filter === 'block'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
              : 'bg-slate-800/60 text-slate-300 hover:text-white hover:scale-105'
          }`}
        >
          🏰 My Block
        </button>
        <button
          onClick={() => setFilter('global')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
            filter === 'global'
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
              : 'bg-slate-800/60 text-slate-300 hover:text-white hover:scale-105'
          }`}
        >
          🌍 Global
        </button>
      </div>

      {/* Top 3 Champions Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* 2nd Place - Vice Champion */}
        {topThree[1] && (
          <div className={`md:order-1 bg-gradient-to-br from-slate-700/40 to-slate-800/40 border-2 border-slate-500/40 rounded-2xl p-6 text-center relative overflow-hidden transition-all duration-700 delay-200 hover:scale-105 ${animated ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-500/10 to-transparent pointer-events-none"></div>
            <div className="relative z-10">
              <div className="text-slate-300 text-sm font-semibold mb-2 flex items-center justify-center gap-1 animate-bounce">
                <span>⚔️</span> Vice Champion
              </div>
              <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-slate-500/30 animate-pulse">
                {topThree[1].avatar}
              </div>
              <p className="text-white font-bold text-lg mb-1">{topThree[1].username}</p>
              <div className="flex justify-center gap-4 mt-4">
                <div className="bg-slate-800/60 rounded-lg px-4 py-2 transform hover:scale-110 transition-transform">
                  <p className="text-slate-400 text-xs">Level</p>
                  <p className="text-slate-200 font-bold">{topThree[1].level}</p>
                </div>
                <div className="bg-slate-800/60 rounded-lg px-4 py-2 transform hover:scale-110 transition-transform">
                  <p className="text-slate-400 text-xs">XP</p>
                  <p className="text-yellow-400 font-bold">{topThree[1].xp}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1st Place - Grand Champion */}
        {topThree[0] && (
          <div className={`md:order-2 bg-gradient-to-br from-yellow-600/30 to-amber-700/30 border-2 border-yellow-500/60 rounded-2xl p-8 text-center relative overflow-hidden transition-all duration-700 delay-300 hover:scale-105 ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-500/20 to-transparent pointer-events-none animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
            <div className="relative z-10">
              <div className="text-yellow-300 text-sm font-semibold mb-2 flex items-center justify-center gap-1 animate-bounce">
                <span>👑</span> Grand Champion
              </div>
              <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-yellow-500/50 animate-[pulse_2s_ease-in-out_infinite]">
                {topThree[0].avatar}
              </div>
              <p className="text-white font-bold text-xl mb-1">{topThree[0].username}</p>
              <div className="flex justify-center gap-4 mt-6">
                <div className="bg-slate-900/60 rounded-lg px-6 py-3 border border-yellow-600/30 transform hover:scale-110 transition-transform duration-300">
                  <p className="text-slate-400 text-xs">Level</p>
                  <p className="text-yellow-300 font-bold text-lg">{topThree[0].level}</p>
                </div>
                <div className="bg-slate-900/60 rounded-lg px-6 py-3 border border-yellow-600/30 transform hover:scale-110 transition-transform duration-300">
                  <p className="text-slate-400 text-xs">XP</p>
                  <p className="text-yellow-400 font-bold text-lg">{topThree[0].xp}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {topThree[2] && (
          <div className={`md:order-3 bg-gradient-to-br from-amber-800/30 to-orange-900/30 border-2 border-orange-600/40 rounded-2xl p-6 text-center relative overflow-hidden transition-all duration-700 delay-200 hover:scale-105 ${animated ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-500/10 to-transparent pointer-events-none"></div>
            <div className="relative z-10">
              <div className="text-orange-300 text-sm font-semibold mb-2 flex items-center justify-center gap-1 animate-bounce">
                <span>🥉</span> Third Place
              </div>
              <div className="w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-700 flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-orange-500/30 animate-pulse">
                {topThree[2].avatar}
              </div>
              <p className="text-white font-bold text-lg mb-1">{topThree[2].username}</p>
              <div className="flex justify-center gap-4 mt-4">
                <div className="bg-slate-800/60 rounded-lg px-4 py-2 transform hover:scale-110 transition-transform">
                  <p className="text-slate-400 text-xs">Level</p>
                  <p className="text-orange-300 font-bold">{topThree[2].level}</p>
                </div>
                <div className="bg-slate-800/60 rounded-lg px-4 py-2 transform hover:scale-110 transition-transform">
                  <p className="text-slate-400 text-xs">XP</p>
                  <p className="text-yellow-400 font-bold">{topThree[2].xp}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full Rankings List */}
      <div className={`bg-slate-800/40 border border-slate-700 rounded-2xl p-6 transition-all duration-700 delay-500 ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <h3 className="text-lg font-bold text-white mb-4">Full Rankings</h3>
        <div className="space-y-2">
          {sortedLeaders.map((player, index) => {
            const isCurrentUser = player.username === currentUsername
            return (
              <div 
                key={player.id}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-500 hover:scale-[1.02] cursor-pointer ${
                  isCurrentUser 
                    ? 'bg-gradient-to-r from-purple-900/60 to-pink-900/60 border-purple-500 shadow-lg shadow-purple-600/20' 
                    : player.rank <= 3
                      ? 'bg-slate-800/60 border-slate-600 hover:border-purple-500/60'
                      : 'bg-slate-800/40 border-slate-700 hover:border-purple-500/40'
                }`}
                style={{
                  animationDelay: `${600 + index * 100}ms`,
                  animation: animated ? 'slideIn 0.5s ease-out forwards' : 'none',
                  opacity: 0,
                  transform: 'translateX(-20px)'
                }}
              >
                {/* Rank */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-transform duration-300 hover:scale-125 ${
                  player.rank === 1 ? 'bg-yellow-500 text-white animate-[pulse_2s_ease-in-out_infinite]' :
                  player.rank === 2 ? 'bg-slate-400 text-white' :
                  player.rank === 3 ? 'bg-orange-600 text-white' :
                  'bg-slate-700 text-slate-300'
                }`}>
                  {player.rank}
                </div>
                
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${player.color} flex items-center justify-center text-xl font-bold text-white shadow-lg transform transition-transform duration-300 hover:scale-110 hover:rotate-3`}>
                  {player.avatar}
                </div>
                
                {/* Name & Level */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`font-bold transition-all duration-300 ${isCurrentUser ? 'text-purple-300' : 'text-white'}`}>
                      {player.username}
                      {isCurrentUser && (
                        <span className="ml-2 px-2 py-0.5 bg-purple-600/40 text-purple-200 text-[10px] rounded-full animate-pulse">
                          You
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">Level {player.level}</p>
                </div>
                
                {/* XP */}
                <div className="text-right">
                  <p className="text-yellow-400 font-bold text-lg animate-[pulse_2s_ease-in-out_infinite]">{player.xp} XP</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Your Standing Card */}
      {currentUser && (
        <div className={`bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-600/40 rounded-2xl p-6 transition-all duration-700 delay-700 hover:scale-105 ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xl font-bold text-white animate-[bounce_2s_ease-in-out_infinite]">
                {currentUser.rank}
              </div>
              <div>
                <p className="text-white font-bold text-lg">Your Standing</p>
                <p className="text-slate-400 text-sm">{currentUser.username}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-yellow-400 font-bold text-2xl animate-[pulse_1.5s_ease-in-out_infinite]">#{currentUser.rank}</p>
              <p className="text-slate-400 text-sm">{currentUser.xp} XP</p>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS Animations */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}