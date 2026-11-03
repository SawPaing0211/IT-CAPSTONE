import { useState, useEffect } from 'react'
import { API_BASE } from '../../api/client'

// Accent per year level so the list reads as four cohorts instead of one
// repeated card — year is the one piece of structure every subject has.
// Subjects with no year level fall back to the neutral/purple set.
const YEAR_ACCENT = {
  1: { grad: 'from-cyan-500 to-blue-600',    bar: 'bg-cyan-500',    border: 'border-cyan-500/25',    hoverBorder: 'hover:border-cyan-400/50',    text: 'text-cyan-300',    chip: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/25',    label: '1st Year' },
  2: { grad: 'from-fuchsia-500 to-purple-600', bar: 'bg-fuchsia-500', border: 'border-fuchsia-500/25', hoverBorder: 'hover:border-fuchsia-400/50', text: 'text-fuchsia-300', chip: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/25', label: '2nd Year' },
  3: { grad: 'from-amber-500 to-orange-600', bar: 'bg-amber-500',   border: 'border-amber-500/25',   hoverBorder: 'hover:border-amber-400/50',   text: 'text-amber-300',   chip: 'bg-amber-500/10 text-amber-300 border-amber-500/25',   label: '3rd Year' },
  4: { grad: 'from-rose-500 to-red-600',     bar: 'bg-rose-500',    border: 'border-rose-500/25',    hoverBorder: 'hover:border-rose-400/50',    text: 'text-rose-300',    chip: 'bg-rose-500/10 text-rose-300 border-rose-500/25',    label: '4th Year' },
}
const NO_YEAR_ACCENT = { grad: 'from-slate-500 to-slate-600', bar: 'bg-slate-500', border: 'border-slate-700', hoverBorder: 'hover:border-slate-500/60', text: 'text-slate-300', chip: 'bg-slate-700/40 text-slate-300 border-slate-600/40', label: 'No Year Set' }
const accentFor = (year) => YEAR_ACCENT[year] || NO_YEAR_ACCENT

export default function SubjectsManagement() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSubject, setEditingSubject] = useState(null)
  const [editForm, setEditForm] = useState({
    internal_subject_no: '',
    name: '',
    description: '',
    subject_code: '',
    units: '',
    department: '',
    year_level: '',
    subject_type: 'lab',
  })
  const [toast, setToast] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, name } of the subject pending deletion
  const [newSubject, setNewSubject] = useState({
    internal_subject_no: '',
    name: '',
    description: '',
    subject_code: '',
    units: '',
    department: '',
    year_level: '1',
    subject_type: 'lab',
  })

  // Load all subjects when the page mounts
  useEffect(() => {
    fetchSubjects()
  }, [])

  // Fetch the list of subjects from the server
  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/admin/subjects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSubjects(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch subjects:', err)
    } finally {
      setLoading(false)
    }
  }

  // Send the new subject to the server and refresh the list
  const handleCreateSubject = async () => {
    if (!newSubject.name.trim()) {
      showToast('Subject name is required', 'error')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/admin/subjects`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // the institution's own subject number, not the same as our subject code
          internal_subject_no: newSubject.internal_subject_no.trim() || null,
          name: newSubject.name.trim(),
          description: newSubject.description.trim(),
          subject_code: newSubject.subject_code.trim() || null,
          units: newSubject.units ? parseInt(newSubject.units) : null,
          department: newSubject.department,
          year_level: newSubject.year_level ? parseInt(newSubject.year_level) : null,
          subject_type: newSubject.subject_type,
        })
      })

      if (res.ok) {
        setShowCreateModal(false)
        setNewSubject({ 
          internal_subject_no: '',
          name: '', 
          description: '', 
          subject_code: '', 
          units: '', 
          department: '', 
          year_level: '1', 
          subject_type: 'lab' 
        })
        await fetchSubjects()
        showToast('Subject created successfully!')
      } else {
        const error = await res.json()
        showToast(`Failed to create subject: ${error.error}`, 'error')
      }
    } catch (err) {
      console.error('Failed to create subject:', err)
      showToast('Failed to create subject', 'error')
    }
  }

  // Display a temporary toast message
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Load the selected subject into the edit form
  const handleEditClick = (subject) => {
    setEditingSubject(subject)
    setEditForm({
      internal_subject_no: subject.internal_subject_no || '',
      name: subject.name || '',
      description: subject.description || '',
      subject_code: subject.subject_code || '',
      units: subject.units ? String(subject.units) : '',
      department: subject.department || '',
      year_level: subject.year_level ? String(subject.year_level) : '',
      subject_type: subject.subject_type || 'lab',
    })
    setShowEditModal(true)
  }

  // Save the edited subject details to the server
  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      showToast('Subject name is required', 'error')
      return
    }
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/admin/subjects/${editingSubject.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          internal_subject_no: editForm.internal_subject_no.trim() || null,
          name: editForm.name.trim(),
          description: editForm.description.trim(),
          subject_code: editForm.subject_code.trim() || null,
          units: editForm.units ? parseInt(editForm.units) : null,
          department: editForm.department,
          year_level: editForm.year_level ? parseInt(editForm.year_level) : null,
          subject_type: editForm.subject_type,
        })
      })
      if (res.ok) {
        setShowEditModal(false)
        setEditingSubject(null)
        await fetchSubjects()
        showToast('Subject updated successfully!')
      } else {
        const error = await res.json()
        showToast(error.error || 'Failed to update subject', 'error')
      }
    } catch (err) {
      showToast('Network error. Please try again.', 'error')
    }
  }

  // opens the confirm modal instead of blocking with a native dialog —
  // the actual delete only happens once the admin confirms inside it
  const handleDeleteSubject = (subjectId, subjectName) => {
    setDeleteTarget({ id: subjectId, name: subjectName })
  }

  // Delete the subject that's pending confirmation
  const confirmDeleteSubject = async () => {
    if (!deleteTarget) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/admin/subjects/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        await fetchSubjects()
        showToast('Subject deleted successfully!')
      } else {
        const error = await res.json()
        showToast(`Failed to delete subject: ${error.error}`, 'error')
      }
    } catch (err) {
      console.error('Failed to delete subject:', err)
      showToast('Failed to delete subject', 'error')
    } finally {
      setDeleteTarget(null)
    }
  }

  // Show a spinner while subjects are still loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl font-semibold text-white shadow-xl transition ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.message}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-600/40 rounded-2xl w-full max-w-md shadow-2xl shadow-red-900/30 overflow-hidden">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-red-600/20 border border-red-600/40 rounded-xl flex items-center justify-center text-xl shrink-0">
                  ⚠️
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Delete Subject?</h3>
                  <p className="text-slate-400 text-sm">This can't be undone</p>
                </div>
              </div>
              <p className="text-slate-300 text-sm">
                Delete <span className="text-white font-semibold">"{deleteTarget.name}"</span>? This will affect any class codes using this subject.
              </p>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSubject}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold transition text-sm"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {showEditModal && editingSubject && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border-2 border-purple-600/50 rounded-2xl w-full max-w-lg shadow-2xl shadow-purple-900/40 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-900/60 to-pink-900/40 px-6 py-5 border-b border-purple-600/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-xl">✏️</div>
                <div>
                  <h2 className="text-xl font-black text-white">Edit Subject</h2>
                  <p className="text-purple-300/70 text-xs">Update subject details</p>
                </div>
              </div>
              <button onClick={() => { setShowEditModal(false); setEditingSubject(null) }}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-lg">✕</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Subject Number</label>
                  <input type="text" value={editForm.internal_subject_no}
                    onChange={e => setEditForm({...editForm, internal_subject_no: e.target.value})}
                    placeholder="e.g., 290007"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition font-mono tracking-widest text-sm" />
                  <p className="text-slate-500 text-[10px] mt-1">Internal subject ID</p>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Subject Code</label>
                  <input type="text" value={editForm.subject_code}
                    onChange={e => setEditForm({...editForm, subject_code: e.target.value.toUpperCase()})}
                    placeholder="e.g., IT115"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition font-mono tracking-widest text-sm" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Subject Name *</label>
                  <input type="text" value={editForm.name}
                    onChange={e => setEditForm({...editForm, name: e.target.value})}
                    placeholder="e.g., Intro to Computing"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Description <span className="text-slate-600 normal-case font-normal">(optional)</span></label>
                <textarea value={editForm.description}
                  onChange={e => setEditForm({...editForm, description: e.target.value})}
                  placeholder="Brief description..." rows="2"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-purple-500 resize-none transition text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Units</label>
                  <select value={editForm.units} onChange={e => setEditForm({...editForm, units: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm">
                    <option value="">—</option>
                    {[1,2,3,4,5,6].map(u => <option key={u} value={u}>{u} {u === 1 ? 'unit' : 'units'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Curriculum Year</label>
                  <select value={editForm.year_level} onChange={e => setEditForm({...editForm, year_level: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm">
                    <option value="1">First-year subject</option>
                    {/* an existing subject with another curriculum year stays visible
                        until the official first-year list is confirmed */}
                    {editForm.year_level && editForm.year_level !== '1' && (
                      <option value={editForm.year_level}>Year {editForm.year_level} (not in scope, under review)</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Type</label>
                  <div className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-emerald-400 text-sm font-semibold flex items-center gap-2">
                    🧪 Lab
                  </div>
                  <p className="text-slate-500 text-[10px] mt-1">This platform is lab-only</p>
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Department / College</label>
                <select value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm">
                  <option value="">— Select Department —</option>
                  <option value="CCIT">College of Computing and Information Technology (CCIT)</option>
                  <option value="CCS">College of Computer Studies (CCS)</option>
                  <option value="COE">College of Engineering (COE)</option>
                  <option value="CAS">College of Arts & Sciences (CAS)</option>
                  <option value="COB">College of Business (COB)</option>
                  <option value="CED">College of Education (CED)</option>
                  <option value="GE">General Education</option>
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => { setShowEditModal(false); setEditingSubject(null) }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold transition border border-slate-700">
                  Cancel
                </button>
                <button onClick={handleSaveEdit}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white font-bold transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2">
                  💾 Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center text-xl shadow-lg shadow-purple-900/40 shrink-0">
            📚
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Subjects Management</h1>
            <p className="text-slate-500 text-sm mt-0.5">Create and manage course subjects</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white font-bold text-sm transition shadow-lg shadow-purple-600/20 flex items-center gap-2"
        >
          <span>+</span> New Subject
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-purple-600/15 text-purple-300 flex items-center justify-center text-lg shrink-0">📚</div>
          <div>
            <p className="text-2xl font-bold text-white leading-none">{subjects.length}</p>
            <p className="text-slate-500 text-xs mt-1">Total Subjects</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600/15 text-blue-300 flex items-center justify-center text-lg shrink-0">🏛️</div>
          <div>
            <p className="text-2xl font-bold text-white leading-none">
              {new Set(subjects.map(s => s.department).filter(Boolean)).size}
            </p>
            <p className="text-slate-500 text-xs mt-1">Departments</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600/15 text-emerald-300 flex items-center justify-center text-lg shrink-0">⏱️</div>
          <div>
            <p className="text-2xl font-bold text-white leading-none">
              {subjects.length && subjects.some(s => s.units)
                ? (subjects.reduce((sum, s) => sum + (s.units || 0), 0) / subjects.filter(s => s.units).length).toFixed(1)
                : '—'}
            </p>
            <p className="text-slate-500 text-xs mt-1">Avg. Units</p>
          </div>
        </div>
      </div>

      {/* Subjects List, grouped by year level so cohorts are easy to scan */}
      {subjects.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-bold text-white mb-2">No subjects found</h3>
          <p className="text-slate-400">Create your first subject to get started!</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(
            subjects.reduce((groups, s) => {
              const key = YEAR_ACCENT[s.year_level] ? s.year_level : 'none'
              ;(groups[key] ||= []).push(s)
              return groups
            }, {})
          )
            .sort(([a], [b]) => (a === 'none' ? 1 : b === 'none' ? -1 : a - b))
            .map(([yearKey, group]) => {
              const accent = YEAR_ACCENT[yearKey] || NO_YEAR_ACCENT
              return (
                <div key={yearKey}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`w-2 h-2 rounded-full ${accent.bar}`} />
                    <h2 className="text-sm font-bold text-slate-300">{accent.label}</h2>
                    <span className="text-slate-600 text-xs">{group.length} subject{group.length === 1 ? '' : 's'}</span>
                    <div className="flex-1 h-px bg-slate-800" />
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {group.map(subject => {
                      const a = accentFor(subject.year_level)
                      return (
                        <div
                          key={subject.id}
                          className={`relative bg-slate-900/60 border ${a.border} ${a.hoverBorder} rounded-xl pl-5 pr-4 py-4 transition group overflow-hidden`}
                        >
                          <span className={`absolute left-0 top-0 bottom-0 w-1 ${a.bar}`} />
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`w-10 h-10 bg-gradient-to-br ${a.grad} rounded-xl flex items-center justify-center text-lg flex-shrink-0`}>
                                💻
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {subject.internal_subject_no && (
                                    <span className="font-mono text-[11px] font-bold bg-slate-800 text-yellow-300/90 border border-yellow-600/25 px-1.5 py-0.5 rounded">
                                      {subject.internal_subject_no}
                                    </span>
                                  )}
                                  {subject.subject_code && (
                                    <span className={`font-mono text-[11px] font-bold border px-1.5 py-0.5 rounded ${a.chip}`}>
                                      {subject.subject_code}
                                    </span>
                                  )}
                                </div>
                                <h3 className="text-white font-bold truncate mt-1">{subject.name}</h3>
                                {subject.description ? (
                                  <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{subject.description}</p>
                                ) : (
                                  <p className="text-slate-700 text-xs italic mt-0.5">No description</p>
                                )}
                                <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                  {subject.units && <span className="text-[11px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded-full">{subject.units} {subject.units === 1 ? 'unit' : 'units'}</span>}
                                  {subject.subject_type && <span className="text-[11px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded-full capitalize">{subject.subject_type.replace('_', ' + ')}</span>}
                                  {subject.department && <span className="text-[11px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded-full">{subject.department}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition shrink-0">
                              <button
                                onClick={() => handleEditClick(subject)}
                                title="Edit subject"
                                className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-purple-600/30 text-slate-400 hover:text-purple-300 rounded-lg transition"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteSubject(subject.id, subject.name)}
                                title="Delete subject"
                                className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-red-600/30 text-slate-400 hover:text-red-300 rounded-lg transition"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {/* Create Subject Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border-2 border-purple-600/50 rounded-2xl w-full max-w-lg shadow-2xl shadow-purple-900/40 overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900/60 to-pink-900/40 px-6 py-5 border-b border-purple-600/30 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-xl">📚</div>
                <div>
                  <h2 className="text-xl font-black text-white">Create Subject</h2>
                  <p className="text-purple-300/70 text-xs">Add a new course subject to the system</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-lg"
              >✕</button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

              {/* subject number, code, and name */}
              <div className="grid grid-cols-3 gap-3">
                {/* Internal subject number */}
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Subject Number
                  </label>
                  <input
                    type="text"
                    value={newSubject.internal_subject_no}
                    onChange={(e) => setNewSubject({...newSubject, internal_subject_no: e.target.value})}
                    placeholder="e.g., 290007"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition font-mono tracking-widest text-sm"
                  />
                  <p className="text-slate-500 text-[10px] mt-1">Internal subject ID</p>
                </div>
                
                {/* Subject Code */}
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Subject Code
                  </label>
                  <input
                    type="text"
                    value={newSubject.subject_code}
                    onChange={(e) => setNewSubject({...newSubject, subject_code: e.target.value.toUpperCase()})}
                    placeholder="e.g., IT115"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition font-mono tracking-widest text-sm"
                  />
                </div>
                
                {/* Subject Name */}
                <div className="col-span-1">
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    value={newSubject.name}
                    onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                    placeholder="e.g., Intro to Computing"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition text-sm"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                  Description <span className="text-slate-600 normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  value={newSubject.description}
                  onChange={(e) => setNewSubject({...newSubject, description: e.target.value})}
                  placeholder="Brief description of what this subject covers..."
                  rows="2"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-purple-500 resize-none transition text-sm"
                />
              </div>

              {/* Units + Year Level + Type */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Units</label>
                  <select
                    value={newSubject.units}
                    onChange={(e) => setNewSubject({...newSubject, units: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm"
                  >
                    <option value="">—</option>
                    {[1,2,3,4,5,6].map(u => <option key={u} value={u}>{u} {u === 1 ? 'unit' : 'units'}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Curriculum Year</label>
                  <select
                    value={newSubject.year_level}
                    onChange={(e) => setNewSubject({...newSubject, year_level: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm"
                  >
                    <option value="1">First-year subject</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Type</label>
                  {/* forge.dev is a coding platform — every subject here has
                      to be hands-on lab work, so this is fixed, not a choice */}
                  <div className="w-full bg-slate-800/60 border border-slate-700 rounded-xl px-3 py-2.5 text-emerald-400 text-sm font-semibold flex items-center gap-2">
                    🧪 Lab
                  </div>
                  <p className="text-slate-500 text-[10px] mt-1">This platform is lab-only</p>
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Department / College</label>
                <select
                  value={newSubject.department}
                  onChange={(e) => setNewSubject({...newSubject, department: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm"
                >
                  <option value="">— Select Department —</option>
                  <option value="CCIT">College of Computing and Information Technology (CCIT)</option>
                  <option value="CCS">College of Computer Studies (CCS)</option>
                  <option value="COE">College of Engineering (COE)</option>
                  <option value="CAS">College of Arts & Sciences (CAS)</option>
                  <option value="COB">College of Business (COB)</option>
                  <option value="CED">College of Education (CED)</option>
                  <option value="GE">General Education</option>
                </select>
              </div>

              {/* Live Preview */}
              {newSubject.name.trim() && (
                <div className="bg-slate-800/60 border border-purple-600/20 rounded-xl p-4">
                  <p className="text-slate-500 text-xs uppercase tracking-wider font-semibold mb-3">Preview</p>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-lg flex-shrink-0">💻</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* preview so you can see both numbers before saving */}
                        {newSubject.internal_subject_no && (
                          <span className="font-mono text-xs font-bold bg-slate-700 text-yellow-300 px-2 py-0.5 rounded">
                            {newSubject.internal_subject_no}
                          </span>
                        )}
                        {newSubject.subject_code && (
                          <span className="font-mono text-xs font-bold bg-slate-700 text-purple-300 px-2 py-0.5 rounded">
                            {newSubject.subject_code}
                          </span>
                        )}
                        <p className="text-white font-bold text-sm">{newSubject.name}</p>
                      </div>
                      <p className="text-slate-500 text-xs mt-0.5 truncate">{newSubject.description || 'No description'}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {newSubject.units && (
                          <span className="text-xs bg-blue-600/20 text-blue-300 border border-blue-600/30 px-2 py-0.5 rounded-full">{newSubject.units} units</span>
                        )}
                        {newSubject.year_level && (
                          <span className="text-xs bg-green-600/20 text-green-300 border border-green-600/30 px-2 py-0.5 rounded-full">Year {newSubject.year_level}</span>
                        )}
                        {newSubject.subject_type && (
                          <span className="text-xs bg-orange-600/20 text-orange-300 border border-orange-600/30 px-2 py-0.5 rounded-full capitalize">{newSubject.subject_type.replace('_', ' + ')}</span>
                        )}
                        {newSubject.department && (
                          <span className="text-xs bg-purple-600/20 text-purple-300 border border-purple-600/30 px-2 py-0.5 rounded-full">{newSubject.department}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    setNewSubject({ 
                      internal_subject_no: '',
                      name: '', 
                      description: '', 
                      subject_code: '', 
                      units: '', 
                      department: '', 
                      year_level: '1', 
                      subject_type: 'lab' 
                    })
                  }}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold transition border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSubject}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white font-bold transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
                >
                  📚 Create Subject
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}