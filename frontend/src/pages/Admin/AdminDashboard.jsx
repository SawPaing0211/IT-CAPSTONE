import { useState, useEffect } from 'react'
import DashboardOverview from './DashboardOverview'
import UserManagement from './UserManagement'
import InstructorAssignments from './InstructorAssignments'
import ActivityLogs from './ActivityLogs'
import SubjectsManagement from './SubjectsManagement'
import SectionsManagement from './SectionsManagement'

export default function AdminDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      if (window.innerWidth < 1024) setSidebarOpen(false)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Listen for navigate-tab events dispatched by DashboardOverview quick actions
  useEffect(() => {
    const handler = e => setActiveTab(e.detail)
    window.addEventListener('navigate-tab', handler)
    return () => window.removeEventListener('navigate-tab', handler)
  }, [])

  const tabs = [
    { id: 'dashboard',    label: 'Dashboard',              icon: '📊' },
    { id: 'sections',     label: 'Class Codes',             icon: '🗂️' },
    { id: 'users',        label: 'User Management',         icon: '👥' },
    { id: 'assignments',  label: 'Instructor Assignments',  icon: '👨‍🏫' },
    { id: 'activity',     label: 'Activity Logs',           icon: '📜' },
  ]

  const tabDescriptions = {
    dashboard:   'System overview and quick actions',
    sections:    'Manage class codes, schedules, and student enrollment',
    users:       'Manage students, instructors, and administrators',
    assignments: 'Manage instructor subject and class code assignments',
    subjects:    'Create and manage course subjects',
    activity:    'Comprehensive audit trail of all administrative actions',
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full bg-slate-900/95 backdrop-blur-xl border-r border-purple-600/30 transition-all duration-300 z-50 ${
        sidebarOpen ? 'w-64' : 'w-20'
      } ${isMobile && !sidebarOpen ? '-translate-x-full' : 'translate-x-0'}`}>

        {/* Logo */}
        <div className="p-6 border-b border-purple-600/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-purple-600/50 flex-shrink-0">
              👑
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <h1 className="font-black text-base bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Forge.Administrator
                </h1>
                <p className="text-xs text-slate-400">Administrator Control</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                if (isMobile) setSidebarOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title={!sidebarOpen ? tab.label : undefined}
            >
              <span className="text-xl flex-shrink-0">{tab.icon}</span>
              {sidebarOpen && <span className="font-medium whitespace-nowrap">{tab.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-purple-600/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden flex-1">
                <p className="font-semibold text-sm truncate">{user?.username || 'Admin'}</p>
                <p className="text-xs text-slate-400 truncate">Administrator</p>
              </div>
            )}
          </div>
          <button
            onClick={onLogout}
            className="w-full mt-3 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 border border-red-600/50 rounded-lg text-sm transition flex items-center justify-center gap-2 text-red-300"
          >
            <span>🚪</span>
            {sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Header */}
        <header className="bg-slate-900/80 backdrop-blur-xl border-b border-purple-600/30 px-6 lg:px-8 py-6 flex justify-between items-center sticky top-0 z-40">
          <div className="flex items-center gap-4">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition text-slate-300 lg:hidden"
              >
                ☰
              </button>
            )}
            <div>
              <h1 className="text-2xl font-black text-white mb-1">
                {tabs.find(t => t.id === activeTab)?.label}
              </h1>
              <p className="text-slate-400 text-sm hidden sm:block">
                {tabDescriptions[activeTab] || ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:flex px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition text-slate-300 items-center gap-2"
            >
              <span>{sidebarOpen ? '◀' : '▶'}</span>
              <span className="hidden xl:inline">Toggle Sidebar</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-600/50 rounded-lg transition flex items-center gap-2 text-purple-300"
              title="Refresh page"
            >
              <span>🔄</span>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </header>

        {/* Tab Content */}
        <div className="p-6 lg:p-8">
          {/* Administrator Role Banner */}
          <div className="mb-6 flex items-center gap-4 px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-900/60 via-pink-900/40 to-purple-900/60 border border-purple-500/40 shadow-lg shadow-purple-900/30">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-purple-600/40 flex-shrink-0">
              🛡️
            </div>
            <div className="flex-1">
              <h3 className="font-black text-white text-base">Administrator</h3>
              <p className="text-purple-300/80 text-xs mt-0.5">
                Full platform control — user management, academic structure (subjects, class codes, instructor assignments), system configuration, and audit logs.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 border border-purple-500/40 rounded-lg">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-green-400 text-xs font-bold">System Online</span>
            </div>
          </div>

          {activeTab === 'dashboard'   && <DashboardOverview onNavigate={tab => setActiveTab(tab)} />}
          {activeTab === 'users'       && <UserManagement />}
          {activeTab === 'assignments' && <InstructorAssignments />}
          {activeTab === 'subjects'    && <SubjectsManagement />}
          {activeTab === 'sections'    && <SectionsManagement />}
          {activeTab === 'activity'    && <ActivityLogs />}
        </div>
      </main>
    </div>
  )
}
