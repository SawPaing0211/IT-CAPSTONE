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

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../../api/client'

export default function MySubjects({ onSelectSubject, user, stats }) {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)

  // Fetch the student's enrolled subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const token = localStorage.getItem('token')
        const subjectsRes = await fetch(`${API_BASE}/api/student/subjects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const subjectsData = await subjectsRes.json()
        setSubjects(subjectsData)
      } catch (err) {
        console.error('Failed to load subjects:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSubjects()
  }, [])

  // Show skeleton cards while subjects are loading, shaped like the real grid below
  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="h-8 w-48 bg-slate-800 rounded-lg" />
            <div className="h-4 w-64 bg-slate-800 rounded mt-2" />
          </div>
          <div className="h-10 w-40 bg-slate-800 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-slate-800 rounded-xl" />
                <div className="h-5 w-16 bg-slate-800 rounded-full" />
              </div>
              <div className="h-5 w-3/4 bg-slate-800 rounded mb-2" />
              <div className="h-4 w-32 bg-slate-800 rounded mb-4" />
              <div className="h-8 w-full bg-slate-800 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Show an empty state when the student isn't enrolled in any subjects
  if (subjects.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-4xl mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-white mb-2">No Subjects Enrolled</h2>
          <p className="text-slate-400 mb-6">You haven't been assigned to any subjects yet.</p>
          <p className="text-slate-500 text-sm">Contact your administrator to be enrolled in classes.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-3xl sm:text-4xl">🎓</span>
            My Subjects
          </h1>
          <p className="text-slate-400 mt-1 text-sm sm:text-base">
            Welcome back, <span className="text-purple-400 font-semibold">{user?.full_name || user?.username}</span>! 
            Here are your enrolled subjects.
          </p>
        </div>
        <div className="self-start sm:self-auto shrink-0 bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-600/30 rounded-xl px-4 sm:px-6 py-2 sm:py-3">
          <p className="text-sm text-purple-300 font-bold whitespace-nowrap">{subjects.length} {subjects.length === 1 ? 'Subject' : 'Subjects'} Enrolled</p>
        </div>
      </div>

            {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            // Build the subject payload and hand it up to the dashboard
            onClick={() => {
              const subjectData = {
                id: subject.id,
                name: subject.name,
                section_id: subject.section_id,   
                section_no: subject.section_no,  
                semester: subject.semester,
                instructor: subject.instructor,
              }
              
              if (onSelectSubject) {
                onSelectSubject(subjectData)
              } else {
                navigate(`/student/subject/${subject.section_id}`) 
              }
            }}
            className="group bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-4 sm:p-5 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-600/20 transition-all duration-300 cursor-pointer transform hover:scale-[1.02]"
          >
            {/* Subject Icon & Badge */}
            <div className="flex items-start justify-between mb-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-xl shadow-lg group-hover:scale-110 transition-transform shrink-0">
                📖
              </div>
              <span className="px-2.5 py-1 bg-purple-600/20 border border-purple-600/40 rounded-full text-xs font-bold text-purple-300 shrink-0">
                {subject.semester || 'Current'}
              </span>
            </div>

            {/* Subject Name (Big Text - this is now the main heading) */}
            <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-300 transition truncate">
              {subject.name}
            </h3>

            {/* Class code + instructor — one compact line instead of two
                separate bordered sections */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 flex-wrap">
              <span className="px-2 py-0.5 bg-slate-700 rounded font-bold text-slate-300 shrink-0">
                🏷️ {subject.section_no || 'No Code'}
              </span>
              <span className="truncate">👨‍🏫 {subject.instructor || 'TBA'}</span>
            </div>

            {/* Action Button */}
            <button className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-white font-bold text-sm transition shadow-lg shadow-purple-600/20 group-hover:shadow-purple-600/40">
              Open Course →
            </button>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 sm:mt-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-4 text-center">
          <div className="text-lg sm:text-3xl font-bold text-purple-400">{subjects.length}</div>
          <div className="text-[9px] sm:text-xs text-slate-500 uppercase tracking-wider mt-0.5 sm:mt-1 truncate">Total Subjects</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-4 text-center">
          <div className="text-lg sm:text-3xl font-bold text-green-400">{stats?.accepted_submissions ?? 0}</div>
          <div className="text-[9px] sm:text-xs text-slate-500 uppercase tracking-wider mt-0.5 sm:mt-1 truncate">Quests Done</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 sm:p-4 text-center">
          <div className="text-lg sm:text-3xl font-bold text-yellow-400">{stats?.total_xp ?? 0}</div>
          <div className="text-[9px] sm:text-xs text-slate-500 uppercase tracking-wider mt-0.5 sm:mt-1 truncate">Total XP</div>
        </div>
      </div>
    </div>
  )
}
