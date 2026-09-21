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

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../../api/client'

function StudentsModal({ cls, onClose }) {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Fetch enrolled students for this class when the modal opens
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${API_BASE}/api/admin/sections/${cls.id}/students`, {
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
  }, [cls.id])

  // Filter the student list by the search text
  const filtered = students.filter(s =>
    (s.full_name || s.username).toLowerCase().includes(search.toLowerCase()) ||
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">

        <div className="flex items-center justify-between gap-3 p-4 sm:p-6 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-white">Class {cls.name} — Students</h2>
            <p className="text-slate-400 text-sm mt-0.5">{cls.title} · {students.length} enrolled</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            ✕
          </button>
        </div>

        <div className="px-4 sm:px-6 py-4 border-b border-slate-800">
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
                <div key={student.id} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3.5 hover:bg-slate-800/40 transition">
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

        <div className="px-4 sm:px-6 py-4 border-t border-slate-800">
          <p className="text-slate-500 text-xs">Showing {filtered.length} of {students.length} students</p>
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
  // Which subject we've drilled into — null means we're still at the
  // subject-picking step (unless there's only one subject, see below).
  const [selectedSubjectId, setSelectedSubjectId] = useState(null)

  // Fetch the instructor's assigned classes on mount
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${API_BASE}/api/instructor/classes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await res.json()
        setClasses(data.map(c => ({
          id:           c.id,
          subjectId:    c.subject_id,
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

  // Group classes by subject — an instructor can teach the same subject
  // across several class codes/sections (or teach a handful of unrelated
  // subjects), so one flat list gets repetitive and confusing fast. This
  // mirrors the same "pick a subject, then pick a class code" pattern
  // already used when creating a quest (components/ClassPicker.jsx) — if
  // there's only one subject, there's nothing to pick between, so that step
  // is skipped entirely.
  const subjectGroups = useMemo(() => {
    const bySubject = new Map()
    for (const cls of classes) {
      const key = cls.subjectId ?? `unassigned-${cls.id}`
      if (!bySubject.has(key)) {
        bySubject.set(key, { subjectId: cls.subjectId, name: cls.title, classes: [] })
      }
      bySubject.get(key).classes.push(cls)
    }
    return Array.from(bySubject.values())
  }, [classes])

  const onlyOneSubject = subjectGroups.length <= 1
  const step = selectedSubjectId != null || onlyOneSubject ? 'classes' : 'subjects'
  const activeGroup = subjectGroups.find(g => g.subjectId === selectedSubjectId) || subjectGroups[0]

  const handleBackToSubjects = () => { setSelectedSubjectId(null); setSearchTerm('') }

  // Filter whichever step is currently showing by the search term
  const filteredSubjects = subjectGroups.filter(g =>
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const classesInScope = step === 'classes' ? (activeGroup?.classes || []) : []
  const filteredClasses = classesInScope.filter(c =>
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
    { icon: '📝', key: 'problems',      label: 'Quests',    clickable: false },
    { icon: '📚', key: 'lessons',       label: 'Modules',       clickable: false },
    { icon: '📢', key: 'announcements', label: 'Announcements', clickable: false },
  ]

  return (
    <div className="space-y-6">

      {studentsModal && (
        <StudentsModal cls={studentsModal} onClose={() => setStudentsModal(null)} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          {step === 'classes' && !onlyOneSubject && (
            <p className="text-sm mb-1 flex items-center gap-1.5 flex-wrap">
              <button
                onClick={handleBackToSubjects}
                className="text-purple-400 hover:text-purple-300 font-semibold transition flex items-center gap-1"
              >
                ← My Classes
              </button>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">{activeGroup?.name}</span>
            </p>
          )}
          <h1 className="text-2xl font-black text-white tracking-tight truncate">
            {step === 'subjects' || onlyOneSubject ? 'My Classes' : activeGroup?.name}
          </h1>
          <p className="text-slate-400 mt-0.5 text-sm">
            {step === 'subjects'
              ? 'Choose a subject to see its class codes'
              : 'View and manage your assigned class codes'}
          </p>
        </div>
        {!loading && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg shrink-0">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-slate-300 text-xs font-medium">
              {step === 'subjects'
                ? `${subjectGroups.length} ${subjectGroups.length === 1 ? 'Subject' : 'Subjects'}`
                : `${classesInScope.length} ${classesInScope.length === 1 ? 'Class' : 'Classes'}`}
            </span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">🔍</span>
        <input
          type="text"
          placeholder={step === 'subjects' ? 'Search subjects...' : 'Search by class code or semester...'}
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

      {/* ── Step 1: Subjects ── (only shown when there's more than one) */}
      {!loading && step === 'subjects' && (
        filteredSubjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-5xl mb-4">🔍</span>
            <p className="text-slate-300 text-lg font-semibold mb-1">No subjects found</p>
            <p className="text-slate-500 text-sm">Try adjusting your search</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSubjects.map((group, idx) => {
              const totalStudents = group.classes.reduce((sum, c) => sum + c.students, 0)
              return (
                <button
                  key={group.subjectId ?? `unassigned-${idx}`}
                  onClick={() => { setSelectedSubjectId(group.subjectId); setSearchTerm('') }}
                  className="text-left bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-600/40 hover:shadow-xl hover:shadow-purple-900/10 transition-all duration-300 group"
                >
                  <div className={`h-1.5 bg-gradient-to-r ${gradients[idx % gradients.length]}`} />
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-12 h-12 bg-gradient-to-br ${gradients[idx % gradients.length]} rounded-xl flex items-center justify-center text-xl shadow-lg group-hover:scale-105 transition-transform`}>
                        🏫
                      </div>
                      <span className="px-2.5 py-1 bg-purple-600/20 border border-purple-600/40 rounded-full text-xs font-bold text-purple-300 whitespace-nowrap">
                        {group.classes.length} {group.classes.length === 1 ? 'code' : 'codes'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition truncate">
                      {group.name}
                    </h3>
                    <p className="text-slate-500 text-xs mt-3 pt-3 border-t border-slate-800">
                      👥 {totalStudents} students total
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )
      )}

      {/* ── Step 2: Class codes for the chosen subject ── */}
      {!loading && step === 'classes' && (
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

                <div className="flex-1 p-4 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 bg-gradient-to-br ${gradients[idx % gradients.length]} rounded-xl flex items-center justify-center text-xl shadow-lg group-hover:scale-105 transition-transform shrink-0`}>
                        🏫
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition">
                            {cls.title}
                          </h3>
                          <span className="px-2 py-0.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-xs font-bold">
                            Active
                          </span>
                        </div>
                        <p className="text-slate-400 text-sm font-medium mb-0.5">{cls.name}</p>
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

          {filteredClasses.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-5xl mb-4">🏫</span>
              <p className="text-slate-300 text-lg font-semibold mb-1">No classes found</p>
              <p className="text-slate-500 text-sm">
                {searchTerm ? 'Try adjusting your search' : 'No class codes assigned yet — ask your admin'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
