import { useState, useEffect } from 'react'

export default function Announcements({ classId }) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [statusFilter, setStatusFilter] = useState('All Status')

  const [form, setForm] = useState({
    title: '',
    content: '',
    priority: 'medium',
    is_pinned: false,
  })

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('token')
      const url = classId
        ? `http://localhost:5000/api/announcements?class_id=${classId}`
        : 'http://localhost:5000/api/announcements'
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setAnnouncements(await res.json())
    } catch (err) {
      console.error('Failed to fetch announcements:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAnnouncements() }, [classId])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/announcements', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          priority: form.priority,
          is_pinned: form.is_pinned,
          class_id: classId ?? null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to post announcement')
      }
      setSuccess('Announcement posted!')
      setForm({ title: '', content: '', priority: 'medium', is_pinned: false })
      setShowCreateForm(false)
      await fetchAnnouncements()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const priorityConfig = {
    low:    { label: 'Low',    color: 'text-slate-400',  bg: 'bg-slate-700/40',     border: 'border-slate-600' },
    medium: { label: 'Medium', color: 'text-blue-400',   bg: 'bg-blue-500/10',      border: 'border-blue-500/20' },
    high:   { label: 'High',   color: 'text-orange-400', bg: 'bg-orange-500/10',    border: 'border-orange-500/20' },
    urgent: { label: 'Urgent', color: 'text-red-400',    bg: 'bg-red-500/10',       border: 'border-red-500/20' },
  }

  const filtered = announcements.filter(a =>
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.content.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Announcements</h1>
          <p className="text-slate-400">Communicate important updates to your students</p>
        </div>
        <button
          onClick={() => { setShowCreateForm(true); setError(null) }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-600/20"
        >
          ➕ Create Announcement
        </button>
      </div>

      {/* Success / Error banners */}
      {success && (
        <div className="p-4 bg-green-900/30 border border-green-600/40 rounded-xl text-green-300 text-sm">
          ✅ {success}
        </div>
      )}
      {error && !showCreateForm && (
        <div className="p-4 bg-red-900/30 border border-red-600/40 rounded-xl text-red-300 text-sm">
          ❌ {error}
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">New Announcement</h2>
            <button
              onClick={() => { setShowCreateForm(false); setError(null) }}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-600/40 rounded-lg text-red-300 text-sm">
              ❌ {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-slate-400 text-sm mb-2">Title *</label>
            <input
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Enter announcement title"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition"
            />
          </div>

          {/* Priority + Pin row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-sm mb-2">Priority</label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none appearance-none cursor-pointer"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  name="is_pinned"
                  checked={form.is_pinned}
                  onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <div>
                  <p className="text-white text-sm font-medium">Pin announcement</p>
                  <p className="text-slate-500 text-xs">Shows at the top of the list</p>
                </div>
              </label>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-slate-400 text-sm mb-2">Content *</label>
            <textarea
              name="content"
              value={form.content}
              onChange={handleChange}
              rows="6"
              placeholder="Write your announcement here..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none resize-none transition"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-slate-800">
            <button
              onClick={() => { setShowCreateForm(false); setError(null) }}
              disabled={submitting}
              className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl text-white font-bold transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {submitting
                ? (<><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Posting...</>)
                : '📢 Post Announcement'}
            </button>
          </div>
        </div>
      )}

      {/* Search / Filter bar */}
      <div className="flex gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
        <input
          type="text"
          placeholder="Search announcements..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-600 outline-none focus:border-blue-500/60 transition text-sm"
        />
        <select
          value={priorityConfig}
          onChange={e => setTypeFilter(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white outline-none text-sm"
        >
          <option>All Types</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(ann => {
            const pc = priorityConfig[ann.priority] || priorityConfig.medium
            return (
              <div
                key={ann.id}
                className={`bg-slate-900 border rounded-2xl p-6 hover:border-slate-700 transition ${
                  ann.is_pinned ? 'border-blue-500/30' : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {ann.is_pinned && (
                        <span className="text-blue-400 text-xs font-bold">📌 PINNED</span>
                      )}
                      <h3 className="text-lg font-bold text-white">{ann.title}</h3>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${pc.bg} ${pc.color} ${pc.border}`}>
                        {pc.label}
                      </span>
                      <span className="px-2.5 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-bold">
                        Published
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-slate-400 text-xs">
                      {new Date(ann.created_at).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">by {ann.instructor}</p>
                  </div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{ann.content}</p>
              </div>
            )
          })}

          {filtered.length === 0 && !loading && (
            <div className="text-center py-14 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="text-5xl mb-4">📢</div>
              <p className="text-slate-300 text-lg font-semibold mb-1">
                {searchTerm ? 'No announcements match your search' : 'No announcements yet'}
              </p>
              <p className="text-slate-500 text-sm mb-6">
                {searchTerm ? 'Try different keywords' : 'Create your first announcement to communicate with students'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition"
                >
                  Create Announcement
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}