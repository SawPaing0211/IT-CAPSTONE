import { useState, useEffect } from 'react'
import CreateBlockModal from './CreateBlockModal'

export default function BlocksSections() {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [semesterFilter, setSemesterFilter] = useState('all')
  const [sortBy, setSortBy] = useState('section_code')
  const [sortOrder, setSortOrder] = useState('asc')
  const [viewMode, setViewMode] = useState('list') // 'list' or 'grid'
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBlock, setNewBlock] = useState({
    section_code: '', 
    semester: '',
    subjects: []  
  })

  const [showEditModal, setShowEditModal] = useState(false)
  const [editingBlock, setEditingBlock] = useState(null)
  const [editForm, setEditForm] = useState({
    section_code: '',
    semester: '',
    instructor_id: null,
    subject_ids: []
  })

  const [subjects, setSubjects] = useState([]) // Available subjects from API

  useEffect(() => {
    fetchBlocks()
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
    }
  }

  const fetchBlocks = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/blocks', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setBlocks(data)
      setLoading(false)
    } catch (err) {
      console.error('Failed to fetch blocks:', err)
      setLoading(false)
    }
  }

  const handleDeleteBlock = async (blockId) => {
    if (!confirm('Are you sure you want to delete this block?')) return
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/blocks/${blockId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        fetchBlocks()
        alert('✅ Block deleted successfully!')
      } else {
        let msg = 'Unknown error'
        try {
          const error = await res.json()
          msg = error.error || msg
        } catch {
          msg = `Server error (${res.status})`
        }
        alert(`Failed to delete block: ${msg}`)
      }
    } catch (err) {
      console.error('Failed to delete block:', err)
      alert('Failed to delete block')
    }
  }

  // ✅ Edit block handlers
  const handleEditBlock = (block) => {
    setEditingBlock(block)
    
    // Get current subject IDs from the block's subjects
    const currentSubjectIds = block.subjects && block.subjects.length > 0 
      ? block.subjects.map(subName => {
          const subject = subjects.find(s => s.name === subName)
          return subject ? subject.id : null
        }).filter(id => id !== null)
      : []
    
    setEditForm({
      section_code: block.section_code,
      semester: block.semester || '',
      instructor_id: block.instructor_id,
      subject_ids: currentSubjectIds
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/blocks/${editingBlock.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          section_code: editForm.section_code,
          semester: editForm.semester,
          instructor_id: editForm.instructor_id,
          subject_ids: editForm.subject_ids
        })
      })
      
      if (res.ok) {
        setShowEditModal(false)
        setEditingBlock(null)
        fetchBlocks()
        alert('✅ Block updated successfully!')
      } else {
        const error = await res.json()
        alert(`Failed to update block: ${error.error}`)
      }
    } catch (err) {
      console.error('Failed to update block:', err)
      alert('Failed to update block')
    }
  }

  // Filter and sort blocks
  const getFilteredAndSortedBlocks = () => {
    let filtered = [...blocks]

    // Search filter - now includes subject names
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(block =>
        block.section_code.toLowerCase().includes(term) ||
        (block.subjects && block.subjects.some(s => s.toLowerCase().includes(term))) ||
        (block.instructor && block.instructor.toLowerCase().includes(term))
      )
    }

    // Semester filter
    if (semesterFilter !== 'all') {
      filtered = filtered.filter(block => block.semester === semesterFilter)
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal = a[sortBy]
      let bVal = b[sortBy]
      
      // Handle null/undefined
      if (aVal === null || aVal === undefined) aVal = ''
      if (bVal === null || bVal === undefined) bVal = ''

      // Case-insensitive string comparison
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase()
        bVal = bVal.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })

    return filtered
  }

  // Get unique semesters for filter dropdown
  const getUniqueSemesters = () => {
    const semesters = [...new Set(blocks.map(b => b.semester).filter(Boolean))]
    return semesters.sort()
  }

  // Calculate stats
  const stats = {
    total: blocks.length,
    totalStudents: blocks.reduce((sum, b) => sum + (b.student_count || 0), 0),
    totalInstructors: blocks.reduce((sum, b) => sum + (b.instructor_count || 0), 0),
    avgStudents: blocks.length > 0 ? Math.round(blocks.reduce((sum, b) => sum + (b.student_count || 0), 0) / blocks.length) : 0
  }

  const filteredBlocks = getFilteredAndSortedBlocks()
  const semesters = getUniqueSemesters()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-purple-300 font-mono text-lg">Loading blocks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Blocks & Sections</h1>
          <p className="text-slate-400 mt-1">Manage class blocks and course assignments</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchBlocks}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition flex items-center gap-2"
          >
            <span>🔄</span> Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-white font-bold transition shadow-lg shadow-purple-600/30"
            title="Create a new class block with subjects and instructor"
          >
            <span className="text-xl">+</span> Create Block
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-900/30 to-slate-900 border border-purple-600/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Blocks</p>
          <p className="text-3xl font-bold text-purple-300 mt-1">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-green-900/30 to-slate-900 border border-green-600/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Students</p>
          <p className="text-3xl font-bold text-green-300 mt-1">{stats.totalStudents}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-900/30 to-slate-900 border border-blue-600/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Instructors</p>
          <p className="text-3xl font-bold text-blue-300 mt-1">{stats.totalInstructors}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-900/30 to-slate-900 border border-yellow-600/30 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Avg Students/Block</p>
          <p className="text-3xl font-bold text-yellow-300 mt-1">{stats.avgStudents}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <input
              type="text"
              placeholder="🔍 Search by block code, course name, or instructor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 outline-none focus:border-purple-500"
            />
          </div>

          {/* Semester Filter */}
          <div className="w-full md:w-48">
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
            >
              <option value="all">All Semesters</option>
              {semesters.map(sem => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="w-full md:w-48">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
            >
              <option value="section_code">Sort by Code</option>
              <option value="name">Sort by Name</option>
              <option value="semester">Sort by Semester</option>
              <option value="student_count">Sort by Students</option>
              <option value="created_at">Sort by Date</option>
            </select>
          </div>

          {/* Sort Order Toggle */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition"
            title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              ☰
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              ⊞
            </button>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            Showing <span className="text-white font-bold">{filteredBlocks.length}</span> of <span className="text-white font-bold">{blocks.length}</span> blocks
          </span>
          {(searchTerm || semesterFilter !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setSemesterFilter('all') }}
              className="text-purple-400 hover:text-purple-300"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Blocks List/Grid */}
      {filteredBlocks.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
          <div className="text-6xl mb-4">📦</div>
          <h3 className="text-xl font-bold text-white mb-2">No blocks found</h3>
          <p className="text-slate-400">
            {blocks.length === 0 ? 'Create your first block to get started!' : 'Try adjusting your filters'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="space-y-3">
          {filteredBlocks.map(block => (
            <div key={block.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-purple-600/40 transition group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-2xl">
                    📚
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white">{block.section_code}</h3>
                      <span className="px-2 py-0.5 bg-purple-600/20 text-purple-300 rounded text-xs font-bold border border-purple-600/30">
                        {block.semester || 'No Semester'}
                      </span>
                    </div>
                    {/* ✅ Show subjects as tags instead of single name */}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {block.subjects && block.subjects.length > 0 ? (
                        block.subjects.map((sub, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300">
                            {sub}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 text-xs">No subjects</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span>👨‍🏫 {block.instructor || 'No instructor'}</span>
                      <span>👥 {block.student_count || 0} students</span>
                      <span>📅 {new Date(block.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button 
                    onClick={() => handleEditBlock(block)}
                    className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded-lg text-sm font-bold transition"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg text-sm font-bold transition"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBlocks.map(block => (
            <div key={block.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-purple-600/40 transition group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-2xl">
                  📚
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                  <button 
                    onClick={() => handleEditBlock(block)}
                    className="px-2 py-1 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 rounded text-xs font-bold"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    className="px-2 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded text-xs font-bold"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-white">{block.section_code}</h3>
                  <span className="px-2 py-0.5 bg-purple-600/20 text-purple-300 rounded text-xs font-bold border border-purple-600/30">
                    {block.semester || 'N/A'}
                  </span>
                </div>
                {/* ✅ Show subjects as tags in Grid View too */}
                <div className="flex flex-wrap gap-1 mt-1">
                  {block.subjects && block.subjects.length > 0 ? (
                    block.subjects.map((sub, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] text-slate-300">
                        {sub}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-xs">No subjects</span>
                  )}
                </div>
              </div>
              <div className="space-y-2 text-xs text-slate-500 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between">
                  <span>👨‍🏫 Instructor</span>
                  <span className="text-slate-300">{block.instructor || 'None'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>👥 Students</span>
                  <span className="text-slate-300">{block.student_count || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>📅 Created</span>
                  <span className="text-slate-300">{new Date(block.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Block Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 border-2 border-purple-600/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span>✏️</span> Edit Block
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Block Code</label>
                <input
                  type="text"
                  value={editForm.section_code}
                  onChange={(e) => setEditForm({...editForm, section_code: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">Semester</label>
                <input
                  type="text"
                  value={editForm.semester}
                  onChange={(e) => setEditForm({...editForm, semester: e.target.value})}
                  placeholder="e.g., 1st Semester 2024-2025"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white outline-none focus:border-purple-500"
                />
              </div>
              
              {/* ✅ Subject Assignment */}
              <div>
                <label className="block text-slate-400 text-sm mb-2">Assign Subjects</label>
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-2 max-h-48 overflow-y-auto">
                  {subjects.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-2">
                      No subjects available. Create subjects first.
                    </p>
                  ) : (
                    subjects.map(subject => (
                      <label key={subject.id} className="flex items-center gap-2 p-2 hover:bg-slate-700 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editForm.subject_ids.includes(subject.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditForm({
                                ...editForm,
                                subject_ids: [...editForm.subject_ids, subject.id]
                              })
                            } else {
                              setEditForm({
                                ...editForm,
                                subject_ids: editForm.subject_ids.filter(id => id !== subject.id)
                              })
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-600 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          {subject.internal_subject_no && (
                            <span className="shrink-0 px-1.5 py-0.5 bg-slate-600 text-slate-200 rounded text-[10px] font-mono font-semibold">
                              {subject.internal_subject_no}
                            </span>
                          )}
                          {subject.subject_code && (
                            <span className="shrink-0 px-1.5 py-0.5 bg-purple-700/60 text-purple-200 rounded text-[10px] font-mono font-semibold border border-purple-600/40">
                              {subject.subject_code}
                            </span>
                          )}
                          <span className="text-sm text-white truncate">{subject.name}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Check subjects to assign to this block
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowEditModal(false); setEditingBlock(null) }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-white font-bold transition shadow-lg shadow-purple-600/30"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✨ NEW: Polished Create Block Modal */}
      {showCreateModal && (
        <CreateBlockModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); fetchBlocks(); }}
        />
      )}
    </div>
  )
}