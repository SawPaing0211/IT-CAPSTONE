import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function ClassDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [classInfo, setClassInfo] = useState(null)
  const [students, setStudents] = useState([])
  const [stats, setStats] = useState({ total: 0, problems: 0, avg: 0, atRisk: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const fetchClassDetail = async () => {
      try {
        const token = localStorage.getItem('token')
        const headers = { 'Authorization': `Bearer ${token}` }

        // Fetch class info
        const classRes = await fetch(`http://localhost:5000/api/instructor/classes`, { headers })
        const classes = await classRes.json()
        const found = classes.find(c => c.id === parseInt(id))
        setClassInfo(found)

        // Fetch students in this class
        const studentsRes = await fetch(`http://localhost:5000/api/admin/blocks/${id}/students`, { headers })
        if (studentsRes.ok) {
          const data = await studentsRes.json()
          setStudents(data)
          const atRisk = data.filter(s => s.xp < 100).length
          setStats({
            total: data.length,
            problems: 0,
            avg: 0,
            atRisk
          })
        }
      } catch (err) {
        console.error('Failed to fetch class detail:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchClassDetail()
  }, [id])

  const filtered = students.filter(s =>
    s.username.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  )

  const getStatus = (xp) => {
    if (xp >= 500) return 'On Track'
    if (xp >= 100) return 'Needs Attention'
    return 'At Risk'
  }

  if (loading) return (
    <div className="text-center py-20 text-slate-400">Loading class data...</div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/instructor/classes')} className="text-slate-400 hover:text-white transition">
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">
                {classInfo?.section_code || id}
              </h1>
              <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full text-xs font-bold border border-green-600/30">
                Active
              </span>
            </div>
            <p className="text-slate-400">{classInfo?.name || 'Loading...'}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition">
            📊 View Analytics
          </button>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold transition">
            ➕ Add Student
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Students</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Active Problems</p>
          <p className="text-2xl font-bold text-white">{stats.problems}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Avg Score</p>
          <p className="text-2xl font-bold text-green-400">{stats.avg}%</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">At Risk</p>
          <p className="text-2xl font-bold text-red-400">{stats.atRisk}</p>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Students</h2>
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm outline-none"
          />
        </div>
        <table className="w-full text-left">
          <thead className="bg-slate-800/50 text-slate-400 text-sm">
            <tr>
              <th className="p-4 font-medium">Student</th>
              <th className="p-4 font-medium">Level</th>
              <th className="p-4 font-medium">XP</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-500">
                  No students found in this block
                </td>
              </tr>
            ) : (
              filtered.map(student => (
                <tr key={student.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                        {student.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white">{student.username}</p>
                        <p className="text-slate-500 text-xs">{student.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-slate-800 rounded text-xs font-bold text-slate-300">
                      Lvl {student.level}
                    </span>
                  </td>
                  <td className="p-4 text-yellow-400 font-mono font-bold">{student.xp} XP</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      getStatus(student.xp) === 'On Track' ? 'bg-green-600/20 text-green-400' :
                      getStatus(student.xp) === 'Needs Attention' ? 'bg-yellow-600/20 text-yellow-400' :
                      'bg-red-600/20 text-red-400'
                    }`}>
                      {getStatus(student.xp)}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                      View Progress
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}