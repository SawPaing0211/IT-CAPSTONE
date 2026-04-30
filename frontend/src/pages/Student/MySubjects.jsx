import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function MySubjects({ onSelectSubject }) {
  const navigate = useNavigate()
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token')
        
        // Get current user info
        const userRes = await fetch('http://localhost:5000/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const userData = await userRes.json()
        setUser(userData)
        
        // ✅ Get enrolled subjects (individual, not grouped by block)
        const subjectsRes = await fetch('http://localhost:5000/api/student/subjects', {
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
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-purple-300 font-mono text-lg">Loading your subjects...</p>
        </div>
      </div>
    )
  }

  if (subjects.length === 0) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
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
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span className="text-4xl">🎓</span>
            My Subjects
          </h1>
          <p className="text-slate-400 mt-1">
            Welcome back, <span className="text-purple-400 font-semibold">{user?.username}</span>! 
            Here are your enrolled subjects.
          </p>
        </div>
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-600/30 rounded-xl px-6 py-3">
          <p className="text-sm text-purple-300 font-bold">{subjects.length} {subjects.length === 1 ? 'Subject' : 'Subjects'} Enrolled</p>
        </div>
      </div>

            {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <div
            key={subject.id}
            onClick={() => {
            // ✅ Pass BOTH subject and block info
            const subjectData = {
              id: subject.id,              // ✅ SUBJECT ID (8 or 9) - THIS IS THE KEY FIX!
              name: subject.name,          // Subject name
              block_id: subject.block_id,  // Block ID
              block_code: subject.block_code,
              semester: subject.semester,
              instructor: subject.instructor
            }
            
            if (onSelectSubject) {
              onSelectSubject(subjectData)  // ✅ Pass subjectData
            } else {
              navigate(`/student/subject/${subject.block_id}`)
            }
          }}
            className="group bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-600/20 transition-all duration-300 cursor-pointer transform hover:scale-105"
          >
            {/* Subject Icon & Badge */}
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                📖
              </div>
              <span className="px-3 py-1 bg-purple-600/20 border border-purple-600/40 rounded-full text-xs font-bold text-purple-300">
                {subject.semester || 'Current'}
              </span>
            </div>

            {/* ✅ Subject Name (Big Text - this is now the main heading) */}
            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-300 transition">
              {subject.name}
            </h3>
            
            {/* ✅ Block Code Badge (Small Text) */}
            <div className="mb-3">
              <span className="px-2.5 py-0.5 bg-slate-700 rounded text-xs font-bold text-slate-300">
                Block {subject.block_code}
              </span>
            </div>
            
            {/* ✅ Instructor */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-700">
              <span className="text-xs text-slate-500">👨‍🏫 Instructor</span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-300 font-medium">
                {subject.instructor || 'TBA'}
              </span>
            </div>

            {/* Action Button */}
            <div className="mt-6 pt-4 border-t border-slate-700">
              <button className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-white font-bold text-sm transition shadow-lg shadow-purple-600/20 group-hover:shadow-purple-600/40">
                View Quest Log →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-purple-400">{subjects.length}</div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Total Subjects</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-green-400">0</div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Quests Completed</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">0</div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">Total XP Earned</div>
        </div>
      </div>
    </div>
  )
}