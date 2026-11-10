// subjects list — first thing student sees after login, shows their
// enrolled courses as cards, click one to go into that course
//
// used to fetch user info (/api/auth/me) and stats (/api/student/stats)
// itself, but StudentDashboard.jsx ALREADY has both of those (user comes
// from App.jsx as a prop, heroStats gets fetched once in StudentDashboard).
// so this was hitting the same 2 endpoints a second time for no reason —
// every page load fired me/stats twice as much as needed. fixed by just
// accepting user + stats as props instead of re-fetching. only fetch left
// here is /api/student/subjects since nothing else already has that.

import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE, authFetch } from '../../api/client'
import { CourseCard } from './components/CourseGrid'

export default function MySubjects({ onSelectSubject, user, stats }) {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  const [failed, setFailed] = useState(false)
  const [semester, setSemester] = useState('all')

  // Fetch the student's enrolled subjects. A failed request shows a retry
  // card instead of the "not enrolled" message, which would be wrong.
  const fetchSubjects = async () => {
    setLoading(true)
    setFailed(false)
    try {
      const token = localStorage.getItem('token')
      const subjectsRes = await authFetch(`${API_BASE}/api/student/subjects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!subjectsRes.ok) throw new Error(`HTTP ${subjectsRes.status}`)
      const subjectsData = await subjectsRes.json()
      setSubjects(Array.isArray(subjectsData) ? subjectsData : [])
    } catch (err) {
      console.error('Failed to load subjects:', err)
      setFailed(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSubjects() }, [])

  // semester filter pills, only when the student has courses in 2+ semesters
  const semesters = useMemo(() => [...new Set(subjects.map(s => s.semester).filter(Boolean))], [subjects])
  const visible = semester === 'all' ? subjects : subjects.filter(s => s.semester === semester)

  const openSubject = (subject) => {
    // Build the subject payload and hand it up to the dashboard
    const subjectData = {
      id: subject.id,
      name: subject.name,
      section_id: subject.section_id,
      section_no: subject.section_no,
      semester: subject.semester,
      instructor: subject.instructor,
      quests_total: subject.quests_total,
      quests_done: subject.quests_done,
    }
    if (onSelectSubject) {
      onSelectSubject(subjectData)
    } else {
      navigate(`/student/subject/${subject.section_id}`)
    }
  }

  // Show skeleton cards while subjects are loading, shaped like the real grid below
  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 animate-pulse" aria-busy="true">
        <div className="h-8 w-48 bg-slate-800/80 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-[190px] rounded-xl bg-slate-900/70 border border-slate-800" />)}
        </div>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="rounded-xl border border-amber-300/25 bg-gradient-to-br from-[#0f1836] to-[#0a1024] p-10 text-center">
          <h2 className="font-cinzel text-2xl font-bold text-white mb-2">The scroll would not open</h2>
          <p role="alert" className="text-slate-300 mb-5">We could not load your subjects. Check your connection and try again.</p>
          <button onClick={fetchSubjects} className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">Try again</button>
        </div>
      </div>
    )
  }

  // Show an empty state when the student isn't enrolled in any subjects
  if (subjects.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="rounded-xl border border-amber-300/25 bg-gradient-to-br from-[#0f1836] to-[#0a1024] p-10 text-center">
          <h2 className="font-cinzel text-2xl font-bold text-white mb-2">No Subjects Enrolled</h2>
          <p className="text-slate-300 mb-2">You haven't been assigned to any subjects yet.</p>
          <p className="text-slate-500 text-sm">Contact your administrator to be enrolled in classes.</p>
        </div>
      </div>
    )
  }

  const stat = (value, label, color) => (
    <div className="rounded-xl border border-amber-300/20 bg-gradient-to-br from-[#0f1836] to-[#0a1024] p-3 sm:p-4 text-center">
      <div className={`font-cinzel text-xl sm:text-3xl font-bold ${color}`}>{value}</div>
      <div className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-[0.18em] mt-1 truncate">{label}</div>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <span className="w-2.5 h-2.5 rotate-45 bg-amber-300 shrink-0" aria-hidden="true" />
            My Subjects
          </h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">
            Welcome back, <span className="text-amber-200 font-semibold">{user?.full_name || user?.username}</span>. Here are your enrolled subjects.
          </p>
        </div>
        <div className="self-start sm:self-auto shrink-0 rounded-full border border-amber-300/30 bg-[#0b1326] px-4 py-2">
          <p className="text-[11px] font-bold tracking-[0.15em] uppercase text-amber-200 whitespace-nowrap">{subjects.length} {subjects.length === 1 ? 'Subject' : 'Subjects'} Enrolled</p>
        </div>
      </div>

      {semesters.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by semester">
          {['all', ...semesters].map(key => (
            <button
              key={key}
              onClick={() => setSemester(key)}
              aria-pressed={semester === key}
              className={`min-h-[44px] sm:min-h-0 px-4 py-2 rounded-full border text-xs font-bold tracking-wide transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${
                semester === key
                  ? 'bg-gradient-to-b from-violet-500 to-violet-700 border-violet-300/60 text-white shadow-[0_0_18px_-4px_rgba(139,92,246,0.7)]'
                  : 'bg-[#0b1224] border-slate-700 text-slate-300 hover:border-amber-300/40'
              }`}
            >{key === 'all' ? 'All Courses' : key}</button>
          ))}
        </div>
      )}

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visible.map((subject) => (
          <CourseCard key={subject.id} subject={subject} onOpen={openSubject} />
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 sm:mt-8">
        {stat(subjects.length, 'Total Subjects', 'text-violet-300')}
        {stat(stats?.quests_done ?? stats?.accepted_submissions ?? 0, 'Quests Done', 'text-emerald-300')}
        {stat(stats?.total_xp ?? 0, 'Total XP', 'text-amber-300')}
      </div>
    </div>
  )
}
