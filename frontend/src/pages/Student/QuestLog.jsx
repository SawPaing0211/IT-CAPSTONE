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
      // Course context - just use the provided blockId
      setSelectedBlock({ id: blockId })
      return
    }
    
    // Dashboard context - fetch enrolled blocks
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token')
        
        // ✅ Use new endpoint
        const blocksRes = await fetch('http://localhost:5000/api/student/subjects', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const subjects = await blocksRes.json()
        
        // Convert subjects to blocks format (group by block)
        const blocksMap = {}
        subjects.forEach(sub => {
          if (!blocksMap[sub.block_id]) {
            blocksMap[sub.block_id] = {
              id: sub.block_id,
              section_code: sub.block_code,
              name: sub.name,
              semester: sub.semester
            }
          }
        })
        
        const blocks = Object.values(blocksMap)
        setEnrolledBlocks(blocks)
        
        if (blocks.length > 0) {
          setSelectedBlock(blocks[0])
        }
      } catch (err) {
        console.error("Failed to load blocks", err)
      } finally {
        setLoading(false)
      }
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
        const res = await fetch(
          `http://localhost:5000/api/student/submissions/by-block?block_id=${selectedBlock.id}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        )
        const data = await res.json()
        setSubmissions(data.submissions || [])
      } catch (err) {
        console.error("Failed to load submissions", err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchSubmissions()
  }, [selectedBlock])

  if (loading && enrolledBlocks.length === 0) {
    return (
      <div className="text-center py-20 text-purple-300 animate-pulse">
        Loading Quest Log...
      </div>
    )
  }

  if (enrolledBlocks.length === 0) {
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
              <span>{submissions.length} {submissions.length === 1 ? 'Quest' : 'Quests'} Completed</span>
              <span>Success Rate: {Math.round((submissions.filter(s => s.status === 'accepted').length / submissions.length) * 100)}%</span>
            </div>
            
            {submissions.map((sub) => (
              <div 
                key={sub.id} 
                className="group bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-purple-500/50 transition-all duration-300 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-xl transition-transform group-hover:scale-110 ${
                    sub.status === 'accepted' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                  }`}>
                    {sub.status === 'accepted' ? '⚔️' : '💀'}
                  </div>
                  <div>
                    <h3 className="font-bold text-white group-hover:text-purple-400 transition">
                      {sub.problem_title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {new Date(sub.submitted_at).toLocaleDateString()} • {sub.language.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm">
                  {/* Status Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    sub.status === 'accepted' 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                      : 'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}>
                    {sub.status === 'accepted' ? 'CONQUERED' : 'DEFEATED'}
                  </span>

                  {/* XP Reward */}
                  <div className="text-right">
                    <span className={`font-bold text-lg ${sub.status === 'accepted' ? 'text-yellow-400' : 'text-slate-600'}`}>
                      {sub.status === 'accepted' ? `+${sub.score} XP` : '0 XP'}
                    </span>
                    <p className="text-xs text-slate-500">Score: {sub.score}</p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}