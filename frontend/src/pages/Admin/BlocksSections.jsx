import { useState, useEffect } from 'react'

export default function BlocksSections() {
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(false)
  const [editModal, setEditModal] = useState(null)

  useEffect(() => {
    fetchBlocks()
  }, [])

  const fetchBlocks = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Check if token exists
      if (!token) {
        console.warn('⚠️ No token found, redirecting to login')
        window.location.href = '/'
        return
      }
      
      const res = await fetch('http://localhost:5000/api/admin/blocks', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.status === 401) {
        console.error('❌ Token expired or invalid')
        localStorage.removeItem('token')
        window.location.href = '/'
        return
      }
      
      if (res.ok) {
        const data = await res.json()
        setBlocks(Array.isArray(data) ? data : [])
      } else {
        console.error('Failed to fetch blocks:', await res.text())
      }
    } catch (err) {
      console.error('Failed to fetch blocks:', err)
      if (err.message.includes('Failed to fetch')) {
        console.error('💡 Tip: Make sure backend is running on http://localhost:5000')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBlock = async (blockData) => {
    try {
      const token = localStorage.getItem('token')
      
      // Debug: Log what we're sending
      console.log('📦 Creating block with data:', blockData)
      console.log('🔑 Token:', token ? `${token.substring(0, 20)}...` : 'MISSING')
      
      // Check if token exists
      if (!token) {
        alert('Session expired. Please login again.')
        window.location.href = '/'
        return
      }
      
      const res = await fetch('http://localhost:5000/api/admin/blocks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(blockData)
      })
      
      console.log('📡 Response status:', res.status)
      
      if (res.status === 401) {
        // Token expired
        alert('Your session has expired. Please login again.')
        localStorage.removeItem('token')
        window.location.href = '/'
        return
      }
      
      if (res.ok) {
        await fetchBlocks()
        setCreateModal(false)
        alert('✅ Block created successfully!')
      } else {
        // Try to get error message from response
        const errorData = await res.json().catch(() => ({}))
        const errorMessage = errorData.error || `Server error: ${res.status}`
        console.error('❌ Create block failed:', errorData)
        alert(`Failed to create block: ${errorMessage}`)
      }
    } catch (err) {
      console.error('Failed to create block:', err)
      
      // Check if it's a network error
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        alert('❌ Cannot connect to server. Make sure backend is running on port 5000.')
        console.log('💡 Troubleshooting:')
        console.log('  1. Run: cd backend && .\\venv\\Scripts\\Activate && python app.py')
        console.log('  2. Check: http://localhost:5000/api/health')
        console.log('  3. Verify CORS allows http://localhost:5173')
      } else {
        alert(`Failed to create block: ${err.message}`)
      }
    }
  }

  const handleUpdateBlock = async (blockId, blockData) => {
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        alert('Session expired. Please login again.')
        window.location.href = '/'
        return
      }
      
      const res = await fetch(`http://localhost:5000/api/admin/blocks/${blockId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(blockData)
      })
      
      if (res.status === 401) {
        alert('Your session has expired. Please login again.')
        localStorage.removeItem('token')
        window.location.href = '/'
        return
      }
      
      if (res.ok) {
        await fetchBlocks()
        setEditModal(null)
        alert('✅ Block updated successfully!')
      } else {
        const errorData = await res.json().catch(() => ({}))
        const errorMessage = errorData.error || `Server error: ${res.status}`
        alert(`Failed to update block: ${errorMessage}`)
      }
    } catch (err) {
      console.error('Failed to update block:', err)
      if (err.message.includes('Failed to fetch')) {
        alert('Cannot connect to server. Make sure backend is running.')
      } else {
        alert(`Failed to update block: ${err.message}`)
      }
    }
  }

  const handleDeleteBlock = async (blockId) => {
    if (!confirm('Are you sure you want to delete this block? This action cannot be undone.')) return
    
    try {
      const token = localStorage.getItem('token')
      
      if (!token) {
        alert('Session expired. Please login again.')
        window.location.href = '/'
        return
      }
      
      const res = await fetch(`http://localhost:5000/api/admin/blocks/${blockId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.status === 401) {
        alert('Your session has expired. Please login again.')
        localStorage.removeItem('token')
        window.location.href = '/'
        return
      }
      
      if (res.ok) {
        await fetchBlocks()
        alert('✅ Block deleted successfully!')
      } else {
        const errorData = await res.json().catch(() => ({}))
        const errorMessage = errorData.error || `Server error: ${res.status}`
        alert(`Failed to delete block: ${errorMessage}`)
      }
    } catch (err) {
      console.error('Failed to delete block:', err)
      if (err.message.includes('Failed to fetch')) {
        alert('Cannot connect to server. Make sure backend is running.')
      } else {
        alert(`Failed to delete block: ${err.message}`)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <p className="text-slate-400">Manage class blocks and course assignments</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition flex items-center gap-2">
            <span>📥</span> Export CSV
          </button>
          <button 
            onClick={() => setCreateModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg transition flex items-center gap-2 font-bold"
          >
            <span>📚</span> Create Block
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 rounded-xl border border-purple-600/30 p-4">
          <p className="text-slate-400 text-sm mb-1">Total Blocks</p>
          <p className="text-2xl font-black text-purple-400">{blocks.length}</p>
        </div>
        <div className="bg-slate-900/80 rounded-xl border border-green-600/30 p-4">
          <p className="text-slate-400 text-sm mb-1">Total Students</p>
          <p className="text-2xl font-black text-green-400">1</p>
        </div>
        <div className="bg-slate-900/80 rounded-xl border border-blue-600/30 p-4">
          <p className="text-slate-400 text-sm mb-1">Total Instructors</p>
          <p className="text-2xl font-black text-blue-400">2</p>
        </div>
        <div className="bg-slate-900/80 rounded-xl border border-yellow-600/30 p-4">
          <p className="text-slate-400 text-sm mb-1">Avg Students/Block</p>
          <p className="text-2xl font-black text-yellow-400">1</p>
        </div>
      </div>

      {/* Blocks List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {blocks.map(block => (
            <div key={block.id} className="bg-slate-900/80 rounded-2xl border border-purple-600/30 p-6">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-600/30 rounded-xl flex items-center justify-center text-2xl">
                    📚
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{block.section_code}</h3>
                    <p className="text-slate-400 mb-3">{block.name}</p>
                    <div className="flex gap-2">
                      <span className="px-3 py-1 bg-green-600/20 text-green-300 rounded-lg text-sm border border-green-600/30">
                        👥 {block.student_count || 0} Students
                      </span>
                      <span className="px-3 py-1 bg-blue-600/20 text-blue-300 rounded-lg text-sm border border-blue-600/30">
                        👨‍🏫 {block.instructor_count || 0} Instructors
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditModal(block)}
                    className="px-3 py-1 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg text-sm transition text-purple-300"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDeleteBlock(block.id)}
                    className="px-3 py-1 bg-red-600/30 hover:bg-red-600/50 rounded-lg text-sm transition text-red-300"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {blocks.length === 0 && (
            <div className="text-center py-12 bg-slate-900/80 rounded-2xl border border-dashed border-slate-700">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-slate-400 text-lg">No blocks found</p>
              <p className="text-slate-500 text-sm mt-2">Create your first block to get started</p>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(createModal || editModal) && (
        <BlockModal
          block={editModal || {}}
          onClose={() => {
            setCreateModal(false)
            setEditModal(null)
          }}
          onSave={editModal ? handleUpdateBlock : handleCreateBlock}
        />
      )}
    </div>
  )
}

function BlockModal({ block, onClose, onSave }) {
  const [form, setForm] = useState({
    section_code: block.section_code || '',
    name: block.name || '',
    semester: block.semester || ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validate required fields
    if (!form.section_code.trim()) {
      alert('Block Number is required')
      return
    }
    
    if (block.id) {
      onSave(block.id, form)
    } else {
      onSave(form)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-2xl border-2 border-purple-600/50 w-full max-w-lg p-6 shadow-2xl">
        <h3 className="text-2xl font-bold text-white mb-6">
          {block.id ? '✏️ Edit Block' : '📚 Create Block'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-400 text-sm mb-2 font-medium">Block Number *</label>
            <input
              type="text"
              value={form.section_code}
              onChange={(e) => setForm({...form, section_code: e.target.value})}
              placeholder="301"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-2 font-medium">Course Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              placeholder="Introduction to Programming"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-2 font-medium">Semester</label>
            <input
              type="text"
              value={form.semester}
              onChange={(e) => setForm({...form, semester: e.target.value})}
              placeholder="1st Sem 2024-2025"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none transition"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition text-slate-300 font-medium border border-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg transition font-bold text-white shadow-lg"
            >
              {block.id ? 'Update Block' : 'Create Block'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}