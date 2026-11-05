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
import { API_BASE, authFetch } from '../../api/client'
import QuestButton from '../Student/components/QuestButton'
import bookIcon from '../../assets/instructor/nav-book.svg'
import searchIcon from '../../assets/instructor/search.svg'
import './InstructorRefined.css'

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
  const [search, setSearch] = useState('')
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [reload, setReload] = useState(0)
  const [studentsModal, setStudentsModal] = useState(null)
  const [selectedKey, setSelectedKey] = useState(null)

  useEffect(() => {
    const controller = new AbortController()
    let current = true
    async function load() {
      setLoading(true)
      setError(false)
      try {
        const response = await authFetch(`${API_BASE}/api/instructor/classes`, { signal: controller.signal })
        if (!response.ok) throw new Error('Classes unavailable')
        const data = await response.json()
        if (!Array.isArray(data)) throw new Error('Invalid classes')
        if (current) setClasses(data.map(cls => ({
          id: cls.id, subjectId: cls.subject_id, name: String(cls.section_no ?? ''),
          title: cls.subjects?.length ? cls.subjects.join(' · ') : (cls.name || 'Assigned subject'),
          semester: cls.semester || 'Semester not specified',
          students: cls.student_count, quests: cls.problem_count,
          modules: cls.lesson_count, announcements: cls.announcement_count,
        })))
      } catch {
        if (current) setError(true)
      } finally {
        if (current) setLoading(false)
      }
    }
    load()
    return () => { current = false; controller.abort() }
  }, [reload])

  const groups = useMemo(() => {
    const subjects = new Map()
    for (const cls of classes) {
      const key = cls.subjectId ?? `unassigned-${cls.id}`
      if (!subjects.has(key)) subjects.set(key, { key, name: cls.title, classes: [] })
      subjects.get(key).classes.push(cls)
    }
    return Array.from(subjects.values())
  }, [classes])

  const oneSubject = groups.length === 1
  const activeGroup = groups.find(group => group.key === selectedKey) || (oneSubject ? groups[0] : null)
  const showingClasses = Boolean(activeGroup)
  const term = search.trim().toLowerCase()
  const filteredSubjects = groups.filter(group => group.name.toLowerCase().includes(term))
  const filteredClasses = (activeGroup?.classes || []).filter(cls => [cls.name, cls.title, cls.semester].some(value => value.toLowerCase().includes(term)))
  const number = value => Number.isFinite(value) ? value.toLocaleString() : '—'
  const book = <span className="ir-book-medallion" aria-hidden="true"><img src={bookIcon} alt="" width="38" height="38" /></span>

  return <div className="ir-my-classes">
    {studentsModal && <StudentsModal cls={studentsModal} onClose={() => setStudentsModal(null)} />}
    {showingClasses && !oneSubject && <nav aria-label="Class selection"><button className="ir-text-action" onClick={() => { setSelectedKey(null); setSearch('') }}>← All assigned subjects</button></nav>}
    <header className="ir-classes-heading">
      <div><h1>{showingClasses && !oneSubject ? activeGroup.name : 'My Classes'}</h1>
        <p>{showingClasses ? 'Choose a class code to open its workspace.' : 'Choose an assigned subject to view its class codes.'}</p></div>
      {!loading && !error && <span className="ir-assigned-count">{showingClasses ? `${activeGroup.classes.length} class ${activeGroup.classes.length === 1 ? 'code' : 'codes'}` : `${groups.length} assigned ${groups.length === 1 ? 'subject' : 'subjects'}`}</span>}
    </header>
    <label className="ir-classes-search ir-surface">
      <img src={searchIcon} alt="" width="22" height="22" /><span className="sr-only">{showingClasses ? 'Search class codes' : 'Search subjects'}</span>
      <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={showingClasses ? 'Search by class code or semester…' : 'Search subjects'} />
    </label>
    {loading ? <div className="ir-surface ir-empty" role="status"><h2>Loading assigned classes…</h2></div>
      : error ? <div className="ir-surface ir-empty" role="alert"><h2>Unable to load your classes</h2><p>Check your connection and try again.</p><button className="ir-secondary" onClick={() => setReload(value => value + 1)}>Try again</button></div>
      : groups.length === 0 ? <div className="ir-surface ir-empty">{book}<h2>No assigned classes yet</h2><p>Your assigned subjects will appear here. Contact your administrator to get started.</p></div>
      : <>
        {showingClasses ? <div className="ir-class-codes">{filteredClasses.map(cls => <article className="ir-surface ir-class-code-card" key={cls.id}>
          <div className="ir-subject-identity">{book}<div><h2>Class {cls.name}</h2><p>{cls.title}</p><span>{cls.semester}</span></div></div>
          <dl className="ir-class-counts">
            <div><dt>Students</dt><dd><button className="ir-text-action" onClick={() => setStudentsModal(cls)} aria-label={`View students in class ${cls.name}`}>{number(cls.students)} <span>View roster →</span></button></dd></div>
            <div><dt>Quests</dt><dd>{number(cls.quests)}</dd></div>
            <div><dt>Modules</dt><dd>{number(cls.modules)}</dd></div>
            <div><dt>Announcements</dt><dd>{number(cls.announcements)}</dd></div>
          </dl>
          <QuestButton ariaLabel={`Open class ${cls.name}`} className="ir-subject-action" onClick={() => navigate(`/instructor/class/${cls.id}`)}>Open Class</QuestButton>
        </article>)}</div>
          : <div className="ir-subject-grid">{filteredSubjects.map(group => {
            const students = group.classes.every(cls => Number.isFinite(cls.students)) ? group.classes.reduce((total, cls) => total + cls.students, 0) : undefined
            return <article className="ir-surface ir-subject-card" key={group.key}>
              <div className="ir-subject-identity">{book}<h2>{group.name}</h2></div>
              <div className="ir-subject-counts"><span className="ir-code-count">{group.classes.length} class {group.classes.length === 1 ? 'code' : 'codes'}</span><span className="ir-student-count" title="Total student enrollments across this subject’s assigned class codes"><strong>{number(students)}</strong> students</span></div>
              <QuestButton className="ir-subject-action" ariaLabel={`View classes for ${group.name}`} onClick={() => { setSelectedKey(group.key); setSearch('') }}>View Classes</QuestButton>
            </article>
          })}</div>}
        {(showingClasses ? filteredClasses : filteredSubjects).length === 0 && <div className="ir-surface ir-empty"><h2>No matching {showingClasses ? 'class codes' : 'subjects'}</h2><p>Try a different search.</p><button className="ir-secondary" onClick={() => setSearch('')}>Clear search</button></div>}
        <p className="ir-classes-note">Only {showingClasses ? 'class codes' : 'subjects'} assigned to you are shown.</p>
      </>}
  </div>
}
