// Announcements for one specific subject — students only read these,
// no create/edit/delete (that's instructor-only). Reuses the same
// /api/announcements?class_id=X endpoint the instructor side already
// uses, since it's already correctly scoped and open to any logged-in
// user to read.

import { useState, useEffect } from 'react'
import { api } from '../../api/client'

export default function StudentAnnouncements({ classId, blockName }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true)
      try {
        const data = await api.get(`/api/announcements?class_id=${classId}`)
        setAnnouncements(data)
      } catch (err) {
        console.error('Failed to fetch announcements:', err)
      } finally {
        setLoading(false)
      }
    }
    if (classId) fetchAnnouncements()
  }, [classId])

  const priorityConfig = {
    low:    { label: 'Low',    color: 'text-slate-400',  bg: 'bg-slate-700/40',  border: 'border-slate-600' },
    medium: { label: 'Medium', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
    high:   { label: 'High',   color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    urgent: { label: 'Urgent', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
  }

  if (loading) {
    return (
      <div className="text-center py-20 text-purple-300 animate-pulse">
        Loading announcements...
      </div>
    )
  }

  if (announcements.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">📢</div>
          <h2 className="text-2xl font-bold text-white mb-2">No Announcements Yet</h2>
          <p className="text-slate-400">
            Your instructor hasn't posted anything for {blockName} yet.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span>📢</span> Announcements
        </h2>
        <p className="text-slate-400 text-sm mt-1">Updates from your instructor for {blockName}</p>
      </div>

      {announcements.map(a => {
        const pc = priorityConfig[a.priority] || priorityConfig.medium
        return (
          <div
            key={a.id}
            className={`bg-slate-900 border rounded-xl p-5 transition ${
              a.is_pinned ? 'border-purple-500/50 shadow-lg shadow-purple-900/20' : 'border-slate-800'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                {a.is_pinned && <span className="text-purple-400 text-sm">📌</span>}
                <span className={`px-2 py-0.5 rounded text-xs font-bold border ${pc.bg} ${pc.color} ${pc.border}`}>
                  {pc.label}
                </span>
              </div>
              <span className="text-slate-500 text-xs shrink-0">
                {new Date(a.created_at).toLocaleDateString()}
              </span>
            </div>
            <h3 className="text-white font-bold text-lg mb-1">{a.title}</h3>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{a.content}</p>
            <p className="text-slate-500 text-xs mt-3">👨‍🏫 {a.instructor}</p>
          </div>
        )
      })}
    </div>
  )
}