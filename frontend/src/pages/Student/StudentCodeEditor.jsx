import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

export default function StudentCodeEditor() {
  const navigate = useNavigate()
  const { problemId } = useParams()
  
  // UI State
  const [language, setLanguage] = useState('python')
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [output, setOutput] = useState(null)
  const [showHints, setShowHints] = useState(false)
  const [usedHints, setUsedHints] = useState([])
  const [xpGained, setXpGained] = useState(0)
  const [showSuccessAnim, setShowSuccessAnim] = useState(false)

  // Gamification State (Mock - will connect to backend later)
  const [userStats, setUserStats] = useState({
    xp: 1250,
    level: 5,
    streak: 3
  })

  // Mock Problem Data (Matches backend Problem model)
  const [problem, setProblem] = useState({
    id: 1,
    title: 'Arrays: Reverse List',
    difficulty: 'Easy',
    xp_reward: 100,
    is_event_quest: false,
    description: 'Given an array of integers, reverse the array and return the new array. You must do this in-place with O(1) extra space.',
    hints: [
      { id: 1, text: 'Think about swapping elements from both ends moving inward.', xp_penalty: 10 },
      { id: 2, text: 'Python slice notation: arr[::-1] creates a reversed copy.', xp_penalty: 15 }
    ],
    starter_code: {
      python: 'def reverse_array(arr):\n    # Your code here\n    pass',
      java: 'public class Solution {\n    public int[] reverseArray(int[] arr) {\n        // Your code here\n        return arr;\n    }\n}',
      csharp: 'using System;\n\nclass Solution {\n    public int[] ReverseArray(int[] arr) {\n        // Your code here\n        return arr;\n    }\n}'
    },
    test_cases: [
      { input: '[1, 2, 3, 4, 5]', expected: '[5, 4, 3, 2, 1]' },
      { input: '[10, 20]', expected: '[20, 10]' },
      { input: '[]', expected: '[]' }
    ]
  })

  // Initialize code when language changes
  useEffect(() => {
    setCode(problem.starter_code[language] || '')
  }, [language])

  // Simulate Running Code (Replace with backend call later)
  const handleRunCode = async () => {
    setIsLoading(true)
    setOutput(null)
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    // Mock response matching backend structure
    const mockResults = {
      passed: 2,
      total: 3,
      test_results: [
        { test_case: '[1, 2, 3, 4, 5]', expected: '[5, 4, 3, 2, 1]', passed: true, output: '[5, 4, 3, 2, 1]', runtime: '0.02s' },
        { test_case: '[10, 20]', expected: '[20, 10]', passed: true, output: '[20, 10]', runtime: '0.01s' },
        { test_case: '[]', expected: '[]', passed: false, output: 'None', runtime: '0.00s', message: 'Wrong Answer' }
      ],
      status: 'wrong_answer',
      score: 66
    }
    
    setOutput(mockResults)
    setIsLoading(false)
  }

  // Simulate Submitting Solution
  const handleSubmit = async () => {
    setIsLoading(true)
    setOutput(null)
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Simulate success
    const successResults = {
      passed: 3,
      total: 3,
      test_results: [
        { test_case: '[1, 2, 3, 4, 5]', expected: '[5, 4, 3, 2, 1]', passed: true, output: '[5, 4, 3, 2, 1]', runtime: '0.02s' },
        { test_case: '[10, 20]', expected: '[20, 10]', passed: true, output: '[20, 10]', runtime: '0.01s' },
        { test_case: '[]', expected: '[]', passed: true, output: '[]', runtime: '0.00s' }
      ],
      status: 'accepted',
      score: 100
    }
    
    setOutput(successResults)
    setIsLoading(false)
    setShowSuccessAnim(true)
    
    // Calculate XP (deduct hint penalties)
    const hintPenalty = usedHints.reduce((sum, hId) => {
      const hint = problem.hints.find(h => h.id === hId)
      return sum + (hint ? hint.xp_penalty : 0)
    }, 0)
    
    const gained = Math.max(0, problem.xp_reward - hintPenalty)
    setXpGained(gained)
    setUserStats(prev => ({ ...prev, xp: prev.xp + gained }))
    
    setTimeout(() => setShowSuccessAnim(false), 3000)
  }

  const handleUseHint = (hintId) => {
    if (!usedHints.includes(hintId)) {
      setUsedHints([...usedHints, hintId])
    }
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      {/* Success Animation Overlay */}
      {showSuccessAnim && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300">
          <div className="bg-slate-900 border-2 border-green-500/50 rounded-2xl p-8 text-center shadow-2xl shadow-green-500/20 max-w-sm mx-4">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold text-green-400 mb-2">Accepted!</h2>
            <p className="text-slate-400 mb-4">All test cases passed</p>
            <div className="bg-green-600/20 border border-green-600/30 rounded-xl p-4 mb-4">
              <p className="text-green-300 font-bold text-xl">+{xpGained} XP</p>
              <p className="text-slate-400 text-sm mt-1">Level {userStats.level} • {userStats.xp + xpGained} Total</p>
            </div>
            <button onClick={() => navigate('/student/dashboard')} className="px-6 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-bold transition">
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/student/dashboard')} className="text-slate-400 hover:text-white transition">
            ← Back
          </button>
          <div>
            <h1 className="font-bold text-white flex items-center gap-2">
              {problem.title}
              {problem.is_event_quest && (
                <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-600 to-purple-600 text-white text-xs font-bold rounded-full">
                  🎉 EVENT
                </span>
              )}
            </h1>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className={`px-2 py-0.5 rounded ${
                problem.difficulty === 'Easy' ? 'bg-green-600/20 text-green-400' :
                problem.difficulty === 'Medium' ? 'bg-yellow-600/20 text-yellow-400' :
                'bg-red-600/20 text-red-400'
              }`}>
                {problem.difficulty}
              </span>
              <span>🎯 {problem.xp_reward} XP</span>
              <span>🔥 {userStats.streak} day streak</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg">
            <span className="text-purple-400 font-bold">Lvl {userStats.level}</span>
            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 rounded-full" style={{ width: '65%' }}></div>
            </div>
            <span className="text-xs text-slate-400">{userStats.xp} XP</span>
          </div>
          <button className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400">⚙️</button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Problem Description */}
        <div className="w-1/2 border-r border-slate-800 flex flex-col bg-slate-950 overflow-y-auto">
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                📋 Problem Statement
              </h2>
              <div className="text-slate-300 leading-relaxed whitespace-pre-line">
                {problem.description}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-400 mb-2">Examples</h3>
              <div className="space-y-3">
                {problem.test_cases.map((tc, idx) => (
                  <div key={idx} className="bg-slate-900 rounded-lg p-3 border border-slate-800">
                    <p className="text-xs text-slate-500 mb-1">Input</p>
                    <code className="text-green-400 text-sm font-mono block mb-2">{tc.input}</code>
                    <p className="text-xs text-slate-500 mb-1">Output</p>
                    <code className="text-blue-400 text-sm font-mono block">{tc.expected}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Hints Section */}
            <div className="border-t border-slate-800 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
                  💡 Hints
                </h3>
                <button 
                  onClick={() => setShowHints(!showHints)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition"
                >
                  {showHints ? 'Hide' : 'Show Hints'}
                </button>
              </div>
              
              {showHints && (
                <div className="space-y-3">
                  {problem.hints.map(hint => {
                    const isUsed = usedHints.includes(hint.id)
                    return (
                      <div key={hint.id} className={`p-3 rounded-lg border ${
                        isUsed ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-900 border-slate-800'
                      }`}>
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-xs font-bold ${isUsed ? 'text-slate-500' : 'text-yellow-400'}`}>
                            Hint {hint.id}
                          </span>
                          {!isUsed && (
                            <button 
                              onClick={() => handleUseHint(hint.id)}
                              className="text-xs bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 px-2 py-1 rounded transition"
                            >
                              Reveal (-{hint.xp_penalty} XP)
                            </button>
                          )}
                        </div>
                        <p className={`text-sm ${isUsed ? 'text-slate-300' : 'text-slate-600 blur-sm select-none'}`}>
                          {hint.text}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Code Editor & Console */}
        <div className="w-1/2 flex flex-col bg-slate-950">
          {/* Language Selector & Editor */}
          <div className="flex-1 flex flex-col border-b border-slate-800">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
              <div className="flex gap-1">
                {['python', 'java', 'csharp'].map(lang => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                      language === lang 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {lang === 'python' ? '🐍' : lang === 'java' ? '☕' : '🔷'} {lang}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-500">Main.{language === 'python' ? 'py' : language === 'java' ? 'java' : 'cs'}</span>
            </div>
            
            <div className="flex-1 relative">
              <textarea
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full h-full bg-slate-950 text-green-400 font-mono text-sm p-4 resize-none focus:outline-none leading-relaxed"
                spellCheck="false"
                placeholder={`// Write your ${language} code here...`}
              />
              {/* Line Numbers (Visual only) */}
              <div className="absolute top-4 left-0 w-10 text-right text-slate-600 font-mono text-sm select-none pointer-events-none pr-3">
                {code.split('\n').map((_, i) => (
                  <div key={i} className="leading-relaxed">{i + 1}</div>
                ))}
              </div>
            </div>
          </div>

          {/* Console & Actions */}
          <div className="h-64 flex flex-col bg-slate-900">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-800/50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Console</span>
              <div className="flex gap-2">
                <button 
                  onClick={handleRunCode}
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 rounded-md text-xs font-bold text-white transition flex items-center gap-1"
                >
                  {isLoading ? '⏳ Running...' : '▶ Run Code'}
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-md text-xs font-bold text-white transition flex items-center gap-1 shadow-lg shadow-green-600/20"
                >
                  {isLoading ? '⏳ Submitting...' : '📤 Submit'}
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
              {!output && !isLoading && (
                <p className="text-slate-500 italic">Run or submit your code to see results here...</p>
              )}
              
              {isLoading && (
                <div className="flex items-center gap-2 text-blue-400">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Executing tests...</span>
                </div>
              )}
              
              {output && (
                <div className="space-y-3">
                  <div className={`flex items-center gap-2 pb-2 border-b border-slate-700 ${
                    output.status === 'accepted' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    <span className="text-lg">{output.status === 'accepted' ? '✅' : '⚠️'}</span>
                    <span className="font-bold">{output.status === 'accepted' ? 'All Tests Passed' : 'Some Tests Failed'}</span>
                    <span className="text-slate-500 text-xs ml-auto">Score: {output.score}%</span>
                  </div>
                  
                  {output.test_results.map((tc, idx) => (
                    <div key={idx} className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-xs font-bold ${tc.passed ? 'text-green-400' : 'text-red-400'}`}>
                          Test Case {idx + 1}: {tc.passed ? 'PASSED' : 'FAILED'}
                        </span>
                        <span className="text-xs text-slate-500">{tc.runtime}</span>
                      </div>
                      {!tc.passed && (
                        <p className="text-xs text-red-300 mt-1">{tc.message || 'Output mismatch'}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}