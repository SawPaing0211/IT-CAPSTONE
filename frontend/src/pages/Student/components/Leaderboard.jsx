import { useState, useEffect } from 'react'

const AVATAR_GRADIENTS = [
  'from-purple-600 to-blue-600',
  'from-slate-600 to-slate-700',
  'from-orange-500 to-yellow-500',
  'from-green-600 to-emerald-600',
  'from-red-600 to-pink-600',
  'from-red-500 to-orange-500',
  'from-green-500 to-teal-500',
  'from-amber-700 to-yellow-700',
  'from-purple-700 to-indigo-700',
  'from-cyan-600 to-blue-500',
  'from-rose-600 to-fuchsia-600',
  'from-lime-600 to-green-600',
]

function getGradient(index) {
  return AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]
}

function getInitial(player) {
  const name = player.full_name || player.username || '?'
  return name[0].toUpperCase()
}

function getDisplayName(player) {
  return player.full_name || player.username
}

export default function Leaderboard({ currentUsername }) {
  const [filter, setFilter] = useState('block')
  const [animated, setAnimated] = useState(false)
  const [leaders, setLeaders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setAnimated(true)
  }, [])

  useEffect(() => {
    fetchLeaderboard()
  }, [filter])

  const fetchLeaderboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')

      // Determine block_id for "My Block" filter
      let url = 'http://localhost:5000/api/leaderboard'
      if (filter === 'block') {
        // Try to get the student's block from their subjects
        const subjRes = await fetch('http://localhost:5000/api/student/subjects', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (subjRes.ok) {
          const subjects = await subjRes.json()
          if (subjects.length > 0) {
            url += `?block_id=${subjects[0].block_id}`
          }
        }
      }

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Failed to fetch leaderboard')
      const data = await res.json()

      // Enrich with display helpers
      const enriched = data.map((player, idx) => ({
        ...player,
        color: getGradient(idx),
        avatar: getInitial(player),
      }))

      setLeaders(enriched)
    } catch (err) {
      console.error('Leaderboard fetch error:', err)
      setError('Could not load leaderboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const topThree = leaders.slice(0, 3)
  const currentUser = leaders.find(u => u.username === currentUsername) || null

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Summoning the champions…</p>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-12 bg-red-900/20 border border-red-600/30 rounded-2xl">
          <p className="text-red-400 text-lg">⚠️ {error}</p>
          <button
            onClick={fetchLeaderboard}
            className="mt-4 px-4 py-2 bg-red-600/30 hover:bg-red-600/50 border border-red-600/50 rounded-lg text-red-300 text-sm transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && leaders.length === 0 && (
        <div className="text-center py-16 bg-slate-800/40 rounded-2xl border border-dashed border-slate-600">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-slate-400 text-lg">No rankings yet</p>
          <p className="text-slate-500 text-sm mt-1">Be the first to earn XP!</p>
        </div>
      )}

      {/* Content — only render when we have data */}
      {!loading && !error && leaders.length > 0 && (
        <>
          {/* Top 3 Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* 2nd Place */}
            {topThree[1] && (
              <div className={`md:order-1 bg-gradient-to-br from-slate-700/40 to-slate-800/40 border-2 border-slate-500/40 rounded-2xl p-6 text-center relative overflow-hidden transition-all duration-700 delay-200 hover:scale-105 ${animated ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-slate-500/10 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="text-slate-300 text-sm font-semibold mb-2 flex items-center justify-center gap-1 animate-bounce">
                    <span>⚔️</span> Vice Champion
                  </div>
                  <div className={`w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${topThree[1].color} flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-slate-500/30 animate-pulse`}>
                    {topThree[1].avatar}
                  </div>
                  <p className="text-white font-bold text-lg mb-1 truncate px-2" title={getDisplayName(topThree[1])}>
                    {getDisplayName(topThree[1])}
                  </p>
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

            {/* 1st Place */}
            {topThree[0] && (
              <div className={`md:order-2 bg-gradient-to-br from-yellow-600/30 to-amber-700/30 border-2 border-yellow-500/60 rounded-2xl p-8 text-center relative overflow-hidden transition-all duration-700 delay-300 hover:scale-105 ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}`}>
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-500/20 to-transparent pointer-events-none animate-pulse" />
                <div className="relative z-10">
                  <div className="text-yellow-300 text-sm font-semibold mb-2 flex items-center justify-center gap-1 animate-bounce">
                    <span>👑</span> Grand Champion
                  </div>
                  <div className={`w-24 h-24 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${topThree[0].color} flex items-center justify-center text-4xl font-bold text-white shadow-lg shadow-yellow-500/50`}>
                    {topThree[0].avatar}
                  </div>
                  <p className="text-white font-bold text-xl mb-1 truncate px-2" title={getDisplayName(topThree[0])}>
                    {getDisplayName(topThree[0])}
                  </p>
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
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-500/10 to-transparent pointer-events-none" />
                <div className="relative z-10">
                  <div className="text-orange-300 text-sm font-semibold mb-2 flex items-center justify-center gap-1 animate-bounce">
                    <span>🥉</span> Third Place
                  </div>
                  <div className={`w-20 h-20 mx-auto mb-3 rounded-2xl bg-gradient-to-br ${topThree[2].color} flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-orange-500/30 animate-pulse`}>
                    {topThree[2].avatar}
                  </div>
                  <p className="text-white font-bold text-lg mb-1 truncate px-2" title={getDisplayName(topThree[2])}>
                    {getDisplayName(topThree[2])}
                  </p>
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

          {/* Full Rankings */}
          <div className={`bg-slate-800/40 border border-slate-700 rounded-2xl p-6 transition-all duration-700 delay-500 ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
            <h3 className="text-lg font-bold text-white mb-4">Full Rankings</h3>
            <div className="space-y-2">
              {leaders.map((player, index) => {
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
                      animationDelay: `${600 + index * 80}ms`,
                      animation: animated ? 'slideIn 0.5s ease-out forwards' : 'none',
                      opacity: 0,
                      transform: 'translateX(-20px)',
                    }}
                  >
                    {/* Rank badge */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 transition-transform duration-300 hover:scale-125 ${
                      player.rank === 1 ? 'bg-yellow-500 text-white animate-pulse' :
                      player.rank === 2 ? 'bg-slate-400 text-white' :
                      player.rank === 3 ? 'bg-orange-600 text-white' :
                      'bg-slate-700 text-slate-300'
                    }`}>
                      {player.rank}
                    </div>

                    {/* Avatar */}
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${player.color} flex items-center justify-center text-xl font-bold text-white shadow-lg flex-shrink-0 transform transition-transform duration-300 hover:scale-110 hover:rotate-3`}>
                      {player.avatar}
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-bold truncate transition-all duration-300 ${isCurrentUser ? 'text-purple-300' : 'text-white'}`}>
                          {getDisplayName(player)}
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
                    <div className="text-right flex-shrink-0">
                      <p className="text-yellow-400 font-bold text-lg">{player.xp} XP</p>
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
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xl font-bold text-white animate-bounce">
                    {currentUser.rank}
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">Your Standing</p>
                    <p className="text-slate-400 text-sm">{getDisplayName(currentUser)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-yellow-400 font-bold text-2xl animate-pulse">#{currentUser.rank}</p>
                  <p className="text-slate-400 text-sm">{currentUser.xp} XP</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Animations */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  )
}
