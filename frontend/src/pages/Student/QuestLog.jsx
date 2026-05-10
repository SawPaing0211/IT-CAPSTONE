import { useState, useEffect } from 'react'

export default function QuestLog({ blockId }) {
  const [submissions, setSubmissions] = useState([])
  const [enrolledBlocks, setEnrolledBlocks] = useState([])
  const [selectedBlock, setSelectedBlock] = useState(null)
  const [loading, setLoading] = useState(true)

  // If blockId is provided (course context), use it directly
  // Otherwise, fetch enrolled blocks (dashboard context)
  useEffect(() => {
  if (blockId) {
    // Course context - fetch block info to display properly
    const fetchBlockInfo = async () => {
      try {
        const token = localStorage.getItem('token')
        // Get subjects to find block info
        const subjectsRes = await fetch('http://localhost:5000/api/student/subjects', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const subjects = await subjectsRes.json()
        
        // Find the subject for this block
        const subject = subjects.find(s => s.block_id === blockId)
        
        if (subject) {
          setSelectedBlock({
            id: subject.block_id,
            section_code: subject.block_code,
            name: subject.name,
            semester: subject.semester
          })
        }
      } catch (err) {
        console.error('Failed to fetch block info:', err)
        // Fallback
        setSelectedBlock({ id: blockId, section_code: 'Block', name: 'Current Subject' })
      }
    }
    fetchBlockInfo()
    return
  }
  
  // Dashboard context - fetch enrolled blocks (existing code)
  const fetchData = async () => {
    // ... your existing dashboard context code ...
  }
  fetchData()
}, [blockId])

  // Fetch submissions when block changes
  useEffect(() => {
    if (!selectedBlock) return
    
    const fetchSubmissions = async () => {
  setLoading(true)
  try {
    const token = localStorage.getItem('token')
    
    // Fetch ALL quests for this block
    const questsRes = await fetch(
      `http://localhost:5000/api/problems?block_id=${selectedBlock.id}&subject_id=${selectedBlock.subject_id || ''}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
    const allQuests = await questsRes.json()
    
    // Fetch student's submissions
    const subsRes = await fetch(
      `http://localhost:5000/api/student/submissions/by-block?block_id=${selectedBlock.id}`,
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
  }, [selectedBlock])

  if (loading) {
  return (
    <div className="text-center py-20 text-purple-300 animate-pulse">
      Loading Quest Log...
    </div>
  )
}

// Only show "No Subjects Enrolled" in dashboard context (not course context)
if (!blockId && enrolledBlocks.length === 0) {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
        <div className="text-5xl mb-4">📚</div>
        <h2 className="text-xl font-bold text-white mb-2">No Subjects Enrolled</h2>
        <p className="text-slate-400">You're not enrolled in any subjects yet. Contact your administrator.</p>
      </div>
    </div>
  )
}

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header with Block Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">📜 Quest Log</h1>
          <p className="text-slate-400 text-sm mt-1">Track your progress across subjects</p>
        </div>
        
        {/* Subject/Block Dropdown */}
        <select
          value={selectedBlock?.id || ''}
          onChange={(e) => {
            const block = enrolledBlocks.find(b => b.id === parseInt(e.target.value))
            setSelectedBlock(block)
          }}
          className="px-4 py-2 bg-slate-900 border border-purple-600/40 rounded-lg text-white text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition cursor-pointer"
        >
          {enrolledBlocks.map(block => (
            <option key={block.id} value={block.id}>
              {block.section_code} - {block.name}
            </option>
          ))}
        </select>
      </div>

      {/* Current Subject Badge */}
      {selectedBlock && (
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-600/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-xl">
              📚
            </div>
            <div>
              <p className="text-xs text-purple-300 font-bold uppercase tracking-wider">Current Subject</p>
              <p className="text-white font-bold">{selectedBlock.section_code} - {selectedBlock.name}</p>
            </div>
          </div>
        </div>
      )}

      {/* Submissions List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-purple-300 animate-pulse">
            Loading submissions...
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center">
            <div className="text-5xl mb-4">⚔️</div>
            <h3 className="text-lg font-bold text-white mb-2">No Quests Attempted</h3>
            <p className="text-slate-400 text-sm">
              You haven't attempted any quests in <span className="text-purple-400 font-semibold">{selectedBlock?.name}</span> yet.
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
                className={`group border rounded-xl p-4 transition-all duration-300 flex items-center justify-between ${
                  isConquered 
                    ? 'bg-green-900/10 border-green-600/30 hover:border-green-500/50' 
                    : 'bg-slate-900 border-slate-800 hover:border-purple-500/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Icon with animation for conquered */}
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

                <div className="flex items-center gap-6 text-sm">
                  {/* Status Badge */}
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

                  {/* XP Reward */}
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