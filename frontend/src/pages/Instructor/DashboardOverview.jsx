import { useNavigate } from 'react-router-dom'

export default function DashboardOverview() {
  const navigate = useNavigate()

  // Mock Data
  const stats = [
    { label: 'Total Students', value: '42', change: '+5 this week', icon: '👥', color: 'blue' },
    { label: 'Avg Class Score', value: '84%', change: '+2% vs last week', icon: '📊', color: 'green' },
    { label: 'Pending Reviews', value: '8', change: 'Critical attention needed', icon: '⏳', color: 'orange' },
    { label: 'Active Problems', value: '12', change: '3 new this week', icon: '📝', color: 'purple' },
  ]

  const classes = [
    { id: 1, name: 'Block 301', title: 'Intro to Programming', students: 15, problems: 5, color: 'bg-blue-600' },
    { id: 2, name: 'Block 302', title: 'Data Structures', students: 12, problems: 3, color: 'bg-purple-600' },
  ]

  const recentActivity = [
    { id: 1, user: 'Ohma', action: 'submitted', target: 'Reverse String', time: '2 mins ago', status: 'Accepted' },
    { id: 2, user: 'Ganryu', action: 'failed', target: 'Fibonacci', time: '15 mins ago', status: 'Wrong Answer' },
    { id: 3, user: 'Admin', action: 'posted', target: 'Midterm Announcement', time: '1 hour ago', status: 'Info' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Instructor Dashboard</h1>
        <p className="text-slate-400">Manage your classes, problems, and student progress</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition group">
            <div className="flex justify-between items-start mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                stat.color === 'blue' ? 'bg-blue-600/20 text-blue-400' :
                stat.color === 'green' ? 'bg-green-600/20 text-green-400' :
                stat.color === 'orange' ? 'bg-orange-600/20 text-orange-400' :
                'bg-purple-600/20 text-purple-400'
              }`}>
                {stat.icon}
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                stat.change.includes('+') || stat.change.includes('Critical') ? 'text-green-400 bg-green-600/10' : 'text-slate-400 bg-slate-800'
              }`}>
                {stat.change}
              </span>
            </div>
            <h3 className="text-3xl font-bold text-white mb-1">{stat.value}</h3>
            <p className="text-slate-400 text-sm">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Classes & Activity */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* My Classes */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">My Classes</h2>
              <button onClick={() => navigate('/instructor/classes')} className="text-blue-400 text-sm hover:text-blue-300 transition">
                View All →
              </button>
            </div>
            <div className="space-y-4">
              {classes.map(cls => (
                <div key={cls.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl hover:bg-slate-800 transition cursor-pointer border border-transparent hover:border-slate-700">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 ${cls.color} rounded-xl flex items-center justify-center text-xl`}>
                      🏫
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{cls.name}</h3>
                      <p className="text-slate-400 text-sm">{cls.title}</p>
                    </div>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="text-right">
                      <p className="text-white font-bold">{cls.students}</p>
                      <p className="text-slate-500">Students</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold">{cls.problems}</p>
                      <p className="text-slate-500">Problems</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity.map(activity => (
                <div key={activity.id} className="flex items-center gap-4 pb-4 border-b border-slate-800 last:border-0 last:pb-0">
                  <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-lg">
                    {activity.status === 'Accepted' ? '✅' : activity.status === 'Wrong Answer' ? '❌' : 'ℹ️'}
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm">
                      <span className="font-bold">{activity.user}</span> {activity.action} <span className="text-blue-400">{activity.target}</span>
                    </p>
                    <p className="text-slate-500 text-xs">{activity.time}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    activity.status === 'Accepted' ? 'bg-green-600/20 text-green-400' :
                    activity.status === 'Wrong Answer' ? 'bg-red-600/20 text-red-400' :
                    'bg-blue-600/20 text-blue-400'
                  }`}>
                    {activity.status}
                  </span>
                </div>
              ))}
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

          {/* Top Performers */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Top Performers</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-yellow-600/20 text-yellow-400 rounded-full flex items-center justify-center font-bold text-xs">1</div>
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold">O</div>
                <div className="flex-1">
                  <p className="text-white text-sm font-bold">Ohma</p>
                </div>
                <span className="text-yellow-400 font-bold text-sm">1250 XP</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-slate-600/20 text-slate-400 rounded-full flex items-center justify-center font-bold text-xs">2</div>
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold">G</div>
                <div className="flex-1">
                  <p className="text-white text-sm font-bold">Ganryu</p>
                </div>
                <span className="text-slate-400 font-bold text-sm">980 XP</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-600/20 text-orange-400 rounded-full flex items-center justify-center font-bold text-xs">3</div>
                <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center text-xs font-bold">N</div>
                <div className="flex-1">
                  <p className="text-white text-sm font-bold">NewUser</p>
                </div>
                <span className="text-slate-400 font-bold text-sm">450 XP</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}