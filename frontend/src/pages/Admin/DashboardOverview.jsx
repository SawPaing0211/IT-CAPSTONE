import { useState, useEffect } from 'react'
import CreateUserModal from './CreateUserModal'
import CreateBlockModal from './CreateBlockModal'
import BackupDatabaseModal from './BackupDatabaseModal'
import SystemSettingsModal from './SystemSettingsModal'

export default function DashboardOverview() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  // Modal states
  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [showCreateBlockModal, setShowCreateBlockModal] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'u': e.preventDefault(); setShowCreateUserModal(true); break
          case 'b': e.preventDefault(); setShowCreateBlockModal(true); break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
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
          tooltip="Number of unique user logins in the last 24 hours. Tracks platform engagement and daily active users."
        />
        <StatCard
          title="Submissions"
          value={stats?.today_submissions || 89}
          icon="📝"
          trend="+5%"
          color="blue"
          tooltip="Total code submissions across all quests and classes. Measures student activity and platform usage. Includes Python, Java, and C#."
        />
        <StatCard
          title="Avg Response"
          value="2.3s"
          icon="⏱️"
          trend="-8%"
          color="yellow"
          tooltip="Average time to execute and grade code submissions. Measures Docker sandbox performance. Excellent: <3s, Acceptable: 3-5s, Slow: >5s."
        />
        <StatCard
          title="Success Rate"
          value="98%"
          icon="✅"
          trend="+2%"
          color="green"
          tooltip="Percentage of submissions that executed without errors or timeouts. Indicates system stability and code quality."
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

      {/* Quick Actions — FUNCTIONAL */}
      <div className="bg-slate-900/80 rounded-2xl border border-purple-600/30 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-white">Quick Actions</h3>
          <span className="text-xs text-slate-500 hidden sm:block">Keyboard: Ctrl+U (User) · Ctrl+B (Block)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            icon="👤"
            title="Create New User"
            description="Add students or instructors"
            color="blue"
            shortcut="Ctrl+U"
            onClick={() => setShowCreateUserModal(true)}
          />
          <QuickActionCard
            icon="📚"
            title="Create New Block"
            description="Set up class sections"
            color="purple"
            shortcut="Ctrl+B"
            onClick={() => setShowCreateBlockModal(true)}
          />
          <QuickActionCard
            icon="💾"
            title="Backup Database"
            description="Create system backup"
            color="green"
            onClick={() => setShowBackupModal(true)}
          />
          <QuickActionCard
            icon="⚙️"
            title="System Settings"
            description="Configure system options"
            color="orange"
            onClick={() => setShowSettingsModal(true)}
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
                    <p className="font-semibold text-white">{activity.admin || activity.user}</p>
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

      {/* ── MODALS ── */}
      {showCreateUserModal && (
        <CreateUserModal
          onClose={() => setShowCreateUserModal(false)}
          onSuccess={() => { setShowCreateUserModal(false); fetchStats() }}
        />
      )}
      {showCreateBlockModal && (
        <CreateBlockModal
          onClose={() => setShowCreateBlockModal(false)}
          onSuccess={() => { setShowCreateBlockModal(false); fetchStats() }}
        />
      )}
      {showBackupModal && (
        <BackupDatabaseModal onClose={() => setShowBackupModal(false)} />
      )}
      {showSettingsModal && (
        <SystemSettingsModal onClose={() => setShowSettingsModal(false)} />
      )}
    </div>
  )
}

function StatCard({ title, value, icon, trend, color, trendDown, tooltip }) {
  const colors = {
    green: {
      gradient: 'from-emerald-900/40 to-teal-900/40',
      border: 'border-emerald-600/30 hover:border-emerald-500/60',
      glow: 'shadow-emerald-600/20',
      text: 'text-emerald-400 group-hover:text-emerald-300',
      iconBg: 'bg-emerald-600/20',
      tooltipBorder: 'border-emerald-600/50',
      tooltipShadow: 'shadow-emerald-600/20'
    },
    blue: {
      gradient: 'from-blue-900/40 to-indigo-900/40',
      border: 'border-blue-600/30 hover:border-blue-500/60',
      glow: 'shadow-blue-600/20',
      text: 'text-blue-400 group-hover:text-blue-300',
      iconBg: 'bg-blue-600/20',
      tooltipBorder: 'border-blue-600/50',
      tooltipShadow: 'shadow-blue-600/20'
    },
    yellow: {
      gradient: 'from-amber-900/40 to-orange-900/40',
      border: 'border-amber-600/30 hover:border-amber-500/60',
      glow: 'shadow-amber-600/20',
      text: 'text-amber-400 group-hover:text-amber-300',
      iconBg: 'bg-amber-600/20',
      tooltipBorder: 'border-amber-600/50',
      tooltipShadow: 'shadow-amber-600/20'
    },
    purple: {
      gradient: 'from-purple-900/40 to-pink-900/40',
      border: 'border-purple-600/30 hover:border-purple-500/60',
      glow: 'shadow-purple-600/20',
      text: 'text-purple-400 group-hover:text-purple-300',
      iconBg: 'bg-purple-600/20',
      tooltipBorder: 'border-purple-600/50',
      tooltipShadow: 'shadow-purple-600/20'
    }
  }

  const theme = colors[color] || colors.blue;

  // Default tooltips if not provided
  const tooltips = {
    "Today's Logins": "Number of unique user logins in the last 24 hours. Tracks platform engagement and daily active users.",
    "Submissions": "Total code submissions across all quests and classes. Measures student activity and platform usage. Includes Python, Java, and C#.",
    "Avg Response": "Average time to execute and grade code submissions. Measures Docker sandbox performance. Excellent: <3s, Acceptable: 3-5s, Slow: >5s.",
    "Success Rate": "Percentage of submissions that executed without errors or timeouts. Indicates system stability and code quality."
  }

  const description = tooltip || tooltips[title] || "System metric for monitoring platform health.";

  return (
    <div className="group relative">
      <div className={`relative bg-gradient-to-br ${theme.gradient} rounded-2xl border-2 ${theme.border} p-6 
                hover:shadow-2xl ${theme.glow} transition-all duration-300 
                hover:scale-105 hover:-translate-y-1 cursor-help overflow-visible`}>
        
        {/* Animated glow overlay */}
        <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient.replace('900', '600').replace('/40', '/10')} 
                        opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
        
        {/* Content */}
        <div className="relative flex items-start justify-between mb-4">
          <div>
            <p className="text-slate-400 text-sm font-semibold mb-1">{title}</p>
            <h3 className={`text-4xl font-black ${theme.text} transition-colors`}>
              {value}
            </h3>
          </div>
          <div className={`w-10 h-10 ${theme.iconBg} rounded-xl flex items-center justify-center 
                          group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300`}>
            <span className="text-2xl">{icon}</span>
          </div>
        </div>
        
        {/* Trend */}
        <div className="relative flex items-center gap-2">
          <span className={`${trendDown ? 'text-red-400' : 'text-green-400'} font-bold text-sm flex items-center gap-1
                          group-hover:scale-110 transition-transform`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d={trendDown ? "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" : "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"} />
            </svg>
            {trend}
          </span>
          <span className="text-slate-500 text-xs">vs yesterday</span>
        </div>
        
        {/* Tooltip - Positioned BELOW card to avoid header */}
        <div 
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 
                    opacity-0 invisible group-hover:opacity-100 group-hover:visible 
                    transition-all duration-300 z-[9999] pointer-events-none"
          style={{ 
            filter: 'drop-shadow(0 20px 25px rgba(0,0,0,0.5))'
          }}
        >
          <div className={`bg-slate-900 border ${theme.tooltipBorder} rounded-xl p-4 
                          shadow-2xl ${theme.tooltipShadow} min-w-[300px] max-w-[400px]`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`${theme.text} text-lg`}>{icon}</span>
              <p className={`${theme.text} font-bold text-sm`}>{title}</p>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">{description}</p>
            <div className="mt-2 pt-2 border-t border-slate-800">
              <p className="text-slate-500 text-xs">
                <span className={`${theme.text} font-semibold`}>💡 Tip:</span> Monitor this metric for system health
              </p>
            </div>
            {/* Arrow pointer - flipped to point UP */}
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 
                            w-4 h-4 bg-slate-900 border-l border-t border-slate-700 
                            rotate-45"></div>
          </div>
        </div>
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

function QuickActionCard({ icon, title, description, color, shortcut, onClick }) {
  const colors = {
    blue:   'from-blue-600/20 to-cyan-600/20 border-blue-600/30 hover:border-blue-500/60 hover:shadow-blue-600/20',
    purple: 'from-purple-600/20 to-pink-600/20 border-purple-600/30 hover:border-purple-500/60 hover:shadow-purple-600/20',
    green:  'from-green-600/20 to-emerald-600/20 border-green-600/30 hover:border-green-500/60 hover:shadow-green-600/20',
    orange: 'from-orange-600/20 to-red-600/20 border-orange-600/30 hover:border-orange-500/60 hover:shadow-orange-600/20',
  }
  return (
    <button
      onClick={onClick}
      className={`group relative bg-gradient-to-b ${colors[color]} backdrop-blur p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg text-left w-full`}
    >
      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">{icon}</div>
      <h4 className="font-bold text-white mb-1">{title}</h4>
      <p className="text-slate-400 text-sm">{description}</p>
      {shortcut && (
        <span className="absolute top-2 right-2 text-[10px] text-slate-600 bg-slate-800/50 px-1.5 py-0.5 rounded font-mono hidden group-hover:block">
          {shortcut}
        </span>
      )}
    </button>
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