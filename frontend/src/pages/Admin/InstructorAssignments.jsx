import { useState, useEffect } from 'react'

const API = 'http://localhost:5000'

export default function InstructorAssignments() {
  const [assignments, setAssignments] = useState([])
  const [instructors, setInstructors] = useState([])
  const [subjects, setSubjects] = useState([])
  const [sections, setSections] = useState([])
  const [filteredSections, setFilteredSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const [formData, setFormData] = useState({
    instructor_id: '',
    subject_id: '',
    section_id: '',
  })

  const [editingAssignment, setEditingAssignment] = useState(null)

  const [filterInstructor, setFilterInstructor] = useState('all')
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterSection, setFilterSection] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchAssignments()
    fetchInstructors()
    fetchSubjects()
    fetchSections()
  }, [])

  // Filter sections when subject changes (optional UX improvement)
  useEffect(() => {
    if (!formData.subject_id) {
      setFilteredSections(sections)
      return
    }
    // Show all sections — backend controls which are valid per subject
    setFilteredSections(sections)

    // Reset section if not already set
    if (formData.section_id) {
      setFormData(prev => ({ ...prev, section_id: '' }))
    }
  }, [formData.subject_id, sections])

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('token')
      let url = `${API}/api/admin/instructor-assignments?`
      if (filterInstructor !== 'all') url += `instructor_id=${filterInstructor}&`
      if (filterSubject !== 'all') url += `subject_id=${filterSubject}&`
      if (filterSection !== 'all') url += `section_id=${filterSection}&`

      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setAssignments(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch assignments:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchInstructors = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/admin/users?role=instructor`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setInstructors(Array.isArray(data) ? data : [])
      }
    } catch (err) { console.error('Failed to fetch instructors:', err) }
  }

  const fetchSubjects = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/admin/subjects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSubjects(Array.isArray(data) ? data : [])
      }
    } catch (err) { console.error('Failed to fetch subjects:', err) }
  }

  // Fetch sections (was fetchBlocks)
  const fetchSections = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/admin/sections`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data) ? data : []
        setSections(list)
        setFilteredSections(list)
      }
    } catch (err) { console.error('Failed to fetch sections:', err) }
  }

  const handleEditAssignment = (assignment) => {
    setEditingAssignment(assignment)
    setFormData({
      instructor_id: assignment.instructor?.id || '',
      subject_id:    assignment.subject?.id    || '',
      section_id:    assignment.section?.id    || '',
    })
  }

  const handleUpdateAssignment = async () => {
    if (!formData.instructor_id || !formData.subject_id || !formData.section_id) {
      alert('Please fill in all fields')
      return
    }
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/admin/instructor-assignments/${editingAssignment.id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setEditingAssignment(null)
        setFormData({ instructor_id: '', subject_id: '', section_id: '' })
        await fetchAssignments()
        alert('✅ Assignment updated successfully!')
      } else {
        const error = await res.json()
        alert(`Failed to update assignment: ${error.error}`)
      }
    } catch (err) {
      console.error('Failed to update assignment:', err)
      alert('Failed to update assignment')
    }
  }

  const handleCreateAssignment = async () => {
    if (!formData.instructor_id || !formData.subject_id || !formData.section_id) {
      alert('Please fill in all fields')
      return
    }
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/admin/instructor-assignments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setShowCreateModal(false)
        setFormData({ instructor_id: '', subject_id: '', section_id: '' })
        await fetchAssignments()
        alert('✅ Instructor assigned successfully!')
      } else {
        const error = await res.json()
        alert(`Failed to create assignment: ${error.error}`)
      }
    } catch (err) {
      console.error('Failed to create assignment:', err)
      alert('Failed to create assignment')
    }
  }

  const handleDeleteAssignment = async (assignmentId) => {
    const confirmText = prompt('Type "DELETE" to confirm removal of this assignment:')
    if (confirmText !== 'DELETE') { alert('Deletion cancelled.'); return }
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/admin/instructor-assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        await fetchAssignments()
        alert('✅ Assignment removed successfully!')
      } else {
        const error = await res.json()
        alert(`Failed to remove assignment: ${error.error}`)
      }
    } catch (err) {
      console.error('Failed to delete assignment:', err)
      alert('Failed to delete assignment')
    }
  }

  const filteredAssignments = assignments.filter(assignment => {
    if (filterInstructor !== 'all' && assignment.instructor?.id != filterInstructor) return false
    if (filterSubject !== 'all' && assignment.subject?.id != filterSubject) return false
    if (filterSection !== 'all' && assignment.section?.id != filterSection) return false
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const instructorName = assignment.instructor?.username?.toLowerCase() || ''
      const subjectName    = assignment.subject?.name?.toLowerCase()         || ''
      const sectionCode    = assignment.section?.section_no?.toLowerCase()   || ''
      return instructorName.includes(term) || subjectName.includes(term) || sectionCode.includes(term)
    }
    return true
  })

  const stats = {
    total:            assignments.length,
    uniqueInstructors: new Set(assignments.map(a => a.instructor?.id)).size,
    uniqueSubjects:   new Set(assignments.map(a => a.subject?.id)).size,
    uniqueSections:   new Set(assignments.map(a => a.section?.id)).size,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-purple-300 font-mono text-lg">Loading assignments...</p>
        </div>
      </div>
    )
  }

  const AssignmentForm = ({ onSubmit, onCancel, title }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border-2 border-purple-600/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <span>{title.includes('Edit') ? '✏️' : '👨‍🏫'}</span> {title}
        </h2>
        <div className="space-y-4">
          {/* Instructor */}
          <div>
            <label className="block text-slate-400 text-sm mb-2">Instructor *</label>
            <select
              value={formData.instructor_id}
              onChange={e => setFormData({ ...formData, instructor_id: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
            >
              <option value="">Select Instructor</option>
              {instructors.map(inst => (
                <option key={inst.id} value={inst.id}>{inst.username}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-slate-400 text-sm mb-2">Subject *</label>
            <select
              value={formData.subject_id}
              onChange={e => setFormData({ ...formData, subject_id: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
            >
              <option value="">Select Subject</option>
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>
                  {sub.subject_code ? `[${sub.subject_code}] ` : ''}{sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Class Code (Section) */}
          <div>
            <label className="block text-slate-400 text-sm mb-2">Class Code *</label>
            <select
              value={formData.section_id}
              onChange={e => setFormData({ ...formData, section_id: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
            >
              <option value="">Select Class Code</option>
              {filteredSections.map(s => (
                <option key={s.id} value={s.id}>
                  {s.section_no}
                  {s.subject_code ? ` — ${s.subject_code}` : ''}
                  {s.subject_name ? ` · ${s.subject_name}` : ''}
                  {s.semester ? ` (${s.semester})` : ''}
                </option>
              ))}
            </select>
            {filteredSections.length === 0 && (
              <p className="text-yellow-400 text-xs mt-1">⚠️ No class codes found — create sections first</p>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-white font-bold transition shadow-lg shadow-purple-600/30"
          >
            {title.includes('Edit') ? 'Save Changes' : 'Assign Instructor'}
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Instructor Assignments</h1>
          <p className="text-slate-400 mt-1">Manage which instructors teach which subjects in each class code</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAssignments}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition flex items-center gap-2"
          >
            <span>🔄</span> Refresh
          </button>
          <button
            onClick={() => { setFormData({ instructor_id: '', subject_id: '', section_id: '' }); setShowCreateModal(true) }}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-white font-bold transition shadow-lg shadow-purple-600/30"
          >
            <span className="text-xl">+</span> Assign Instructor
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-900/30 to-slate-900 border border-purple-600/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Assignments</p>
          <p className="text-3xl font-bold text-purple-300 mt-1">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-900/30 to-slate-900 border border-blue-600/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Active Instructors</p>
          <p className="text-3xl font-bold text-blue-300 mt-1">{stats.uniqueInstructors}</p>
        </div>
        <div className="bg-gradient-to-br from-green-900/30 to-slate-900 border border-green-600/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Subjects Covered</p>
          <p className="text-3xl font-bold text-green-300 mt-1">{stats.uniqueSubjects}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-900/30 to-slate-900 border border-yellow-600/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Class Codes Used</p>
          <p className="text-3xl font-bold text-yellow-300 mt-1">{stats.uniqueSections}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Search by instructor, subject, or class code..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 outline-none focus:border-purple-500"
            />
          </div>
          <select
            value={filterInstructor}
            onChange={e => setFilterInstructor(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
          >
            <option value="all">All Instructors</option>
            {instructors.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.username}</option>
            ))}
          </select>
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
          >
            <option value="all">All Subjects</option>
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>
                {sub.subject_code ? `[${sub.subject_code}] ` : ''}{sub.name}
              </option>
            ))}
          </select>
          <select
            value={filterSection}
            onChange={e => setFilterSection(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
          >
            <option value="all">All Class Codes</option>
            {sections.map(s => (
              <option key={s.id} value={s.id}>{s.section_no}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            Showing <span className="text-white font-bold">{filteredAssignments.length}</span> of{' '}
            <span className="text-white font-bold">{assignments.length}</span> assignments
          </span>
          {(searchTerm || filterInstructor !== 'all' || filterSubject !== 'all' || filterSection !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setFilterInstructor('all'); setFilterSubject('all'); setFilterSection('all') }}
              className="text-purple-400 hover:text-purple-300"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Assignments grouped by instructor */}
      {filteredAssignments.length === 0 ? (
        <div className="bg-slate-900/60 border border-dashed border-slate-700 rounded-2xl p-16 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-bold text-white mb-2">No assignments found</h3>
          <p className="text-slate-400 text-sm">
            {assignments.length === 0 ? 'Click "+ Assign Instructor" to get started.' : 'Try adjusting your filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(
            filteredAssignments.reduce((groups, assignment) => {
              const key = assignment.instructor?.id || 'unknown'
              if (!groups[key]) groups[key] = { instructor: assignment.instructor, assignments: [] }
              groups[key].assignments.push(assignment)
              return groups
            }, {})
          ).map(([instructorId, group]) => (
            <div key={instructorId} className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-600/30 transition">
              {/* Instructor header */}
              <div className="flex items-center gap-4 px-6 py-4 bg-slate-800/60 border-b border-slate-700/50">
                <div className="w-11 h-11 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-lg font-black text-white shadow-lg shadow-purple-600/30 flex-shrink-0">
                  {group.instructor?.username?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white text-base">{group.instructor?.username || 'Unknown Instructor'}</p>
                  <p className="text-xs text-slate-400">{group.assignments.length} assignment{group.assignments.length !== 1 ? 's' : ''}</p>
                </div>
                <span className="px-3 py-1 bg-purple-600/20 text-purple-300 text-xs font-bold rounded-full border border-purple-600/30">
                  👨‍🏫 Instructor
                </span>
              </div>

              {/* Assignment rows grouped by subject */}
              <div className="divide-y divide-slate-800/60">
                {Object.entries(
                  group.assignments.reduce((acc, a) => {
                    const key = a.subject?.id || 'unknown'
                    if (!acc[key]) acc[key] = { subject: a.subject, assignments: [] }
                    acc[key].assignments.push(a)
                    return acc
                  }, {})
                ).map(([subjectId, subjectGroup]) => (
                  <div key={subjectId} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-800/30 transition group">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Subject</span>
                      <span className="px-3 py-1 bg-green-600/15 text-green-300 rounded-lg text-sm font-bold border border-green-600/25">
                        {subjectGroup.subject?.name || 'Unknown'}
                      </span>
                      <span className="text-slate-500 text-xs uppercase tracking-wider font-bold ml-2">Class Codes</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {subjectGroup.assignments.map(a => (
                          <span key={a.id} className="px-3 py-1 bg-purple-600/15 text-purple-300 rounded-lg text-sm font-bold border border-purple-600/25 font-mono">
                            {a.section?.section_no || 'Unknown'}
                          </span>
                        ))}
                      </div>
                    </div>
                    {/* Per-assignment edit/delete */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition ml-4 flex-shrink-0">
                      {subjectGroup.assignments.map(a => (
                        <div key={a.id} className="flex gap-1">
                          <button
                            onClick={() => handleEditAssignment(a)}
                            className="px-2.5 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded-lg text-xs font-bold transition border border-purple-600/30"
                            title={`Edit ${a.section?.section_no}`}
                          >
                            ✏️ {a.section?.section_no}
                          </button>
                          <button
                            onClick={() => handleDeleteAssignment(a.id)}
                            className="px-2 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-lg text-xs font-bold transition border border-red-600/30"
                            title={`Remove ${a.section?.section_no}`}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingAssignment && (
        <AssignmentForm
          title="Edit Assignment"
          onSubmit={handleUpdateAssignment}
          onCancel={() => { setEditingAssignment(null); setFormData({ instructor_id: '', subject_id: '', section_id: '' }) }}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <AssignmentForm
          title="Assign Instructor"
          onSubmit={handleCreateAssignment}
          onCancel={() => { setShowCreateModal(false); setFormData({ instructor_id: '', subject_id: '', section_id: '' }) }}
        />
      )}
    </div>
  )
}
