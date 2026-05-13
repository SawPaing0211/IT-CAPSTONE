import { useState, useEffect } from 'react'

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
  const [newSubject, setNewSubject] = useState({
    internal_subject_no: '',
    name: '',
    description: '',
    subject_code: '',
    units: '',
    department: '',
    year_level: '',
    subject_type: 'lab',
  })

  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/subjects', {
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

  const handleCreateSubject = async () => {
    if (!newSubject.name.trim()) {
      alert('Subject name is required')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/subjects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // ✅ Include internal_subject_no in payload
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
          year_level: '', 
          subject_type: 'lab' 
        })
        await fetchSubjects()
        alert('✅ Subject created successfully!')
      } else {
        const error = await res.json()
        alert(`Failed to create subject: ${error.error}`)
      }
    } catch (err) {
      console.error('Failed to create subject:', err)
      alert('Failed to create subject')
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

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

  const handleSaveEdit = async () => {
    if (!editForm.name.trim()) {
      showToast('Subject name is required', 'error')
      return
    }
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/subjects/${editingSubject.id}`, {
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

  const handleDeleteSubject = async (subjectId, subjectName) => {
    if (!confirm(`Delete "${subjectName}"?\n\n⚠️ This will affect blocks using this subject!`)) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/subjects/${subjectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        await fetchSubjects()
        alert('✅ Subject deleted successfully!')
      } else {
        const error = await res.json()
        alert(`Failed to delete subject: ${error.error}`)
      }
    } catch (err) {
      console.error('Failed to delete subject:', err)
      alert('Failed to delete subject')
    }
  }

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
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-lg">×</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Subject Number</label>
                  <input type="text" value={editForm.internal_subject_no}
                    onChange={e => setEditForm({...editForm, internal_subject_no: e.target.value})}
                    placeholder="e.g., 290007"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition font-mono tracking-widest text-sm" />
                  <p className="text-slate-500 text-[10px] mt-1">Adamson internal ID</p>
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
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Year Level</label>
                  <select value={editForm.year_level} onChange={e => setEditForm({...editForm, year_level: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm">
                    <option value="">Any</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Type</label>
                  <select value={editForm.subject_type} onChange={e => setEditForm({...editForm, subject_type: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm">
                    <option value="lab">Lab ✓</option>
                    <option value="lecture_lab">Lec + Lab</option>
                    <option value="elective">Elective</option>
                  </select>
                  <p className="text-yellow-500/80 text-[10px] mt-1">Only Lab subjects supported</p>
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Subjects Management</h1>
          <p className="text-slate-400 mt-1">Create and manage course subjects</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white font-bold transition shadow-lg shadow-purple-600/30 flex items-center gap-2"
        >
          <span className="text-xl">+</span> Create Subject
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-900/30 to-slate-900 border border-purple-600/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Subjects</p>
          <p className="text-3xl font-bold text-purple-300 mt-1">{subjects.length}</p>
        </div>
      </div>

      {/* Subjects List */}
      {subjects.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-bold text-white mb-2">No subjects found</h3>
          <p className="text-slate-400">Create your first subject to get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map(subject => (
            <div key={subject.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-purple-600/40 transition group">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                    📖
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {/* ✅ Show Subject Number (Adamson's internal number) */}
                      {subject.internal_subject_no && (
                        <span className="font-mono text-xs font-bold bg-slate-800 text-yellow-300 border border-yellow-600/30 px-2 py-0.5 rounded">
                          {subject.internal_subject_no}
                        </span>
                      )}
                      {/* Subject Code */}
                      {subject.subject_code && (
                        <span className="font-mono text-xs font-bold bg-slate-800 text-purple-300 border border-purple-600/30 px-2 py-0.5 rounded">
                          {subject.subject_code}
                        </span>
                      )}
                      <h3 className="text-lg font-bold text-white">{subject.name}</h3>
                    </div>
                    {subject.description ? (
                      <p className="text-slate-400 text-sm mb-2">{subject.description}</p>
                    ) : (
                      <p className="text-slate-600 text-sm italic mb-2">No description</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {subject.units && <span className="text-xs bg-blue-600/20 text-blue-300 border border-blue-600/30 px-2 py-0.5 rounded-full">{subject.units} units</span>}
                      {subject.year_level && <span className="text-xs bg-green-600/20 text-green-300 border border-green-600/30 px-2 py-0.5 rounded-full">Year {subject.year_level}</span>}
                      {subject.subject_type && <span className="text-xs bg-orange-600/20 text-orange-300 border border-orange-600/30 px-2 py-0.5 rounded-full capitalize">{subject.subject_type.replace('_', ' + ')}</span>}
                      {subject.department && <span className="text-xs bg-purple-600/20 text-purple-300 border border-purple-600/30 px-2 py-0.5 rounded-full">{subject.department}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => handleEditClick(subject)}
                    className="px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-sm font-bold transition flex items-center gap-2"
                  >
                    <span>✏️</span> Edit
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(subject.id, subject.name)}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg text-sm font-bold transition flex items-center gap-2"
                  >
                    <span>🗑️</span> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
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
              >×</button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

              {/* ✅ Subject Number + Subject Code + Name */}
              <div className="grid grid-cols-3 gap-3">
                {/* Adamson Subject Number */}
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
                  <p className="text-slate-500 text-[10px] mt-1">Adamson internal ID</p>
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
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Year Level</label>
                  <select
                    value={newSubject.year_level}
                    onChange={(e) => setNewSubject({...newSubject, year_level: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm"
                  >
                    <option value="">Any</option>
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Type</label>
                  <select
                    value={newSubject.subject_type}
                    onChange={(e) => setNewSubject({...newSubject, subject_type: e.target.value})}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500 transition text-sm"
                  >
                    <option value="lab">Lab ✓</option>
                    <option value="lecture_lab">Lec + Lab</option>
                    <option value="elective">Elective</option>
                  </select>
                  <p className="text-yellow-500/80 text-[10px] mt-1">Only Lab subjects supported</p>
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
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-lg flex-shrink-0">📖</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* ✅ Preview shows both numbers */}
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
                      year_level: '', 
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
                  ✅ Create Subject
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}