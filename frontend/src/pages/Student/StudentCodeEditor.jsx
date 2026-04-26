import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { api } from '../../api/client'

export default function StudentCodeEditor({ 
  quest, 
  onVictory, 
  onReturn, 
  heroLevel,
  onOpenSandbox  // ← NEW: Added onOpenSandbox prop
}) {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('python')
  const [output, setOutput] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('problem')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showHints, setShowHints] = useState(false)
  const [usedHints, setUsedHints] = useState([])
  const [xpGained, setXpGained] = useState(0)
  const [showSuccessAnim, setShowSuccessAnim] = useState(false)
  const [combo, setCombo] = useState(0)
  const [autoSaveTimer, setAutoSaveTimer] = useState(null)
  const editorRef = useRef(null)
  const editorContainerRef = useRef(null)

  // Load saved code on mount
  useEffect(() => {
    if (quest?.starter_code) {
      const saved = localStorage.getItem(`forge_code_${quest.id}_${language}`)
      if (saved) {
        setCode(saved)
      } else {
        const starter = typeof quest.starter_code === 'string'
          ? JSON.parse(quest.starter_code)
          : quest.starter_code
        setCode(starter[language] || '')
      }
    }
  }, [quest, language])

  // Auto-save every 5 seconds
  useEffect(() => {
    if (autoSaveTimer) clearTimeout(autoSaveTimer)
    const timer = setTimeout(() => {
      if (quest?.id && code) {
        localStorage.setItem(`forge_code_${quest.id}_${language}`, code)
        const saveIndicator = document.getElementById('save-indicator')
        if (saveIndicator) {
          saveIndicator.textContent = 'Saved'
          setTimeout(() => saveIndicator.textContent = '', 2000)
        }
      }
    }, 5000)
    setAutoSaveTimer(timer)
    return () => clearTimeout(timer)
  }, [code, quest, language])

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleRunCode()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        localStorage.setItem(`forge_code_${quest?.id}_${language}`, code)
        const saveIndicator = document.getElementById('save-indicator')
        if (saveIndicator) {
          saveIndicator.textContent = 'Saved!'
          setTimeout(() => saveIndicator.textContent = '', 2000)
        }
      }
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [code, language, quest, isFullscreen])

  // Monaco ResizeObserver
  useEffect(() => {
    if (!editorContainerRef.current) return
    const observer = new ResizeObserver(() => {
      if (editorRef.current) {
        editorRef.current.layout()
      }
    })
    observer.observe(editorContainerRef.current)
    return () => observer.disconnect()
  }, [])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      editorRef.current?.layout()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 🔒 UPDATED: Using api.post instead of fetch
  const handleRunCode = async () => {
    setIsLoading(true)
    setOutput(null)
    try {
      const data = await api.post('/api/submissions', { problem_id: quest.id, code, language })
      setOutput(data)
      if (data.status === 'accepted') {
        playSuccessSound()
        setCombo(c => c + 1)
      } else {
        setCombo(0)
      }
    } catch (err) {
      setOutput({ error: err.message, status: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  // 🔒 UPDATED: Using api.post instead of fetch
  const handleSubmit = async () => {
    setIsLoading(true)
    setOutput(null)
    try {
      const data = await api.post('/api/submissions', { problem_id: quest.id, code, language })
      setOutput(data)
      if (data.status === 'accepted') {
        setShowSuccessAnim(true)
        const hintPenalty = usedHints.reduce((sum, hId) => {
          const hint = quest.hints?.find(h => h.id === hId)
          return sum + (hint?.xp_penalty || 0)
        }, 0)
        const gained = Math.max(0, (quest.xp_reward || 0) - hintPenalty)
        setXpGained(gained)
        if (onVictory) onVictory(gained, data.user_level || heroLevel)
        setTimeout(() => setShowSuccessAnim(false), 3000)
      }
    } catch (err) {
      setOutput({ error: err.message, status: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    if (confirm('Reset code to starter template?')) {
      const starter = typeof quest.starter_code === 'string'
        ? JSON.parse(quest.starter_code)
        : quest.starter_code
      setCode(starter[language] || '')
      localStorage.removeItem(`forge_code_${quest.id}_${language}`)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `solution.${language === 'python' ? 'py' : language === 'java' ? 'java' : 'cs'}`
    a.click()
  }

  const handleUseHint = (hintId) => {
    if (!usedHints.includes(hintId)) {
      setUsedHints([...usedHints, hintId])
    }
  }

  const playSuccessSound = () => {
    const audio = new Audio('/sounds/success.mp3')
    audio.volume = 0.3
    audio.play().catch(() => {})
  }

  const editorOptions = {
    minimap: { enabled: true },
    fontSize: 14,
    lineHeight: 1.6,
    fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', 'Consolas', monospace",
    fontLigatures: true,
    automaticLayout: false,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    tabSize: 4,
    suggest: { showKeywords: true, showSnippets: true },
    autoIndent: 'full',
    formatOnPaste: true,
    formatOnType: true,
    folding: true,
    foldingStrategy: 'indentation',
    renderLineHighlight: 'all',
    matchBrackets: 'always',
    unicodeHighlight: { ambiguousCharacters: false, invisibleCharacters: false },
  }

  if (!quest) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-400 bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mx-auto mb-4"></div>
          <p>Loading quest...</p>
        </div>
      </div>
    )
  }

  return (
    // Root: locked to 100vh, flex column, no overflow
    <div
      className={`flex flex-col bg-slate-950 text-slate-100 overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-[9999]' : ''
      }`}
      style={{ height: '100vh' }}
    >

      {/* Success Animation Overlay */}
      {showSuccessAnim && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300 pointer-events-auto">
          <div className="bg-slate-900 border-2 border-green-500/50 rounded-2xl p-8 text-center shadow-2xl shadow-green-500/20 max-w-sm mx-4">
            <div className="text-6xl mb-4 animate-[bounce_0.5s_ease-in-out_3]">🎉</div>
            <h2 className="text-2xl font-bold text-green-400 mb-2">Quest Complete!</h2>
            <p className="text-slate-400 mb-4">All tests passed, hero!</p>
            {combo > 1 && (
              <div className="mb-4 px-4 py-2 bg-orange-600/20 border border-orange-600/40 rounded-lg">
                <p className="text-orange-400 font-bold">🔥 {combo}x Combo!</p>
              </div>
            )}
            <div className="bg-green-600/20 border border-green-600/30 rounded-xl p-4 mb-4">
              <p className="text-green-300 font-bold text-xl">+{xpGained} XP</p>
              <p className="text-slate-400 text-sm mt-1">Forge your legend!</p>
            </div>
            <button
              onClick={onReturn}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-bold transition shadow-lg"
            >
              Continue Adventure
            </button>
          </div>
        </div>
      )}

      {/* ── HEADER (shrink-0, fixed 56px) ── */}
      <header className="h-14 bg-slate-900/90 border-b border-purple-600/40 flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onReturn}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm"
          >
            ← Back to Quests
          </button>
          <div className="h-6 w-px bg-slate-700"></div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-white">{quest.title}</h1>
              {quest.is_event_quest && (
                <span className="px-2 py-0.5 bg-gradient-to-r from-yellow-600 to-purple-600 text-white text-[10px] font-bold rounded-full animate-pulse">
                  🎉 EVENT
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span className={`px-2 py-0.5 rounded border ${
                quest.difficulty === 'Easy'   ? 'bg-green-600/20 text-green-400' :
                quest.difficulty === 'Medium' ? 'bg-yellow-600/20 text-yellow-400' :
                                                'bg-red-600/20 text-red-400'
              }`}>
                {quest.difficulty}
              </span>
              <span>🎯 {quest.xp_reward} XP</span>
              <span>•</span>
              <span>{quest.problem_type || 'coding'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span id="save-indicator" className="text-[10px] text-slate-500"></span>
          <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-purple-600/30">
            <span className="text-purple-400 font-bold text-xs">Lvl {heroLevel}</span>
          </div>
          <button
            onClick={toggleFullscreen}
            className={`p-2 rounded-lg transition border ${
              isFullscreen
                ? 'bg-purple-600/40 border-purple-500 text-white shadow-lg shadow-purple-600/40'
                : 'hover:bg-slate-800 border-transparent text-slate-400 hover:text-white'
            }`}
            title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen'}
          >
            {isFullscreen ? '◱' : '⛶'}
          </button>
        </div>
      </header>

      {/* ── MAIN BODY (fills remaining height, no overflow) ── */}
      <div
        className="flex-1 grid grid-cols-[minmax(300px,1fr)_3fr] overflow-hidden"
        style={{ minHeight: 0 }}
      >

        {/* ── LEFT PANEL ── */}
        <div className={`border-r border-purple-600/20 flex flex-col bg-slate-950 overflow-hidden ${
          isFullscreen ? 'min-w-[250px]' : 'min-w-[300px]'
        }`}>

          {/* Tabs */}
          <div className="flex border-b border-purple-600/20 bg-slate-900/50 shrink-0">
            <button
              onClick={() => setActiveTab('problem')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition ${
                activeTab === 'problem'
                  ? 'bg-purple-600/20 text-purple-400 border-b-2 border-purple-600'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📜 Problem
            </button>
            <button
              onClick={() => setActiveTab('testcases')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition ${
                activeTab === 'testcases'
                  ? 'bg-purple-600/20 text-purple-400 border-b-2 border-purple-600'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📋 Test Cases
            </button>
            <button
              onClick={() => setActiveTab('hints')}
              className={`flex-1 px-4 py-2 text-sm font-medium transition relative ${
                activeTab === 'hints'
                  ? 'bg-purple-600/20 text-purple-400 border-b-2 border-purple-600'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              💡 Hints
              {quest.hints?.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-600 text-white text-[8px] rounded-full flex items-center justify-center">
                  {quest.hints.length}
                </span>
              )}
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-5" style={{ minHeight: 0 }}>
            {activeTab === 'problem' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">📜 Quest Details</h2>
                  <div className="text-slate-300 leading-relaxed whitespace-pre-line text-sm">{quest.description}</div>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-400 mb-2">Examples</h3>
                  <div className="space-y-3">
                    {quest.test_cases?.slice(0, 3).map((tc, idx) => (
                      <div key={idx} className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
                        <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Input</p>
                        <code className="text-green-400 text-xs font-mono block mb-2 break-all">{tc.input}</code>
                        <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Expected Output</p>
                        <code className="text-blue-400 text-xs font-mono block break-all">{tc.expected}</code>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-700">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Time Limit:</span><span className="text-slate-300">5 seconds</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
                    <span>Memory Limit:</span><span className="text-slate-300">256 MB</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'testcases' && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-400 mb-3">All Test Cases</h3>
                {quest.test_cases?.map((tc, idx) => (
                  <div key={idx} className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-purple-400">Test Case {idx + 1}</span>
                      {output?.test_results?.[idx] && (
                        <span className={`text-[10px] px-2 py-0.5 rounded ${
                          output.test_results[idx].passed
                            ? 'bg-green-600/20 text-green-400'
                            : 'bg-red-600/20 text-red-400'
                        }`}>
                          {output.test_results[idx].passed ? '✅ PASSED' : '❌ FAILED'}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 text-xs">
                      <div>
                        <p className="text-slate-500 mb-1">Input:</p>
                        <code className="text-green-400 font-mono block bg-slate-950 p-2 rounded">{tc.input}</code>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Expected:</p>
                        <code className="text-blue-400 font-mono block bg-slate-950 p-2 rounded">{tc.expected}</code>
                      </div>
                      {output?.test_results?.[idx] && !output.test_results[idx].passed && (
                        <div>
                          <p className="text-slate-500 mb-1">Your Output:</p>
                          <code className="text-red-400 font-mono block bg-slate-950 p-2 rounded">
                            {output.test_results[idx].output}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'hints' && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-400 mb-3">Ancient Scrolls (Hints)</h3>
                {quest.hints?.map(hint => {
                  const isUsed = usedHints.includes(hint.id)
                  return (
                    <div
                      key={hint.id}
                      className={`p-4 rounded-lg border transition-all duration-300 ${
                        isUsed
                          ? 'bg-slate-900/60 border-slate-700'
                          : 'bg-slate-900/40 border-purple-600/30 hover:border-purple-600/60'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-bold ${isUsed ? 'text-slate-500' : 'text-yellow-400'}`}>
                          Scroll {hint.id}
                        </span>
                        {!isUsed && (
                          <button
                            onClick={() => handleUseHint(hint.id)}
                            className="text-[10px] bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 px-2 py-1 rounded transition border border-yellow-600/40"
                          >
                            Reveal (-{hint.xp_penalty} XP)
                          </button>
                        )}
                      </div>
                      <p className={`text-sm transition-all duration-300 ${
                        isUsed ? 'text-slate-300' : 'text-slate-600 blur-sm select-none'
                      }`}>
                        {hint.text}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex flex-col bg-slate-950 overflow-hidden">

          {/* Toolbar (~48px, shrink-0) */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-purple-600/20 shrink-0">
            <div className="flex gap-1">
              {quest.languages?.map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                    language === lang
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border border-purple-400 shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  {lang === 'python' ? '🐍' : lang === 'java' ? '☕' : '🔷'} {lang}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {/* ← NEW: Try in Sandbox Button */}
              {onOpenSandbox && (
                <button
                  onClick={() => onOpenSandbox(code, language)}
                  className="px-3 py-1.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 border border-emerald-600/30 rounded-lg transition flex items-center gap-1"
                  title="Take your current code to the sandbox to experiment"
                >
                  🧪 Try in Sandbox
                </button>
              )}
              
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
              >
                🔄 Reset
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
              >
                📥 Download
              </button>
              <span className="text-[10px] text-slate-500">
                Main.{language === 'python' ? 'py' : language === 'java' ? 'java' : 'cs'}
              </span>
            </div>
          </div>

          {/* Monaco Editor (flex-1, min-height:0 — this is the critical pair) */}
          <div
            id="editor-wrapper"
            ref={editorContainerRef}
            style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden', position: 'relative' }}
          >
            <Editor
              height="100%"
              width="100%"
              language={language}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={editorOptions}
              onMount={(editor) => {
                editorRef.current = editor
                setTimeout(() => editor.layout(), 100)
              }}
            />
          </div>

          {/* Console (fixed 192px, shrink-0 — never grows or shrinks) */}
          <div
            id="console-wrapper"
            className="flex flex-col bg-slate-900/80 border-t border-purple-600/20"
            style={{ height: '192px', minHeight: '192px', flexShrink: 0, overflow: 'hidden' }}
          >
            {/* Console header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-purple-600/20 bg-slate-800/40 shrink-0">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                🔮 Crystal Ball (Console)
                {isLoading && <span className="text-blue-400 animate-pulse">• Casting spell...</span>}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleRunCode}
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-xs font-bold text-white transition flex items-center gap-1.5 border border-slate-600 hover:border-slate-500"
                >
                  {isLoading ? '⏳' : '▶'} Run <span className="hidden sm:inline">(Ctrl+Enter)</span>
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-green-600/20 border border-green-500/50"
                >
                  {isLoading ? '⏳' : '⚔️'} Submit
                </button>
              </div>
            </div>

            {/* Console output (scrollable within the 192px) */}
            <div className="overflow-y-auto p-4 font-mono text-xs" style={{ flex: '1 1 0', minHeight: 0 }}>
              {!output && !isLoading && (
                <div className="text-center py-4 text-slate-500">
                  <p className="text-lg mb-2">🔮</p>
                  <p>Cast your spell to see the results...</p>
                  <p className="text-xs mt-2">Press Ctrl+Enter to run your code</p>
                </div>
              )}
              {isLoading && (
                <div className="flex items-center justify-center py-4">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-purple-400 animate-pulse text-xs">Consulting the oracle...</p>
                  </div>
                </div>
              )}
              {output && (
                <div className="space-y-3">
                  <div className={`flex items-center gap-3 pb-3 border-b border-slate-700 ${
                    output.status === 'accepted' ? 'text-green-400' :
                    output.status === 'error'    ? 'text-red-400'   : 'text-yellow-400'
                  }`}>
                    <span className="text-xl">
                      {output.status === 'accepted' ? '✅' : output.status === 'error' ? '❌' : '⚠️'}
                    </span>
                    <div>
                      <p className="font-bold text-sm">
                        {output.status === 'accepted' ? 'Victory! All tests passed!' :
                         output.status === 'error'    ? 'Runtime Error' : 'Some tests failed'}
                      </p>
                      {output.status !== 'error' && (
                        <p className="text-xs text-slate-400">
                          Score: {output.score}% • Passed {output.passed || 0}/{output.total || output.test_results?.length || 0} tests
                        </p>
                      )}
                    </div>
                    {output.status === 'accepted' && (
                      <div className="ml-auto text-right">
                        <p className="text-yellow-400 font-bold text-lg">+{xpGained} XP</p>
                        {combo > 1 && <p className="text-orange-400 text-xs">🔥 {combo}x Combo!</p>}
                      </div>
                    )}
                  </div>

                  {output.test_results?.map((tc, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        tc.passed ? 'bg-green-900/10 border-green-600/30' : 'bg-red-900/10 border-red-600/30'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-bold ${tc.passed ? 'text-green-400' : 'text-red-400'}`}>
                          Test {idx + 1}: {tc.passed ? 'PASSED' : 'FAILED'}
                        </span>
                        <span className="text-xs text-slate-500">{tc.runtime}</span>
                      </div>
                      {!tc.passed && (
                        <div className="space-y-2 mt-2 text-xs">
                          <div>
                            <p className="text-slate-500 mb-1">Expected:</p>
                            <code className="text-blue-400 font-mono block bg-slate-950 p-2 rounded">{tc.expected}</code>
                          </div>
                          <div>
                            <p className="text-slate-500 mb-1">Your Output:</p>
                            <code className="text-red-400 font-mono block bg-slate-950 p-2 rounded">{tc.output}</code>
                          </div>
                          {tc.message && (
                            <div>
                              <p className="text-slate-500 mb-1">Error:</p>
                              <code className="text-red-400 font-mono block bg-slate-950 p-2 rounded">{tc.message}</code>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {output.error && (
                    <div className="p-3 bg-red-900/20 rounded-lg border border-red-600/30">
                      <p className="text-red-400 text-xs font-bold mb-1">Error:</p>
                      <code className="text-red-300 text-xs block">{output.error}</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>{/* end right panel */}
      </div>{/* end main body grid */}
    </div>/* end root */
  )
}