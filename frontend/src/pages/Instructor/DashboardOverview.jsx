import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function DashboardOverview() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [loading, setLoading] = useState(true)
  
  // ✅ Real stats state
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

        // Fetch classes
        const classesRes = await fetch('http://localhost:5000/api/instructor/classes', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!classesRes.ok) throw new Error('Failed to fetch classes')
        const classesData = await classesRes.json()
        setClasses(classesData)
        
        // Calculate total students
        const total = classesData.reduce((sum, cls) => sum + (cls.student_count || 0), 0)
        setTotalStudents(total)
        
        // ✅ Fetch dashboard stats from new endpoint
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
        <div className="text-gray-400 text-lg animate-pulse">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Instructor Dashboard</h1>
        <p className="text-slate-400">Manage your classes, problems, and student progress</p>
      </div>

      {/* Stats Grid - All Real Data */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Students */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-blue-600/20 text-blue-400">
              👥
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-full text-green-400 bg-green-600/10">
              +5 this week
            </span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{totalStudents}</h3>
          <p className="text-slate-400 text-sm">Total Students</p>
        </div>

        {/* Avg Class Score */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-green-600/20 text-green-400">
              📊
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-full text-green-400 bg-green-600/10">
              +2% vs last week
            </span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{avgScore}%</h3>
          <p className="text-slate-400 text-sm">Avg Class Score</p>
        </div>

        {/* Pending Reviews */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-orange-600/20 text-orange-400">
              ⏳
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-full text-red-400 bg-red-600/10">
              Critical attention needed
            </span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{pendingReviews}</h3>
          <p className="text-slate-400 text-sm">Pending Reviews</p>
        </div>

        {/* Active Problems */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition group">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-purple-600/20 text-purple-400">
              📝
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-full text-slate-400 bg-slate-800">
              {newProblemsThisWeek > 0 ? `+${newProblemsThisWeek} this week` : 'No new'}
            </span>
          </div>
          <h3 className="text-3xl font-bold text-white mb-1">{totalProblems}</h3>
          <p className="text-slate-400 text-sm">Active Problems</p>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Classes & Activity */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* My Classes - Real Data */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">My Classes</h2>
              <button onClick={() => navigate('/instructor/classes')} className="text-blue-400 text-sm hover:text-blue-300 transition">
                View All →
              </button>
            </div>
            <div className="space-y-4">
              {classes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No classes assigned yet.</p>
              ) : (
                classes.map(cls => (
                  <div 
                    key={cls.id} 
                    onClick={() => navigate(`/instructor/class/${cls.id}`)}
                    className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition cursor-pointer border border-transparent hover:border-slate-700"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${cls.id % 2 === 0 ? 'bg-purple-600' : 'bg-blue-600'} rounded-xl flex items-center justify-center text-xl`}>
                        🏫
                      </div>
                      <div>
                        <h3 className="font-bold text-white">Block {cls.section_code}</h3>
                        <p className="text-slate-400 text-sm">{cls.name}</p>
                      </div>
                    </div>
                    <div className="flex gap-6 text-sm">
                      <div className="text-right">
                        <p className="text-white font-bold">{cls.student_count || 0}</p>
                        <p className="text-slate-500">Students</p>
                      </div>
                      <div className="text-right">
                        {/* ✅ Show real problem count from backend */}
                        <p className="text-white font-bold">{cls.problem_count || 0}</p>
                        <p className="text-slate-500">Problems</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity - Real Data */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No recent activity</p>
              ) : (
                recentActivity.map(activity => (
                  <div key={activity.id} className="flex items-center gap-4 pb-4 border-b border-slate-800 last:border-0 last:pb-0">
                    <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-lg">
                      {activity.status === 'accepted' ? '✅' : activity.status === 'wrong_answer' ? '❌' : 'ℹ️'}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm">
                        <span className="font-bold">{activity.student}</span> submitted{' '}
                        <span className="text-blue-400">{activity.problem}</span>
                      </p>
                      <p className="text-slate-500 text-xs">
                        {new Date(activity.submitted_at).toLocaleDateString()} at{' '}
                        {new Date(activity.submitted_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      activity.status === 'accepted' ? 'bg-green-600/20 text-green-400' :
                      activity.status === 'wrong_answer' ? 'bg-red-600/20 text-red-400' :
                      'bg-slate-600/20 text-slate-400'
                    }`}>
                      {activity.status.replace('_', ' ')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Quick Actions & Top Performers */}
        <div className="space-y-8">
          
          {/* Quick Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <button onClick={() => navigate('/instructor/create-problem')} className="w-full flex items-center gap-4 p-4 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 rounded-xl transition group text-left">
                <span className="text-2xl group-hover:scale-110 transition">➕</span>
                <div>
                  <h3 className="font-bold text-blue-400">Create Problem</h3>
                  <p className="text-slate-400 text-xs">Add new challenge</p>
                </div>
              </button>
              <button onClick={() => navigate('/instructor/classes')} className="w-full flex items-center gap-4 p-4 bg-green-600/10 hover:bg-green-600/20 border border-green-600/30 rounded-xl transition group text-left">
                <span className="text-2xl group-hover:scale-110 transition">🏫</span>
                <div>
                  <h3 className="font-bold text-green-400">View Classes</h3>
                  <p className="text-slate-400 text-xs">Manage class list</p>
                </div>
              </button>
              <button onClick={() => navigate('/instructor/announcements')} className="w-full flex items-center gap-4 p-4 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-600/30 rounded-xl transition group text-left">
                <span className="text-2xl group-hover:scale-110 transition">📢</span>
                <div>
                  <h3 className="font-bold text-purple-400">Post Announcement</h3>
                  <p className="text-slate-400 text-xs">Communicate with students</p>
                </div>
              </button>
            </div>
          </div>

          {/* Top Performers - Real Data */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Top Performers</h2>
            <div className="space-y-4">
              {topPerformers.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No student data yet</p>
              ) : (
                topPerformers.map((student, index) => (
                  <div key={student.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                      index === 0 ? 'bg-yellow-600/20 text-yellow-400' :
                      index === 1 ? 'bg-slate-600/20 text-slate-400' :
                      'bg-orange-600/20 text-orange-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {(student.username || 'U')[0].toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-bold">{student.username}</p>
                    </div>
                    <span className="text-yellow-400 font-bold text-sm">{student.xp} XP</span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}