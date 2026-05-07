import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StudentCodeModal from "./StudentCodeModal";

export default function ProblemSubmissions() {
  const { problemId } = useParams()
  const navigate = useNavigate()
  const [problem, setProblem] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState(null)
  const [viewingSubmissionId, setViewingSubmissionId] = useState(null)

  useEffect(() => {
    fetchData()
  }, [problemId])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `http://localhost:5000/api/instructor/problems/${problemId}/submissions`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch submissions')
      }
      const data = await res.json()
      setProblem(data.problem)
      setStudents(data.students)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredStudents = students.filter(student => {
    if (filter === 'submitted') return student.submitted
    if (filter === 'pending') return !student.submitted
    return true
  })

  const submittedCount = students.filter(s => s.submitted).length
  const pendingCount = students.filter(s => !s.submitted).length
  const avgScore = submittedCount > 0
    ? Math.round(students.filter(s => s.submitted).reduce((acc, s) => acc + s.score, 0) / submittedCount)
    : 0

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-400">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
        Loading submissions...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">⚠️ {error}</p>
        <button
          onClick={() => navigate('/instructor/problems')}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
        >
          ← Back to Problems
        </button>
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="text-center py-20 text-red-400">Problem not found</div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Modal */}
      {viewingSubmissionId && (
        <StudentCodeModal
          submissionId={viewingSubmissionId}
          onClose={() => setViewingSubmissionId(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/instructor/problems')}
            className="text-slate-400 hover:text-white transition"
          >
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{problem.title}</h1>
            <p className="text-slate-400">Submission Overview</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 font-medium transition"
        >
          🔄 Refresh
        </button>
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

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { key: 'all', label: `All (${students.length})`, active: 'bg-blue-600' },
          { key: 'submitted', label: `Submitted (${submittedCount})`, active: 'bg-green-600' },
          { key: 'pending', label: `Pending (${pendingCount})`, active: 'bg-yellow-600' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === tab.key
                ? `${tab.active} text-white`
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-800/50 text-slate-400 text-sm">
            <tr>
              <th className="p-4 font-medium">Student</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Score</th>
              <th className="p-4 font-medium">Language</th>
              <th className="p-4 font-medium">Submitted At</th>
              <th className="p-4 font-medium">Code</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">
                  {students.length === 0
                    ? 'No students enrolled in your blocks yet.'
                    : 'No students match this filter.'}
                </td>
              </tr>
            ) : (
              filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-slate-800/30 transition">

                  {/* Student */}
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

                  {/* Status */}
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      !student.submitted
                        ? 'bg-slate-700/50 text-slate-400'
                        : student.status === 'accepted'
                        ? 'bg-green-600/20 text-green-400'
                        : student.status === 'wrong_answer'
                        ? 'bg-yellow-600/20 text-yellow-400'
                        : 'bg-red-600/20 text-red-400'
                    }`}>
                      {!student.submitted ? '⏳ Not Submitted'
                        : student.status === 'accepted' ? '✅ Accepted'
                        : student.status === 'wrong_answer' ? '⚠️ Wrong Answer'
                        : student.status === 'error' ? '❌ Error'
                        : `📝 ${student.status}`}
                    </span>
                  </td>

                  {/* Score */}
                  <td className="p-4">
                    {student.submitted
                      ? <span className="text-yellow-400 font-mono font-bold">{student.score} XP</span>
                      : <span className="text-slate-500">—</span>}
                  </td>

                  {/* Language */}
                  <td className="p-4">
                    {student.language
                      ? <span className="text-slate-300 text-sm">
                          {student.language === 'python' ? '🐍'
                            : student.language === 'java' ? '☕' : '🔷'} {student.language}
                        </span>
                      : <span className="text-slate-500">—</span>}
                  </td>

                  {/* Submitted At */}
                  <td className="p-4 text-slate-400 text-sm">
                    {student.submitted_at
                      ? new Date(student.submitted_at).toLocaleString()
                      : '—'}
                  </td>

                  {/* View Code */}
                  <td className="p-4">
                    {student.submission_id ? (
                      <button
                        onClick={() => setViewingSubmissionId(student.submission_id)}
                        className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-600/40 hover:border-blue-600 rounded-lg text-xs font-medium transition-all duration-150"
                      >
                        {'</>'}  View Code
                      </button>
                    ) : (
                      <span className="text-slate-600 text-xs">No submission</span>
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