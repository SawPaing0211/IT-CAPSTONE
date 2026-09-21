import { useState, useEffect } from 'react'
import { API_BASE } from '../../api/client'

export default function QuestLog({ sectionId }) {
  const [submissions, setSubmissions] = useState([])
  const [selectedSection, setSelectedSection] = useState(null)
  const [loading, setLoading] = useState(true)

  // QuestLog only ever gets opened from inside one subject's course tabs, so
  // sectionId is always given — just resolve that one subject's details,
  // no need to offer a "pick a subject" dropdown here at all
  useEffect(() => {
    const fetchSectionInfo = async () => {
      try {
        const token = localStorage.getItem('token')
        const subjectsRes = await fetch(`${API_BASE}/api/student/subjects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const subjects = await subjectsRes.json()

        const subject = subjects.find(s => s.section_id === sectionId)
        if (subject) {
          setSelectedSection({
            id: subject.section_id,
            section_code: subject.section_no,
            name: subject.name,
            subject_id: subject.id,
            semester: subject.semester
          })
        } else {
          setSelectedSection({ id: sectionId, section_code: 'Section', name: 'Current Subject', subject_id: null })
        }
      } catch (err) {
        console.error('Failed to fetch section info:', err)
        setSelectedSection({ id: sectionId, section_code: 'Section', name: 'Current Subject', subject_id: null })
      }
    }
    fetchSectionInfo()
  }, [sectionId])

  // Fetch quests and submissions for the selected section, then merge them by quest
  useEffect(() => {
    if (!selectedSection) return

    const fetchSubmissions = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')

        const questsRes = await fetch(
          `${API_BASE}/api/problems${selectedSection.subject_id ? `?subject_id=${selectedSection.subject_id}` : ''}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        const allQuests = await questsRes.json()

        const subsRes = await fetch(
          `${API_BASE}/api/student/submissions/by-section?section_id=${selectedSection.id}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        const subsData = await subsRes.json()
        const submissions = subsData.submissions || []
    
    // Merge: Each quest appears once with its best submission
    const questsWithStatus = allQuests.map(quest => {
      // Find best submission for this quest (accepted or latest)
      const questSubmissions = submissions.filter(s => s.problem_id === quest.id)
      const bestSubmission = questSubmissions.find(s => s.status === 'accepted') || 
                      questSubmissions[questSubmissions.length - 1]

const statusMap = {
  'accepted':     'conquered',
  'partial':      'partial',
  'wrong_answer': 'wrong',
  'error':        'error',
  'compile_error':'error',
  'timeout':      'timeout',
}
return {
  ...quest,
  status: bestSubmission
    ? (statusMap[bestSubmission.status] || 'ongoing')
    : 'not_started',
        submission: bestSubmission,
        attempts: questSubmissions.length
      }
    })
    
    setSubmissions(questsWithStatus)
  } catch (err) {
    console.error("Failed to load quests", err)
  } finally {
    setLoading(false)
  }
}
    
    fetchSubmissions()
  }, [selectedSection])

  // Show a loading message while section info resolves
  if (loading) {
  return (
    <div className="text-center py-20 text-purple-300 animate-pulse">
      Loading Quest Log...
    </div>
  )
}

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header — no subject picker here, this page is already scoped to
          whichever subject's course tabs it was opened from */}
      <div>
        <h1 className="text-2xl font-bold text-white">📜 Quest Log</h1>
        <p className="text-slate-400 text-sm mt-1">Track your progress in this subject</p>
      </div>

      {/* Current Subject Badge */}
      {selectedSection && (
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-600/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-xl">
              📚
            </div>
            <div>
              <p className="text-xs text-purple-300 font-bold uppercase tracking-wider">Current Subject</p>
              <p className="text-white font-bold">{selectedSection.section_code} - {selectedSection.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Submissions List */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="border border-slate-800 rounded-xl p-4 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-slate-800" />
                  <div>
                    <div className="h-4 bg-slate-800 rounded w-32 mb-2" />
                    <div className="h-3 bg-slate-800 rounded w-20" />
                  </div>
                </div>
                <div className="h-6 bg-slate-800 rounded-full w-24" />
              </div>
            ))}
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">⚔️</div>
            <h3 className="text-lg font-bold text-white mb-2">No Quests Attempted</h3>
            <p className="text-slate-400 text-sm">
              You haven't attempted any quests in <span className="text-purple-400 font-semibold">{selectedSection?.name}</span> yet.
            </p>
            <p className="text-slate-500 text-xs mt-2">Go to the Quest Board to start your adventure!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
              <span>
                {submissions.filter(s => s.status === 'conquered').length} / {submissions.length} {submissions.length === 1 ? 'Quest' : 'Quests'} Conquered
              </span>
              <span>Success Rate: {submissions.length > 0 ? Math.round((submissions.filter(s => s.status === 'conquered').length / submissions.length) * 100) : 0}%</span>
            </div>
            
            {submissions.map((quest) => {
            const isConquered = quest.status === 'conquered'
            const isOngoing = quest.status === 'ongoing'
            
            return (
              <div 
                key={quest.id} 
                className={`group border rounded-xl p-4 transition-all duration-300 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0 sm:justify-between ${
                  isConquered 
                    ? 'bg-green-900/10 border-green-600/30 hover:border-green-500/50' 
                    : 'bg-slate-900 border-slate-800 hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl transition-transform group-hover:scale-110 ${
                    isConquered ? 'bg-green-900/30 text-green-400' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isConquered ? (
                      <span className="animate-pulse">⚔️</span>
                    ) : (
                      <span>📜</span>
                    )}
                  </div>
                  
                  <div>
                    <h3 className={`font-bold group-hover:text-purple-400 transition ${
                      isConquered ? 'text-green-400' : 'text-white'
                    }`}>
                      {quest.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {quest.difficulty} • {quest.languages?.[0]?.toUpperCase() || 'PYTHON'}
                    </p>
                    {quest.attempts > 0 && (
                      <p className="text-xs text-slate-500">
                        {quest.attempts} attempt{quest.attempts > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    quest.status === 'conquered'  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                    : quest.status === 'partial'  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : quest.status === 'wrong'    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : quest.status === 'error'    ? 'bg-red-500/20 text-red-400 border-red-500/30'
                    : quest.status === 'timeout'  ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                    : quest.status === 'not_started' ? 'bg-slate-700/50 text-slate-500 border-slate-700'
                    : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  }`}>
                    {quest.status === 'conquered'   ? '⚔️ CONQUERED'
                    : quest.status === 'partial'    ? '⚡ PARTIAL'
                    : quest.status === 'wrong'      ? '❌ WRONG ANSWER'
                    : quest.status === 'error'      ? '🔴 ERROR'
                    : quest.status === 'timeout'    ? '⏱ TIMEOUT'
                    : quest.status === 'not_started'? '📋 NOT STARTED'
                    : '📜 ONGOING'}
                  </span>

                  <div className="text-right">
                    {quest.submission ? (
                      <div>
                        <span className={`font-bold text-lg ${
                          isConquered ? 'text-yellow-400' : 'text-slate-500'
                        }`}>
                          {isConquered
                            ? `+${quest.xp_reward} XP`
                            : `${quest.submission.score ?? 0} / ${quest.xp_reward} XP`}
                        </span>
                      </div>
                    ) : (
                      <span className="font-bold text-lg text-slate-600">{quest.xp_reward} XP</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          </>
        )}
      </div>
    </div>
  )
}