// instructor dashboard landing page — first thing they see after login.
// all data is real from /api/instructor/dashboard-stats and /api/instructor/classes.
//
// removed the fake hardcoded badges like "+5 this week" and "+2% vs last week"
// that were there before — those were just made-up strings, not real data.
// now shows real values only, or nothing if we don't have the data for it.
//
// activityFilter second useEffect: runs whenever activityFilter changes.
// the early-return condition (activityFilter === 'all' && sections.length === 0)
// prevents it from firing a pointless fetch on initial mount before sections load.

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function DashboardOverview() {
  const navigate = useNavigate()
  const [classes, setClasses]                   = useState([])
  const [totalStudents, setTotalStudents]       = useState(0)
  const [loading, setLoading]                   = useState(true)
  const [avgScore, setAvgScore]                 = useState(0)
  const [pendingReviews, setPendingReviews]     = useState(0)
  const [totalProblems, setTotalProblems]       = useState(0)
  const [newProblemsThisWeek, setNewProblemsThisWeek] = useState(0)
  const [recentActivity, setRecentActivity]     = useState([])
  const [topPerformers, setTopPerformers]       = useState([])
  const [assignedSections, setAssignedSections] = useState([])
  const [activityFilter, setActivityFilter]     = useState('all')
  const [activityLoading, setActivityLoading]   = useState(false)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!token) throw new Error('Not authenticated')

        const [classesRes, statsRes] = await Promise.all([
          fetch('http://localhost:5000/api/instructor/classes', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch('http://localhost:5000/api/instructor/dashboard-stats', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ])

        if (classesRes.ok) {
          const classesData = await classesRes.json()
          setClasses(classesData)
          setTotalStudents(classesData.reduce((sum, cls) => sum + (cls.student_count || 0), 0))
        }

        if (statsRes.ok) {
          const statsData = await statsRes.json()
          setAvgScore(statsData.avg_score ?? 0)
          setPendingReviews(statsData.pending_reviews ?? 0)
          setTotalProblems(statsData.total_problems ?? 0)
          setNewProblemsThisWeek(statsData.new_problems_this_week ?? 0)
          setRecentActivity(statsData.recent_activity ?? [])
          setTopPerformers(statsData.top_performers ?? [])
          setAssignedSections(statsData.assigned_sections ?? [])
        }
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  // re-fetch activity when section filter changes
  // early return prevents a pointless fetch on first render before sections load
  useEffect(() => {
    if (activityFilter === 'all' && assignedSections.length === 0) return
    const fetchFiltered = async () => {
      setActivityLoading(true)
      try {
        const token = localStorage.getItem('token')
        const url = activityFilter === 'all'
          ? 'http://localhost:5000/api/instructor/dashboard-stats'
          : `http://localhost:5000/api/instructor/dashboard-stats?class_code=${activityFilter}`
        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
        if (res.ok) {
          const data = await res.json()
          setRecentActivity(data.recent_activity ?? [])
        }
      } catch (err) {
        console.error('Filter fetch error:', err)
      } finally {
        setActivityLoading(false)
      }
    }
    fetchFiltered()
  }, [activityFilter])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent" />
          <p className="text-slate-400 text-sm animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* ── Page Header — same pattern as admin ────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Dashboard</h1>
          <p className="text-slate-400 mt-0.5 text-sm">Manage your classes, activities, and student progress</p>
        </div>
        <div className="text-xs text-slate-500 text-right">
          <p className="text-slate-400 font-medium">Updated {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Students',
            value: totalStudents,
            icon: '👥',
            border: 'border-l-purple-500',
            text: 'text-purple-400',
            bg: 'bg-purple-500/5',
          },
          {
            label: 'Avg Class Score',
            value: `${avgScore}%`,
            icon: '📊',
            border: 'border-l-blue-500',
            text: 'text-blue-400',
            bg: 'bg-blue-500/5',
            sub: avgScore >= 70 ? 'Above passing' : avgScore > 0 ? 'Below passing' : null,
            subColor: avgScore >= 70 ? 'text-green-400' : 'text-red-400',
          },
          {
            label: 'Pending Reviews',
            value: pendingReviews,
            icon: '⏳',
            border: pendingReviews > 0 ? 'border-l-red-500' : 'border-l-green-500',
            text: pendingReviews > 0 ? 'text-red-400' : 'text-green-400',
            bg: pendingReviews > 0 ? 'bg-red-500/5' : 'bg-green-500/5',
            sub: pendingReviews > 0 ? 'Needs attention' : 'All clear',
            subColor: pendingReviews > 0 ? 'text-red-400' : 'text-green-400',
          },
          {
            label: 'Active Problems',
            value: totalProblems,
            icon: '📝',
            border: 'border-l-amber-500',
            text: 'text-amber-400',
            bg: 'bg-amber-500/5',
            sub: newProblemsThisWeek > 0 ? `+${newProblemsThisWeek} this week` : null,
            subColor: 'text-amber-400',
          },
        ].map(card => (
          <div
            key={card.label}
            className={`bg-slate-900 border border-slate-800 border-l-4 ${card.border} ${card.bg} rounded-xl p-5 hover:border-slate-700 transition-all`}
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">{card.label}</p>
              <span className="text-xl opacity-70">{card.icon}</span>
            </div>
            <p className={`text-3xl font-black ${card.text} tabular-nums`}>{card.value}</p>
            {card.sub && (
              <p className={`text-xs mt-1 font-medium ${card.subColor}`}>{card.sub}</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Main Grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left col — classes + activity */}
        <div className="lg:col-span-2 space-y-5">

          {/* My Classes */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <span>🏫</span> My Classes
              </h2>
              <button
                onClick={() => navigate('/instructor/classes')}
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold transition"
              >
                View All →
              </button>
            </div>

            <div className="divide-y divide-slate-800/60">
              {classes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-slate-500">
                  <span className="text-4xl mb-3">🏫</span>
                  <p className="text-sm">No classes assigned yet</p>
                  <p className="text-xs text-slate-600 mt-1">Ask your administrator to assign you to a class</p>
                </div>
              ) : (
                classes.slice(0, 5).map((cls, idx) => {
                  const gradients = [
                    'from-purple-600 to-pink-600',
                    'from-blue-600 to-purple-600',
                    'from-emerald-600 to-teal-600',
                    'from-rose-600 to-orange-600',
                    'from-amber-600 to-yellow-600',
                  ]
                  return (
                    <div
                      key={cls.id}
                      onClick={() => navigate(`/instructor/class/${cls.id}`)}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-slate-800/40 transition cursor-pointer group"
                    >
                      <div className={`w-10 h-10 bg-gradient-to-br ${gradients[idx % gradients.length]} rounded-xl flex items-center justify-center text-base shadow-lg group-hover:scale-110 transition-transform shrink-0`}>
                        🏫
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm group-hover:text-purple-300 transition">{cls.section_no}</p>
                        <p className="text-slate-500 text-xs truncate">{cls.name}</p>
                      </div>
                      <div className="flex items-center gap-5 text-right shrink-0">
                        <div>
                          <p className="text-white font-bold text-sm">{cls.student_count || 0}</p>
                          <p className="text-slate-600 text-xs">Students</p>
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">{cls.problem_count || 0}</p>
                          <p className="text-slate-600 text-xs">Problems</p>
                        </div>
                        <span className="text-slate-600 group-hover:text-purple-400 transition text-lg">›</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2 shrink-0">
                <span>⚡</span> Recent Activity
              </h2>
              <select
                value={activityFilter}
                onChange={e => setActivityFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-purple-500/60 transition cursor-pointer"
              >
                <option value="all">All Sections</option>
                {assignedSections.map(sec => (
                  <option key={sec.id} value={sec.section_no}>
                    Class {sec.section_no}
                  </option>
                ))}
              </select>
            </div>

            <div className="divide-y divide-slate-800/60">
              {activityLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-purple-500 border-t-transparent" />
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <span className="text-4xl mb-3">📭</span>
                  <p className="text-sm">No submissions yet{activityFilter !== 'all' ? ` in class ${activityFilter}` : ''}</p>
                </div>
              ) : (
                recentActivity.map(activity => {
                  const statusStyles = {
                    accepted:     { dot: 'bg-green-400',  badge: 'bg-green-500/10 text-green-400 border-green-500/20' },
                    wrong_answer: { dot: 'bg-red-400',    badge: 'bg-red-500/10 text-red-400 border-red-500/20' },
                    partial:      { dot: 'bg-amber-400',  badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                    timeout:      { dot: 'bg-orange-400', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
                    error:        { dot: 'bg-slate-500',  badge: 'bg-slate-700 text-slate-400 border-slate-600' },
                  }
                  const s = statusStyles[activity.status] || statusStyles.error
                  return (
                    <div key={activity.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-800/30 transition">
                      <div className={`w-2 h-2 rounded-full ${s.dot} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          <span className="font-semibold">{activity.student}</span>
                          <span className="text-slate-400"> submitted </span>
                          <span className="text-purple-400">{activity.problem}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {activity.subject && (
                            <span className="text-slate-500 text-xs truncate">{activity.subject}</span>
                          )}
                          {activity.section_no && (
                            <span className="px-1.5 py-0.5 bg-slate-700/60 text-slate-400 rounded text-xs font-mono shrink-0">
                              #{activity.section_no}
                            </span>
                          )}
                          <span className="text-slate-600 text-xs shrink-0">
                            {new Date(activity.submitted_at).toLocaleDateString()} · {new Date(activity.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 border ${s.badge}`}>
                        {activity.status.replace('_', ' ')}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Right col — quick actions + top performers */}
        <div className="space-y-5">

          {/* Quick Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest">Quick Actions</h2>
            </div>
            <div className="p-4 space-y-2">
              {[
                { icon: '➕', label: 'Create Activity',     sub: 'Add new challenge',         color: 'purple', path: '/instructor/create-problem' },
                { icon: '🏫', label: 'View Classes',        sub: 'Manage class list',          color: 'blue',   path: '/instructor/classes' },
                { icon: '📢', label: 'Post Announcement',   sub: 'Communicate with students',  color: 'pink',   path: '/instructor/announcements' },
              ].map(action => {
                const colors = {
                  purple: { bg: 'bg-purple-600/10 hover:bg-purple-600/20 border-purple-600/20', text: 'text-purple-400' },
                  blue:   { bg: 'bg-blue-600/10 hover:bg-blue-600/20 border-blue-600/20',       text: 'text-blue-400' },
                  pink:   { bg: 'bg-pink-600/10 hover:bg-pink-600/20 border-pink-600/20',       text: 'text-pink-400' },
                }
                const c = colors[action.color]
                return (
                  <button
                    key={action.label}
                    onClick={() => navigate(action.path)}
                    className={`w-full flex items-center gap-3 p-3.5 ${c.bg} border rounded-xl transition group text-left`}
                  >
                    <span className="text-xl group-hover:scale-110 transition-transform">{action.icon}</span>
                    <div>
                      <p className={`font-bold text-sm ${c.text}`}>{action.label}</p>
                      <p className="text-slate-500 text-xs">{action.sub}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                <span>🏆</span> Top Performers
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
                  const medals   = ['🥇', '🥈', '🥉']
                  const rankBg   = [
                    'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
                    'bg-slate-500/10  text-slate-300  border-slate-500/30',
                    'bg-orange-500/10 text-orange-400 border-orange-500/30',
                  ]
                  return (
                    <div
                      key={student.id}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        index < 3 ? 'bg-slate-800/60 border border-slate-700/50' : 'hover:bg-slate-800/30'
                      } transition`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${
                        index < 3 ? rankBg[index] : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}>
                        {index < 3 ? medals[index] : index + 1}
                      </div>
                      <div className="w-7 h-7 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0">
                        {(student.username || 'U')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{student.full_name || student.username}</p>
                        <p className="text-slate-500 text-xs">Level {student.level}</p>
                      </div>
                      <span className="text-yellow-400 font-bold text-sm tabular-nums shrink-0">{student.xp} XP</span>
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
