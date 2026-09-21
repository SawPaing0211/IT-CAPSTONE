// this is for uploading lessons/modules and files for students. draft = only i can see it, published = students can see it

import { useState, useEffect } from 'react'
import DownloadIcon from '../../components/DownloadIcon'
import { API_BASE } from '../../api/client'

const API = API_BASE

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
function LessonModal({ lesson, onClose, onFileDeleted }) {
  const [downloading, setDownloading] = useState(null)
  const [files, setFiles]             = useState(lesson.files || [])
  const [fileToDelete, setFileToDelete] = useState(null) // file pending confirm, or null
  const [deletingFile, setDeletingFile] = useState(false)

  // Delete the file pending confirmation from this lesson
  const confirmDeleteFile = async () => {
    if (!fileToDelete) return
    setDeletingFile(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${API}/api/lessons/${lesson.id}/files/${fileToDelete.id}`,
        { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
      )
      if (res.ok) {
        setFiles(prev => prev.filter(f => f.id !== fileToDelete.id))
        onFileDeleted?.(lesson.id, fileToDelete.id)
      }
    } catch (err) {
      console.error('Failed to delete file:', err)
    } finally {
      setDeletingFile(false)
      setFileToDelete(null)
    }
  }

  // Download an attached file
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

        <div className="flex items-start justify-between gap-3 p-4 sm:p-6 border-b border-slate-800">
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

        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-5">
          <div>
            <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Description</p>
            <p className="text-slate-300 text-sm leading-relaxed">{lesson.description}</p>
          </div>

          {files.length > 0 && (
            <div>
              <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-3">
                Attached Files ({files.length})
              </p>
              <div className="space-y-2">
                {files.map(file => (
                  fileToDelete?.id === file.id ? (
                    // inline confirm — replaces this row only, rather than a
                    // second modal stacked on top of this one
                    <div
                      key={file.id}
                      className="flex items-center gap-3 px-4 py-3 bg-red-950/30 rounded-xl border border-red-600/40"
                    >
                      <span className="text-red-300 text-sm flex-1 min-w-0 truncate">
                        Remove <span className="font-semibold">"{file.filename}"</span> from this module?
                      </span>
                      <button
                        onClick={() => setFileToDelete(null)}
                        disabled={deletingFile}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs font-bold transition disabled:opacity-50 shrink-0"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={confirmDeleteFile}
                        disabled={deletingFile}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-white text-xs font-bold transition disabled:opacity-50 shrink-0"
                      >
                        {deletingFile ? '...' : 'Remove'}
                      </button>
                    </div>
                  ) : (
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
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-600/20 rounded-lg text-xs font-bold transition disabled:opacity-50 shrink-0"
                      >
                        {downloading === file.id ? '⏳' : <><DownloadIcon size={13} /> Download</>}
                      </button>
                      <button
                        onClick={() => setFileToDelete(file)}
                        title="Remove this file"
                        className="p-1.5 hover:bg-red-900/20 rounded-lg text-slate-500 hover:text-red-400 transition shrink-0"
                      >
                        🗑️
                      </button>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {files.length === 0 && (
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
export default function CourseMaterials({ classId, subjectId }) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [lessons, setLessons]               = useState([])
  const [loadingLessons, setLoadingLessons] = useState(true)
  const [filter, setFilter]                 = useState('all')
  const [viewingLesson, setViewingLesson]   = useState(null) // lesson object to show in modal

  // no subject/section picker here, this always lives inside one class tab already so it's auto scoped to that class
  const [formData, setFormData] = useState({
    title: '', description: '', week_number: 1,
    is_published: false, files: []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError]               = useState(null)
  const [success, setSuccess]           = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const token = () => localStorage.getItem('token')
  const authHeaders = () => ({ 'Authorization': `Bearer ${token()}` })

  // fetch lessons
  const fetchLessons = async () => {
    setLoadingLessons(true)
    try {
      const res = await fetch(`${API}/api/lessons?class_id=${classId}`, { headers: authHeaders() })
      if (res.ok) {
        const all = await res.json()
        // A module belongs to one specific class code now, not the whole
        // subject -- the backend already filters by class_id above, this
        // is just a defensive client-side filter in case classId is ever
        // missing from the query.
        setLessons(classId ? all.filter(l => l.section_id === Number(classId)) : all)
      }
    } catch (err) {
      console.error('Failed to fetch lessons:', err)
    } finally {
      setLoadingLessons(false)
    }
  }
  useEffect(() => { fetchLessons() }, [classId])

  // Sync a form field's value or checked state into state
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  // Accept only supported file types under the size limit, and note any that got skipped
  const handleFileChange = (e) => {
    const validTypes = ['application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-powerpoint', // .ppt
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'image/jpeg', 'image/png', 'application/zip']
    const incoming = Array.from(e.target.files)
    const valid    = incoming.filter(f => validTypes.includes(f.type) && f.size <= 16 * 1024 * 1024)
    const rejected = incoming.filter(f => !validTypes.includes(f.type) || f.size > 16 * 1024 * 1024)
    if (rejected.length > 0) {
      setError(`Skipped ${rejected.length} file${rejected.length > 1 ? 's' : ''} — unsupported type or over 16MB: ${rejected.map(f => f.name).join(', ')}`)
    }
    setFormData(prev => ({ ...prev, files: [...prev.files, ...valid] }))
  }

  // Remove a staged file from the upload list before submitting
  const removeFile = (index) => {
    setFormData(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }))
  }

  // this is for the draft/publish toggle, updates right away so the button doesn't feel laggy
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

  // Open the delete confirmation modal for a lesson
  const handleDelete = (lesson) => {
    setDeleteTarget(lesson)
  }

  // this is for keeping the file count in sync after deleting a file from inside the modal
  const handleFileDeleted = (lessonId, fileId) => {
    setLessons(prev => prev.map(l =>
      l.id === lessonId ? { ...l, files: (l.files || []).filter(f => f.id !== fileId) } : l
    ))
  }

  // Delete the lesson pending confirmation
  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`${API}/api/lessons/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: authHeaders()
      })
      if (res.ok) {
        setLessons(prev => prev.filter(l => l.id !== deleteTarget.id))
        setSuccess('Lesson deleted.')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        setError('Failed to delete lesson')
      }
    } catch {
      setError('Failed to delete lesson')
    } finally {
      setDeleteTarget(null)
    }
  }

  // Create the lesson, then upload its attached files one by one
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subjectId) { setError('Still loading this class — try again in a moment.'); return }
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
          subject_id:   parseInt(subjectId),
          section_id:   parseInt(classId),
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
      setFormData({ title: '', description: '', week_number: 1, is_published: false, files: [] })
      setShowCreateForm(false)
      await fetchLessons()
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter and sort lessons for the selected tab
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
        <LessonModal lesson={viewingLesson} onClose={() => setViewingLesson(null)} onFileDeleted={handleFileDeleted} />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border-2 border-red-600/40 rounded-2xl w-full max-w-sm shadow-2xl shadow-red-900/30 overflow-hidden">
            <div className="p-6 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl">
                🗑️
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Delete Module?</h3>
              <p className="text-slate-400 text-sm">
                Delete <span className="text-white font-semibold">"{deleteTarget.title}"</span>? This also removes all attached files and cannot be undone.
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Module
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
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-purple-600/20 rounded-2xl p-4 sm:p-6 space-y-5">
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

          {/* Subject/Section — no picker: this form always creates the module for
              the class tab it's opened from, so there's nothing to choose here. */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-xl text-slate-400 text-xs">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-purple-400 shrink-0">
              <path d="M12 2 2 7l10 5 10-5-10-5Z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
            </svg>
            This module will be created for this class only.
          </div>

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

          {/* Visibility — both options always shown side by side, so it's obvious
              which one is picked and what the other one does. A checkbox whose
              own label flips between the two states hides that comparison. */}
          <div>
            <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Visibility</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, is_published: false }))}
                className={`text-left p-4 rounded-xl border-2 transition ${
                  !formData.is_published
                    ? 'bg-yellow-600/10 border-yellow-500/60'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📝</span>
                  <span className="text-white font-bold text-sm">Draft</span>
                  {!formData.is_published && (
                    <span className="ml-auto text-yellow-400 text-xs font-bold">✓ Selected</span>
                  )}
                </div>
                <p className="text-slate-400 text-xs">Only you can see this. Publish it later when the week starts.</p>
              </button>

              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, is_published: true }))}
                className={`text-left p-4 rounded-xl border-2 transition ${
                  formData.is_published
                    ? 'bg-green-600/10 border-green-500/60'
                    : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">✅</span>
                  <span className="text-white font-bold text-sm">Publish</span>
                  {formData.is_published && (
                    <span className="ml-auto text-green-400 text-xs font-bold">✓ Selected</span>
                  )}
                </div>
                <p className="text-slate-400 text-xs">Visible to students as soon as you save.</p>
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-slate-800">
            <button type="button" onClick={() => { setShowCreateForm(false); setError(null) }}
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition disabled:opacity-50 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting || !subjectId}
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
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition text-sm inline-flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
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
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 sm:p-5">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
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
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap sm:shrink-0 pl-16 sm:pl-0">
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
