import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function DashboardOverview() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [loading, setLoading] = useState(true)
  const [avgScore, setAvgScore] = useState(0)
  const [pendingReviews, setPendingReviews] = useState(0)
  const [totalProblems, setTotalProblems] = useState(0)
  const [newProblemsThisWeek, setNewProblemsThisWeek] = useState(0)
  const [recentActivity, setRecentActivity] = useState([])
  const [topPerformers, setTopPerformers] = useState([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) throw new Error('Not authenticated')

        const classesRes = await fetch('http://localhost:5000/api/instructor/classes', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!classesRes.ok) throw new Error('Failed to fetch classes')
        const classesData = await classesRes.json()
        setClasses(classesData)
        const total = classesData.reduce((sum, cls) => sum + (cls.student_count || 0), 0)
        setTotalStudents(total)

        const statsRes = await fetch('http://localhost:5000/api/instructor/dashboard-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setAvgScore(statsData.avg_score)
          setPendingReviews(statsData.pending_reviews)
          setTotalProblems(statsData.total_problems)
          setNewProblemsThisWeek(statsData.new_problems_this_week)
          setRecentActivity(statsData.recent_activity)
          setTopPerformers(statsData.top_performers)
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-slate-400 text-sm animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: 'Total Students',
      value: totalStudents,
      icon: '👥',
      color: 'blue',
      badge: '+5 this week',
      badgeColor: 'text-green-400 bg-green-500/10',
    },
    {
      label: 'Avg Class Score',
      value: `${avgScore}%`,
      icon: '📊',
      color: 'green',
      badge: '+2% vs last week',
      badgeColor: 'text-green-400 bg-green-500/10',
    },
    {
      label: 'Pending Reviews',
      value: pendingReviews,
      icon: '⏳',
      color: 'orange',
      badge: pendingReviews > 0 ? 'Needs attention' : 'All clear',
      badgeColor: pendingReviews > 0 ? 'text-red-400 bg-red-500/10' : 'text-green-400 bg-green-500/10',
    },
    {
      label: 'Active Problems',
      value: totalProblems,
      icon: '📝',
      color: 'purple',
      badge: newProblemsThisWeek > 0 ? `+${newProblemsThisWeek} this week` : 'No new',
      badgeColor: 'text-slate-400 bg-slate-700/50',
    },
  ]

  const colorMap = {
    blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20',   glow: 'shadow-blue-500/10' },
    green:  { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20',  glow: 'shadow-green-500/10' },
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/20', glow: 'shadow-orange-500/10' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', glow: 'shadow-purple-500/10' },
  }

  const blockColors = [
    'from-blue-600 to-blue-700',
    'from-purple-600 to-purple-700',
    'from-emerald-600 to-emerald-700',
    'from-rose-600 to-rose-700',
    'from-amber-600 to-amber-700',
  ]

  return (
    <div className="space-y-8">

      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Instructor Dashboard</h1>
          <p className="text-slate-400 mt-1 text-sm">Manage your classes, problems, and student progress</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
          <span className="text-green-400 text-xs font-semibold">Live</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => {
          const c = colorMap[card.color]
          return (
            <div
              key={card.label}
              className={`relative bg-slate-900 border ${c.border} rounded-2xl p-5 hover:shadow-xl ${c.glow} transition-all duration-300 group overflow-hidden`}
            >
              {/* Background glow blob */}
              <div className={`absolute -top-6 -right-6 w-24 h-24 ${c.bg} rounded-full blur-2xl opacity-60 group-hover:opacity-100 transition-opacity`}></div>

              <div className="relative flex justify-between items-start mb-4">
                <div className={`w-11 h-11 ${c.bg} rounded-xl flex items-center justify-center text-xl border ${c.border}`}>
                  {card.icon}
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${card.badgeColor}`}>
                  {card.badge}
                </span>
              </div>

              <div className="relative">
                <p className="text-3xl font-black text-white mb-1 tabular-nums">{card.value}</p>
                <p className={`text-sm font-medium ${c.text}`}>{card.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">

        {/* Left: Classes + Activity */}
        <div className="lg:col-span-2 space-y-7">

          {/* My Classes */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-blue-400">🏫</span> My Classes
              </h2>
              <button
                onClick={() => navigate('/instructor/classes')}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold transition flex items-center gap-1"
              >
                View All <span>→</span>
              </button>
            </div>

            <div className="divide-y divide-slate-800/60">
              {classes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-slate-500">
                  <span className="text-4xl mb-3">🏫</span>
                  <p className="text-sm">No classes assigned yet</p>
                </div>
              ) : (
                classes.map((cls, idx) => (
                  <div
                    key={cls.id}
                    onClick={() => navigate(`/instructor/class/${cls.id}`)}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/40 transition cursor-pointer group"
                  >
                    <div className={`w-11 h-11 bg-gradient-to-br ${blockColors[idx % blockColors.length]} rounded-xl flex items-center justify-center text-lg shadow-lg group-hover:scale-110 transition-transform flex-shrink-0`}>
                      🏫
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-sm group-hover:text-blue-300 transition">Block {cls.section_code}</p>
                      <p className="text-slate-500 text-xs truncate">{cls.name}</p>
                    </div>
                    <div className="flex items-center gap-5 text-right">
                      <div>
                        <p className="text-white font-bold text-sm">{cls.student_count || 0}</p>
                        <p className="text-slate-600 text-xs">Students</p>
                      </div>
                      <div>
                        <p className="text-white font-bold text-sm">{cls.problem_count || 0}</p>
                        <p className="text-slate-600 text-xs">Problems</p>
                      </div>
                      <span className="text-slate-600 group-hover:text-slate-300 transition text-lg">›</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-yellow-400">⚡</span> Recent Activity
              </h2>
            </div>

            <div className="divide-y divide-slate-800/60">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <span className="text-4xl mb-3">📭</span>
                  <p className="text-sm">No recent activity yet</p>
                </div>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-800/30 transition">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${
                      activity.status === 'accepted' ? 'bg-green-500/10' :
                      activity.status === 'wrong_answer' ? 'bg-red-500/10' : 'bg-slate-800'
                    }`}>
                      {activity.status === 'accepted' ? '✅' : activity.status === 'wrong_answer' ? '❌' : 'ℹ️'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">
                        <span className="font-semibold">{activity.student}</span>
                        <span className="text-slate-400"> submitted </span>
                        <span className="text-blue-400">{activity.problem}</span>
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {new Date(activity.submitted_at).toLocaleDateString()} at{' '}
                        {new Date(activity.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex-shrink-0 ${
                      activity.status === 'accepted' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      activity.status === 'wrong_answer' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {activity.status.replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Actions + Top Performers */}
        <div className="space-y-7">

          {/* Quick Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-purple-400">⚡</span> Quick Actions
              </h2>
            </div>
            <div className="p-4 space-y-3">
              {[
                { icon: '➕', label: 'Create Problem', sub: 'Add new challenge', color: 'blue', path: '/instructor/create-problem' },
                { icon: '🏫', label: 'View Classes',   sub: 'Manage class list',  color: 'green', path: '/instructor/classes' },
                { icon: '📢', label: 'Post Announcement', sub: 'Communicate with students', color: 'purple', path: '/instructor/announcements' },
              ].map((action) => {
                const ac = colorMap[action.color]
                return (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.path)}
                    className={`w-full flex items-center gap-3 p-3.5 ${ac.bg} hover:opacity-80 border ${ac.border} rounded-xl transition group text-left`}
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">{action.icon}</span>
                    <div>
                      <p className={`font-bold text-sm ${ac.text}`}>{action.label}</p>
                      <p className="text-slate-500 text-xs">{action.sub}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-yellow-400">🏆</span> Top Performers
              </h2>
            </div>

            <div className="p-4 space-y-2">
              {topPerformers.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <span className="text-3xl mb-2 block">🎯</span>
                  <p className="text-sm">No student data yet</p>
                </div>
              ) : (
                topPerformers.map((student, index) => {
                  const medals = ['🥇', '🥈', '🥉']
                  const rankColors = [
                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
                    'bg-slate-500/10 text-slate-300 border-slate-500/20',
                    'bg-orange-500/10 text-orange-400 border-orange-500/20',
                  ]
                  return (
                    <div
                      key={student.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition ${
                        index < 3 ? 'bg-slate-800/50 border border-slate-700/50' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${
                        index < 3 ? rankColors[index] : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                        {index < 3 ? medals[index] : index + 1}
                      </div>
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0">
                        {(student.username || 'U')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{student.username}</p>
                        <p className="text-slate-500 text-xs">Level {student.level}</p>
                      </div>
                      <span className="text-yellow-400 font-bold text-sm tabular-nums">{student.xp} XP</span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
