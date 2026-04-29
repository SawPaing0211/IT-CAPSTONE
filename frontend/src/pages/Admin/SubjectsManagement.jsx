import { useState, useEffect } from 'react'

export default function SubjectsManagement() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newSubject, setNewSubject] = useState({
    name: '',
    description: ''
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
        body: JSON.stringify(newSubject)
      })

      if (res.ok) {
        setShowCreateModal(false)
        setNewSubject({ name: '', description: '' })
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
                    <h3 className="text-lg font-bold text-white mb-1">{subject.name}</h3>
                    {subject.description ? (
                      <p className="text-slate-400 text-sm">{subject.description}</p>
                    ) : (
                      <p className="text-slate-600 text-sm italic">No description</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteSubject(subject.id, subject.name)}
                  className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded-lg text-sm font-bold transition opacity-0 group-hover:opacity-100 flex items-center gap-2"
                >
                  <span>🗑️</span> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Subject Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border-2 border-purple-600/50 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <span>📚</span> Create Subject
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Subject Name *</label>
                <input
                  type="text"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                  placeholder="e.g., Introduction to Programming"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">Description</label>
                <textarea
                  value={newSubject.description}
                  onChange={(e) => setNewSubject({...newSubject, description: e.target.value})}
                  placeholder="Brief description of the subject..."
                  rows="3"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 resize-none transition"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSubject}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-white font-bold transition shadow-lg shadow-purple-600/30"
              >
                Create Subject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}