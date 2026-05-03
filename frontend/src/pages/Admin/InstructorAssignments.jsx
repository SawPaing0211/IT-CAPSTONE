import { useState, useEffect } from 'react'

export default function InstructorAssignments() {
  const [assignments, setAssignments] = useState([])
  const [instructors, setInstructors] = useState([])
  const [subjects, setSubjects] = useState([])
  const [blocks, setBlocks] = useState([])
  const [filteredBlocks, setFilteredBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Form state
  const [formData, setFormData] = useState({
    instructor_id: '',
    subject_id: '',
    block_id: ''
  })
  
  // Edit state
  const [editingAssignment, setEditingAssignment] = useState(null)
  
  // Filter state
  const [filterInstructor, setFilterInstructor] = useState('all')
  const [filterSubject, setFilterSubject] = useState('all')
  const [filterBlock, setFilterBlock] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchAssignments()
    fetchInstructors()
    fetchSubjects()
    fetchBlocks()
  }, [])

  // ✅ NEW: Filter blocks when subject changes
useEffect(() => {
  if (!formData.subject_id) {
    setFilteredBlocks([])
    return
  }
  
  // Find the selected subject name
  const selectedSubject = subjects.find(s => s.id == formData.subject_id)
  
  // Filter blocks that have the selected subject (block.subjects is an array of names)
  const blocksWithSubject = blocks.filter(block => 
    block.subjects && selectedSubject && block.subjects.includes(selectedSubject.name)
  )
  
  setFilteredBlocks(blocksWithSubject)
  
  // Reset block selection if current block doesn't have this subject
  if (formData.block_id && !blocksWithSubject.some(b => b.id == formData.block_id)) {
    setFormData(prev => ({ ...prev, block_id: '' }))
  }
}, [formData.subject_id, blocks, subjects])  // ✅ Added subjects to dependencies

  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem('token')
      let url = 'http://localhost:5000/api/admin/instructor-assignments?'
      if (filterInstructor !== 'all') url += `instructor_id=${filterInstructor}&`
      if (filterSubject !== 'all') url += `subject_id=${filterSubject}&`
      if (filterBlock !== 'all') url += `block_id=${filterBlock}&`
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
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
      const res = await fetch('http://localhost:5000/api/admin/users?role=instructor', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setInstructors(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch instructors:', err)
    }
  }

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
    }
  }

  const fetchBlocks = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/blocks', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setBlocks(Array.isArray(data) ? data : [])
      }
    } catch (err) {
      console.error('Failed to fetch blocks:', err)
    }
  }

  const handleEditAssignment = (assignment) => {
    setEditingAssignment(assignment)
    setFormData({
      instructor_id: assignment.instructor?.id || '',
      subject_id: assignment.subject?.id || '',
      block_id: assignment.block?.id || ''
    })
  }

  const handleUpdateAssignment = async () => {
    if (!formData.instructor_id || !formData.subject_id || !formData.block_id) {
      alert('Please fill in all fields')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/instructor-assignments/${editingAssignment.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setEditingAssignment(null)
        setFormData({ instructor_id: '', subject_id: '', block_id: '' })
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
    if (!formData.instructor_id || !formData.subject_id || !formData.block_id) {
      alert('Please fill in all fields')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/instructor-assignments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        setShowCreateModal(false)
        setFormData({ instructor_id: '', subject_id: '', block_id: '' })
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
    const confirmText = prompt(`Type "DELETE" to confirm removal of this assignment:`)
    if (confirmText !== 'DELETE') {
      alert('Deletion cancelled.')
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/instructor-assignments/${assignmentId}`, {
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

  // Filter assignments
  const filteredAssignments = assignments.filter(assignment => {
    if (filterInstructor !== 'all' && assignment.instructor?.id != filterInstructor) return false
    if (filterSubject !== 'all' && assignment.subject?.id != filterSubject) return false
    if (filterBlock !== 'all' && assignment.block?.id != filterBlock) return false
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const instructorName = assignment.instructor?.username?.toLowerCase() || ''
      const subjectName = assignment.subject?.name?.toLowerCase() || ''
      const blockCode = assignment.block?.section_code?.toLowerCase() || ''
      
      return instructorName.includes(term) || subjectName.includes(term) || blockCode.includes(term)
    }
    
    return true
  })

  // Stats
  const stats = {
    total: assignments.length,
    uniqueInstructors: new Set(assignments.map(a => a.instructor?.id)).size,
    uniqueSubjects: new Set(assignments.map(a => a.subject?.id)).size,
    uniqueBlocks: new Set(assignments.map(a => a.block?.id)).size
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Instructor Assignments</h1>
          <p className="text-slate-400 mt-1">Manage which instructors teach which subjects in each block</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchAssignments}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition flex items-center gap-2"
          >
            <span>🔄</span> Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
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
          <p className="text-slate-400 text-sm">Subjects Taught</p>
          <p className="text-3xl font-bold text-green-300 mt-1">{stats.uniqueSubjects}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-900/30 to-slate-900 border border-yellow-600/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Blocks Covered</p>
          <p className="text-3xl font-bold text-yellow-300 mt-1">{stats.uniqueBlocks}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Search by instructor, subject, or block..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 outline-none focus:border-purple-500"
            />
          </div>

          {/* Instructor Filter */}
          <select
            value={filterInstructor}
            onChange={(e) => setFilterInstructor(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
          >
            <option value="all">All Instructors</option>
            {instructors.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.username}</option>
            ))}
          </select>

          {/* Subject Filter */}
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
          >
            <option value="all">All Subjects</option>
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name}</option>
            ))}
          </select>

          {/* Block Filter */}
          <select
            value={filterBlock}
            onChange={(e) => setFilterBlock(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
          >
            <option value="all">All Blocks</option>
            {blocks.map(block => (
              <option key={block.id} value={block.id}>{block.section_code}</option>
            ))}
          </select>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            Showing <span className="text-white font-bold">{filteredAssignments.length}</span> of <span className="text-white font-bold">{assignments.length}</span> assignments
          </span>
          {(searchTerm || filterInstructor !== 'all' || filterSubject !== 'all' || filterBlock !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setFilterInstructor('all'); setFilterSubject('all'); setFilterBlock('all') }}
              className="text-purple-400 hover:text-purple-300"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Assignments List — grouped by instructor */}
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
          {/* Group by instructor */}
          {Object.entries(
            filteredAssignments.reduce((groups, assignment) => {
              const key = assignment.instructor?.id || 'unknown'
              if (!groups[key]) groups[key] = { instructor: assignment.instructor, assignments: [] }
              groups[key].assignments.push(assignment)
              return groups
            }, {})
          ).map(([instructorId, group]) => (
            <div key={instructorId} className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-600/30 transition">
              {/* Instructor Header */}
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

              {/* Assignment Rows */}
              <div className="divide-y divide-slate-800/60">
                {group.assignments.map(assignment => (
                  <div key={assignment.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-800/30 transition group">
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Subject */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Subject</span>
                        <span className="px-3 py-1 bg-green-600/15 text-green-300 rounded-lg text-sm font-bold border border-green-600/25">
                          {assignment.subject?.name || 'Unknown'}
                        </span>
                      </div>
                      <span className="text-slate-600 text-xs">in</span>
                      {/* Block */}
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs uppercase tracking-wider font-bold">Block</span>
                        <span className="px-3 py-1 bg-purple-600/15 text-purple-300 rounded-lg text-sm font-bold border border-purple-600/25">
                          {assignment.block?.section_code || 'Unknown'}
                        </span>
                      </div>
                      <span className="text-slate-700 text-xs ml-2">#{assignment.id}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleEditAssignment(assignment)}
                        className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded-lg text-xs font-bold transition border border-purple-600/30"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteAssignment(assignment.id)}
                        className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-lg text-xs font-bold transition border border-red-600/30"
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Assignment Modal */}
      {editingAssignment && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border-2 border-purple-600/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span>✏️</span> Edit Assignment
            </h2>
            <div className="space-y-4">
              {/* Instructor Select */}
              <div>
                <label className="block text-slate-400 text-sm mb-2">Instructor *</label>
                <select
                  value={formData.instructor_id}
                  onChange={(e) => setFormData({...formData, instructor_id: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                >
                  <option value="">Select Instructor</option>
                  {instructors.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.username}</option>
                  ))}
                </select>
              </div>

              {/* Subject Select */}
              <div>
                <label className="block text-slate-400 text-sm mb-2">Subject *</label>
                <select
                  value={formData.subject_id}
                  onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                >
                  <option value="">Select Subject</option>
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>

              {/* Block Select */}
              <div>
                <label className="block text-slate-400 text-sm mb-2">Block *</label>
                <select
                  value={formData.block_id}
                  onChange={(e) => setFormData({...formData, block_id: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                  disabled={!formData.subject_id}
                >
                  <option value="">
                    {formData.subject_id ? 'Select Block' : 'Please select a subject first'}
                  </option>
                  {filteredBlocks.map(block => (
                    <option key={block.id} value={block.id}>{block.section_code} - {block.semester || 'No Semester'}</option>
                  ))}
                </select>
                {formData.subject_id && filteredBlocks.length === 0 && (
                  <p className="text-yellow-400 text-xs mt-1">⚠️ No blocks found with this subject</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setEditingAssignment(null); setFormData({ instructor_id: '', subject_id: '', block_id: '' }) }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateAssignment}
                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-white font-bold transition shadow-lg shadow-purple-600/30"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border-2 border-purple-600/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span>👨‍🏫</span> Assign Instructor
            </h2>
            <div className="space-y-4">
              {/* Instructor Select */}
              <div>
                <label className="block text-slate-400 text-sm mb-2">Instructor *</label>
                <select
                  value={formData.instructor_id}
                  onChange={(e) => setFormData({...formData, instructor_id: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                >
                  <option value="">Select Instructor</option>
                  {instructors.map(inst => (
                    <option key={inst.id} value={inst.id}>{inst.username}</option>
                  ))}
                </select>
              </div>

              {/* Subject Select */}
              <div>
                <label className="block text-slate-400 text-sm mb-2">Subject *</label>
                <select
                  value={formData.subject_id}
                  onChange={(e) => setFormData({...formData, subject_id: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                >
                  <option value="">Select Subject</option>
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>

              {/* Block Select */}
              <div>
                <label className="block text-slate-400 text-sm mb-2">Block *</label>
                <select
                  value={formData.block_id}
                  onChange={(e) => setFormData({...formData, block_id: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                  disabled={!formData.subject_id}
                >
                  <option value="">
                    {formData.subject_id ? 'Select Block' : 'Please select a subject first'}
                  </option>
                  {filteredBlocks.map(block => (
                    <option key={block.id} value={block.id}>{block.section_code} - {block.semester || 'No Semester'}</option>
                  ))}
                </select>
                {formData.subject_id && filteredBlocks.length === 0 && (
                  <p className="text-yellow-400 text-xs mt-1">⚠️ No blocks found with this subject</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowCreateModal(false); setFormData({ instructor_id: '', subject_id: '', block_id: '' }) }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAssignment}
                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-white font-bold transition shadow-lg shadow-purple-600/30"
              >
                Assign Instructor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}