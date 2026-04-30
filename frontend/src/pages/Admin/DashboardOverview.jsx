import { useState, useEffect } from 'react'

export default function DashboardOverview() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/dashboard-stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Today's Logins"
          value={stats?.today_logins || 156}
          icon="📈"
          trend="+12%"
          color="green"
        />
        <StatCard
          title="Submissions"
          value={stats?.today_submissions || 89}
          icon="📝"
          trend="+5%"
          color="blue"
        />
        <StatCard
          title="Avg Response"
          value="2.3s"
          icon="⏱️"
          trend="-8%"
          color="yellow"
        />
        <StatCard
          title="Success Rate"
          value="98%"
          icon="✅"
          trend="+2%"
          color="green"
        />
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <UserStatCard
          title="Total Students"
          value={stats?.total_students || 1}
          subtitle="Active student accounts"
          icon="🎓"
          trend="+12%"
        />
        <UserStatCard
          title="Total Instructors"
          value={stats?.total_instructors || 2}
          subtitle="Active instructor accounts"
          icon="👨‍"
          trend="+5%"
        />
        <UserStatCard
          title="Total Blocks"
          value={stats?.total_blocks || 1}
          subtitle="Class sections"
          icon="📚"
          trend="+8%"
        />
        <UserStatCard
          title="Active Sessions"
          value={stats?.active_sessions || 24}
          subtitle="Current active users"
          icon="👥"
          trend="-3%"
          trendDown
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-900/80 rounded-2xl border border-purple-600/30 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            icon="👤"
            title="Create New User"
            description="Add students or instructors"
            color="blue"
          />
          <QuickActionCard
            icon="📚"
            title="Create New Block"
            description="Set up class sections"
            color="purple"
          />
          <QuickActionCard
            icon="💾"
            title="Backup Database"
            description="Create system backup"
            color="green"
          />
          <QuickActionCard
            icon="⚙️"
            title="System Settings"
            description="Configure system options"
            color="orange"
          />
        </div>
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-900/80 rounded-2xl border border-purple-600/30 p-6">
          <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {stats?.recent_activity?.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-600/30 rounded-lg flex items-center justify-center">
                    ⚙️
                  </div>
                  <div>
                    <p className="font-semibold text-white">{activity.user}</p>
                    <p className="text-xs text-slate-400">{activity.action}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400">{activity.details}</p>
                  <p className="text-xs text-slate-500">{new Date(activity.created_at).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900/80 rounded-2xl border border-purple-600/30 p-6">
          <h3 className="text-xl font-bold text-white mb-4">System Status</h3>
          <div className="space-y-4">
            <StatusItem label="Database" status="Connected" color="green" />
            <StatusItem label="API Server" status="Operational" color="green" />
            <StatusItem label="Last Backup" status="Apr 20, 08:59 PM" color="yellow" />
            <StatusItem label="Uptime" status="99.9%" color="green" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, trend, color, trendDown }) {
  const colors = {
    green: 'from-green-600/20 to-emerald-600/20 border-green-600/30',
    blue: 'from-blue-600/20 to-cyan-600/20 border-blue-600/30',
    yellow: 'from-yellow-600/20 to-orange-600/20 border-yellow-600/30',
    purple: 'from-purple-600/20 to-pink-600/20 border-purple-600/30'
  }

  return (
    <div className={`bg-gradient-to-b ${colors[color]} backdrop-blur p-6 rounded-2xl border-2`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-slate-400 text-sm mb-1">{title}</p>
          <p className="text-3xl font-black text-white">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`flex items-center gap-1 text-sm font-bold ${trendDown ? 'text-red-400' : 'text-green-400'}`}>
        <span>{trendDown ? '↓' : '↑'}</span>
        <span>{trend}</span>
      </div>
    </div>
  )
}

function UserStatCard({ title, value, subtitle, icon, trend, trendDown }) {
  return (
    <div className="bg-slate-900/80 rounded-2xl border border-purple-600/30 p-6 hover:border-purple-600/50 transition">
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 bg-purple-600/30 rounded-xl flex items-center justify-center text-2xl">
          {icon}
        </div>
        <span className={`text-sm font-bold ${trendDown ? 'text-red-400' : 'text-green-400'}`}>
          {trendDown ? '↓' : '↑'} {trend}
        </span>
      </div>
      <p className="text-3xl font-black text-white mb-1">{value}</p>
      <p className="text-slate-400 text-sm mb-2">{title}</p>
      <p className="text-slate-500 text-xs">{subtitle}</p>
    </div>
  )
}

function QuickActionCard({ icon, title, description, color }) {
  const colors = {
    blue: 'from-blue-600/20 to-cyan-600/20 border-blue-600/30 hover:border-blue-600/50',
    purple: 'from-purple-600/20 to-pink-600/20 border-purple-600/30 hover:border-purple-600/50',
    green: 'from-green-600/20 to-emerald-600/20 border-green-600/30 hover:border-green-600/50',
    orange: 'from-orange-600/20 to-red-600/20 border-orange-600/30 hover:border-orange-600/50'
  }

  return (
    <div className={`bg-gradient-to-b ${colors[color]} backdrop-blur p-5 rounded-xl border-2 cursor-pointer transition-all hover:transform hover:scale-105`}>
      <div className="text-3xl mb-3">{icon}</div>
      <h4 className="font-bold text-white mb-1">{title}</h4>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  )
}

function StatusItem({ label, status, color }) {
  const colors = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400'
  }

  return (
    <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
      <span className="text-slate-400">{label}</span>
      <span className={`font-bold ${colors[color]}`}>{status}</span>
    </div>
  )
}