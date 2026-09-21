// instructor achievements — badge gallery showing all 15 instructor badges,
// earned and locked. all data is real from /api/instructor/achievements.
//
// badges use the same shared AchievementBadge component the student side
// uses (components/AchievementBadge.jsx) — icon + name, tap/hover for the
// full description/progress/reward in a tooltip — so a badge looks and
// behaves like the same "thing" on both sides of the app, and the grid
// stays compact instead of a tall stack of description cards.
//
// filter tabs: All/Earned/In Progress/Locked. sort by default/xp/progress.

import { useState, useEffect, useRef } from 'react'
import MobileSheet from '../../components/MobileSheet'
import AchievementBadge from '../../components/AchievementBadge'
import { API_BASE } from '../../api/client'

const API = API_BASE

const SORT_LABELS = { default: 'Default', xp: 'XP Reward', progress: 'Progress' }

export default function InstructorAchievements() {
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [filter, setFilter]             = useState('all')
  const [sortBy, setSortBy]             = useState('default')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const sortMenuRef = useRef(null)

  // Fetch instructor achievements on mount
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
        if (res.status === 401) { localStorage.removeItem('token'); window.location.href = '/'; return }
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

  // Split achievements into earned, in-progress, and locked groups
  const earned     = achievements.filter(a => a.is_earned)
  const inProgress = achievements.filter(a => !a.is_earned && a.progress > 0)
  const locked     = achievements.filter(a => !a.is_earned && a.progress === 0)
  const totalXP    = earned.reduce((sum, a) => sum + a.xp_reward, 0)

  // Filter achievements by the selected tab, then sort by the chosen order
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
      // earned first, then in-progress by % completion, then locked
      list = [...list].sort((a, b) => {
        if (a.is_earned !== b.is_earned) return a.is_earned ? -1 : 1
        const pa = a.max_progress > 0 ? a.progress / a.max_progress : 0
        const pb = b.max_progress > 0 ? b.progress / b.max_progress : 0
        return pb - pa
      })
    }
    return list
  })()

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 w-64 bg-slate-800 rounded-lg animate-pulse mb-2" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-800 rounded-2xl animate-pulse" />)}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {[...Array(12)].map((_, i) => <div key={i} className="aspect-square bg-slate-800 rounded-xl animate-pulse" />)}
      </div>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <span className="text-5xl">⚠️</span>
      <p className="text-red-400 font-semibold">{error}</p>
      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm font-medium transition">
        🔄 Retry
      </button>
    </div>
  )

  return (
    <div className="space-y-4 sm:space-y-7">

      {/* Header — same pattern as other redesigned pages */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Achievements</h1>
          <p className="text-slate-400 mt-0.5 text-sm">Milestones earned through your work as an instructor</p>
        </div>
        {achievements.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <span className="text-purple-400 text-xs font-bold">{earned.length}/{achievements.length} Earned</span>
          </div>
        )}
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Earned',        value: earned.length,     icon: '🥇', color: 'text-yellow-400', border: 'border-l-yellow-500' },
          { label: 'In Progress',   value: inProgress.length, icon: '⚡', color: 'text-blue-400',   border: 'border-l-blue-500' },
          { label: 'Locked',        value: locked.length,     icon: '🔒', color: 'text-slate-400',  border: 'border-l-slate-600' },
          { label: 'XP from Badges',value: `${totalXP} XP`,  icon: '✨', color: 'text-purple-400', border: 'border-l-purple-500' },
        ].map(stat => (
          <div key={stat.label} className={`bg-slate-900 border border-slate-800 border-l-4 ${stat.border} rounded-xl p-2.5 sm:p-4`}>
            <p className={`text-lg sm:text-2xl font-black ${stat.color} tabular-nums leading-none`}>{stat.value}</p>
            <p className="text-slate-500 text-[10px] sm:text-xs mt-0.5 sm:mt-1 flex items-center gap-1 truncate"><span>{stat.icon}</span> {stat.label}</p>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      {achievements.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 sm:p-5">
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
        <div className="flex gap-1.5 sm:gap-2 flex-wrap">
          {[
            { key: 'all',      label: `All (${achievements.length})` },
            { key: 'earned',   label: `Earned (${earned.length})` },
            { key: 'progress', label: `In Progress (${inProgress.length})` },
            { key: 'locked',   label: `Locked (${locked.length})` },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                filter === tab.key
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div ref={sortMenuRef} className="relative shrink-0">
          <button
            onClick={() => setShowSortMenu(v => !v)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl px-3 sm:px-4 py-1.5 sm:py-2 text-slate-300 text-xs sm:text-sm transition"
          >
            <span>Sort: {SORT_LABELS[sortBy]}</span>
            <span className="text-slate-500 text-[10px]">▼</span>
          </button>
          <MobileSheet show={showSortMenu} onClose={() => setShowSortMenu(false)} widthClass="sm:w-48" anchorRef={sortMenuRef}>
            <div className="py-2">
              {Object.entries(SORT_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setSortBy(key); setShowSortMenu(false) }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition ${
                    sortBy === key ? 'text-purple-300 bg-purple-600/10 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </MobileSheet>
        </div>
      </div>

      {/* Grid — icon + name, same as the student side's badge gallery. Tap
          (or hover on desktop) a badge for its full description, progress
          and reward in a tooltip. */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <span className="text-5xl mb-4">🎯</span>
          <p className="text-slate-300 font-semibold text-lg mb-1">No achievements here</p>
          <p className="text-slate-500 text-sm">Try a different filter</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-5">
            {filtered.map(badge => (
              <div key={badge.id} className="flex flex-col items-center gap-2">
                <AchievementBadge badge={badge} size="md" />
                <p className={`text-xs text-center font-medium truncate w-full ${badge.is_earned ? 'text-white' : 'text-slate-500'}`}>
                  {badge.name}
                </p>
              </div>
            ))}
          </div>
          <p className="text-slate-600 text-xs text-center mt-5 pt-4 border-t border-slate-800">
            Tap a badge for details · Keep teaching to earn more! ✨
          </p>
        </div>
      )}

      {locked.length > 0 && filter !== 'locked' && (
        <p className="text-slate-600 text-xs text-center">
          {locked.length} achievement{locked.length !== 1 ? 's' : ''} still locked — keep teaching!
        </p>
      )}
    </div>
  )
}
