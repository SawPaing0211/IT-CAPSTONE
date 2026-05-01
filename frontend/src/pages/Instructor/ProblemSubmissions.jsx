import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function ProblemSubmissions() {
  const { problemId } = useParams()
  const navigate = useNavigate()
  const [problem, setProblem] = useState(null)
  const [students, setStudents] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all, submitted, pending

  useEffect(() => {
    fetchData()
  }, [problemId])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      
      // Fetch problem details
      const problemRes = await fetch(`http://localhost:5000/api/instructor/problems/${problemId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (problemRes.ok) {
        const data = await problemRes.json()
        setProblem(data)
      }

      // Fetch all students (you might need to adjust this endpoint)
      const studentsRes = await fetch('http://localhost:5000/api/admin/users?role=student', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (studentsRes.ok) {
        const data = await studentsRes.json()
        setStudents(data)
      }

      // Fetch submissions for this problem
      const subsRes = await fetch(`http://localhost:5000/api/submissions?problem_id=${problemId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (subsRes.ok) {
        const data = await subsRes.json()
        setSubmissions(data.submissions || data)
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  }

  // Merge students with their submission status
  const studentSubmissions = students.map(student => {
    const submission = submissions.find(s => s.user_id === student.id || s.student_id === student.id)
    return {
      ...student,
      submitted: !!submission,
      score: submission?.score || 0,
      status: submission?.status || 'Not Submitted',
      submitted_at: submission?.submitted_at || null,
      test_results: submission?.test_results || null
    }
  })

  const filteredStudents = studentSubmissions.filter(student => {
    if (filter === 'submitted') return student.submitted
    if (filter === 'pending') return !student.submitted
    return true
  })

  const submittedCount = studentSubmissions.filter(s => s.submitted).length
  const pendingCount = studentSubmissions.filter(s => !s.submitted).length
  const avgScore = submittedCount > 0 
    ? Math.round(studentSubmissions.filter(s => s.submitted).reduce((acc, s) => acc + s.score, 0) / submittedCount)
    : 0

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-400">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
        Loading submissions...
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="text-center py-20 text-red-400">
        Problem not found
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/instructor/problems')} className="text-slate-400 hover:text-white transition">
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{problem.title}</h1>
            <p className="text-slate-400">Submission Overview</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition">
            📊 View Analytics
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Students</p>
          <p className="text-2xl font-bold text-white">{students.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Submitted</p>
          <p className="text-2xl font-bold text-green-400">{submittedCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Pending</p>
          <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Avg Score</p>
          <p className="text-2xl font-bold text-blue-400">{avgScore} XP</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          All ({studentSubmissions.length})
        </button>
        <button
          onClick={() => setFilter('submitted')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'submitted' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Submitted ({submittedCount})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-medium transition ${
            filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
          }`}
        >
          Pending ({pendingCount})
        </button>
      </div>

      {/* Submissions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-800/50 text-slate-400 text-sm">
            <tr>
              <th className="p-4 font-medium">Student</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Score</th>
              <th className="p-4 font-medium">Submitted At</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-500">
                  No students found
                </td>
              </tr>
            ) : (
              filteredStudents.map(student => (
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
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      student.submitted ? 'bg-green-600/20 text-green-400' : 'bg-yellow-600/20 text-yellow-400'
                    }`}>
                      {student.submitted ? '✅ Submitted' : '⏳ Pending'}
                    </span>
                  </td>
                  <td className="p-4">
                    {student.submitted ? (
                      <span className="text-yellow-400 font-mono font-bold">{student.score} XP</span>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-400 text-sm">
                    {student.submitted_at ? new Date(student.submitted_at).toLocaleString() : '-'}
                  </td>
                  <td className="p-4 text-right">
                    {student.submitted && (
                      <button 
                        onClick={() => alert(`View code for ${student.username}\n\nScore: ${student.score} XP\nStatus: ${student.status}`)}
                        className="px-3 py-1 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-600/30 transition"
                      >
                        View Code
                      </button>
                    )}
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