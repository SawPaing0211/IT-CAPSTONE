import { useState, useEffect } from 'react'
import AchievementBadge from '../../components/AchievementBadge'

export default function InstructorAchievements() {
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:5000/api/instructor/achievements', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setAchievements(data)
        }
      } catch (err) {
        console.error('Failed to fetch instructor achievements:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchAchievements()
  }, [])

  const earned = achievements.filter(a => a.is_earned)
  const locked = achievements.filter(a => !a.is_earned)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <span>🏆</span> Teaching Achievements
        </h1>
        <p className="text-slate-400 mt-1">
          Track your teaching milestones and earn badges
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-600/30 rounded-xl p-4">
          <p className="text-2xl font-bold text-purple-400">{earned.length}</p>
          <p className="text-xs text-slate-400">Earned</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <p className="text-2xl font-bold text-slate-400">{locked.length}</p>
          <p className="text-xs text-slate-500">Locked</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4">
          <p className="text-2xl font-bold text-yellow-400">{achievements.length}</p>
          <p className="text-xs text-slate-500">Total</p>
        </div>
      </div>

      {/* Badge Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {achievements.map(badge => (
            <div key={badge.id} className="flex flex-col items-center gap-2">
              <AchievementBadge badge={badge} size="md" showTooltip={true} />
              <p className={`text-xs text-center font-medium ${badge.is_earned ? 'text-white' : 'text-slate-400'}`}>
                {badge.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}