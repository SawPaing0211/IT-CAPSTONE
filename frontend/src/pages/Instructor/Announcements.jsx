// announcements — instructor posts updates, students see them.
// reused in two places: inside a class tab (classId passed in) and possibly
// a global feed (no classId) — fetchAnnouncements branches on that.
//
// priority = low/medium/high/urgent, just a colored label, no real logic
// tied to it. is_pinned just floats it to the top of the list.
//
// bug fixed: the Type filter dropdown had value={priorityConfig} which was
// passing the whole config object as the select value — nothing would filter.
// should be value={typeFilter} (the actual state variable). also removed the
// statusFilter state that was declared but never connected to anything.
//
// new: delete and edit per announcement. backend now has DELETE and PUT
// /api/announcements/:id routes. edit re-uses the same create form,
// just pre-fills it and sends PUT instead of POST.

import { useState, useEffect } from 'react'

export default function Announcements({ classId }) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId]           = useState(null)
  const [announcements, setAnnouncements]   = useState([])
  const [loading, setLoading]               = useState(true)
  const [submitting, setSubmitting]         = useState(false)
  const [error, setError]                   = useState(null)
  const [success, setSuccess]               = useState(null)
  const [searchTerm, setSearchTerm]         = useState('')
  const [typeFilter, setTypeFilter]         = useState('all')

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
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
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

  const openCreate = () => {
    setEditingId(null)
    setForm({ title: '', content: '', priority: 'medium', is_pinned: false })
    setError(null)
    setShowCreateForm(true)
  }

  const openEdit = (ann) => {
    setEditingId(ann.id)
    setForm({ title: ann.title, content: ann.content, priority: ann.priority, is_pinned: ann.is_pinned })
    setError(null)
    setShowCreateForm(true)
  }

  const closeForm = () => {
    setShowCreateForm(false)
    setEditingId(null)
    setError(null)
    setForm({ title: '', content: '', priority: 'medium', is_pinned: false })
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
      const url = editingId
        ? `http://localhost:5000/api/announcements/${editingId}`
        : 'http://localhost:5000/api/announcements'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:     form.title,
          content:   form.content,
          priority:  form.priority,
          is_pinned: form.is_pinned,
          class_id:  classId ?? null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save announcement')
      }
      setSuccess(editingId ? 'Announcement updated!' : 'Announcement posted!')
      closeForm()
      await fetchAnnouncements()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement? Students will no longer see it.')) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/announcements/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setAnnouncements(prev => prev.filter(a => a.id !== id))
        setSuccess('Announcement deleted.')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const priorityConfig = {
    low:    { label: 'Low',    color: 'text-slate-400',  bg: 'bg-slate-700/40',  border: 'border-slate-600' },
    medium: { label: 'Medium', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20' },
    high:   { label: 'High',   color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
    urgent: { label: 'Urgent', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20' },
  }

  const filtered = announcements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType   = typeFilter === 'all' || a.priority === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Announcements</h2>
          <p className="text-slate-400 mt-0.5 text-sm">Communicate important updates to your students</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold transition shadow-lg shadow-purple-600/20 flex items-center gap-2 text-sm"
        >
          ➕ New Announcement
        </button>
      </div>

      {success && (
        <div className="p-4 bg-green-900/30 border border-green-600/40 rounded-xl text-green-300 text-sm flex items-center gap-2">
          ✅ {success}
        </div>
      )}
      {error && !showCreateForm && (
        <div className="p-4 bg-red-900/30 border border-red-600/40 rounded-xl text-red-300 text-sm flex items-center gap-2">
          ❌ {error}
        </div>
      )}

      {/* create + edit reuse the same form — editingId tells us which mode */}
      {showCreateForm && (
        <div className="bg-slate-900 border border-purple-600/20 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">
              {editingId ? 'Edit Announcement' : 'New Announcement'}
            </h3>
            <button onClick={closeForm} className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition">
              ✕
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-900/30 border border-red-600/40 rounded-lg text-red-300 text-sm">❌ {error}</div>
          )}

          <div>
            <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Title *</label>
            <input
              type="text" name="title" value={form.title} onChange={handleChange}
              placeholder="Enter announcement title"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-purple-500/60 outline-none transition text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Priority</label>
              <select
                name="priority" value={form.priority} onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none cursor-pointer text-sm focus:border-purple-500/60 transition"
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
                  type="checkbox" name="is_pinned" checked={form.is_pinned} onChange={handleChange}
                  className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <div>
                  <p className="text-white text-sm font-medium">Pin announcement</p>
                  <p className="text-slate-500 text-xs">Shows at the top of the list</p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Content *</label>
            <textarea
              name="content" value={form.content} onChange={handleChange} rows="5"
              placeholder="Write your announcement here..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-purple-500/60 outline-none resize-none transition text-sm"
            />
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-800">
            <button onClick={closeForm} disabled={submitting} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition disabled:opacity-50 text-sm">
              Cancel
            </button>
            <button
              onClick={handleSubmit} disabled={submitting}
              className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl text-white font-bold transition flex items-center justify-center gap-2 text-sm"
            >
              {submitting
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                : editingId ? '💾 Save Changes' : '📢 Post Announcement'
              }
            </button>
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
          <input
            type="text" placeholder="Search announcements..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-white placeholder-slate-600 outline-none focus:border-purple-500/60 transition text-sm"
          />
        </div>
        <select
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 outline-none text-sm focus:border-purple-500/60 transition cursor-pointer"
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ann => {
            const pc = priorityConfig[ann.priority] || priorityConfig.medium
            return (
              <div
                key={ann.id}
                className={`bg-slate-900 border rounded-2xl p-5 hover:border-slate-700 transition ${
                  ann.is_pinned ? 'border-purple-500/30' : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {ann.is_pinned && <span className="text-purple-400 text-xs font-bold">📌 PINNED</span>}
                      <h3 className="text-base font-bold text-white">{ann.title}</h3>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${pc.bg} ${pc.color} ${pc.border}`}>
                      {pc.label}
                    </span>
                  </div>
                  <div className="flex items-start gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-slate-400 text-xs">
                        {new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">by {ann.instructor}</p>
                    </div>
                    {/* always visible — not hover-only so it works on mobile too */}
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(ann)} title="Edit" className="p-1.5 rounded-lg hover:bg-purple-500/10 text-slate-500 hover:text-purple-400 transition">✏️</button>
                      <button onClick={() => handleDelete(ann.id)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition">🗑️</button>
                    </div>
                  </div>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed">{ann.content}</p>
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="text-center py-14 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="text-5xl mb-4">📢</div>
              <p className="text-slate-300 text-lg font-semibold mb-1">
                {searchTerm || typeFilter !== 'all' ? 'No announcements match your filters' : 'No announcements yet'}
              </p>
              <p className="text-slate-500 text-sm mb-6">
                {searchTerm || typeFilter !== 'all' ? 'Try adjusting your search or filter' : 'Create your first announcement to communicate with students'}
              </p>
              {!searchTerm && typeFilter === 'all' && (
                <button onClick={openCreate} className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition text-sm">
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
