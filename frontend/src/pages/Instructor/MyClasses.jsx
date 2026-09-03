// my classes list — shows all sections this instructor is assigned to teach.
// clicking a card goes to /instructor/class/:id (ClassDetail.jsx).
// clicking the student count badge opens StudentsModal to see who's enrolled.
//
// data comes from /api/instructor/classes which returns SubjectSection objects.
// the mapping below just renames fields to something cleaner for the UI:
//   id         → SubjectSection.id (used for routing)
//   name       → section_code (the class code like "29022")
//   section_no → same (shown as secondary tag)
//   title      → subject names joined together
//
// StudentsModal hits /api/admin/sections/:id/students — yes it's the admin
// endpoint, but instructors have access to it (backend checks instructor_or_admin)

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function StudentsModal({ block, onClose }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`http://localhost:5000/api/admin/sections/${block.id}/students`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) setStudents(await res.json())
      } catch (err) {
        console.error('Failed to fetch students:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStudents()
  }, [block.id])

  const filtered = students.filter(s =>
    (s.full_name || s.username).toLowerCase().includes(search.toLowerCase()) ||
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">

        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white">Class {block.name} — Students</h2>
            <p className="text-slate-400 text-sm mt-0.5">{block.title} · {students.length} enrolled</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-4 border-b border-slate-800">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 pl-9 text-white placeholder-slate-600 focus:border-purple-500/60 focus:outline-none text-sm transition"
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent" />
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
                  <span className="text-slate-600 text-xs w-5 text-right shrink-0">{idx + 1}</span>
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {(student.full_name || student.username)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">{student.full_name || student.username}</p>
                    <p className="text-slate-500 text-xs truncate">{student.username} · {student.email}</p>
                  </div>
                  <div className="flex items-center gap-4 text-right shrink-0">
                    <div>
                      <p className="text-yellow-400 font-bold text-sm">{student.xp} XP</p>
                      <p className="text-slate-600 text-xs">Lv. {student.level}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                      student.is_active
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {student.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

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
        setClasses(data.map(c => ({
          id:           c.id,
          name:         c.section_no,
          section_no:   c.section_no,
          title:        c.subjects?.length > 0 ? c.subjects.join(' · ') : c.name,
          description:  c.semester || 'Current Semester',
          students:     c.student_count || 0,
          problems:     c.problem_count || 0,
          lessons:      c.lesson_count || 0,
          announcements: c.announcement_count || 0,
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
    'from-purple-600 to-pink-600',
    'from-blue-600 to-purple-600',
    'from-emerald-600 to-teal-600',
    'from-rose-600 to-orange-600',
    'from-amber-600 to-yellow-600',
  ]

  const statItems = [
    { icon: '👥', key: 'students',      label: 'Students',      clickable: true  },
    { icon: '📝', key: 'problems',      label: 'Activities',    clickable: false },
    { icon: '📚', key: 'lessons',       label: 'Modules',       clickable: false },
    { icon: '📢', key: 'announcements', label: 'Announcements', clickable: false },
  ]

  return (
    <div className="space-y-6">

      {studentsModal && (
        <StudentsModal block={studentsModal} onClose={() => setStudentsModal(null)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">My Classes</h1>
          <p className="text-slate-400 mt-0.5 text-sm">View and manage your assigned class codes</p>
        </div>
        {!loading && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-slate-300 text-xs font-medium">{classes.length} {classes.length === 1 ? 'Class' : 'Classes'}</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
        <input
          type="text"
          placeholder="Search by class code, subject name, or semester..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 pl-12 text-white placeholder-slate-600 focus:border-purple-500/60 focus:outline-none transition text-sm"
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent" />
            <p className="text-slate-500 text-sm animate-pulse">Loading classes...</p>
          </div>
        </div>
      )}

      {/* Classes List */}
      <div className="space-y-4">
        {filteredClasses.map((cls, idx) => (
          <div
            key={cls.id}
            onClick={() => navigate(`/instructor/class/${cls.id}`)}
            className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-600/30 hover:shadow-xl hover:shadow-purple-900/10 transition-all duration-300 cursor-pointer group"
          >
            <div className="flex items-stretch">
              {/* colored left accent strip — same pattern as admin cards */}
              <div className={`w-1.5 bg-gradient-to-b ${gradients[idx % gradients.length]} shrink-0`} />

              <div className="flex-1 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 bg-gradient-to-br ${gradients[idx % gradients.length]} rounded-xl flex items-center justify-center text-xl shadow-lg group-hover:scale-105 transition-transform shrink-0`}>
                      🏫
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition">
                          {cls.name}
                        </h3>
                        <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-bold">
                          Active
                        </span>
                      </div>
                      <p className="text-purple-400 text-sm font-medium mb-0.5">{cls.title}</p>
                      <p className="text-slate-500 text-xs">{cls.description}</p>
                    </div>
                  </div>
                  <span className="text-slate-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all text-xl shrink-0 mt-1">›</span>
                </div>

                {/* Stat pills */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-800/60">
                  {statItems.map(({ icon, key, label, clickable }) => (
                    <button
                      key={key}
                      onClick={clickable ? e => { e.stopPropagation(); setStudentsModal(cls) } : e => e.stopPropagation()}
                      className={`flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 rounded-lg text-sm transition border ${
                        clickable
                          ? 'hover:bg-purple-600/20 hover:border-purple-500/40 border-transparent cursor-pointer'
                          : 'border-transparent cursor-default'
                      }`}
                    >
                      <span>{icon}</span>
                      <span className="text-white font-bold">{cls[key]}</span>
                      <span className="text-slate-500 text-xs">{label}</span>
                      {clickable && <span className="text-purple-400 text-xs">↗</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}

        {!loading && filteredClasses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-5xl mb-4">🏫</span>
            <p className="text-slate-300 text-lg font-semibold mb-1">No classes found</p>
            <p className="text-slate-500 text-sm">
              {searchTerm ? 'Try adjusting your search' : 'No class codes assigned yet — ask your admin'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
