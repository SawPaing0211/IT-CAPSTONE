import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function MyClasses() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:5000/api/instructor/classes', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        setClasses(data.map(c => ({
          id: c.id,
          name: c.section_code,
          // ✅ BONUS: Show ALL subjects joined by comma
          title: c.subjects?.length > 0 ? c.subjects.join(' · ') : c.name,
          description: c.semester || 'Current Semester',
          students: c.student_count || 0,
          problems: c.problem_count || 0,
          lessons: c.lesson_count || 0,
          announcements: c.announcement_count || 0,
          status: 'Active',
        })))
      } catch (err) {
        console.error('Failed to fetch classes:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchClasses()
  }, [])

  // ✅ STEP 2: Enhanced search to include subjects
  const filteredClasses = classes.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const gradients = [
    'from-blue-600 to-indigo-700',
    'from-purple-600 to-violet-700',
    'from-emerald-600 to-teal-700',
    'from-rose-600 to-pink-700',
    'from-amber-600 to-orange-700',
  ]

  const statItems = [
    { icon: '👥', key: 'students', label: 'Students' },
    { icon: '📝', key: 'problems', label: 'Problems' },
    { icon: '📚', key: 'lessons',  label: 'Lessons' },
    { icon: '📢', key: 'announcements', label: 'Announcements' },
  ]

  return (
    <div className="space-y-7">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">My Classes</h1>
          <p className="text-slate-400 mt-1 text-sm">View and manage your assigned class blocks</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg pointer-events-none">🔍</span>
        <input
          type="text"
          placeholder="Search by block number, course name, or subject..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3.5 pl-12 text-white placeholder-slate-600 focus:border-blue-500/60 focus:outline-none transition text-sm"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition text-sm"
          >
            ✕
          </button>
        )}
      </div>

      {/* Summary pill */}
      {!loading && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
          {filteredClasses.length} {filteredClasses.length === 1 ? 'class' : 'classes'} found
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-slate-500 text-sm animate-pulse">Loading classes...</p>
          </div>
        </div>
      )}

      {/* Classes Grid */}
      <div className="space-y-4">
        {filteredClasses.map((cls, idx) => (
          <div
            key={cls.id}
            onClick={() => navigate(`/instructor/class/${cls.id}`)}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 hover:shadow-xl hover:shadow-black/20 transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-stretch">

              {/* Color accent strip */}
              <div className={`w-1.5 bg-gradient-to-b ${gradients[idx % gradients.length]} flex-shrink-0`}></div>

              <div className="flex-1 p-6">
                <div className="flex items-start justify-between gap-4">

                  {/* Icon + Info */}
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 bg-gradient-to-br ${gradients[idx % gradients.length]} rounded-xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-105 transition-transform flex-shrink-0`}>
                      🏫
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 mb-1">
                        <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition">
                          Block {cls.name}
                        </h3>
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-bold">
                          {cls.status}
                        </span>
                      </div>
                      
                      {/* ✅ BONUS: Better visual display for multiple subjects */}
                      <div className="flex flex-wrap gap-1 mb-0.5">
                        {cls.title.split(', ').map((subject, i) => (
                          <span key={i} className="text-blue-400 text-sm font-medium">
                            {subject}{i < cls.title.split(', ').length - 1 ? ',' : ''}
                          </span>
                        ))}
                      </div>
                      
                      <p className="text-slate-500 text-xs">{cls.description}</p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="text-slate-600 group-hover:text-slate-300 group-hover:translate-x-1 transition-all text-2xl flex-shrink-0 mt-1">
                    ›
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex flex-wrap gap-3 mt-5 pt-4 border-t border-slate-800/60">
                  {statItems.map(({ icon, key, label }) => (
                    <div
                      key={key}
                      className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/60 hover:bg-slate-800 rounded-lg transition"
                    >
                      <span className="text-base">{icon}</span>
                      <span className="text-white font-bold text-sm">{cls[key]}</span>
                      <span className="text-slate-500 text-xs">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Empty State */}
        {!loading && filteredClasses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-5xl mb-4">🏫</span>
            <p className="text-slate-300 text-lg font-semibold mb-1">No classes found</p>
            <p className="text-slate-500 text-sm">
              {searchTerm ? 'Try adjusting your search terms' : 'No classes assigned yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}