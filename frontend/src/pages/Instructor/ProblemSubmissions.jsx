import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import StudentCodeModal from "./StudentCodeModal";
import { API_BASE, authFetch } from '../../api/client'
import { formatApiTimestamp } from '../../utils/apiTimestamp'
import './InstructorQuestReview.css'
import InstructorBackButton from '../../components/InstructorBackButton'

export default function ProblemSubmissions() {
  const { problemId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // where this page came from — falls back to the standalone quests list
  // if it was reached some other way and no "from" was ever set
  const goBack = () => navigate(searchParams.get('from') || '/instructor/problems')
  const [problem, setProblem] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [error, setError] = useState(null)
  const [viewingSubmissionId, setViewingSubmissionId] = useState(null)

  // Fetch this problem's submissions and per-student status
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(`${API_BASE}/api/instructor/problems/${problemId}/submissions`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to fetch submissions')
      }
      const data = await res.json()
      if (!data?.problem || !Array.isArray(data.students)) throw new Error('The submissions response is incomplete. Please retry.')
      setProblem(data.problem)
      setStudents(data.students)
    } catch (err) {
      console.error('Failed to fetch data:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [problemId])

  // Loading/error are remote-resource states reset for each selected quest.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchData() }, [fetchData])

  // Filter students by submission status
  const filteredStudents = students.filter(student => {
    if (filter === 'submitted') return student.submitted
    if (filter === 'pending') return !student.submitted
    return true
  })

  // Compute submission counts and the average score across submitted students
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
        <button type="button" className="ir-secondary" onClick={fetchData}>Retry submissions</button>
        <InstructorBackButton onClick={goBack}>Back to Quests</InstructorBackButton>
      </div>
    )
  }

  if (!problem) {
    return (
      <div className="text-center py-20 text-red-400">Problem not found</div>
    )
  }

  return (
    <div className="iq-screen iq-submissions space-y-6">

      {/* Modal */}
      {viewingSubmissionId && (
        <StudentCodeModal
          submissionId={viewingSubmissionId}
          onClose={() => setViewingSubmissionId(null)}
        />
      )}

      {/* Header */}
      <div className="iq-heading flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <InstructorBackButton onClick={goBack} />
          <div className="min-w-0">
            <h1>{problem.title}</h1>
            <p className="text-slate-400 text-xs sm:text-base">Submission Overview</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="ir-secondary"
        >
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="iq-stats grid grid-cols-2 md:grid-cols-4 gap-4">
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
          <p className="text-slate-400 text-sm">Average submitted XP</p>
          <p className="text-2xl font-bold text-blue-400">{submittedCount ? `${avgScore} XP` : '—'}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="iq-filters flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" role="group" aria-label="Filter students">
        {[
          { key: 'all', label: `All (${students.length})`, active: 'bg-blue-600' },
          { key: 'submitted', label: `Submitted (${submittedCount})`, active: 'bg-green-600' },
          { key: 'pending', label: `Pending (${pendingCount})`, active: 'bg-yellow-600' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            aria-pressed={filter === tab.key}
            className={`px-4 py-2 min-h-[44px] rounded-lg font-medium transition shrink-0 whitespace-nowrap ${
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
      <p className="iq-table-hint">Recorded submissions only · Select a language’s code to view its saved result. <span>Scroll the table to see all columns.</span></p>
      <div className="iq-table-wrap" role="region" aria-label="Student submissions. Scroll horizontally on small screens." tabIndex={0}>
        <table className="w-full text-left min-w-[640px]">
          <thead className="bg-slate-800/50 text-slate-400 text-sm">
            <tr>
              <th className="p-3 sm:p-4 font-medium">Student</th>
              <th className="p-3 sm:p-4 font-medium">Status</th>
              <th className="p-3 sm:p-4 font-medium">Score</th>
              <th className="p-3 sm:p-4 font-medium hidden md:table-cell">Language</th>
              <th className="p-3 sm:p-4 font-medium hidden lg:table-cell">Submitted At</th>
              <th className="p-3 sm:p-4 font-medium">Code</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredStudents.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-8 text-center text-slate-500">
                  <div className="iq-empty"><h3>{students.length === 0 ? 'No students enrolled yet' : filter === 'submitted' ? 'No submissions yet' : filter === 'pending' ? 'No pending submissions' : 'No matching students'}</h3><p>{students.length === 0 ? 'Enrolled students will appear here.' : filter === 'submitted' ? 'Saved submissions will appear here when students submit this quest.' : 'Choose All to view the complete student list.'}</p>{filter !== 'all' && <button className="ir-secondary" onClick={() => setFilter('all')}>Show all students</button>}</div>
                </td>
              </tr>
            ) : (
              filteredStudents.map(student => (
                <tr key={student.id} className="hover:bg-slate-800/30 transition">

                  {/* Student */}
                  <td className="p-3 sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                        {(student.full_name || student.username)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white">{student.full_name || student.username}</p>
                        <p className="text-slate-500 text-xs">{student.username} · {student.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Status: one line per language the student submitted */}
                  <td className="p-3 sm:p-4">
                    <div className="flex flex-col gap-2 items-start">
                      {(student.submissions?.length ? student.submissions : [student]).map((row, i) => (
                        <span key={i} className={`px-3 py-1 rounded-full text-xs font-bold ${
                          !student.submitted
                            ? 'bg-slate-700/50 text-slate-400'
                            : row.status === 'accepted'
                            ? 'bg-green-600/20 text-green-400'
                            : row.status === 'partial'
                            ? 'bg-blue-600/20 text-blue-400'
                            : row.status === 'wrong_answer'
                            ? 'bg-yellow-600/20 text-yellow-400'
                            : 'bg-red-600/20 text-red-400'
                        }`}>
                          {!student.submitted ? '⏳ Not Submitted'
                            : row.status === 'accepted'      ? '✅ Accepted'
                            : row.status === 'partial'       ? '⚡ Partial'
                            : row.status === 'wrong_answer'  ? '⚠️ Wrong Answer'
                            : row.status === 'timeout'       ? '⏱️ Timeout'
                            : row.status === 'compile_error' ? '🔴 Compile Error'
                            : row.status === 'error'         ? '❌ Error'
                            : `📝 ${row.status}`}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Score: total over all languages, with the split when there are several */}
                  <td className="p-3 sm:p-4">
                    {student.submitted
                      ? <div>
                          <span className="text-yellow-400 font-mono font-bold">{student.score} XP</span>
                          {student.submissions?.length > 1 && (
                            <div className="text-slate-500 text-[10px] font-mono mt-1">
                              {student.submissions.map(r => `${r.language}: ${r.score}`).join(' + ')}
                            </div>
                          )}
                        </div>
                      : <span className="text-slate-500">—</span>}
                  </td>

                  {/* Language */}
                  <td className="p-4 hidden md:table-cell">
                    {student.language
                      ? <div className="flex flex-col gap-2">
                          {(student.submissions?.length ? student.submissions : [student]).map((row, i) => (
                            <span key={i} className="iq-language text-slate-300 text-sm">
                              {row.language === 'csharp' ? 'C#' : row.language === 'java' ? 'Java' : row.language === 'python' ? 'Python' : row.language}
                            </span>
                          ))}
                        </div>
                      : <span className="text-slate-500">—</span>}
                  </td>

                  {/* Submitted At */}
                  <td className="p-4 text-slate-400 text-sm hidden lg:table-cell">
                    {student.submitted_at
                      ? <div className="flex flex-col gap-2">
                          {(student.submissions?.length ? student.submissions : [student]).map((row, i) => (
                            <span key={i}>{formatApiTimestamp(row.submitted_at)}</span>
                          ))}
                        </div>
                      : '—'}
                  </td>

                  {/* View Code: one button per language */}
                  <td className="p-3 sm:p-4">
                    {student.submission_id ? (
                      <div className="flex flex-col gap-2 items-start">
                        {(student.submissions?.length ? student.submissions : [student]).map((row, i) => (
                          <button
                            key={i}
                            onClick={() => setViewingSubmissionId(row.submission_id)}
                            className="ir-secondary iq-view-code"
                          >
                            {'</>'}  View {row.language === 'csharp' ? 'C#' : row.language === 'java' ? 'Java' : row.language === 'python' ? 'Python' : row.language} code
                          </button>
                        ))}
                      </div>
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
