import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { API_BASE, authFetch } from '../../api/client'

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
const accentFor = (year) => YEAR_ACCENT[year] || (year ? { ...NO_YEAR_ACCENT, label: 'Year ' + year } : NO_YEAR_ACCENT)
const INITIAL_SUBJECT = { internal_subject_no: '', subject_code: '', name: '', description: '', units: '', department: '' }
const DEPARTMENTS = [
  ['CCIT', 'College of Computing and Information Technology (CCIT)'],
  ['CCS', 'College of Computer Studies (CCS)'],
  ['COE', 'College of Engineering (COE)'],
  ['CAS', 'College of Arts & Sciences (CAS)'],
  ['COB', 'College of Business (COB)'],
  ['CED', 'College of Education (CED)'],
  ['GE', 'General Education'],
]
const subjectField = 'block w-full min-h-11 rounded-lg border border-slate-600 bg-slate-950 [color-scheme:dark] px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400'

export default function SubjectsManagement() {
  const [subjects, setSubjects] = useState([])
  const [search, setSearch] = useState('')
  const [year, setYear] = useState('all')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const createDialog = useRef(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
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
  const [newSubject, setNewSubject] = useState(INITIAL_SUBJECT)

  useLayoutEffect(() => {
    if (!showCreateModal) return
    const dialog = createDialog.current
    dialog.showModal()
    return () => dialog.close()
  }, [showCreateModal])

  // Load all subjects when the page mounts
  useEffect(() => {
    fetchSubjects()
  }, [])

  // Fetch the list of subjects from the server
  const fetchSubjects = async () => {
    setLoadError('')
    try {
      const res = await authFetch(`${API_BASE}/api/admin/subjects`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (!Array.isArray(data)) throw new Error('Unexpected subject list')
      setSubjects(data)
    } catch {
      setLoadError('Could not load subjects. Try again before making changes.')
    } finally {
      setLoading(false)
    }
  }

  // Send the new subject to the server and refresh the list
  const closeCreateSubject = () => {
    setShowCreateModal(false)
    setNewSubject(INITIAL_SUBJECT)
    setCreateError('')
  }

  const handleCreateSubject = async (event) => {
    event.preventDefault()
    if (creating) return
    if (!newSubject.name.trim()) {
      setCreateError('Enter a subject name.')
      return
    }

    setCreating(true)
    setCreateError('')
    try {
      const res = await authFetch(`${API_BASE}/api/admin/subjects`, {
        method: 'POST',
        headers: {
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
          year_level: 1,
          subject_type: 'lab',
        })
      })

      if (res.ok) {
        closeCreateSubject()
        await fetchSubjects()
        showToast('Subject created successfully!')
      } else {
        const error = await res.json().catch(() => ({}))
        setCreateError(error.error || 'Could not create the subject. Try again.')
      }
    } catch {
      setCreateError('Could not create the subject. Check your connection and try again.')
    } finally {
      setCreating(false)
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
    if (savingEdit) return
    if (!editForm.name.trim()) {
      showToast('Subject name is required', 'error')
      return
    }
    setSavingEdit(true)
    try {
      const res = await authFetch(`${API_BASE}/api/admin/subjects/${editingSubject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // An untouched blank may come from a server that omitted this field.
          // Only send the subject number when the admin actually changes it.
          ...(editForm.internal_subject_no.trim() !== (editingSubject.internal_subject_no || '').trim()
            ? { internal_subject_no: editForm.internal_subject_no.trim() || null }
            : {}),
          name: editForm.name.trim(),
          description: editForm.description.trim(),
          subject_code: editForm.subject_code.trim() || null,
          units: editForm.units ? parseInt(editForm.units) : null,
          department: editForm.department,
          year_level: editForm.year_level ? parseInt(editForm.year_level) : null,
          subject_type: editForm.subject_type,
        })
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        showToast(data?.error || `Could not save changes (HTTP ${res.status}).`, 'error')
      } else if (data?.subject?.id === editingSubject.id) {
        setShowEditModal(false)
        setEditingSubject(null)
        await fetchSubjects()
        showToast('Subject updated successfully!')
      } else {
        showToast('The server did not confirm the save. Refresh the subject list before trying again.', 'error')
      }
    } catch {
      showToast('Could not reach the server or read its response. Refresh the subject list before trying again.', 'error')
    } finally {
      setSavingEdit(false)
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
      const res = await authFetch(`${API_BASE}/api/admin/subjects/${deleteTarget.id}`, {
        method: 'DELETE',
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

  if (loadError) {
    return (
      <div role="alert" className="rounded-xl border border-amber-400/35 bg-slate-900 p-5 text-slate-100">
        <p>{loadError}</p>
        <button type="button" className="mt-3 min-h-11 rounded-lg border border-amber-300/50 px-4 text-amber-200 focus-visible:outline focus-visible:outline-violet-400" onClick={() => { setLoading(true); fetchSubjects() }}>Retry</button>
      </div>
    )
  }

  const query = search.trim().toLowerCase()
  const years = [...new Set(subjects.map(subject => String(subject.year_level ?? 'none')))].sort()
  const visibleSubjects = subjects.filter(subject =>
    (year === 'all' || String(subject.year_level ?? 'none') === year) &&
    [subject.name, subject.subject_code, subject.internal_subject_no, subject.department].some(value => String(value ?? '').toLowerCase().includes(query))
  )

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed inset-x-4 top-4 z-[9999] max-w-md break-words px-5 sm:left-auto sm:right-6 py-3 rounded-xl font-semibold text-white shadow-xl transition ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.message}
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-600/40 rounded-2xl w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl shadow-red-900/30">
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
                Delete <span className="text-white font-semibold">"{deleteTarget.name}"</span>? This removes its lessons, class codes, enrollments and instructor assignments, and detaches its quests from the catalog.
              </p>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={() => setDeleteTarget(null)}
                className="admin-button flex-1 py-2.5 rounded-xl text-slate-300 font-bold transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteSubject}
                className="admin-button admin-button-danger flex-1 py-2.5 rounded-xl text-white font-bold transition text-sm"
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
          <div className="bg-slate-900 border border-amber-300/35 rounded-2xl w-full max-w-lg max-h-[calc(100dvh-2rem)] overflow-y-auto shadow-2xl">
            <div className="bg-violet-950/40 px-6 py-5 border-b border-amber-300/25 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="font-cinzel text-xl font-semibold text-white">Edit subject</h2>
                  <p className="text-slate-300 text-sm">Update subject details</p>
                </div>
              </div>
              <button onClick={() => { setShowEditModal(false); setEditingSubject(null) }}
                className="admin-button w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 transition text-lg">✕</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
              <div className="grid gap-3 sm:grid-cols-3 [&>*]:min-w-0">
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
                  className="admin-button flex-1 py-2.5 rounded-xl text-white font-bold transition border">
                  Cancel
                </button>
                <button onClick={handleSaveEdit} disabled={savingEdit}
                  className="admin-button admin-button-primary flex-1 py-2.5 rounded-xl text-white font-bold transition flex items-center justify-center gap-2 disabled:opacity-60">
                  {savingEdit ? 'Saving…' : '💾 Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-cinzel text-2xl font-semibold text-white">Subject catalog</h2>
          <p className="mt-1 text-sm text-slate-300">Find and manage the subjects used by class codes.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="admin-button admin-button-primary px-5 py-2.5 rounded-xl text-white font-bold text-sm transition flex items-center gap-2"
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

      {subjects.length > 0 && <section aria-label="Subject filters" className="grid gap-4 rounded-xl border border-amber-300/25 bg-slate-900 p-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
        <label className="min-w-0 space-y-2 text-sm text-slate-200"><span>Search subjects</span>
          <input type="search" className={subjectField} value={search} onChange={event => setSearch(event.target.value)} placeholder="Subject name, code, or department" />
        </label>
        <label className="min-w-0 space-y-2 text-sm text-slate-200"><span id="subject-year-filter-label">Curriculum year</span>
          <select aria-labelledby="subject-year-filter-label" className={subjectField} value={year} onChange={event => setYear(event.target.value)}>
            <option value="all">All years</option>
            {years.map(value => <option key={value} value={value}>{value === 'none' ? 'No year set' : accentFor(Number(value)).label}</option>)}
          </select>
        </label>
        <button type="button" disabled={!search && year === 'all'} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-amber-200 hover:bg-amber-300/10 focus-visible:outline focus-visible:outline-violet-400 disabled:opacity-50" onClick={() => { setSearch(''); setYear('all') }}>Clear filters</button>
      </section>}
      {subjects.length > 0 && <p className="text-sm text-slate-300" aria-live="polite">Showing {visibleSubjects.length} of {subjects.length} subjects</p>}

      {visibleSubjects.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-bold text-white mb-2">{subjects.length ? 'No matching subjects' : 'No subjects yet'}</h3>
          <p className="text-slate-400">{subjects.length ? 'Try another search or clear the filters.' : 'Create a subject to get started.'}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(
            visibleSubjects.reduce((groups, s) => {
              const key = s.year_level ?? 'none'
              ;(groups[key] ||= []).push(s)
              return groups
            }, {})
          )
            .sort(([a], [b]) => (a === 'none' ? 1 : b === 'none' ? -1 : a - b))
            .map(([yearKey, group]) => {
              const accent = accentFor(Number(yearKey))
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
                        <article
                          key={subject.id}
                          className={`relative bg-slate-900/60 border ${a.border} ${a.hoverBorder} rounded-xl pl-5 pr-4 py-4 transition group overflow-hidden`}
                        >
                          <span className={`absolute left-0 top-0 bottom-0 w-1 ${a.bar}`} />
                          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
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
                                <h3 className="mt-1 break-words font-cinzel text-base font-semibold text-white">{subject.name}</h3>
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
                            <div className="flex flex-wrap justify-end gap-2 shrink-0">
                              <button
                                onClick={() => handleEditClick(subject)}
                                aria-label={'Edit ' + subject.name}
                                className="min-h-10 rounded-lg border border-amber-300/30 px-3 text-sm font-semibold text-amber-100 hover:bg-amber-300/10 focus-visible:outline focus-visible:outline-violet-400"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSubject(subject.id, subject.name)}
                                aria-label={'Delete ' + subject.name}
                                className="min-h-10 rounded-lg border border-red-400/25 px-3 text-sm font-semibold text-red-200 hover:bg-red-400/10 focus-visible:outline focus-visible:outline-violet-400"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                </div>
              )
            })}
        </div>
      )}

      {showCreateModal && (
        <dialog
          ref={createDialog}
          aria-labelledby="create-subject-title"
          aria-describedby="create-subject-description"
          onCancel={(event) => { event.preventDefault(); if (!creating) closeCreateSubject() }}
          className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl border border-amber-300/35 bg-slate-900 p-0 text-slate-100 backdrop:bg-slate-950/80"
        >
          <form onSubmit={handleCreateSubject} className="flex max-h-[calc(100dvh-2rem)] flex-col">
            <header className="border-b border-amber-300/20 bg-violet-950/30 px-5 py-5 sm:px-7">
              <h2 id="create-subject-title" className="font-cinzel text-2xl font-semibold">Create Subject</h2>
              <p id="create-subject-description" className="mt-1 text-sm text-slate-300">Add a first-year lab subject to the course catalog.</p>
            </header>
            <fieldset disabled={creating} className="min-h-0 min-w-0 space-y-4 overflow-y-auto px-5 py-5 sm:px-7">
              <label className="block space-y-2 text-sm font-medium">
                <span>Subject name <span className="text-amber-300" aria-hidden="true">*</span></span>
                <input className={subjectField} required maxLength={200} autoFocus value={newSubject.name}
                  onChange={event => setNewSubject({ ...newSubject, name: event.target.value })} placeholder="e.g. Intermediate Programming" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium">
                  <span>Subject number</span>
                  <input className={subjectField} maxLength={10} value={newSubject.internal_subject_no}
                    onChange={event => setNewSubject({ ...newSubject, internal_subject_no: event.target.value })} placeholder="e.g. 290007" />
                </label>
                <label className="block space-y-2 text-sm font-medium">
                  <span>Subject code</span>
                  <input className={subjectField} maxLength={20} value={newSubject.subject_code}
                    onChange={event => setNewSubject({ ...newSubject, subject_code: event.target.value.toUpperCase() })} placeholder="e.g. IT115L" />
                </label>
              </div>
              <label className="block space-y-2 text-sm font-medium">
                <span>Description <span className="font-normal text-slate-400">(optional)</span></span>
                <textarea className={subjectField} rows={3} value={newSubject.description}
                  onChange={event => setNewSubject({ ...newSubject, description: event.target.value })} />
              </label>
              <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
                <label className="block space-y-2 text-sm font-medium">
                  <span>Units</span>
                  <select className={subjectField} value={newSubject.units}
                    onChange={event => setNewSubject({ ...newSubject, units: event.target.value })}>
                    <option value="">Not set</option>
                    <option value="1">1 unit</option>
                    <option value="2">2 units</option>
                    <option value="3">3 units</option>
                  </select>
                </label>
                <label className="block min-w-0 space-y-2 text-sm font-medium">
                  <span>Department / college</span>
                  <select className={subjectField} value={newSubject.department}
                    onChange={event => setNewSubject({ ...newSubject, department: event.target.value })}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
              </div>
              <p className="border-t border-slate-700 pt-3 text-sm text-slate-300">Curriculum year: <strong>First year</strong> <span className="mx-2 text-slate-500" aria-hidden="true">·</span> Type: <strong>Lab</strong></p>
            </fieldset>
            <footer className="shrink-0 border-t border-amber-300/20 bg-slate-950/50 px-5 py-4 sm:px-7">
              {createError && <p role="alert" className="mb-3 text-sm text-rose-200">{createError}</p>}
              <div className="flex flex-wrap justify-end gap-3">
                <button type="button" disabled={creating} onClick={closeCreateSubject}
                  className="min-h-11 rounded-lg border border-amber-300/45 px-4 text-sm font-semibold text-amber-100 hover:bg-amber-300/10 focus-visible:outline focus-visible:outline-violet-400 disabled:opacity-50">Cancel</button>
                <button type="submit" disabled={creating}
                  className="admin-button admin-button-primary font-cinzel min-h-11 rounded-lg border px-5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-amber-300 disabled:opacity-70">{creating ? 'Creating…' : 'Create Subject'}</button>
              </div>
            </footer>
          </form>
        </dialog>
      )}
    </div>
  )
}
