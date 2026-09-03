// analytics — real per-class stats from /api/instructor/classes/:id/analytics.
// no more hardcoded numbers. all data is live from the database.
//
// shows: total students, submissions, success rate, avg XP, top performers,
// most challenging problems, activity heatmap by hour, at-risk students.
//
// "at risk" = students with zero submissions in the last 14 days.
// charts are hand-drawn with divs/bars (no recharts dependency needed).
// heatmap uses real submission timestamps grouped by hour, not Math.random().

import { useState, useEffect } from 'react'

const API = 'http://localhost:5000'

export default function Analytics({ classId }) {
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    if (!classId) return
    const fetch_ = async () => {
      setLoading(true)
      setError(null)
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${API}/api/instructor/classes/${classId}/analytics`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Failed to load analytics')
        setStats(await res.json())
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [classId])

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent" />
      <p className="text-slate-500 text-sm animate-pulse">Loading analytics...</p>
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <span className="text-4xl">⚠️</span>
      <p className="text-red-400 text-sm">{error}</p>
    </div>
  )

  if (!stats) return null

  const successRate = stats.success_rate ?? 0
  const maxHeatmap  = Math.max(...(stats.activity_heatmap?.map(h => h.submissions) || [1]), 1)

  // compute insights from real data
  const insights = []
  if (stats.at_risk_students?.length > 0) {
    insights.push({
      type: 'warning', icon: '⚠️',
      title: `${stats.at_risk_students.length} student${stats.at_risk_students.length > 1 ? 's' : ''} haven't submitted anything in 14 days`,
      desc: 'Consider reaching out — early intervention prevents students from falling too far behind.',
    })
  }
  if (stats.challenging_problems?.[0]) {
    const hardest = stats.challenging_problems[0]
    insights.push({
      type: 'suggestion', icon: '💡',
      title: `"${hardest.title}" has a ${hardest.success_rate}% success rate`,
      desc: `${hardest.attempts} attempts but only ${Math.round(hardest.attempts * hardest.success_rate / 100)} passed. Consider adding a hint or a simpler warm-up problem.`,
    })
  }
  if (stats.top_performers?.[0]) {
    insights.push({
      type: 'positive', icon: '🎉',
      title: `Top student: ${stats.top_performers[0].full_name}`,
      desc: `${stats.top_performers[0].xp} XP, ${stats.top_performers[0].solved} problems solved. ${successRate >= 70 ? 'Class is performing above passing threshold.' : 'Class average is below passing — may need extra support.'}`,
    })
  }
  if (insights.length === 0) {
    insights.push({
      type: 'suggestion', icon: '📊',
      title: 'No activity data yet',
      desc: 'Insights will appear once students start submitting.',
    })
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Analytics</h2>
          <p className="text-slate-400 mt-0.5 text-sm">Real-time performance data for this class</p>
        </div>
        <span className="text-xs text-slate-600">All data is live from the database</span>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Students',     value: stats.total_students,    icon: '👥', border: 'border-l-purple-500', text: 'text-purple-400' },
          { label: 'Submissions',  value: stats.total_submissions,  icon: '📝', border: 'border-l-blue-500',   text: 'text-blue-400' },
          { label: 'Success Rate', value: `${successRate}%`,       icon: '✅', border: successRate >= 70 ? 'border-l-green-500' : 'border-l-red-500', text: successRate >= 70 ? 'text-green-400' : 'text-red-400' },
          { label: 'Avg XP',       value: stats.avg_xp,            icon: '⭐', border: 'border-l-yellow-500', text: 'text-yellow-400' },
        ].map(c => (
          <div key={c.label} className={`bg-slate-900 border border-slate-800 border-l-4 ${c.border} rounded-xl p-4`}>
            <p className={`text-3xl font-black ${c.text} tabular-nums`}>{c.value}</p>
            <p className="text-slate-500 text-xs mt-1 flex items-center gap-1">
              <span>{c.icon}</span> {c.label}
            </p>
          </div>
        ))}
      </div>

      {/* AI Insights — computed from real data */}
      <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-600/30 rounded-2xl p-5">
        <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
          <span>🤖</span> Insights & Recommendations
          <span className="text-xs text-slate-500 font-normal ml-1">— based on real class data</span>
        </h3>
        <div className="space-y-2">
          {insights.map((ins, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${
              ins.type === 'warning'  ? 'bg-red-900/20 border border-red-600/20' :
              ins.type === 'positive' ? 'bg-green-900/20 border border-green-600/20' :
              'bg-slate-900/50 border border-slate-800'
            }`}>
              <span className="text-lg shrink-0">{ins.icon}</span>
              <div>
                <p className="text-white text-sm font-semibold">{ins.title}</p>
                <p className="text-slate-400 text-xs mt-0.5">{ins.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Top Performers */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">🏆 Top Performers</h3>
          </div>
          <div className="p-4 space-y-2">
            {stats.top_performers?.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">No submissions yet</p>
              </div>
            ) : stats.top_performers?.map((s, i) => {
              const medals = ['🥇', '🥈', '🥉']
              const rankBg = [
                'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
                'bg-slate-500/10 text-slate-300 border-slate-500/30',
                'bg-orange-500/10 text-orange-400 border-orange-500/30',
              ]
              return (
                <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl ${i < 3 ? 'bg-slate-800/60 border border-slate-700/50' : 'hover:bg-slate-800/30'} transition`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border shrink-0 ${i < 3 ? rankBg[i] : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                    {i < 3 ? medals[i] : i + 1}
                  </div>
                  <div className="w-7 h-7 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0">
                    {(s.full_name || s.username)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{s.full_name || s.username}</p>
                    <p className="text-slate-500 text-xs">Level {s.level} · {s.solved} solved</p>
                  </div>
                  <span className="text-yellow-400 font-bold text-sm tabular-nums shrink-0">{s.xp} XP</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Most Challenging Problems */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">📊 Most Challenging</h3>
          </div>
          <div className="p-4 space-y-3">
            {!stats.challenging_problems?.length ? (
              <div className="text-center py-8 text-slate-500">
                <p className="text-sm">Not enough submission data yet</p>
                <p className="text-xs mt-1">Needs at least 3 attempts per problem</p>
              </div>
            ) : stats.challenging_problems.map((p) => (
              <div key={p.problem_id} className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white text-sm font-semibold">{p.title}</p>
                    <p className="text-slate-500 text-xs">{p.attempts} attempts</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    p.difficulty === 'Hard'   ? 'bg-red-600/20 text-red-400' :
                    p.difficulty === 'Medium' ? 'bg-yellow-600/20 text-yellow-400' :
                    'bg-green-600/20 text-green-400'
                  }`}>{p.difficulty}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs w-14">Success</span>
                  <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${p.success_rate < 30 ? 'bg-red-500' : p.success_rate < 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ width: `${p.success_rate}%` }}
                    />
                  </div>
                  <span className="text-white text-xs font-bold w-10 text-right">{p.success_rate}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* Activity Heatmap */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              🔥 Submission Activity by Hour
              <span className="text-slate-600 text-xs font-normal">(all time)</span>
            </h3>
          </div>
          <div className="p-4 space-y-2.5">
            {stats.activity_heatmap?.map((h, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-slate-500 text-xs w-12 font-mono shrink-0">{h.hour}</span>
                <div className="flex-1 h-6 bg-slate-800 rounded-md overflow-hidden">
                  <div
                    className={`h-full rounded-md transition-all ${
                      h.submissions === 0 ? '' :
                      h.submissions < maxHeatmap * 0.25 ? 'bg-blue-900/60' :
                      h.submissions < maxHeatmap * 0.60 ? 'bg-blue-600/70' :
                      'bg-purple-500'
                    }`}
                    style={{ width: `${maxHeatmap > 0 ? (h.submissions / maxHeatmap) * 100 : 0}%`, minWidth: h.submissions > 0 ? '4px' : '0' }}
                  />
                </div>
                <span className="text-slate-500 text-xs w-6 text-right shrink-0">{h.submissions}</span>
              </div>
            ))}
            {stats.activity_heatmap?.every(h => h.submissions === 0) && (
              <p className="text-center text-slate-600 text-sm py-4">No submissions yet</p>
            )}
          </div>
        </div>

        {/* At-Risk Students */}
        <div className={`border rounded-2xl overflow-hidden ${
          stats.at_risk_students?.length > 0 ? 'bg-red-900/10 border-red-600/20' : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              ⚠️ Needs Attention
              <span className="text-slate-500 text-xs font-normal">— no submissions in 14 days</span>
            </h3>
          </div>
          <div className="p-4">
            {stats.at_risk_students?.length === 0 ? (
              <div className="text-center py-8">
                <span className="text-4xl block mb-2">✅</span>
                <p className="text-green-400 text-sm font-semibold">All students are active</p>
                <p className="text-slate-500 text-xs mt-1">Everyone has submitted in the last 14 days</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stats.at_risk_students.slice(0, 8).map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-red-950/20 rounded-lg border border-red-900/30">
                    <div className="w-8 h-8 bg-red-600/20 rounded-full flex items-center justify-center text-xs font-bold text-red-400 shrink-0">
                      {(s.full_name || s.username)[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{s.full_name || s.username}</p>
                      <p className="text-red-400 text-xs">Level {s.level} · {s.xp} XP</p>
                    </div>
                    <span className="text-red-400 text-xs font-bold shrink-0">Inactive</span>
                  </div>
                ))}
                {stats.at_risk_students.length > 8 && (
                  <p className="text-slate-500 text-xs text-center pt-1">+{stats.at_risk_students.length - 8} more</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
