import { useState } from 'react'

export default function Analytics() {
  const [timeRange, setTimeRange] = useState('Last Month')

  // Enhanced Mock Data with More Details
  const performanceTrend = [
    { day: 'Mon', current: 65, previous: 58 },
    { day: 'Tue', current: 68, previous: 60 },
    { day: 'Wed', current: 72, previous: 65 },
    { day: 'Thu', current: 70, previous: 62 },
    { day: 'Fri', current: 75, previous: 70 },
    { day: 'Sat', current: 78, previous: 72 },
    { day: 'Sun', current: 82, previous: 74 }
  ]

  const topPerformers = [
    { rank: 1, name: 'Christian Rejano', avatar: 'M', color: 'bg-blue-500', xp: 1450, level: 7, solved: 42, streak: 5 },
    { rank: 2, name: 'Niño Sasan ', avatar: 'J', color: 'bg-slate-600', xp: 1200, level: 6, solved: 38, streak: 3 },
    { rank: 3, name: 'King Kakazu', avatar: 'D', color: 'bg-orange-500', xp: 950, level: 5, solved: 35, streak: 7 },
    { rank: 4, name: 'Iverson Flores', avatar: 'R', color: 'bg-green-600', xp: 820, level: 5, solved: 30, streak: 1 },
    { rank: 5, name: 'Michael Jordan', avatar: 'D', color: 'bg-red-600', xp: 750, level: 4, solved: 28, streak: 4 }
  ]

  const challengingProblems = [
    { title: 'Arrays', difficulty: 'Easy', successRate: 42, attempts: 312, avgTime: '12 min', hintUsage: '15%' },
    { title: 'Looping', difficulty: 'Medium', successRate: 35, attempts: 245, avgTime: '18 min', hintUsage: '25%' },
    { title: 'If-Else Statements', difficulty: 'Hard', successRate: 28, attempts: 189, avgTime: '24 min', hintUsage: '40%' }
  ]

  const activityHeatmap = [
    { hour: '0:00', subs: 12 },
    { hour: '4:00', subs: 5 },
    { hour: '8:00', subs: 45 },
    { hour: '12:00', subs: 89 },
    { hour: '16:00', subs: 67 },
    { hour: '20:00', subs: 95 }
  ]

  const aiInsights = [
    { icon: '💡', title: 'Consider adding more practice problems', desc: 'Students are completing assignments quickly', type: 'suggestion' },
    { icon: '⚠️', title: '2 students need attention', desc: 'Low activity detected in Block 302', type: 'warning' },
    { icon: '🎉', title: 'Great engagement!', desc: 'Class average improved by 17%', type: 'positive' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Class Analytics</h1>
          <p className="text-slate-400">Performance insights and trend analysis</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition flex items-center gap-2">
            <span>📄</span> PDF Report
          </button>
          <button className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-white font-bold transition flex items-center gap-2">
            <span>📥</span> Export
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <select className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none">
          <option>All Blocks</option>
          <option>Block 301</option>
          <option>Block 302</option>
        </select>
        <select className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none">
          <option>No Comparison</option>
          <option>Compare with Last Period</option>
        </select>
        <select 
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none"
        >
          <option>Last Week</option>
          <option>Last Month</option>
          <option>Last Semester</option>
        </select>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-2xl">👥</div>
            <span className="text-green-400 text-xs font-bold">+5 this week</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">42</p>
          <p className="text-slate-400 text-sm">Total Students</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-green-600/20 rounded-xl flex items-center justify-center text-2xl">📊</div>
            <span className="text-green-400 text-xs font-bold">+2% vs last week</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">78.5%</p>
          <p className="text-slate-400 text-sm">Class Average</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-yellow-600/20 rounded-xl flex items-center justify-center text-2xl">✅</div>
            <span className="text-red-400 text-xs font-bold">-3% vs last week</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">85%</p>
          <p className="text-slate-400 text-sm">Completion Rate</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="w-12 h-12 bg-purple-600/20 rounded-xl flex items-center justify-center text-2xl">📝</div>
            <span className="text-green-400 text-xs font-bold">+2 new this week</span>
          </div>
          <p className="text-3xl font-bold text-white mb-1">12</p>
          <p className="text-slate-400 text-sm">Active Problems</p>
        </div>
      </div>

      {/* AI Insights */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-600/30 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          AI Insights & Recommendations
        </h2>
        <div className="space-y-3">
          {aiInsights.map((insight, idx) => (
            <div key={idx} className={`flex items-start gap-3 p-4 rounded-xl ${
              insight.type === 'warning' ? 'bg-red-900/20 border border-red-600/30' :
              insight.type === 'positive' ? 'bg-green-900/20 border border-green-600/30' :
              'bg-slate-900/50'
            }`}>
              <span className="text-xl">{insight.icon}</span>
              <div>
                <p className="text-white font-medium">{insight.title}</p>
                <p className="text-slate-400 text-sm">{insight.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Trend - FIXED with proper height */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-xl">📈</span>
              Performance Trend
            </h2>
            <span className="text-green-400 font-bold text-sm">+17% Overall Improvement</span>
          </div>
          
          <div className="relative h-72 w-full flex items-end justify-between gap-4 px-2 pb-6 border-b border-slate-800">
            {/* Legend */}
            <div className="absolute top-0 right-0 flex gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gradient-to-b from-purple-500 to-blue-600 rounded-sm"></div>
                <span className="text-slate-300">This Month</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-700 rounded-sm"></div>
                <span className="text-slate-500">Last Month</span>
              </div>
            </div>

            {performanceTrend.map((data, idx) => (
              <div key={idx} className="flex-1 flex flex-col justify-end items-center gap-2 group">
                
                {/* Bar Container */}
                <div className="w-full flex items-end justify-center gap-1 h-60 relative">
                  
                  {/* Previous Month (Background Bar) */}
                  <div 
                    className="w-2/5 bg-slate-700/50 rounded-t-md transition-all duration-500"
                    style={{ height: `${data.previous}%` }}
                  ></div>

                  {/* Current Month (Foreground Bar) */}
                  <div 
                    className="w-2/5 bg-gradient-to-t from-blue-600 to-purple-500 rounded-t-md shadow-lg transition-all duration-500 hover:opacity-80 relative"
                    style={{ height: `${data.current}%` }}
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-20 border border-slate-700">
                      {data.current}% Avg
                    </div>
                  </div>
                </div>

                {/* Day Label */}
                <span className="text-slate-500 text-xs font-medium mt-2">{data.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers - Anime Edition */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="text-xl">🏆</span>
            Top Performers
          </h2>
          <div className="space-y-4">
            {topPerformers.map((student) => (
              <div key={student.rank} className={`flex items-center gap-4 p-4 rounded-xl transition ${
                student.rank <= 3 ? 'bg-slate-800/80 border border-slate-700' : 'bg-slate-800/40'
              }`}>
                <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-full ${
                  student.rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500' : 
                  student.rank === 2 ? 'bg-slate-400/20 text-slate-300 border border-slate-400' :
                  student.rank === 3 ? 'bg-orange-600/20 text-orange-400 border border-orange-600' : 
                  'bg-slate-700 text-slate-400'
                }`}>
                  {student.rank}
                </div>
                <div className={`w-10 h-10 ${student.color} rounded-full flex items-center justify-center font-bold shadow-lg`}>
                  {student.avatar}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white">{student.name}</p>
                    {student.streak >= 5 && (
                      <span className="text-xs text-red-400 font-bold bg-red-600/20 px-1.5 py-0.5 rounded">
                        🔥 {student.streak}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs">Level {student.level} • {student.solved} Problems Solved</p>
                </div>
                <div className="text-right">
                  <p className="text-yellow-400 font-bold">{student.xp} XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Most Challenging - Enhanced Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-lg">📊</span>
            Most Challenging
          </h3>
          <div className="space-y-5">
            {challengingProblems.map((problem, idx) => (
              <div key={idx} className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-white font-bold">{problem.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                      <span>⏱️ {problem.avgTime}</span>
                      <span>👁️ {problem.hintUsage} Hints</span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    problem.difficulty === 'Hard' ? 'bg-red-600/20 text-red-400' : 
                    problem.difficulty === 'Medium' ? 'bg-yellow-600/20 text-yellow-400' : 
                    'bg-green-600/20 text-green-400'
                  }`}>
                    {problem.difficulty}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-slate-500 w-12">Success</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-green-500 rounded-full" 
                      style={{ width: `${problem.successRate}%` }} 
                    />
                  </div>
                  <span className="text-xs text-white font-bold w-8 text-right">{problem.successRate}%</span>
                </div>
                <div className="text-xs text-slate-500 text-right">{problem.attempts} Attempts</div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Heatmap */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="text-lg">🔥</span>
            Activity Heatmap
          </h3>
          <div className="flex justify-between text-xs text-slate-500 mb-3">
            <span>Low Activity</span>
            <span>High Activity</span>
          </div>
          <div className="space-y-3">
            {activityHeatmap.map((time, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-slate-500 text-xs w-10 font-mono">{time.hour}</span>
                <div className="flex-1 flex gap-1">
                  {[...Array(7)].map((_, dayIdx) => {
                    // Simulate random intensity for visual variety
                    const intensity = Math.min(5, Math.max(0, Math.floor(time.subs / 20) + (Math.random() * 2 - 1)))
                    return (
                      <div
                        key={dayIdx}
                        className={`flex-1 h-6 rounded transition-colors hover:ring-1 ring-white ${
                          intensity <= 1 ? 'bg-slate-800' :
                          intensity <= 2 ? 'bg-blue-900/50' :
                          intensity <= 3 ? 'bg-blue-600/60' :
                          'bg-yellow-500'
                        }`}
                        title={`Hour ${time.hour}: ${Math.floor(time.subs * (intensity / 5))} submissions`}
                      />
                    )
                  })}
                </div>
                <span className="text-xs text-slate-600 w-6 text-right">{time.subs}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between text-xs">
            <span className="text-slate-400">Peak Hours:</span>
            <span className="text-yellow-400 font-bold">12:00 - 20:00</span>
          </div>
        </div>
        
        {/* At Risk Students */}
        <div className="bg-red-900/10 border border-red-600/30 rounded-2xl p-6">
           <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
             <span className="text-lg">⚠️</span>
             Needs Attention
           </h3>
           <div className="space-y-4">
             <div className="flex items-center gap-3 p-3 bg-red-950/30 rounded-lg border border-red-900/50">
               <div className="w-10 h-10 bg-red-600/20 rounded-full flex items-center justify-center text-xl">😰</div>
               <div>
                 <p className="text-white font-bold text-sm">2 Students At-Risk</p>
                 <p className="text-red-400 text-xs">0 submissions in last 7 days</p>
               </div>
             </div>
             <div className="p-3 bg-slate-800/50 rounded-lg">
               <p className="text-slate-300 text-sm font-bold mb-2">Recent Struggles</p>
               <div className="flex justify-between text-xs text-slate-500 mb-1">
                 <span>If-Else Problems</span>
                 <span>15% Success</span>
               </div>
               <div className="h-1 bg-slate-700 rounded-full">
                 <div className="h-full w-[15%] bg-red-500 rounded-full"></div>
               </div>
             </div>
             <button className="w-full py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded-lg text-red-400 font-medium transition text-sm">
               View All At-Risk Students
             </button>
           </div>
        </div>
      </div>
    </div>
  )
}