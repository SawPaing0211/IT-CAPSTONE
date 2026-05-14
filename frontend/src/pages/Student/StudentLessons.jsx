import { useState, useEffect } from 'react'

export default function StudentLessons({ subjectId, blockId, blockName }) {
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const token = localStorage.getItem('token')
        if (!subjectId) {
          setLessons([])
          setLoading(false)
          return
        }
        const res = await fetch(
          `http://localhost:5000/api/student/lessons?subject_id=${subjectId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        if (res.ok) {
          const data = await res.json()
          const filtered = blockId
            ? data.filter(lesson => !lesson.block_id || lesson.block_id === blockId)
            : data
          setLessons(filtered)
        }
      } catch (err) {
        console.error('Failed to fetch lessons:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchLessons()
  }, [subjectId, blockId])

  const handleDownload = async (lessonId, fileId, filename) => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `http://localhost:5000/api/lessons/${lessonId}/files/${fileId}/download`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      if (!res.ok) { alert('Download failed'); return }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      alert('Download failed')
    }
  }

  const getFileIcon = (fileType) => {
    if (fileType === 'pdf') return '📄'
    if (fileType === 'ppt' || fileType === 'pptx') return '📊'
    if (fileType === 'doc' || fileType === 'docx') return '📝'
    if (fileType === 'zip') return '📦'
    return '📎'
  }

  if (loading) {
    return (
      <div className="text-center py-20 text-purple-300 animate-pulse">
        Loading lessons...
      </div>
    )
  }

  if (lessons.length === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-white mb-2">No Lessons Yet</h2>
          <p className="text-slate-400">
            Your instructor hasn't uploaded any lessons for {blockName} yet.
          </p>
        </div>
      </div>
    )
  }

  // Group lessons by week
  const lessonsByWeek = lessons.reduce((acc, lesson) => {
    const week = `Week ${lesson.week_number}`
    if (!acc[week]) acc[week] = []
    acc[week].push(lesson)
    return acc
  }, {})

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">📚 Course Lessons</h2>
        <p className="text-slate-400">Learning materials for {blockName}</p>
      </div>

      {/* Lessons by Week */}
      {Object.entries(lessonsByWeek).map(([week, weekLessons]) => (
        <div key={week} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-purple-400 mb-4 flex items-center gap-2">
            <span>📅</span> {week}
          </h3>
          <div className="space-y-3">
            {weekLessons.map(lesson => (
              <div key={lesson.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 hover:border-purple-500/50 transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-bold text-white mb-1">{lesson.title}</h4>
                    <p className="text-sm text-slate-400 mb-3">{lesson.description}</p>
                    
                    {/* Files */}
                    {lesson.files && lesson.files.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">📎 Files</p>
                        {lesson.files.map(file => (
                          <div
                            key={file.id}
                            className="flex items-center gap-3 w-full px-3 py-2 bg-slate-700/50 rounded-lg"
                          >
                            <span className="text-lg">{getFileIcon(file.file_type)}</span>
                            <span className="text-sm text-slate-300 flex-1 truncate">{file.filename}</span>
                            <span className="text-xs text-slate-600 flex-shrink-0 italic mr-2">
                              .{file.file_type}
                            </span>
                            <button
                              onClick={() => handleDownload(lesson.id, file.id, file.filename)}
                              className="flex-shrink-0 px-2 py-1 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-600/40 rounded text-xs text-purple-300 hover:text-white transition"
                            >
                              ⬇ Download
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}