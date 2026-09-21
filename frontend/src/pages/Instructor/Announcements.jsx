// announcements — instructor posts updates, students see them.
// reused in two places: inside a class tab (classId passed in), and the
// standalone /instructor/announcements route (Dashboard Quick Actions →
// "Post Announcement"), which has no class context of its own — that route
// makes the instructor pick one of their classes first (via the shared
// ClassPicker) before showing the composer, so every announcement always
// ends up scoped to a real class. There used to be a "no class_id" global
// path here that broadcast to every student on the platform; nothing
// legitimately used it, so it's gone — pickedClass below is what replaces it.
//
// priority = low/medium/high/urgent, just a colored label, no real logic
// tied to it. is_pinned just floats it to the top of the list.
//
// the Type filter dropdown used to bind to the wrong variable so filtering
// never worked, uses typeFilter now. also removed an unused statusFilter state.
//
// edit re-uses the same create form, just pre-filled, sends PUT instead of POST

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ClassPicker from '../../components/ClassPicker'
import MobileSheet from '../../components/MobileSheet'
import { API_BASE } from '../../api/client'

export default function Announcements({ classId }) {
  const navigate = useNavigate()
  // only used on the standalone route (no classId prop) — the class the
  // instructor picked before the composer/list is shown
  const [pickedClass, setPickedClass] = useState(null)
  const effectiveClassId = classId ?? pickedClass?.id

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId]           = useState(null)
  const [announcements, setAnnouncements]   = useState([])
  const [loading, setLoading]               = useState(true)
  const [submitting, setSubmitting]         = useState(false)
  const [error, setError]                   = useState(null)
  const [success, setSuccess]               = useState(null)
  const [searchTerm, setSearchTerm]         = useState('')
  const [typeFilter, setTypeFilter]         = useState('all')
  const [showTypeFilter, setShowTypeFilter] = useState(false)
  const typeFilterRef = useRef(null)
  const [deleteTarget, setDeleteTarget]     = useState(null)

  const [form, setForm] = useState({
    title: '',
    content: '',
    priority: 'medium',
    is_pinned: false,
  })

  // Fetch announcements for the effective class
  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/announcements?class_id=${effectiveClassId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) setAnnouncements(await res.json())
    } catch (err) {
      console.error('Failed to fetch announcements:', err)
    } finally {
      setLoading(false)
    }
  }

  // Re-fetch announcements whenever the effective class changes. On the
  // standalone route there's nothing to fetch yet until a class is picked.
  useEffect(() => {
    if (effectiveClassId != null) fetchAnnouncements()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveClassId])

  // Sync a form field's value or checked state into state
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  // Open the form in create mode with a blank announcement
  const openCreate = () => {
    setEditingId(null)
    setForm({ title: '', content: '', priority: 'medium', is_pinned: false })
    setError(null)
    setShowCreateForm(true)
  }

  // Open the form pre-filled with an existing announcement's data
  const openEdit = (ann) => {
    setEditingId(ann.id)
    setForm({ title: ann.title, content: ann.content, priority: ann.priority, is_pinned: ann.is_pinned })
    setError(null)
    setShowCreateForm(true)
  }

  // Close the create/edit form and reset it
  const closeForm = () => {
    setShowCreateForm(false)
    setEditingId(null)
    setError(null)
    setForm({ title: '', content: '', priority: 'medium', is_pinned: false })
  }

  // Create or update the announcement depending on which mode the form is in
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
        ? `${API_BASE}/api/announcements/${editingId}`
        : `${API_BASE}/api/announcements`
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:     form.title,
          content:   form.content,
          priority:  form.priority,
          is_pinned: form.is_pinned,
          class_id:  effectiveClassId,
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

  // Open the delete confirmation modal for an announcement
  const handleDelete = (ann) => {
    setDeleteTarget(ann)
  }

  // Delete the announcement pending confirmation
  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/announcements/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        setAnnouncements(prev => prev.filter(a => a.id !== deleteTarget.id))
        setSuccess('Announcement deleted.')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setDeleteTarget(null)
    }
  }

  const priorityConfig = {
    low:    { label: 'Low',    color: 'text-slate-400',  bg: 'bg-slate-700/40',  border: 'border-slate-600',     selectedBorder: 'border-slate-400' },
    medium: { label: 'Medium', color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   selectedBorder: 'border-blue-500' },
    high:   { label: 'High',   color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', selectedBorder: 'border-orange-500' },
    urgent: { label: 'Urgent', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    selectedBorder: 'border-red-500' },
  }

  // Filter announcements by search term and priority
  const filtered = announcements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType   = typeFilter === 'all' || a.priority === typeFilter
    return matchesSearch && matchesType
  })

  // Standalone route (no classId prop) and no class picked yet — make the
  // instructor choose one of their classes before anything else renders.
  // This is what keeps class_id from ever being sent as null.
  if (classId == null && !pickedClass) {
    return (
      <ClassPicker
        onSelect={(cls) => setPickedClass(cls)}
        onCancel={() => navigate(-1)}
        actionLabel="Post Announcement — Choose a Class"
        actionIcon="📢"
        prompt="Which class is this announcement for?"
      />
    )
  }

  return (
    <div className="space-y-6">

      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Announcements</h2>
          <p className="text-slate-400 mt-0.5 text-sm flex items-center gap-1.5 flex-wrap">
            <span>Communicate important updates to your students</span>
            {/* only shown on the standalone route — classId prop already pins the tab to one class */}
            {classId == null && pickedClass && (
              <>
                <span className="text-slate-700">·</span>
                <button
                  onClick={() => { setPickedClass(null); setAnnouncements([]); setLoading(true) }}
                  className="text-purple-400 hover:text-purple-300 font-semibold transition"
                >
                  {pickedClass.name} (change)
                </button>
              </>
            )}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold transition shadow-lg shadow-purple-600/20 flex items-center gap-2 text-sm"
        >
          📢 New Announcement
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
        <div className="bg-slate-900 border border-purple-600/20 rounded-2xl p-4 sm:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{editingId ? '✏️' : '📢'}</span>
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

          <div>
            <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Priority</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(priorityConfig).map(([key, pc]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, priority: key }))}
                  className={`py-2.5 rounded-xl text-sm font-bold border-2 transition ${
                    form.priority === key
                      ? `${pc.bg} ${pc.color} ${pc.selectedBorder}`
                      : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {pc.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`p-4 border rounded-xl transition ${
            form.is_pinned
              ? 'bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-purple-600/30'
              : 'bg-slate-800/40 border-slate-700'
          }`}>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">📌</span>
                  <span className="text-white font-bold text-sm">Pin announcement</span>
                </div>
                <p className="text-slate-400 text-xs mt-1">Shows at the top of the list</p>
              </div>
              <input
                type="checkbox" name="is_pinned" checked={form.is_pinned} onChange={handleChange}
                className="w-6 h-6 rounded border-slate-600 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
            </label>
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
        <div ref={typeFilterRef} className="relative shrink-0">
          <button
            onClick={() => setShowTypeFilter(v => !v)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 text-sm transition"
          >
            <span>{typeFilter === 'all' ? 'All Priorities' : priorityConfig[typeFilter]?.label}</span>
            <span className="text-slate-500 text-[10px]">▼</span>
          </button>
          <MobileSheet show={showTypeFilter} onClose={() => setShowTypeFilter(false)} widthClass="sm:w-48" anchorRef={typeFilterRef}>
            <div className="py-2">
              {[{ key: 'all', label: 'All Priorities' }, ...Object.entries(priorityConfig).map(([key, pc]) => ({ key, label: pc.label }))].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => { setTypeFilter(opt.key); setShowTypeFilter(false) }}
                  className={`w-full px-4 py-2.5 text-left text-sm transition ${
                    typeFilter === opt.key ? 'text-purple-300 bg-purple-600/10 font-semibold' : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </MobileSheet>
        </div>
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
                      <button onClick={() => handleDelete(ann)} title="Delete" className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition">🗑️</button>
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

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border-2 border-red-600/40 rounded-2xl w-full max-w-sm shadow-2xl shadow-red-900/30 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl">
                📢
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Delete Announcement?</h3>
              <p className="text-slate-400 text-sm">
                Delete <span className="text-white font-semibold">"{deleteTarget.title}"</span>? Students will no longer see it.
              </p>
            </div>
            <div className="flex gap-3 p-4 pt-0">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold transition text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
