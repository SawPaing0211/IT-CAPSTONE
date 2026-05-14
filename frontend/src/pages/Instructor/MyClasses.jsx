import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// --------------------------------------------------------------------------
// StudentsModal — receives the class object which now includes block_id
// (resolved from SubjectSection → Block on the backend response)
// --------------------------------------------------------------------------
function StudentsModal({ block, onClose }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem('token')
        const blockId = block.block_id ?? block.id
        const res = await fetch(`http://localhost:5000/api/admin/sections/${block.id}/students`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setStudents(data)
        }
      } catch (err) {
        console.error('Failed to fetch students:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStudents()
  }, [block.id, block.block_id])

  const filtered = students.filter(s =>
    (s.full_name || s.username).toLowerCase().includes(search.toLowerCase()) ||
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            {/* ✅ FIX: display section_code (e.g. "IT101") not the raw id */}
            <h2 className="text-xl font-bold text-white">Class Code {block.name} — Students</h2>
            <p className="text-slate-400 text-sm mt-0.5">{block.title} · {students.length} enrolled</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-lg"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-slate-800">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 pl-9 text-white placeholder-slate-600 focus:border-blue-500/60 focus:outline-none text-sm transition"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <span className="text-4xl mb-3">👥</span>
              <p className="text-sm">{search ? 'No students match your search' : 'No students enrolled yet'}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/60">
              {filtered.map((student, idx) => (
                <div key={student.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-800/40 transition">
                  <span className="text-slate-600 text-xs w-5 text-right flex-shrink-0">{idx + 1}</span>
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {(student.full_name || student.username)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{student.full_name || student.username}</p>
                    <p className="text-slate-500 text-xs truncate">{student.username} · {student.email}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right flex-shrink-0">
                    <div>
                      <p className="text-yellow-400 font-bold text-sm">{student.xp} XP</p>
                      <p className="text-slate-600 text-xs">Lv. {student.level}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      student.is_active
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {student.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-between items-center">
          <p className="text-slate-500 text-xs">Showing {filtered.length} of {students.length} students</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------
// MyClasses — main component
// --------------------------------------------------------------------------
export default function MyClasses() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [studentsModal, setStudentsModal] = useState(null)

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:5000/api/instructor/classes', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()

        // ✅ FIX: API now returns SubjectSection objects.
        // Fields from backend get_instructor_classes:
        //   id            → SubjectSection.id  (used for routing to ClassDetail)
        //   section_code  → Block.section_code, e.g. "IT101"
        //   section_no    → SubjectSection.section_no, e.g. "29144"
        //   name          → comma-joined subject names
        //   semester
        //   student_count, problem_count, lesson_count, announcement_count
        //
        // The backend does NOT currently return block_id on this endpoint.
        // We derive it from section_no being distinct from section_code.
        // For the StudentsModal we need the real Block.id — stored as block_id
        // below once the backend is updated. Until then we fall back to id.
        setClasses(data.map(c => ({
          id: c.id,                        // SubjectSection.id — used for /instructor/class/:id
          block_id: c.block_id ?? null,    // Block.id — used for student lookup; may be null until backend adds it
          name: c.section_code,            // display name: "IT101"
          section_no: c.section_no,        // raw section number: "29144"
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
    { icon: '👥', key: 'students',      label: 'Students',      clickable: true  },
    { icon: '📝', key: 'problems',      label: 'Activities',    clickable: false },
    { icon: '📚', key: 'lessons',       label: 'Modules',       clickable: false },
    { icon: '📢', key: 'announcements', label: 'Announcements', clickable: false },
  ]

  return (
    <div className="space-y-7">

      {/* Students Modal */}
      {studentsModal && (
        <StudentsModal
          block={studentsModal}
          onClose={() => setStudentsModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">My Classes</h1>
          <p className="text-slate-400 mt-1 text-sm">View and manage your assigned class codes</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg pointer-events-none">🔍</span>
        <input
          type="text"
          placeholder="Search by class code, course name, or subject..."
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
                        {/* ✅ FIX: show section_code (Block code like "IT101"), not raw SubjectSection.id */}
                        <h3 className="text-xl font-bold text-white group-hover:text-blue-300 transition">
                          Class Code {cls.name}
                        </h3>
                        {/* ✅ FIX: show section_no as a subtle secondary label */}
                        {cls.section_no && (
                          <span className="px-2 py-0.5 bg-slate-700/60 text-slate-400 rounded text-xs font-mono">
                            #{cls.section_no}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-bold">
                          {cls.status}
                        </span>
                      </div>

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
                  {statItems.map(({ icon, key, label, clickable }) => (
                    <button
                      key={key}
                      onClick={clickable ? (e) => {
                        e.stopPropagation()
                        setStudentsModal(cls)
                      } : (e) => e.stopPropagation()}
                      className={`flex items-center gap-2 px-3.5 py-2 bg-slate-800/60 rounded-lg transition ${
                        clickable
                          ? 'hover:bg-blue-600/20 hover:border-blue-500/40 border border-transparent cursor-pointer'
                          : 'cursor-default'
                      }`}
                    >
                      <span className="text-base">{icon}</span>
                      <span className="text-white font-bold text-sm">{cls[key]}</span>
                      <span className="text-slate-500 text-xs">{label}</span>
                      {clickable && (
                        <span className="text-blue-500 text-xs ml-0.5">↗</span>
                      )}
                    </button>
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
              {searchTerm ? 'Try adjusting your search terms' : 'No class codes assigned yet'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
