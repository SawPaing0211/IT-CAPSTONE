// this is the "pick a class first" screen before making a quest, for when you clicked Create Quest without already being inside a class

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function SelectClassForQuest() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch and normalize the instructor's classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:5000/api/instructor/classes', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        setClasses(data.map(c => ({
          id:         c.id,
          subjectId:  c.subject_id,
          name:       c.section_no,
          title:      c.subjects?.length > 0 ? c.subjects.join(' · ') : c.name,
          semester:   c.semester || 'Current Semester',
          students:   c.student_count || 0,
          problems:   c.problem_count || 0,
        })))
      } catch (err) {
        console.error('Failed to fetch classes:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchClasses()
  }, [])

  // Filter classes by search term
  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const gradients = [
    'from-purple-600 to-pink-600',
    'from-blue-600 to-purple-600',
    'from-emerald-600 to-teal-600',
    'from-rose-600 to-orange-600',
    'from-amber-600 to-yellow-600',
  ]

  // Navigate to the quest builder for the picked class
  const pickClass = (cls) => {
    if (!cls.subjectId) {
      // safety net, a class without a subject can't be locked in next screen
      navigate(`/instructor/create-problem?from=${encodeURIComponent('/instructor/create-problem/pick-class')}`)
      return
    }
    navigate(
      `/instructor/create-problem?subject_id=${cls.subjectId}` +
      `&from=${encodeURIComponent(`/instructor/class/${cls.id}`)}`
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-white transition"
        >
          ← Back
        </button>
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            ⚔️ Create Quest — Pick a Class
          </h1>
          <p className="text-slate-400 mt-0.5 text-sm">
            Which class is this quest for? You'll design the quest itself on the next screen.
          </p>
        </div>
      </div>

      {/* Search */}
      {!loading && classes.length > 3 && (
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
          <input
            type="text"
            placeholder="Search by class code or subject name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 pl-12 text-white placeholder-slate-600 focus:border-purple-500/60 focus:outline-none transition text-sm"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent" />
            <p className="text-slate-500 text-sm animate-pulse">Loading your classes...</p>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-14 bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="text-5xl mb-4">🏫</div>
          <p className="text-slate-300 text-lg font-semibold mb-1">
            {classes.length === 0 ? 'No classes assigned yet' : 'No classes match your search'}
          </p>
          <p className="text-slate-500 text-sm">
            {classes.length === 0
              ? 'Contact your admin to get assigned to a class before creating quests.'
              : 'Try a different search.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((cls, idx) => (
            <button
              key={cls.id}
              onClick={() => pickClass(cls)}
              className="text-left bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-600/40 hover:shadow-xl hover:shadow-purple-900/10 transition-all duration-300 group"
            >
              <div className={`h-1.5 bg-gradient-to-r ${gradients[idx % gradients.length]}`} />
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-11 h-11 bg-gradient-to-br ${gradients[idx % gradients.length]} rounded-xl flex items-center justify-center text-lg shadow-lg group-hover:scale-105 transition-transform shrink-0`}>
                    🏫
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-bold group-hover:text-purple-300 transition truncate">{cls.name}</h3>
                    <p className="text-slate-400 text-xs truncate">{cls.title}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 pt-3 border-t border-slate-800">
                  <span>👥 {cls.students} students</span>
                  <span>📝 {cls.problems} quests</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
