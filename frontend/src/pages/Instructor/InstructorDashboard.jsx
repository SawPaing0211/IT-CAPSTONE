import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'

// Import all Instructor pages
import DashboardOverview from './DashboardOverview'
import MyClasses from './MyClasses'
import ProblemManagement from './ProblemManagement'
import CreateProblem from './CreateProblem'
import ClassDetail from './ClassDetail'
import Announcements from './Announcements'
import PlagiarismCheck from './PlagiarismCheck'
import Analytics from './Analytics'
import CourseMaterials from './CourseMaterials'
import InstructorAchievements from './InstructorAchievements'

export default function InstructorDashboard({ user, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  const menuItems = [
    { path: '/instructor', label: 'Dashboard', icon: '📊' },
    { path: '/instructor/classes', label: 'My Classes', icon: '🏫' },
    { path: '/instructor/achievements', label: '🏆 Achievements', icon: '🏆' },
  ]

  const isActive = (path) => {
    if (path === '/instructor') return location.pathname === '/instructor'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className={`fixed h-full bg-slate-900 border-r border-slate-800 transition-all duration-300 z-50 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-xl shadow-lg shadow-blue-600/20">
            🛡️
          </div>
          {sidebarOpen && (
            <div>
              <h1 className="font-bold text-lg text-white">Forge.Instructor</h1>
              <p className="text-xs text-slate-500">Command Center</p>
            </div>
          )}
        </div>

        <nav className="p-4 space-y-2">
          {menuItems.map(item => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive(item.path)
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="font-medium text-sm whitespace-nowrap">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <div className={`flex items-center gap-3 ${!sidebarOpen && 'justify-center'}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
              {(user?.username || 'U')[0].toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{user?.username || 'Unknown'}</p>
                <p className="text-xs text-slate-500 truncate">Instructor</p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button 
              onClick={onLogout}
              className="w-full mt-3 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 border border-red-600/20 rounded-lg text-sm text-red-400 transition flex items-center justify-center gap-2"
            >
              <span>🚪</span> Sign Out
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
        {/* Top Bar */}
        <header className="h-16 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-40">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400"
            title={sidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 relative" title="Notifications">
              🔔
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <button className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400" title="Settings">
              ⚙️
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}