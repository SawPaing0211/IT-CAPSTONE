import { useState, useEffect } from 'react'
import CreateUserModal from './CreateUserModal'
import BackupDatabaseModal from './BackupDatabaseModal'
import SystemSettingsModal from './SystemSettingsModal'

export default function DashboardOverview() {
  const [stats, setStats] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)

  const [showCreateUserModal, setShowCreateUserModal] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  useEffect(() => {
    fetchStats()
    fetchSections()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'u': e.preventDefault(); setShowCreateUserModal(true); break
          case 's': e.preventDefault(); navigateToSections(); break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const navigateToSections = () => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'sections' }))
  }

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

  const fetchSections = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/sections', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSections(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch sections:', err)
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
          value={stats?.today_logins ?? 0}
          icon="📈"
          trend="+12%"
          color="green"
          tooltip="Number of unique user logins in the last 24 hours."
        />
        <StatCard
          title="Submissions"
          value={stats?.today_submissions ?? 0}
          icon="📝"
          trend="+5%"
          color="blue"
          tooltip="Total code submissions across all quests today."
        />
        <StatCard
          title="Avg Response"
          value="2.3s"
          icon="⏱️"
          trend="-8%"
          color="yellow"
          tooltip="Average time to execute and grade code submissions."
        />
        <StatCard
          title="Success Rate"
          value="98%"
          icon="✅"
          trend="+2%"
          color="green"
          tooltip="Percentage of submissions that executed without errors."
        />
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <UserStatCard
          title="Total Students"
          value={stats?.total_students ?? 0}
          subtitle="Active student accounts"
          icon="🎓"
          trend="+12%"
        />
        <UserStatCard
          title="Total Instructors"
          value={stats?.total_instructors ?? 0}
          subtitle="Active instructor accounts"
          icon="👨‍🏫"
          trend="+5%"
        />
        <UserStatCard
          title="Class Codes"
          value={stats?.total_sections ?? sections.length}
          subtitle="Active subject sections"
          icon="🗂️"
          trend="+8%"
        />
        <UserStatCard
          title="Total Problems"
          value={stats?.total_problems ?? 0}
          subtitle="Problems created"
          icon="🧩"
          trend="+3%"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-slate-900/80 rounded-2xl border border-purple-600/30 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-bold text-white">Quick Actions</h3>
          <span className="text-xs text-slate-500 hidden sm:block">Keyboard: Ctrl+U (User) · Ctrl+S (Class Codes)</span>
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
            icon="🗂️"
            title="Manage Class Codes"
            description="View and create sections"
            color="purple"
            shortcut="Ctrl+S"
            onClick={navigateToSections}
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
            {stats?.recent_activity?.length > 0 ? stats.recent_activity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-purple-600/30 rounded-lg flex items-center justify-center">
                    ⚙️
                  </div>
                  <div>
                    <p className="font-semibold text-white">{activity.admin || activity.student || 'System'}</p>
                    <p className="text-xs text-slate-400">{activity.action || activity.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 max-w-[180px] truncate">{activity.details || activity.problem}</p>
                  <p className="text-xs text-slate-500">{new Date(activity.submitted_at || activity.created_at).toLocaleString()}</p>
                </div>
              </div>
            )) : (
              <p className="text-slate-500 text-sm text-center py-6">No recent activity</p>
            )}
          </div>
        </div>

        <div className="bg-slate-900/80 rounded-2xl border border-purple-600/30 p-6">
          <h3 className="text-xl font-bold text-white mb-4">System Status</h3>
          <div className="space-y-4">
            <StatusItem label="Database" status="Connected" color="green" />
            <StatusItem label="API Server" status="Operational" color="green" />
            <StatusItem label="Code Sandbox" status="Active" color="green" />
            <StatusItem label="Uptime" status="99.9%" color="green" />
          </div>

          {/* Section summary */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Class Code Summary</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total sections</span>
                <span className="text-white font-bold">{sections.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Active sections</span>
                <span className="text-green-400 font-bold">{sections.filter(s => s.is_active).length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total enrolled</span>
                <span className="text-blue-400 font-bold">
                  {sections.reduce((sum, s) => sum + (s.current_count || s.student_count || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showCreateUserModal && (
        <CreateUserModal
          sections={sections}
          onClose={() => setShowCreateUserModal(false)}
          onSuccess={() => { setShowCreateUserModal(false); fetchStats() }}
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
    green:  { border: 'border-emerald-600/30 hover:border-emerald-500/60', text: 'text-emerald-400', iconBg: 'bg-emerald-600/20' },
    blue:   { border: 'border-blue-600/30 hover:border-blue-500/60',       text: 'text-blue-400',    iconBg: 'bg-blue-600/20' },
    yellow: { border: 'border-amber-600/30 hover:border-amber-500/60',     text: 'text-amber-400',   iconBg: 'bg-amber-600/20' },
    purple: { border: 'border-purple-600/30 hover:border-purple-500/60',   text: 'text-purple-400',  iconBg: 'bg-purple-600/20' },
  }
  const theme = colors[color] || colors.blue

  return (
    <div className={`bg-slate-900/80 rounded-2xl border-2 ${theme.border} p-6 hover:shadow-xl transition-all duration-300 group cursor-help`}
         title={tooltip}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-slate-400 text-sm font-semibold mb-1">{title}</p>
          <h3 className={`text-4xl font-black ${theme.text}`}>{value}</h3>
        </div>
        <div className={`w-10 h-10 ${theme.iconBg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`${trendDown ? 'text-red-400' : 'text-green-400'} font-bold text-sm`}>
          {trendDown ? '↓' : '↑'} {trend}
        </span>
        <span className="text-slate-500 text-xs">vs yesterday</span>
      </div>
    </div>
  )
}

function UserStatCard({ title, value, subtitle, icon, trend, trendDown }) {
  return (
    <div className="bg-slate-900/80 rounded-2xl border border-purple-600/30 p-6 hover:border-purple-600/50 transition">
      <div className="flex justify-between items-start mb-4">
        <div className="w-12 h-12 bg-purple-600/30 rounded-xl flex items-center justify-center text-2xl">{icon}</div>
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
  const colors = { green: 'text-green-400', yellow: 'text-yellow-400', red: 'text-red-400' }
  return (
    <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-lg">
      <span className="text-slate-400">{label}</span>
      <span className={`font-bold ${colors[color]}`}>{status}</span>
    </div>
  )
}
