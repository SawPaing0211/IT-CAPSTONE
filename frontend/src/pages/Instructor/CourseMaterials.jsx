import { useState, useEffect } from 'react'

export default function CourseMaterials({ classId }) {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [lessons, setLessons] = useState([])
  const [loadingLessons, setLoadingLessons] = useState(true)
  const [filter, setFilter] = useState('all') // 'all', 'published', 'drafts'
  const [subjects, setSubjects] = useState([])
  const [blocks, setBlocks] = useState([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [loadingBlocks, setLoadingBlocks] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    week_number: 1,
    subject_id: '',
    block_id: '', // Empty = All Blocks
    is_published: false,
    files: []
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // Fetch instructor's assigned subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:5000/api/instructor/assigned-subjects', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) setSubjects(await res.json())
      } catch (err) { console.error('Failed to load subjects:', err) }
      finally { setLoadingSubjects(false) }
    }
    fetchSubjects()
  }, [])

  // Fetch lessons for this class
  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:5000/api/lessons', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          // Filter lessons by classId (block_id)
          const filtered = classId 
            ? data.filter(l => !l.block_id || l.block_id === parseInt(classId))
            : data
          setLessons(filtered)
        }
      } catch (err) {
        console.error('Failed to fetch lessons:', err)
      } finally {
        setLoadingLessons(false)
      }
    }
    fetchLessons()
  }, [classId])

  // Fetch blocks when subject changes
  useEffect(() => {
    if (!formData.subject_id) {
      setBlocks([])
      setFormData(prev => ({ ...prev, block_id: '' }))
      return
    }
    
    setLoadingBlocks(true)
    const fetchBlocks = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`http://localhost:5000/api/instructor/blocks-by-subject?subject_id=${formData.subject_id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) setBlocks(await res.json())
      } catch (err) { console.error('Failed to load blocks:', err) }
      finally { setLoadingBlocks(false) }
    }
    fetchBlocks()
  }, [formData.subject_id])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    const validFiles = files.filter(file => {
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 
                         'application/msword', 'image/jpeg', 'image/png', 'application/zip']
      return validTypes.includes(file.type) && file.size <= 16 * 1024 * 1024
    })
    setFormData(prev => ({ ...prev, files: [...prev.files, ...validFiles] }))
  }

  const removeFile = (index) => {
    setFormData(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== index) }))
  }

  // Publish lesson function
  const handlePublish = async (lessonId) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_published: true })
      })
      
      if (res.ok) {
        // Refresh lessons list
        setLoadingLessons(true)
        const res = await fetch('http://localhost:5000/api/lessons', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          const filtered = classId 
            ? data.filter(l => !l.block_id || l.block_id === parseInt(classId))
            : data
          setLessons(filtered)
        }
        setSuccess('✅ Lesson published!')
        setTimeout(() => setSuccess(null), 3000)
      } else {
        const err = await res.json()
        setError(`❌ Failed to publish: ${err.error}`)
      }
    } catch (err) {
      console.error('Failed to publish lesson:', err)
      setError('❌ Failed to publish lesson')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.subject_id) {
      setError('Please select a subject first!')
      return
    }
    
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const token = localStorage.getItem('token')
      
      const lessonRes = await fetch('http://localhost:5000/api/lessons', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          week_number: parseInt(formData.week_number),
          subject_id: parseInt(formData.subject_id),
          block_id: formData.block_id ? parseInt(formData.block_id) : null,
          is_published: formData.is_published
        })
      })

      if (!lessonRes.ok) {
        const errData = await lessonRes.json()
        throw new Error(errData.error || 'Failed to create lesson')
      }

      const lessonData = await lessonRes.json()
      const lessonId = lessonData.lesson_id

      if (formData.files.length > 0) {
        for (const file of formData.files) {
          const fileForm = new FormData()
          fileForm.append('file', file)
          await fetch(`http://localhost:5000/api/lessons/${lessonId}/files`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: fileForm
          })
        }
      }

      setSuccess('🎉 Lesson created successfully!')
      setFormData({ title: '', description: '', week_number: 1, subject_id: '', block_id: '', is_published: false, files: [] })
      setShowCreateForm(false)
      // Refresh lessons list after creating
      setLoadingLessons(true)
      const res = await fetch('http://localhost:5000/api/lessons', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        const filtered = classId 
          ? data.filter(l => !l.block_id || l.block_id === parseInt(classId))
          : data
        setLessons(filtered)
      }
      
    } catch (err) {
      setError(err.message || 'An error occurred')
    } finally {
      setIsSubmitting(false)
      setLoadingLessons(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Course Materials & Modules</h1>
          <p className="text-slate-400">Create structured learning modules with file attachments</p>
        </div>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition shadow-lg shadow-green-600/20 hover:scale-105 active:scale-95"
        >
          ➕ New Module
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-600/40 rounded-xl text-red-300 animate-in fade-in slide-in-from-top-2">
          ❌ {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-900/30 border border-green-600/40 rounded-xl text-green-300 animate-in fade-in slide-in-from-top-2">
          ✅ {success}
        </div>
      )}

      {showCreateForm ? (
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Create New Lesson</h2>
            <button type="button" onClick={() => setShowCreateForm(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition">
              ✕ Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-slate-400 text-sm mb-2">📝 Lesson Title *</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} required placeholder="e.g., Introduction to Python Lists" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none transition" />
            </div>
            <div>
              <label className="block text-slate-400 text-sm mb-2">📅 Week Number *</label>
              <input type="number" name="week_number" value={formData.week_number} onChange={handleChange} min="1" required className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white outline-none focus:border-green-500 transition" />
              <p className="text-slate-500 text-xs mt-1">Organize lessons by week</p>
            </div>
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-2">📚 Subject *</label>
            {loadingSubjects ? (
              <div className="h-12 bg-slate-800 rounded-xl animate-pulse"></div>
            ) : (
              <select name="subject_id" value={formData.subject_id} onChange={handleChange} required className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none appearance-none cursor-pointer hover:border-slate-600 transition">
                <option value="" disabled>Select a subject...</option>
                {subjects.map(sub => (<option key={sub.id} value={sub.id} className="bg-slate-800 text-white">{sub.name}</option>))}
              </select>
            )}
          </div>

          {/* Block Selector with Dynamic Helper Text */}
          <div>
            <label className="block text-slate-400 text-sm mb-2">🏫 Target Block</label>
            {loadingBlocks ? (
              <div className="h-12 bg-slate-800 rounded-xl animate-pulse"></div>
            ) : (
              <select
                name="block_id"
                value={formData.block_id}
                onChange={handleChange}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none appearance-none cursor-pointer hover:border-slate-600 transition"
              >
                <option value="">🌐 All My Blocks (Subject-wide)</option>
                {blocks.map(block => (
                  <option key={block.id} value={block.id}>
                    🏫 {block.section_code} ({block.semester})
                  </option>
                ))}
              </select>
            )}
            
            {/* Dynamic helper text showing actual blocks */}
            {formData.subject_id && blocks.length > 0 && !loadingBlocks && (
              <p className="text-slate-500 text-xs mt-1">
                🌐 "All My Blocks" = Visible to sections: {blocks.map(b => b.section_code).join(', ')}
              </p>
            )}
            
            {formData.subject_id && blocks.length === 0 && !loadingBlocks && (
              <p className="text-yellow-500 text-xs mt-1">
                ⚠️ You are not assigned to teach this subject in any block
              </p>
            )}
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-2">📖 Description *</label>
            <textarea name="description" value={formData.description} onChange={handleChange} required rows="4" placeholder="Brief description of what students will learn..." className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-green-500 outline-none resize-none transition" />
          </div>

          <div>
            <label className="block text-slate-400 text-sm mb-2">📎 Attach Files (PDF, PPT, DOC, Images)</label>
            <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-slate-600 transition cursor-pointer group">
              <input type="file" multiple onChange={handleFileChange} className="hidden" id="file-upload" accept=".pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png,.zip" />
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📎</div>
                <p className="text-slate-400 text-sm">Click to select files or drag and drop here</p>
                <p className="text-slate-600 text-xs mt-1">Supported: PDF, PPT, DOC, Images, ZIP (Max 16MB each)</p>
              </label>
            </div>
            
            {formData.files.length > 0 && (
              <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-bottom-2">
                {formData.files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-2 border border-slate-700">
                    <span className="text-slate-300 text-sm truncate flex-1">📄 {file.name}</span>
                    <span className="text-slate-500 text-xs mr-3">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    <button type="button" onClick={() => removeFile(index)} className="text-red-400 hover:text-red-300 text-sm px-2 py-1 hover:bg-red-900/30 rounded transition">✕ Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
            <input type="checkbox" name="is_published" checked={formData.is_published} onChange={handleChange} className="w-5 h-5 rounded border-slate-600 text-green-600 focus:ring-green-500 cursor-pointer" />
            <div>
              <p className="text-white font-medium">Publish Immediately</p>
              <p className="text-slate-400 text-sm">Make this lesson visible to students</p>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-slate-800">
            <button type="button" onClick={() => setShowCreateForm(false)} disabled={isSubmitting} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 font-bold transition disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={isSubmitting || !formData.subject_id} className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl text-white font-bold transition shadow-lg shadow-green-600/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
              {isSubmitting ? (<><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Creating...</>) : ('📚 Create Lesson')}
            </button>
          </div>
        </form>
      ) : loadingLessons ? (
        <div className="text-center py-20 text-slate-400">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
          Loading lessons...
        </div>
      ) : lessons.length === 0 ? (
        <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-5xl mb-4 animate-bounce">📚</div>
          <p className="text-slate-400 text-lg mb-2">{classId ? 'No modules for this class yet' : 'No lessons created yet'}</p>
          <p className="text-slate-500 mb-6">Start by creating your first learning module above.</p>
          <button onClick={() => setShowCreateForm(true)} className="px-6 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition shadow-lg hover:scale-105 active:scale-95">Create First Module</button>
        </div>
      ) : (
        // Lessons List View
        <div className="space-y-4">
          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4">
            <button 
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'all' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              All ({lessons.length})
            </button>
            <button 
              onClick={() => setFilter('published')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'published' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Published ({lessons.filter(l => l.is_published).length})
            </button>
            <button 
              onClick={() => setFilter('drafts')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                filter === 'drafts' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Drafts ({lessons.filter(l => !l.is_published).length})
            </button>
          </div>
          
          {lessons.filter(lesson => {
            if (filter === 'published') return lesson.is_published
            if (filter === 'drafts') return !lesson.is_published
            return true // 'all'
          }).map(lesson => (
            <div key={lesson.id} className={`bg-slate-900 border rounded-xl p-4 hover:border-slate-700 transition cursor-pointer ${
              lesson.is_published ? 'border-slate-800' : 'border-yellow-600/30 bg-yellow-900/10'
            }`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{lesson.title}</h3>
                    {!lesson.is_published && (
                      <span className="px-2 py-1 bg-yellow-600/20 text-yellow-400 rounded text-xs font-bold border border-yellow-600/30">
                        📝 DRAFT
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm mt-1">{lesson.description}</p>
                  <div className="flex gap-4 mt-3 text-sm text-slate-500">
                    <span>📅 Week {lesson.week_number}</span>
                    <span>📎 {lesson.files?.length || 0} files</span>
                    <span className={lesson.is_published ? 'text-green-400' : 'text-yellow-400'}>
                      {lesson.is_published ? '✅ Published' : '📝 Draft'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!lesson.is_published && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePublish(lesson.id)
                      }}
                      className="px-3 py-2 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-lg text-sm font-medium transition border border-yellow-600/30"
                    >
                      Publish
                    </button>
                  )}
                  <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm font-medium transition">
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}