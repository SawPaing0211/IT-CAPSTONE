// course materials — instructor creates lessons and uploads files for students.
//
// draft = private (only instructor can see it)
// published = visible to students
//
// the advance scheduling workflow is just draft mode:
//   create week 3 lesson now → leave as Draft → students can't see it
//   when week 3 starts → click Publish → students see it immediately
//   want to hide it again → click Unpublish → back to Draft
//
// instructor can view any lesson (draft or published) by clicking the card.
// students only see published ones.
//
// fixed: block_id was hardcoded to null, now sends section_id correctly.
// fixed: NaN MB — get_lessons now returns file_size from backend.
// fixed: publish toggle now works both ways and updates local state immediately.
// added: delete lesson (with confirmation), view lesson modal, file download.

import { useState, useEffect } from 'react'

const API = 'http://localhost:5000'

// file type → icon
const fileIcon = (name = '') => {
  if (name.match(/\.pdf$/i))               return '📄'
  if (name.match(/\.(ppt|pptx)$/i))       return '📊'
  if (name.match(/\.(doc|docx)$/i))       return '📝'
  if (name.match(/\.(jpg|jpeg|png)$/i))   return '🖼️'
  if (name.match(/\.zip$/i))              return '🗜️'
  return '📎'
}

const formatSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return ''
  if (bytes < 1024)           return `${bytes} B`
  if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

// ── View Lesson Modal ─────────────────────────────────────────────────────────
function LessonModal({ lesson, onClose }) {
  const [downloading, setDownloading] = useState(null)

  const handleDownload = async (file) => {
    setDownloading(file.id)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${API}/api/lessons/${lesson.id}/files/${file.id}/download`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      if (res.ok) {
        const blob = await res.blob()
        const url  = URL.createObjectURL(blob)
        const a    = document.createElement('a')
        a.href     = url
        a.download = file.filename
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">

        <div className="flex items-start justify-between p-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-xs font-mono">
                Week {lesson.week_number}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                lesson.is_published
                  ? 'bg-green-600/10 text-green-400 border-green-600/20'
                  : 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'
              }`}>
                {lesson.is_published ? '✅ PUBLISHED — visible to students' : '📝 DRAFT — only you can see this'}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white">{lesson.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition shrink-0 ml-4"
          >✕</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Description</p>
            <p className="text-slate-300 text-sm leading-relaxed">{lesson.description}</p>
          </div>

          {lesson.files?.length > 0 && (
            <div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">
                Attached Files ({lesson.files.length})
              </p>
              <div className="space-y-2">
                {lesson.files.map(file => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 px-4 py-3 bg-slate-800 rounded-xl border border-slate-700 hover:border-purple-600/30 transition group"
                  >
                    <span className="text-xl shrink-0">{fileIcon(file.filename)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{file.filename}</p>
                      {file.file_size > 0 && (
                        <p className="text-slate-500 text-xs">{formatSize(file.file_size)}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDownload(file)}
                      disabled={downloading === file.id}
                      className="px-3 py-1.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-600/20 rounded-lg text-xs font-bold transition disabled:opacity-50 shrink-0"
                    >
                      {downloading === file.id ? '⏳' : '⬇️ Download'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(!lesson.files || lesson.files.length === 0) && (
            <div className="text-center py-8 text-slate-500">
              <span className="text-3xl mb-2 block">📭</span>
              <p className="text-sm">No files attached to this lesson</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CourseMaterials({ classId }) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [lessons, setLessons]               = useState([])
  const [loadingLessons, setLoadingLessons] = useState(true)
  const [filter, setFilter]                 = useState('all')
  const [subjects, setSubjects]             = useState([])
  const [sections, setSections]             = useState([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [loadingSections, setLoadingSections] = useState(false)
  const [viewingLesson, setViewingLesson]   = useState(null) // lesson object to show in modal

  const [formData, setFormData] = useState({
    title: '', description: '', week_number: 1,
    subject_id: '', section_id: '', is_published: false, files: []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]               = useState(null)
  const [success, setSuccess]           = useState(null)

  const token = () => localStorage.getItem('token')
  const authHeaders = () => ({ 'Authorization': `Bearer ${token()}` })

  // fetch subjects this instructor teaches
  useEffect(() => {
    fetch(`${API}/api/instructor/assigned-subjects`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(setSubjects)
      .catch(console.error)
      .finally(() => setLoadingSubjects(false))
  }, [])

  // fetch lessons
  const fetchLessons = async () => {
    setLoadingLessons(true)
    try {
      const res = await fetch(`${API}/api/lessons`, { headers: authHeaders() })
      if (res.ok) setLessons(await res.json())
    } catch (err) {
      console.error('Failed to fetch lessons:', err)
    } finally {
      setLoadingLessons(false)
    }
  }
  useEffect(() => { fetchLessons() }, [classId])

  // fetch sections when subject changes
  useEffect(() => {
    if (!formData.subject_id) { setSections([]); return }
    setLoadingSections(true)
    fetch(`${API}/api/instructor/blocks-by-subject?subject_id=${formData.subject_id}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        setSections(data)
        setFormData(prev => ({
          ...prev,
          section_id: prev.section_id && data.some(s => s.id === parseInt(prev.section_id)) ? prev.section_id : ''
        }))
      })
      .catch(console.error)
      .finally(() => setLoadingSections(false))
  }, [formData.subject_id])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleFileChange = (e) => {
    const validTypes = ['application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/msword', 'image/jpeg', 'image/png', 'application/zip']
    const files = Array.from(e.target.files).filter(
      f => validTypes.includes(f.type) && f.size <= 16 * 1024 * 1024
    )
    setFormData(prev => ({ ...prev, files: [...prev.files, ...files] }))
  }

  const removeFile = (index) => {
    setFormData(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }))
  }

  // toggle publish/unpublish — updates local state immediately so button
  // reflects new state without waiting for a full re-fetch
  const handleTogglePublish = async (lesson) => {
    const newState = !lesson.is_published
    // optimistic update — update UI immediately
    setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, is_published: newState } : l))
    try {
      const res = await fetch(`${API}/api/lessons/${lesson.id}`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: newState })
      })
      if (!res.ok) {
        // revert on failure
        setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, is_published: !newState } : l))
        setError('Failed to update lesson')
      } else {
        setSuccess(newState ? '✅ Published — students can now see this.' : 'Lesson set to Draft — hidden from students.')
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch {
      setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, is_published: !newState } : l))
      setError('Failed to update lesson')
    }
  }

  const handleDelete = async (lesson) => {
    if (!confirm(`Delete "${lesson.title}"? This also removes all attached files and cannot be undone.`)) return
    try {
      const res = await fetch(`${API}/api/lessons/${lesson.id}`, {
        method: 'DELETE',
        headers: authHeaders()
      })
      if (res.ok) {
        setLessons(prev => prev.filter(l => l.id !== lesson.id))
        setSuccess('Lesson deleted.')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError('Failed to delete lesson')
      }
    } catch {
      setError('Failed to delete lesson')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.subject_id) { setError('Please select a subject first!'); return }
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const lessonRes = await fetch(`${API}/api/lessons`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title:        formData.title,
          description:  formData.description,
          week_number:  parseInt(formData.week_number),
          subject_id:   parseInt(formData.subject_id),
          section_id:   formData.section_id ? parseInt(formData.section_id) : null,
          is_published: formData.is_published
        })
      })
      if (!lessonRes.ok) {
        const err = await lessonRes.json()
        throw new Error(err.error || 'Failed to create lesson')
      }
      const { lesson_id } = await lessonRes.json()

      // upload files one by one
      for (const file of formData.files) {
        const fd = new FormData()
        fd.append('file', file)
        await fetch(`${API}/api/lessons/${lesson_id}/files`, {
          method: 'POST',
          headers: authHeaders(),
          body: fd
        })
      }

      setSuccess(formData.is_published
        ? '✅ Lesson created and published — students can see it!'
        : '✅ Lesson saved as Draft — students cannot see it yet. Publish when ready.')
      setFormData({ title: '', description: '', week_number: 1, subject_id: '', section_id: '', is_published: false, files: [] })
      setShowCreateForm(false)
      await fetchLessons()
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredLessons = lessons
    .filter(l => {
      if (filter === 'published') return l.is_published
      if (filter === 'drafts')    return !l.is_published
      return true
    })
    .sort((a, b) => a.week_number - b.week_number)

  return (
    <div className="space-y-6">

      {viewingLesson && (
        <LessonModal lesson={viewingLesson} onClose={() => setViewingLesson(null)} />
      )}

      {/* Header */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Modules</h2>
          <p className="text-slate-400 mt-0.5 text-sm">
            Create learning materials. Keep as <span className="text-yellow-400 font-medium">Draft</span> to hide from students,{' '}
            <span className="text-green-400 font-medium">Publish</span> when the week starts.
          </p>
        </div>
        <button
          onClick={() => { setShowCreateForm(true); setError(null) }}
          className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold transition shadow-lg shadow-purple-600/20 flex items-center gap-2 text-sm"
        >
          ➕ New Module
        </button>
      </div>

      {/* Banners */}
      {success && (
        <div className="p-4 bg-green-900/30 border border-green-600/40 rounded-xl text-green-300 text-sm">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-900/30 border border-red-600/40 rounded-xl text-red-300 text-sm flex items-center justify-between gap-3">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
        </div>
      )}

      {/* Create Form */}
      {showCreateForm && (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-purple-600/20 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">New Module</h3>
            <button type="button" onClick={() => { setShowCreateForm(false); setError(null) }}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition">
              ✕
            </button>
          </div>

          {/* Title + Week */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Title *</label>
              <input
                type="text" name="title" value={formData.title} onChange={handleChange} required
                placeholder="e.g. Introduction to Variables"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-purple-500/60 outline-none transition text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Week #</label>
              <input
                type="number" name="week_number" value={formData.week_number}
                onChange={handleChange} min="1" max="18"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-purple-500/60 outline-none transition text-sm"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Subject *</label>
            {loadingSubjects ? (
              <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent" />
                Loading subjects...
              </div>
            ) : (
              <select
                name="subject_id" value={formData.subject_id} onChange={handleChange} required
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none cursor-pointer text-sm focus:border-purple-500/60 transition"
              >
                <option value="">Select a subject</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.subject_code} — {s.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Section */}
          {formData.subject_id && (
            <div>
              <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">
                Section <span className="text-slate-600 normal-case font-normal">(optional — leave blank for all your sections)</span>
              </label>
              {loadingSections ? (
                <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent" />
                  Loading sections...
                </div>
              ) : (
                <select
                  name="section_id" value={formData.section_id} onChange={handleChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none cursor-pointer text-sm focus:border-purple-500/60 transition"
                >
                  <option value="">🌐 All My Sections (Subject-wide)</option>
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.id}>
                      🏫 Section {sec.section_no}{sec.semester ? ` (${sec.semester})` : ''}{sec.schedule ? ` — ${sec.schedule}` : ''}
                    </option>
                  ))}
                </select>
              )}
              {sections.length === 0 && !loadingSections && (
                <p className="text-yellow-500 text-xs mt-1">⚠️ Not assigned to any section for this subject</p>
              )}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Description *</label>
            <textarea
              name="description" value={formData.description} onChange={handleChange} required rows="4"
              placeholder="Brief description of what students will learn this week..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-purple-500/60 outline-none resize-none transition text-sm"
            />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Attach Files</label>
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-purple-600/40 transition cursor-pointer group">
              <input type="file" multiple onChange={handleFileChange} className="hidden" id="file-upload"
                accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png,.zip" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📎</div>
                <p className="text-slate-400 text-sm">Click to select files</p>
                <p className="text-slate-600 text-xs mt-1">PDF, PPT, DOC, Images, ZIP — max 16MB each</p>
              </label>
            </div>
            {formData.files.length > 0 && (
              <div className="mt-3 space-y-2">
                {formData.files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-2 border border-slate-700">
                    <span className="text-slate-300 text-sm truncate flex-1">{fileIcon(file.name)} {file.name}</span>
                    <span className="text-slate-500 text-xs mr-3">{formatSize(file.size)}</span>
                    <button type="button" onClick={() => removeFile(i)}
                      className="text-red-400 hover:text-red-300 text-xs px-2 py-1 hover:bg-red-900/30 rounded transition">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Publish toggle — with clear explanation of what draft vs published means */}
          <div className={`flex items-center gap-3 p-4 rounded-xl border transition ${
            formData.is_published
              ? 'bg-green-900/10 border-green-600/20'
              : 'bg-slate-800/50 border-slate-700'
          }`}>
            <input
              type="checkbox" name="is_published" checked={formData.is_published}
              onChange={handleChange}
              className="w-5 h-5 rounded border-slate-600 text-purple-600 focus:ring-purple-500 cursor-pointer"
            />
            <div>
              <p className="text-white font-medium text-sm">
                {formData.is_published ? '✅ Publish immediately' : '📝 Save as Draft'}
              </p>
              <p className="text-slate-400 text-xs">
                {formData.is_published
                  ? 'Students will see this as soon as you save.'
                  : 'Only you can see this. Publish it when the week starts.'}
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-800">
            <button type="button" onClick={() => { setShowCreateForm(false); setError(null) }}
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition disabled:opacity-50 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !formData.subject_id}
              className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl text-white font-bold transition flex items-center justify-center gap-2 text-sm">
              {isSubmitting
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
                : formData.is_published ? '📢 Create & Publish' : '📝 Save as Draft'
              }
            </button>
          </div>
        </form>
      )}

      {/* Lessons List */}
      {loadingLessons ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent" />
          <p className="text-slate-500 text-sm animate-pulse">Loading modules...</p>
        </div>
      ) : (
        <>
          {lessons.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all',       label: `All (${lessons.length})` },
                { key: 'published', label: `Published (${lessons.filter(l => l.is_published).length})` },
                { key: 'drafts',    label: `Drafts (${lessons.filter(l => !l.is_published).length})` },
              ].map(tab => (
                <button key={tab.key} onClick={() => setFilter(tab.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filter === tab.key
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  }`}>
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {filteredLessons.length === 0 ? (
            <div className="text-center py-14 bg-slate-900 border border-slate-800 rounded-2xl">
              <div className="text-5xl mb-4">📚</div>
              <p className="text-slate-300 text-lg font-semibold mb-1">
                {lessons.length === 0 ? 'No modules yet' : 'No modules match this filter'}
              </p>
              <p className="text-slate-500 text-sm mb-6">
                {lessons.length === 0
                  ? 'Create modules in advance and publish them when each week starts.'
                  : 'Try a different filter.'}
              </p>
              {lessons.length === 0 && (
                <button onClick={() => setShowCreateForm(true)}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition text-sm">
                  Create First Module
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLessons.map(lesson => (
                <div
                  key={lesson.id}
                  className={`bg-slate-900 border rounded-2xl overflow-hidden transition ${
                    lesson.is_published
                      ? 'border-slate-800 hover:border-slate-700'
                      : 'border-yellow-600/20'
                  }`}
                >
                  <div className="flex items-center gap-4 p-5">
                    {/* Week badge */}
                    <div className="shrink-0 w-12 h-12 bg-slate-800 border border-slate-700 rounded-xl flex flex-col items-center justify-center">
                      <span className="text-slate-500 text-[9px] uppercase tracking-wider">Wk</span>
                      <span className="text-white font-black text-lg leading-none">{lesson.week_number}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h3 className="text-white font-bold text-base truncate">{lesson.title}</h3>
                        {lesson.is_published ? (
                          <span className="px-2 py-0.5 bg-green-600/10 text-green-400 rounded text-xs font-bold border border-green-600/20 shrink-0">
                            ✅ Published
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded text-xs font-bold border border-yellow-600/30 shrink-0">
                            📝 Draft
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs">
                        📎 {lesson.files?.length || 0} {lesson.files?.length === 1 ? 'file' : 'files'} attached
                        {!lesson.is_published && (
                          <span className="ml-2 text-yellow-600">· hidden from students</span>
                        )}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* View */}
                      <button
                        onClick={() => setViewingLesson(lesson)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-xs font-bold transition"
                      >
                        👁 View
                      </button>

                      {/* Publish / Unpublish */}
                      <button
                        onClick={() => handleTogglePublish(lesson)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                          lesson.is_published
                            ? 'bg-slate-700/50 hover:bg-red-900/20 text-slate-400 hover:text-red-400 border-slate-700 hover:border-red-600/30'
                            : 'bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border-purple-600/20'
                        }`}
                      >
                        {lesson.is_published ? 'Unpublish' : 'Publish'}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(lesson)}
                        title="Delete lesson"
                        className="p-1.5 hover:bg-red-900/20 rounded-lg text-slate-500 hover:text-red-400 transition"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
