import { useState, useEffect } from 'react'
import AchievementBadge from "../../../components/AchievementBadge"
import AchievementModal from "../../../components/AchievementModal"
import { triggerConfetti } from '../../../utils/confetti'
import AchievementToast from '../../../components/AchievementToast'

export default function ProgressStats({ stats, username }) {
  const [animated, setAnimated] = useState(false)
  const [hoveredDay, setHoveredDay] = useState(null)
  const [achievements, setAchievements] = useState([])
  const [loadingAchievements, setLoadingAchievements] = useState(true)
  const [showAllBadges, setShowAllBadges] = useState(false)
  
  // ✅ For celebration effects
  const [newBadge, setNewBadge] = useState(null)
  const [prevEarnedCount, setPrevEarnedCount] = useState(0)

  // ✅ Fetch achievements from API
  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:5000/api/student/achievements', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setAchievements(data)
        }
      } catch (err) {
        console.error('Failed to fetch achievements:', err)
      } finally {
        setLoadingAchievements(false)
      }
    }
    fetchAchievements()
  }, [])

  // ✅ Detect newly earned badges and trigger celebration
  useEffect(() => {
    if (achievements.length > 0 && !loadingAchievements) {
      const earnedBadges = achievements.filter(b => b.is_earned)
      const currentEarnedCount = earnedBadges.length
      
      // If the count of earned badges increased, trigger celebration
      if (currentEarnedCount > prevEarnedCount && prevEarnedCount > 0) {
        // Find the most recently earned badge
        const newestBadge = earnedBadges[earnedBadges.length - 1]
        
        // 🎊 Trigger confetti!
        triggerConfetti()
        
        // 🔔 Show toast notification
        setNewBadge(newestBadge)
      }
      
      setPrevEarnedCount(currentEarnedCount)
    }
  }, [achievements, loadingAchievements])

  useEffect(() => {
    setAnimated(true)
  }, [])

  // ALL MOCK DATA - No backend connection needed for demo
  const mockData = {
    level: 1,
    xp: 0,
    questsCompleted: 0,
    streak: 1,
    totalAttempts: 5,
    failedAttempts: 5,
    successRate: 0,
    completionRate: 0,
    languages: [
      { name: 'Python', solved: 3, total: 5, color: 'from-cyan-500 to-blue-500', icon: '🐍' },
      { name: 'Java', solved: 0, total: 0, color: 'from-orange-500 to-red-500', icon: '☕' },
      { name: 'C#', solved: 0, total: 0, color: 'from-purple-500 to-pink-500', icon: '🔷' }
    ],
    difficulty: [
      { level: 'Easy', completed: 3, total: 5, color: 'text-green-400', bg: 'bg-green-500', borderColor: 'border-green-500' },
      { level: 'Medium', completed: 0, total: 0, color: 'text-yellow-400', bg: 'bg-yellow-500', borderColor: 'border-yellow-500' },
      { level: 'Hard', completed: 0, total: 0, color: 'text-red-400', bg: 'bg-red-500', borderColor: 'border-red-500' }
    ],
    // Enhanced activity data with dates and counts
    activityData: [
      { date: 'Apr 1', count: 3, level: 3 },
      { date: 'Apr 2', count: 0, level: 0 },
      { date: 'Apr 3', count: 5, level: 4 },
      { date: 'Apr 4', count: 2, level: 2 },
      { date: 'Apr 5', count: 7, level: 5 },
      { date: 'Apr 6', count: 1, level: 1 },
      { date: 'Apr 7', count: 0, level: 0 },
      { date: 'Apr 8', count: 4, level: 3 },
      { date: 'Apr 9', count: 6, level: 4 },
      { date: 'Apr 10', count: 2, level: 2 },
      { date: 'Apr 11', count: 8, level: 5 },
      { date: 'Apr 12', count: 3, level: 3 },
      { date: 'Apr 13', count: 0, level: 0 },
      { date: 'Apr 14', count: 0, level: 0 },
      { date: 'Apr 15', count: 5, level: 4 },
      { date: 'Apr 16', count: 2, level: 2 },
      { date: 'Apr 17', count: 4, level: 3 },
      { date: 'Apr 18', count: 6, level: 4 },
      { date: 'Apr 19', count: 1, level: 1 },
      { date: 'Apr 20', count: 0, level: 0 },
      { date: 'Apr 21', count: 0, level: 0 },
      { date: 'Apr 22', count: 7, level: 5 },
      { date: 'Apr 23', count: 3, level: 3 },
      { date: 'Apr 24', count: 5, level: 4 },
      { date: 'Apr 25', count: 2, level: 2 },
      { date: 'Apr 26', count: 4, level: 3 },
      { date: 'Apr 27', count: 0, level: 0 },
      { date: 'Apr 28', count: 0, level: 0 }
    ],
    achievements: [
      { name: 'First Steps', desc: 'Complete your first quest', icon: '🎯', earned: true, date: 'Apr 15, 2024' },
      { name: 'Week Warrior', desc: 'Maintain a 7-day streak', icon: '🔥', earned: false, progress: '1/7' },
      { name: 'Problem Solver', desc: 'Complete 10 quests', icon: '⚔️', earned: false, progress: '0/10' },
      { name: 'Python Novice', desc: 'Solve 5 Python problems', icon: '🐍', earned: false, progress: '3/5' }
    ],
    recentQuests: [
      { title: 'Array Sum', xp: 50, date: '2 days ago', difficulty: 'Easy', icon: '', status: 'completed' },
      { title: 'Simple Addition', xp: 75, date: '2 days ago', difficulty: 'Easy', icon: '➕', status: 'completed' },
      { title: 'Hello World', xp: 50, date: '3 days ago', difficulty: 'Easy', icon: '👋', status: 'completed' }
    ]
  }

  return (
    <div className="space-y-4">
      {/* Hero Header */}
      <div className={`bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-600/40 rounded-2xl p-6 transition-all duration-700 ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg shadow-purple-600/40 animate-pulse">
            {username?.[0]?.toUpperCase() || 'S'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{username}'s Hero Sheet</h2>
            <p className="text-slate-400">Track your legendary progress</p>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 transition-all duration-700 delay-100 ${animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center hover:border-purple-600/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-purple-600/20 group">
          <p className="text-3xl font-bold text-purple-400 mb-1 group-hover:animate-bounce">{mockData.level}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Current Level</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center hover:border-yellow-600/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-yellow-600/20 group">
          <p className="text-3xl font-bold text-yellow-400 mb-1 group-hover:animate-bounce">{mockData.xp}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Total XP</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center hover:border-green-600/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-600/20 group">
          <p className="text-3xl font-bold text-green-400 mb-1 group-hover:animate-bounce">{mockData.questsCompleted}</p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Quests Done</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-4 text-center hover:border-orange-600/40 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-600/20">
          <p className="text-3xl font-bold text-orange-400 mb-1 flex items-center justify-center gap-1 animate-pulse">
            {mockData.streak}🔥
          </p>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">Day Streak</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Combat Stats */}
          <div className={`bg-slate-800/40 border border-slate-700 rounded-xl p-5 transition-all duration-700 delay-200 ${animated ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <span>⚔️</span> Combat Stats
            </h3>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Success Rate</span>
                  <span className="text-green-400 font-bold">{mockData.successRate}%</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-green-600 to-emerald-500 rounded-full transition-all duration-1000 shadow-lg shadow-green-500/30" style={{ width: `${mockData.successRate}%` }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Quest Completion</span>
                  <span className="text-purple-400 font-bold">{mockData.completionRate}%</span>
                </div>
                <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-600 to-pink-500 rounded-full transition-all duration-1000 shadow-lg shadow-purple-500/30" style={{ width: `${mockData.completionRate}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-700">
                <div className="text-center p-2 bg-slate-900/40 rounded-lg hover:bg-slate-900/60 transition">
                  <p className="text-lg font-bold text-blue-400">{mockData.totalAttempts}</p>
                  <p className="text-[9px] text-slate-500">Total Attempts</p>
                </div>
                <div className="text-center p-2 bg-slate-900/40 rounded-lg hover:bg-slate-900/60 transition">
                  <p className="text-lg font-bold text-red-400">{mockData.failedAttempts}</p>
                  <p className="text-[9px] text-slate-500">Failed</p>
                </div>
              </div>
            </div>
          </div>

          {/* Language Skills */}
          <div className={`bg-slate-800/40 border border-slate-700 rounded-xl p-5 transition-all duration-700 delay-300 ${animated ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <span>💻</span> Language Skills
            </h3>
            <div className="space-y-3">
              {mockData.languages.map((lang) => (
                <div key={lang.name} className="group">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg group-hover:scale-110 transition-transform">{lang.icon}</span>
                      <span className="text-sm text-slate-300 font-medium">{lang.name}</span>
                    </div>
                    <span className="text-xs text-slate-400">{lang.solved}/{lang.total}</span>
                  </div>
                  <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${lang.color} rounded-full transition-all duration-1000 shadow-lg group-hover:shadow-lg group-hover:brightness-110`}
                      style={{ width: `${lang.total > 0 ? (lang.solved / lang.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Difficulty Progress */}
          <div className={`bg-slate-800/40 border border-slate-700 rounded-xl p-5 transition-all duration-700 delay-400 ${animated ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'}`}>
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <span>📊</span> Difficulty Progress
            </h3>
            <div className="space-y-2">
              {mockData.difficulty.map((diff) => (
                <div key={diff.level} className={`flex items-center justify-between p-2 bg-slate-900/40 rounded-lg border-l-2 ${diff.borderColor} hover:bg-slate-900/60 transition group`}>
                  <span className={`text-sm font-bold ${diff.color}`}>{diff.level}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${diff.bg} rounded-full shadow-lg group-hover:brightness-110 transition-all`} style={{ width: `${diff.total > 0 ? (diff.completed / diff.total) * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs text-slate-400 w-12 text-right font-mono">{diff.completed}/{diff.total}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Enhanced Activity Calendar */}
          <div className={`bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700 rounded-xl p-5 transition-all duration-700 delay-200 ${animated ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-xl">📅</span> Activity Calendar
              </h3>
              <div className="text-xs text-slate-400">Last 4 Weeks</div>
            </div>
            
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="text-[8px] text-slate-500 text-center font-medium py-1">{day}</div>
              ))}
            </div>
            
            {/* Activity grid */}
            <div className="grid grid-cols-7 gap-1">
              {mockData.activityData.map((day, idx) => {
                const getColorClass = (level) => {
                  if (level === 0) return 'bg-slate-700/60 border-slate-600/40'
                  if (level === 1) return 'bg-green-900/60 border-green-700/40'
                  if (level === 2) return 'bg-green-700/60 border-green-500/40'
                  if (level === 3) return 'bg-green-500 border-green-400'
                  if (level === 4) return 'bg-green-400 border-green-300'
                  return 'bg-green-300 border-green-200'
                }
                
                const isToday = idx === mockData.activityData.length - 1
                
                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className={`
                      aspect-square rounded-md border-2 ${getColorClass(day.level)}
                      hover:scale-125 hover:z-10 hover:shadow-lg hover:shadow-green-500/30
                      transition-all duration-200 cursor-pointer relative group
                      ${isToday ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-800' : ''}
                    `}
                  >
                    {/* Tooltip */}
                    <div className={`
                      absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 
                      bg-slate-900 border border-slate-600 rounded-lg shadow-xl
                      text-[10px] text-white whitespace-nowrap z-20
                      opacity-0 group-hover:opacity-100 transition-opacity duration-200
                      pointer-events-none
                    `}>
                      <div className="font-bold">{day.date}</div>
                      <div className="text-slate-300">{day.count} submissions</div>
                      {isToday && <div className="text-purple-400 font-bold">Today</div>}
                    </div>
                    
                    {/* Count badge for high activity */}
                    {day.count > 0 && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[8px] font-bold text-white drop-shadow-lg">{day.count}</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            
            {/* Legend */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
              <div className="flex items-center gap-1 text-[8px] text-slate-500">
                <span>Less</span>
                <div className="flex gap-0.5">
                  <div className="w-2.5 h-2.5 rounded bg-slate-700/60 border border-slate-600/40"></div>
                  <div className="w-2.5 h-2.5 rounded bg-green-900/60 border border-green-700/40"></div>
                  <div className="w-2.5 h-2.5 rounded bg-green-700/60 border border-green-500/40"></div>
                  <div className="w-2.5 h-2.5 rounded bg-green-500 border border-green-400"></div>
                  <div className="w-2.5 h-2.5 rounded bg-green-400 border border-green-300"></div>
                </div>
                <span>More</span>
              </div>
              <div className="flex items-center gap-1 text-[9px] text-purple-400">
                <div className="w-2.5 h-2.5 rounded ring-2 ring-purple-500 ring-offset-1 ring-offset-slate-800"></div>
                <span>Today</span>
              </div>
            </div>
          </div>

          {/* Achievements */}
          <div className={`bg-slate-800/40 border border-slate-700 rounded-xl p-5 transition-all duration-700 delay-300 ${animated ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🏆</span> Achievements
              </h3>
              <button 
                onClick={() => setShowAllBadges(true)}
                className="text-xs text-purple-400 hover:text-purple-300 transition flex items-center gap-1"
              >
                View All →
              </button>
            </div>
            
            {loadingAchievements ? (
              <div className="flex gap-3 justify-center py-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-12 h-12 bg-slate-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              <>
                {/* Badge Grid - Show first 6 */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {achievements.slice(0, 6).map(badge => (
                    <AchievementBadge 
                      key={badge.id} 
                      badge={badge} 
                      size="sm"
                    />
                  ))}
                </div>
                
                {/* Summary */}
                <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-purple-600 rounded-full" />
                    {achievements.filter(b => b.is_earned).length} Earned
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-slate-600 rounded-full" />
                    {achievements.filter(b => !b.is_earned).length} Locked
                  </span>
                </div>
              </>
            )}
          </div>

          {/* ✅ Achievement Modal */}
          {showAllBadges && (
            <AchievementModal 
              achievements={achievements}
              onClose={() => setShowAllBadges(false)}
            />
          )}

          {/* Recent Quests */}
          <div className={`bg-slate-800/40 border border-slate-700 rounded-xl p-5 transition-all duration-700 delay-400 ${animated ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <span>⚔️</span> Recent Quests
            </h3>
            <div className="space-y-2">
              {mockData.recentQuests.map((quest, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/60 rounded-lg border border-slate-700 hover:border-purple-600/40 transition-all duration-300 hover:scale-[1.02] group cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="text-lg group-hover:scale-110 transition-transform">{quest.icon}</span>
                    <div>
                      <p className="text-white font-semibold text-xs group-hover:text-purple-300 transition-colors">{quest.title}</p>
                      <p className="text-[9px] text-slate-500">{quest.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                      quest.difficulty === 'Easy' ? 'bg-green-600/20 text-green-400 border border-green-600/40' :
                      quest.difficulty === 'Medium' ? 'bg-yellow-600/20 text-yellow-400 border border-yellow-600/40' :
                      'bg-red-600/20 text-red-400 border border-red-600/40'
                    }`}>
                      {quest.difficulty}
                    </span>
                    <span className="px-1.5 py-0.5 bg-green-600/20 text-green-400 text-[9px] rounded-full font-bold border border-green-600/40">
                      +{quest.xp} XP
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 🎉 Celebration Toast */}
      {newBadge && (
        <AchievementToast 
          badge={newBadge} 
          onClose={() => setNewBadge(null)} 
        />
      )}
    </div>
  )
}