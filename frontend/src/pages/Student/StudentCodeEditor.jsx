import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { api, API_BASE} from '../../api/client'
import DownloadIcon from '../../components/DownloadIcon'

export default function StudentCodeEditor({ 
  quest, 
  onVictory, 
  onReturn, 
  heroLevel,
  onOpenSandbox  
}) {
  const LANG_LINE_OFFSET = { python: 0, java: 0, csharp: 7 }

  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('python')
  const [output, setOutput] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('problem')
  // mobile-only: which of the two panels (normally shown side by side) is
  // visible below the md breakpoint, since there's no room for both at once
  const [mobilePanel, setMobilePanel] = useState('problem')
  const [showHints, setShowHints] = useState(false)
  const [usedHints, setUsedHints] = useState([])
  const [xpGained, setXpGained] = useState(0)
  const [userRole, setUserRole] = useState(null)
  const [isQuestCompleted, setIsQuestCompleted] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [priorSubmission, setPriorSubmission] = useState(null) 
  const [savedCode, setSavedCode] = useState('')   
  const [showSuccessAnim, setShowSuccessAnim] = useState(false)
  const [combo, setCombo] = useState(0)
  const [autoSaveTimer, setAutoSaveTimer] = useState(null)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const editorRef = useRef(null)
  const editorContainerRef = useRef(null)
  const monacoRef = useRef(null)

  // ── Parse compiler errors into Monaco markers ─────────────────────────
const parseAndHighlightErrors = (errorText, language) => {
  if (!editorRef.current || !monacoRef.current || !errorText) return

  const model = editorRef.current.getModel()
  if (!model) return

  const offset = LANG_LINE_OFFSET[language] ?? 0
  const markers = []

  if (language === 'csharp') {
    const csRegex = /\((\d+),(\d+)\):\s*(error|warning)\s+(\w+):\s*(.+?)(?:\s*\[.*?\])?$/gm
    let match
    while ((match = csRegex.exec(errorText)) !== null) {
      const studentLine = Math.max(1, parseInt(match[1]) - offset)
      markers.push({
        startLineNumber: studentLine,
        startColumn:     parseInt(match[2]),
        endLineNumber:   studentLine,
        endColumn:       parseInt(match[2]) + 10,
        message:  `${match[4]}: ${match[5]}`,
        severity: match[3] === 'error'
          ? monacoRef.current.MarkerSeverity.Error
          : monacoRef.current.MarkerSeverity.Warning,
      })
    }
  }

  else if (language === 'java') {
    const lines = errorText.split('\n')
    const seen = new Set()

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      const firstColon = trimmed.indexOf(':')
      if (firstColon === -1) continue

      const filename = trimmed.substring(0, firstColon).trim()
      if (!filename.endsWith('.java')) continue

      const afterFilename = trimmed.substring(firstColon + 1)
      const secondColon = afterFilename.indexOf(':')
      if (secondColon === -1) continue

      const lineNumStr = afterFilename.substring(0, secondColon).trim()
      const lineNum = parseInt(lineNumStr, 10)
      if (isNaN(lineNum)) continue

      const rest = afterFilename.substring(secondColon + 1).trim()
      const thirdColon = rest.indexOf(':')
      if (thirdColon === -1) continue

      const errorType = rest.substring(0, thirdColon).trim()
      if (errorType !== 'error' && errorType !== 'warning') continue

      const message = rest.substring(thirdColon + 1).trim()

      const studentLine = Math.max(1, lineNum - offset)
      const key = studentLine + ':' + message

      if (!seen.has(key)) {
        seen.add(key)
        markers.push({
          startLineNumber: studentLine,
          startColumn:     1,
          endLineNumber:   studentLine,
          endColumn:       200,
          message:         message,
          severity:        monacoRef.current.MarkerSeverity.Error,
        })
      }
    }
  }

  else if (language === 'python') {
    const lineMatches = [...errorText.matchAll(/line (\d+)/g)]
    const lines = errorText.split('\n').map(l => l.trim()).filter(Boolean)
    const errorDesc = lines.find(l => /^(\w+Error|NameError|TypeError|ValueError|SyntaxError|AttributeError|Exception)/.test(l))
      || lines.filter(l => !l.startsWith('Traceback') && !l.startsWith('File ') && !l.startsWith('line ') && !l.includes('most recent')).pop()
      || 'Runtime error'

    if (lineMatches.length > 0) {
      const rawLine = parseInt(lineMatches[lineMatches.length - 1][1])
      const studentLine = Math.max(1, rawLine - offset)
      markers.push({
        startLineNumber: studentLine,
        startColumn:     1,
        endLineNumber:   studentLine,
        endColumn:       200,
        message:         errorDesc,
        severity:        monacoRef.current.MarkerSeverity.Error,
      })
    }
  }

  monacoRef.current.editor.setModelMarkers(model, 'forge', markers)
}

// ── Format raw compiler output into clean readable message ────────────
const formatErrorOutput = (rawOutput, language) => {
  if (!rawOutput) return rawOutput

  if (language === 'java') {
    const javaErrors = []
    const seen = new Set()
    const lines = rawOutput.split('\n')

    for (const line of lines) { 
      const trimmed = line.trim()
      if (!trimmed) continue

      const firstColon = trimmed.indexOf(':')
      if (firstColon === -1) continue

      const filename = trimmed.substring(0, firstColon).trim()
      if (!filename.endsWith('.java')) continue

      const afterFilename = trimmed.substring(firstColon + 1)
      const secondColon = afterFilename.indexOf(':')
      if (secondColon === -1) continue

      const lineNumStr = afterFilename.substring(0, secondColon).trim()
      const lineNum = parseInt(lineNumStr, 10)
      if (isNaN(lineNum)) continue

      const rest = afterFilename.substring(secondColon + 1).trim()
      const thirdColon = rest.indexOf(':')
      if (thirdColon === -1) continue

      const errorType = rest.substring(0, thirdColon).trim()
      if (errorType !== 'error' && errorType !== 'warning') continue

      const message = rest.substring(thirdColon + 1).trim()
      const formatted = 'Line ' + lineNum + ': ' + message

      if (!seen.has(formatted)) {
        seen.add(formatted)
        javaErrors.push(formatted)
      }
    }

    if (javaErrors.length > 0) return javaErrors.join('\n')
  }

  if (language === 'csharp') {
    const csErrors = []
    const csRegex = /\((\d+),(\d+)\):\s*(error|warning)\s+(\w+):\s*(.+?)(?:\s*\[.*?\])?$/gm
    let match
    while ((match = csRegex.exec(rawOutput)) !== null) {
      csErrors.push(
        'Line ' + match[1] + ', Col ' + match[2] + ': ' + match[5].trim() + ' (' + match[4] + ')'
      )
    }
    if (csErrors.length > 0) return csErrors.join('\n')
  }

  if (language === 'python') {
    const lineMatches = [...rawOutput.matchAll(/line (\d+)/g)]
    const errorLine = rawOutput
      .split('\n')
      .map(l => l.trim())
      .filter(l => /^(\w+Error|Traceback|Exception)/.test(l))
      .pop() || ''

    if (lineMatches.length > 0) {
      const rawLine = parseInt(lineMatches[lineMatches.length - 1][1])
      return errorLine
        ? 'Line ' + rawLine + ': ' + errorLine
        : 'Line ' + rawLine + ': Runtime error'
    }
  }

  return rawOutput
}

  // Load saved code on mount + detect role + check completion
useEffect(() => {
  // Detect user role from JWT
  const token = localStorage.getItem('token')
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      setUserRole(payload.role || 'student')
    } catch (err) {
      console.error('Failed to decode token:', err)
      setUserRole('student')
    }
  }
  
  if (quest?.id) {
    // Load saved code for this quest + language
    const saved = localStorage.getItem(`forge_code_${quest.id}_${language}`)
    if (saved) {
      setSavedCode(saved)
      setCode(saved)
    } else if (quest?.starter_code) {
      const starter = typeof quest.starter_code === 'string'
        ? JSON.parse(quest.starter_code)
        : quest.starter_code
      setCode(starter?.[language] || '')
    }
    
    // wrapped in a named async function so it's easier to follow
    const checkSubmission = async () => {
      try {
        const token = localStorage.getItem('token')
        const subRes = await fetch(`${API_BASE}/api/problems/${quest.id}/my-submission`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (subRes.ok) {
          const subData = await subRes.json()
          if (subData.has_submitted) {
            setHasSubmitted(true)
            setPriorSubmission(subData)
            setIsQuestCompleted(subData.status === 'accepted')
          }
        }
      } catch (err) {
        console.error('Failed to check submission status:', err)
      }
    }
    
    checkSubmission() // Call the async function
  }
}, [quest, language]) // Re-run when quest or language changes

  // restores which hints this student already revealed for this quest,
  // straight from the server — keeps the unblurred/blurred state correct
  // across page refreshes instead of resetting every time
  useEffect(() => {
    if (!quest?.id) return
    const loadRevealedHints = async () => {
      try {
        const res = await api.get(`/api/problems/${quest.id}/hints/revealed`)
        setUsedHints(res.revealed || [])
      } catch (err) {
        console.error('Failed to load revealed hints:', err)
      }
    }
    loadRevealedHints()
  }, [quest?.id])

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
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [code, language, quest])

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

  // ▶ Run — tests code WITHOUT submitting, no XP, no lock
  const handleRunCode = async () => {
    setIsLoading(true)
    setOutput(null)
    if (monacoRef.current && editorRef.current) {
      monacoRef.current.editor.setModelMarkers(
        editorRef.current.getModel(), 'forge', []
      )
    }
    try {
      const token = localStorage.getItem('token')
      const endpoint = (userRole === 'instructor' || userRole === 'administrator')
        ? `${API_BASE}/api/problems/${quest.id}/test`
        : `${API_BASE}/api/problems/${quest.id}/run`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, language })
      })
      const data = await res.json()
      // Normalize to same shape as submission result for display
      setOutput({
        ...data,
        status: data.passed === data.total ? 'accepted' : 'wrong_answer',
        score: null,  
        xp_earned: 0,
        is_run_mode: true  // flag so UI can show "Run result, not submitted"
      })
      if (data.test_results) {
        const errorOutput = data.test_results.find(t => !t.passed)?.output || ''
        parseAndHighlightErrors(errorOutput, language)
      }
    } catch (err) {
      setOutput({ error: err.message, status: 'error', is_run_mode: true })
    } finally {
      setIsLoading(false)
    }
  }

  // this is for instructors testing code without submitting or earning xp
  const handleTestCode = async () => {
    setIsLoading(true)
    setOutput(null)
    
    // Clear previous markers
    if (monacoRef.current && editorRef.current) {
      monacoRef.current.editor.setModelMarkers(
        editorRef.current.getModel(), 'forge', []
      )
    }
    
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API_BASE}/api/problems/${quest.id}/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, language })
      })
      
      if (res.ok) {
        const data = await res.json()
        setOutput({
          ...data,
          status: 'test_mode',
          message: data.message
        })
        
        // Highlight errors if any tests failed
        if (data.test_results) {
          const errorOutput = data.test_results.find(t => !t.passed)?.output || ''
          parseAndHighlightErrors(errorOutput, language)
        }
        
        // Show feedback
        if (data.passed === data.total) {
          alert(`✅ All ${data.total} test cases passed! (Test mode)`)
        } else {
          alert(`⚠️ ${data.passed}/${data.total} test cases passed`)
        }
      } else {
        const error = await res.json()
        setOutput({ error: error.error, status: 'error' })
        alert(`Test failed: ${error.error}`)
      }
    } catch (err) {
      console.error('Test error:', err)
      setOutput({ error: err.message, status: 'error' })
      alert('Failed to test code')
    } finally {
      setIsLoading(false)
    }
  }

  // using api.post here instead of fetch
    const handleSubmit = async () => {
    setIsLoading(true)
    setOutput(null)
    if (monacoRef.current && editorRef.current) {
      monacoRef.current.editor.setModelMarkers(
        editorRef.current.getModel(), 'forge', []
      )
    }
    try {
      // used_hints now actually reaches the backend. before, this array
      // only ever lived in the browser — the server had no idea hints
      // were used, so it always awarded full XP no matter what.
      const data = await api.post('/api/submissions', { problem_id: quest.id, code, language, used_hints: usedHints })
      setOutput({ ...data, is_run_mode: false })
      
      // Save code to localStorage on submit
      if (quest?.id) {
        localStorage.setItem(`forge_code_${quest.id}_${language}`, code)
      }
      
      // Lock submit after ANY submission (accepted, error, partial, etc.)
      setHasSubmitted(true)
      setPriorSubmission(data)

      if (data.status === 'accepted') {
        setIsQuestCompleted(true)
        setShowSuccessAnim(true)
        const gained = data.xp_earned || 0
        setXpGained(gained)
        if (onVictory) onVictory(gained, data.user_level || heroLevel)
        setTimeout(() => setShowSuccessAnim(false), 3000)
      }
    } catch (err) {
      if (err.status === 409 || err.message?.includes('Already submitted')) {
        setHasSubmitted(true)
        setOutput({ 
          error: 'You have already submitted this problem. Use Run to test your code.',
          status: 'error',
          is_run_mode: false
        })
      } else {
        setOutput({ error: err.message, status: 'error', is_run_mode: false })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Reset the code back to the quest's starter template
  const handleReset = () => setShowResetConfirm(true)

  const confirmReset = () => {
    const starter = typeof quest.starter_code === 'string'
      ? JSON.parse(quest.starter_code)
      : quest.starter_code
    setCode(starter[language] || '')
    localStorage.removeItem(`forge_code_${quest.id}_${language}`)
    setShowResetConfirm(false)
  }

  // Download the current code as a file
  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `solution.${language === 'python' ? 'py' : language === 'java' ? 'java' : 'cs'}`
    a.click()
  }

  const handleUseHint = async (hintId) => {
    if (usedHints.includes(hintId)) return
    setUsedHints([...usedHints, hintId])
    // records the reveal on the server right away, so it's permanent
    // the moment it happens rather than only living in this browser tab
    try {
      await api.post(`/api/problems/${quest.id}/hints/${hintId}/reveal`, {})
    } catch (err) {
      console.error('Failed to record hint reveal:', err)
    }
  }

  // Play a short sound when a quest is completed
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

  // Show a loading state until the quest data arrives
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
      className="flex flex-col bg-slate-950 text-slate-100 overflow-hidden"
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

      {/* Reset-code confirm dialog — same style as the sandbox's save dialog,
          replaces the plain browser confirm() popup */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center px-4">
          <div className="bg-slate-900 border-2 border-purple-600/50 rounded-2xl p-6 w-full max-w-xs shadow-2xl">
            <h3 className="font-bold text-white mb-2">🔄 Reset code?</h3>
            <p className="text-sm text-slate-400 mb-4">This swaps your code back to the starter template. What you've written will be lost.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm transition">Cancel</button>
              <button onClick={confirmReset}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white font-bold text-sm transition">Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER (shrink-0) — title/meta stack into one truncating column so
          they can't wrap and collide with the back button or fullscreen icon
          on a narrow phone screen; badge + save indicator moved down into the
          meta row for the same reason ── */}
      <header className="min-h-14 bg-slate-900/90 border-b border-purple-600/40 flex items-center justify-between gap-2 px-3 sm:px-4 py-2 shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={onReturn}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition text-sm shrink-0 min-w-[32px]"
          >
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">Back to Quests</span>
          </button>
          <div className="h-6 w-px bg-slate-700 hidden sm:block shrink-0"></div>
          <div className="min-w-0">
            <h1 className="font-bold text-white text-sm sm:text-base truncate">{quest.title}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 mt-0.5">
              <span className={`px-2 py-0.5 rounded border shrink-0 ${
                quest.difficulty === 'Easy'   ? 'bg-green-600/20 text-green-400' :
                quest.difficulty === 'Medium' ? 'bg-yellow-600/20 text-yellow-400' :
                                                'bg-red-600/20 text-red-400'
              }`}>
                {quest.difficulty}
              </span>
              <span className="shrink-0">🎯 {quest.xp_reward} XP</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">{quest.problem_type || 'coding'}</span>
              {quest.is_event_quest && (
                <span className="shrink-0 px-2 py-0.5 bg-gradient-to-r from-yellow-600 to-purple-600 text-white text-[9px] font-bold rounded-full animate-pulse">
                  🎉 EVENT
                </span>
              )}
              <span id="save-indicator" className="shrink-0 text-slate-500"></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-purple-600/30">
            <span className="text-purple-400 font-bold text-xs">Lvl {heroLevel}</span>
          </div>
        </div>
      </header>

      {/* ── MOBILE PANEL SWITCHER (below md, only one panel fits) ── */}
      <div className="md:hidden flex border-b border-purple-600/20 bg-slate-900/50 shrink-0">
        <button
          onClick={() => setMobilePanel('problem')}
          className={`flex-1 px-4 py-2.5 text-sm font-bold transition ${
            mobilePanel === 'problem'
              ? 'bg-purple-600/20 text-purple-400 border-b-2 border-purple-600'
              : 'text-slate-400'
          }`}
        >
          📜 Problem
        </button>
        <button
          onClick={() => setMobilePanel('code')}
          className={`flex-1 px-4 py-2.5 text-sm font-bold transition ${
            mobilePanel === 'code'
              ? 'bg-purple-600/20 text-purple-400 border-b-2 border-purple-600'
              : 'text-slate-400'
          }`}
        >
          💻 Code
        </button>
      </div>

      {/* ── MAIN BODY (fills remaining height, no overflow) ──
          Mobile: single column, only the panel picked above is shown.
          md+: original side-by-side grid, both panels always shown. */}
      <div
        className="flex-1 grid grid-cols-1 md:grid-cols-[minmax(300px,1fr)_3fr] overflow-hidden"
        style={{ minHeight: 0 }}
      >

        {/* ── LEFT PANEL ── */}
        <div className={`${mobilePanel === 'problem' ? 'flex' : 'hidden'} md:flex border-r-0 md:border-r border-purple-600/20 flex-col bg-slate-950 overflow-hidden md:min-w-[300px]`}>

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
                    {quest.test_cases?.filter(tc => tc.visible !== false).slice(0, 3).map((tc, idx) => (
                      <div key={idx} className="bg-slate-900/60 rounded-lg p-3 border border-slate-700/50">
                        <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Input</p>
                        <code className="text-green-400 text-xs font-mono block mb-2 break-all whitespace-pre-wrap">{tc.input}</code>
                        <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Expected Output</p>
                        <code className="text-blue-400 text-xs font-mono block break-all whitespace-pre-wrap">{tc.expected}</code>
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
                        <code className="text-green-400 font-mono block bg-slate-950 p-2 rounded whitespace-pre-wrap">{tc.input}</code>
                      </div>
                      <div>
                        <p className="text-slate-500 mb-1">Expected:</p>
                        <code className="text-blue-400 font-mono block bg-slate-950 p-2 rounded whitespace-pre-wrap">{tc.expected}</code>
                      </div>
                      {output?.test_results?.[idx] && !output.test_results[idx].passed && (
                        <div>
                           <p className="text-slate-500 mb-1">Your Output:</p>
                           <code className="text-red-400 font-mono block bg-slate-950 p-2 rounded whitespace-pre-wrap">
                            {formatErrorOutput(tc.output)}
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
                {quest.hints?.map((hint, idx) => {
                  const isUsed = usedHints.includes(idx)
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border transition-all duration-300 ${
                        isUsed
                          ? 'bg-slate-900/60 border-slate-700'
                          : 'bg-slate-900/40 border-purple-600/30 hover:border-purple-600/60'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-bold ${isUsed ? 'text-slate-500' : 'text-yellow-400'}`}>
                          Scroll {idx + 1}
                        </span>
                        {!isUsed && (
                          <button
                            onClick={() => handleUseHint(idx)}
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
        <div className={`${mobilePanel === 'code' ? 'flex' : 'hidden'} md:flex flex-col bg-slate-950 overflow-hidden`}>

          {/* Toolbar (~48px, shrink-0) — icon-only below sm, full labels sm+
              (side by side, this row has 3+ buttons plus a filename label;
              at phone width that overflows unless text collapses to icons) */}
          <div className="flex items-center justify-between px-2 sm:px-4 py-2 bg-slate-900/80 border-b border-purple-600/20 shrink-0 gap-1 overflow-x-auto">
            <div className="flex gap-1 shrink-0">
              {quest.languages?.map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 ${
                    language === lang
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border border-purple-400 shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  {lang === 'python' ? '🐍' : lang === 'java' ? '☕' : '🔷'} <span className="hidden sm:inline">{lang}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* try in sandbox button */}
              {onOpenSandbox && (
                <button
                  onClick={() => onOpenSandbox(code, language)}
                  className="px-2 sm:px-3 py-1.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 border border-emerald-600/30 rounded-lg transition flex items-center gap-1"
                  title="Take your current code to the sandbox to experiment"
                >
                  🧪 <span className="hidden sm:inline">Try in Sandbox</span>
                </button>
              )}

              <button
                onClick={handleReset}
                className="px-2 sm:px-3 py-1.5 text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
              >
                🔄 <span className="hidden sm:inline">Reset</span>
              </button>
              <button
                onClick={handleDownload}
                className="px-2 sm:px-3 py-1.5 text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
              >
                <DownloadIcon size={13} /> <span className="hidden sm:inline">Download</span>
              </button>
              <span className="hidden sm:inline text-[10px] text-slate-500">
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
              onMount={(editor, monaco) => {
                editorRef.current = editor
                monacoRef.current = monaco   
                setTimeout(() => editor.layout(), 100)
              }}
            />
          </div>

          {/* Console */}
          <div
            id="console-wrapper"
            className="flex flex-col bg-slate-900/80 border-t border-purple-600/20"
            style={{ height: '192px', minHeight: '192px', flexShrink: 0, overflow: 'hidden' }}
          >
            {/* Instructor mode banner */}
            {(userRole === 'instructor' || userRole === 'administrator') && (
              <div className="px-4 py-1 bg-yellow-600/10 border-b border-yellow-600/20 text-[10px] text-yellow-400 text-center shrink-0">
                ⚠️ Test mode: Results won't be saved or affect XP
              </div>
            )}
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
                {/* CONDITIONAL: Instructor sees "Test Code", Student sees "Submit" */}
                {userRole === 'instructor' || userRole === 'administrator' ? (
                  <button
                    onClick={handleTestCode}
                    disabled={isLoading}
                    className="px-4 py-1.5 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-xs font-bold text-white transition flex items-center gap-1.5 shadow-lg shadow-yellow-600/20 border border-yellow-500/50"
                  >
                    {isLoading ? '⏳' : '🧪'} Test Code
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading || hasSubmitted}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                      hasSubmitted
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600'
                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg shadow-green-600/20 border border-green-500/50'
                    }`}
                  >
                    {isLoading ? '⏳' : '⚔️'} {hasSubmitted
                      ? (priorSubmission?.status === 'accepted' ? '✅ Conquered' : '🔒 Submitted')
                      : 'Submit'}
                  </button>
                )}
              </div>
            </div>

            {/* Console output (scrollable within the 192px) */}
            <div className="console-output overflow-y-auto p-4 font-mono text-xs [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-950 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gradient-to-b [&::-webkit-scrollbar-thumb]:from-purple-600 [&::-webkit-scrollbar-thumb]:to-pink-600 [&::-webkit-scrollbar-thumb]:shadow-[0_0_8px_rgba(168,85,247,0.6)]" style={{ flex: '1 1 0', minHeight: 0 }}>
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
                          {output.is_run_mode
                            ? `Run mode • Passed ${output.passed ?? output.test_results?.filter(t => t.passed)?.length ?? 0}/${output.total ?? output.test_results?.length ?? 0} tests`
                            : output.scoring_note || `Score: ${output.score} XP • Passed ${output.passed_cases ?? 0}/${output.total_cases ?? 0} tests`}
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
                            <code className="text-blue-400 font-mono block bg-slate-950 p-2 rounded whitespace-pre-wrap">{tc.expected}</code>
                          </div>
                          <div>
                            <p className="text-slate-500 mb-1">Your Output:</p>
                            <code className="text-red-400 font-mono block bg-slate-950 p-2 rounded whitespace-pre-wrap">
                              {formatErrorOutput(tc.output, language)}
                            </code>
                          </div>
                          {tc.message && (
                            <div>
                              <p className="text-slate-500 mb-1">Error:</p>
                              <code className="text-red-400 font-mono block bg-slate-950 p-2 rounded whitespace-pre-wrap">{formatErrorOutput(tc.output, language)}</code>
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