import { useState, useEffect } from 'react'

const API = 'http://localhost:5000'

// ── Inline Badge component (no external dep needed) ──────────────────────────
function AchievementBadge({ badge, size = 'md' }) {
  const sizes = {
    sm: { outer: 'w-14 h-14', icon: 'text-2xl', ring: 'ring-2' },
    md: { outer: 'w-20 h-20', icon: 'text-3xl', ring: 'ring-2' },
    lg: { outer: 'w-28 h-28', icon: 'text-5xl', ring: 'ring-4' },
  }
  const s = sizes[size] || sizes.md

  const earned = badge.is_earned

  return (
    <div className="relative group flex flex-col items-center">
      {/* Glow aura for earned badges */}
      {earned && (
        <div className="absolute inset-0 rounded-full bg-purple-500/20 blur-xl scale-125 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}

      <div
        className={`
          relative ${s.outer} rounded-2xl flex items-center justify-center
          ${s.ring}
          ${earned
            ? 'bg-gradient-to-br from-purple-800/60 to-blue-900/60 ring-purple-500/50 shadow-lg shadow-purple-900/40'
            : 'bg-slate-800/60 ring-slate-700/40 grayscale opacity-50'}
          transition-all duration-300 group-hover:scale-105
        `}
      >
        <span className={s.icon}>{badge.icon}</span>

        {/* Earned checkmark */}
        {earned && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-xs text-white font-bold shadow">
            ✓
          </span>
        )}
      </div>
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = 'purple' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  const colorMap = {
    purple: 'from-purple-600 to-blue-500',
    green:  'from-green-500 to-emerald-400',
    yellow: 'from-yellow-500 to-amber-400',
  }
  return (
    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div
        className={`h-full bg-gradient-to-r ${colorMap[color]} rounded-full transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ── Single achievement card ───────────────────────────────────────────────────
function AchievementCard({ badge }) {
  const pct = badge.max_progress > 0
    ? Math.min(100, Math.round((badge.progress / badge.max_progress) * 100))
    : 0

  return (
    <div
      className={`
        relative flex flex-col gap-4 p-5 rounded-2xl border transition-all duration-300 group
        ${badge.is_earned
          ? 'bg-gradient-to-br from-slate-900 to-purple-950/30 border-purple-600/30 hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-900/30'
          : 'bg-slate-900 border-slate-800 hover:border-slate-700 opacity-75 hover:opacity-90'}
      `}
    >
      {/* Earned shimmer strip */}
      {badge.is_earned && (
        <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-purple-500/60 to-transparent" />
      )}

      {/* Top row: badge + meta */}
      <div className="flex items-start gap-4">
        <AchievementBadge badge={badge} size="md" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className={`font-bold text-sm leading-tight ${badge.is_earned ? 'text-white' : 'text-slate-400'}`}>
              {badge.name}
            </h3>
            {badge.is_earned && (
              <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded text-xs font-bold flex-shrink-0">
                EARNED
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs leading-relaxed">{badge.description}</p>

          {/* XP reward */}
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-yellow-400 text-xs font-black">+{badge.xp_reward}</span>
            <span className="text-yellow-600 text-xs">XP</span>
          </div>
        </div>
      </div>

      {/* Progress section */}
      {!badge.is_earned ? (
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Progress</span>
            <span className="text-slate-400 font-mono tabular-nums">
              {badge.progress} / {badge.max_progress}
            </span>
          </div>
          <ProgressBar value={badge.progress} max={badge.max_progress} />
          <p className="text-slate-600 text-xs text-right">{pct}%</p>
        </div>
      ) : badge.earned_at ? (
        <p className="text-slate-600 text-xs">
          🗓 Earned {new Date(badge.earned_at).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          })}
        </p>
      ) : null}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function InstructorAchievements() {
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [filter, setFilter]             = useState('all') // 'all' | 'earned' | 'locked'
  const [sortBy, setSortBy]             = useState('default') // 'default' | 'xp' | 'progress'

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAchievements = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem('token')
        if (!token) throw new Error('Not authenticated')

        const res = await fetch(`${API}/api/instructor/achievements`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })

        if (res.status === 401) {
          localStorage.removeItem('token')
          window.location.href = '/'
          return
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to fetch achievements')
        }

        setAchievements(await res.json())
      } catch (err) {
        console.error('Failed to fetch instructor achievements:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchAchievements()
  }, [])

  // ── Derived data ───────────────────────────────────────────────────────────
  const earned   = achievements.filter(a => a.is_earned)
  const inProgress = achievements.filter(a => !a.is_earned && a.progress > 0)
  const locked   = achievements.filter(a => !a.is_earned && a.progress === 0)
  const totalXP  = earned.reduce((sum, a) => sum + a.xp_reward, 0)

  const filtered = (() => {
    let list =
      filter === 'earned'   ? earned :
      filter === 'progress' ? inProgress :
      filter === 'locked'   ? locked :
      achievements

    if (sortBy === 'xp') {
      list = [...list].sort((a, b) => b.xp_reward - a.xp_reward)
    } else if (sortBy === 'progress') {
      list = [...list].sort((a, b) => {
        const pa = a.max_progress > 0 ? a.progress / a.max_progress : 0
        const pb = b.max_progress > 0 ? b.progress / b.max_progress : 0
        return pb - pa
      })
    } else {
      // default: earned first, then in-progress, then locked
      list = [...list].sort((a, b) => {
        if (a.is_earned !== b.is_earned) return a.is_earned ? -1 : 1
        const pa = a.max_progress > 0 ? a.progress / a.max_progress : 0
        const pb = b.max_progress > 0 ? b.progress / b.max_progress : 0
        return pb - pa
      })
    }

    return list
  })()

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="h-8 w-64 bg-slate-800 rounded-lg animate-pulse mb-2" />
            <div className="h-4 w-48 bg-slate-800/60 rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <span className="text-5xl">⚠️</span>
        <p className="text-red-400 font-semibold">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm font-medium transition"
        >
          🔄 Retry
        </button>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-7">

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            🏆 Teaching Achievements
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Milestones earned through your work as an instructor
          </p>
        </div>

        {/* Completion pill */}
        {achievements.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <span className="text-purple-400 text-xs font-bold">
              {earned.length}/{achievements.length} Earned
            </span>
          </div>
        )}
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Earned',
            value: earned.length,
            icon: '🥇',
            color: 'text-yellow-400',
            bg: 'bg-yellow-500/10',
            border: 'border-yellow-500/20',
          },
          {
            label: 'In Progress',
            value: inProgress.length,
            icon: '⚡',
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
            border: 'border-blue-500/20',
          },
          {
            label: 'Locked',
            value: locked.length,
            icon: '🔒',
            color: 'text-slate-400',
            bg: 'bg-slate-800',
            border: 'border-slate-700',
          },
          {
            label: 'XP from Badges',
            value: `${totalXP} XP`,
            icon: '✨',
            color: 'text-purple-400',
            bg: 'bg-purple-500/10',
            border: 'border-purple-500/20',
          },
        ].map(stat => (
          <div
            key={stat.label}
            className={`${stat.bg} border ${stat.border} rounded-2xl p-4 flex items-center gap-3`}
          >
            <span className="text-2xl flex-shrink-0">{stat.icon}</span>
            <div>
              <p className={`text-2xl font-black ${stat.color} tabular-nums leading-none`}>
                {stat.value}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      {achievements.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-semibold text-sm">Overall Completion</p>
            <p className="text-slate-400 text-sm tabular-nums">
              {Math.round((earned.length / achievements.length) * 100)}%
            </p>
          </div>
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 rounded-full transition-all duration-1000"
              style={{ width: `${(earned.length / achievements.length) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-600 mt-1.5">
            <span>0</span>
            <span>{achievements.length} total</span>
          </div>
        </div>
      )}

      {/* Filters + Sort */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all',      label: `All (${achievements.length})` },
            { key: 'earned',   label: `Earned (${earned.length})` },
            { key: 'progress', label: `In Progress (${inProgress.length})` },
            { key: 'locked',   label: `Locked (${locked.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                filter === tab.key
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-slate-300 text-sm outline-none focus:border-purple-500/60 transition cursor-pointer"
        >
          <option value="default">Sort: Default</option>
          <option value="xp">Sort: XP Reward</option>
          <option value="progress">Sort: Progress</option>
        </select>
      </div>

      {/* Achievement grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-5xl mb-4">🎯</span>
          <p className="text-slate-300 font-semibold text-lg mb-1">No achievements here</p>
          <p className="text-slate-500 text-sm">Try a different filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(badge => (
            <AchievementCard key={badge.id} badge={badge} />
          ))}
        </div>
      )}

      {/* Footer hint */}
      {locked.length > 0 && filter !== 'locked' && (
        <p className="text-slate-600 text-xs text-center">
          {locked.length} achievement{locked.length !== 1 ? 's' : ''} still locked — keep teaching!
        </p>
      )}
    </div>
  )
}
