import { useState, useEffect, useRef, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { api, API_BASE, authFetch } from '../../api/client'
import DownloadIcon from '../../components/DownloadIcon'
import QuestResultSummary from './components/QuestResultSummary'
import submitSeal from '../../assets/results/submit-seal.webp'
import { achievementStore } from '../../utils/achievementStore'

const LANG_CHIP = {
  python: 'border-sky-400/60 text-sky-300',
  java: 'border-orange-400/60 text-orange-300',
  csharp: 'border-pink-400/55 text-pink-300',
}

  // Draft code is cached in localStorage, which is shared by the whole
  // browser -- without the student's own id in the key, whoever coded
  // last on this machine would have their draft handed to the next
  // student who logs in and opens the same quest. Falls back to 'anon'
  // only if there's genuinely no token yet (shouldn't happen on this
  // authenticated page, but better than crashing).
  const getStorageKey = (questId, lang) => {
    const token = localStorage.getItem('token')
    let uid = 'anon'
    if (token) {
      try {
        uid = JSON.parse(atob(token.split('.')[1])).sub || 'anon'
      } catch (err) {
        uid = 'anon'
      }
    }
    return `forge_code_${uid}_${questId}_${lang}`
  }

export default function StudentCodeEditor({
  quest,
  onVictory,
  onReturn,
  heroLevel,
  onOpenSandbox
}) {
  const LANG_LINE_OFFSET = { python: 0, java: 0, csharp: 0 }

  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('python')

  // Keep the active language valid for this quest. 'python' above is only a
  // starting guess -- it's correct for most quests, but a quest that
  // doesn't offer Python (e.g. Java-only) would otherwise keep sending
  // 'python' to Run/Submit forever, since nothing else ever corrects it:
  // the single remaining tab renders as if selected, but the state behind
  // it never actually moves off the initial default unless a student
  // clicks a tab -- and clicking the only tab there is produces no visible
  // change, so there's no cue to do it. Previously this silently graded
  // valid Java/C# submissions as Python syntax errors.
  useEffect(() => {
    if (quest?.languages?.length && !quest.languages.includes(language)) {
      setLanguage(quest.languages[0])
    }
  }, [quest?.id, quest?.languages])
  const [output, setOutput] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('problem')
  // mobile-only: which of the two panels (normally shown side by side) is
  // visible below the md breakpoint, since there's no room for both at once
  const [mobilePanel, setMobilePanel] = useState('problem')
  const [showHints, setShowHints] = useState(false)
  const [usedHints, setUsedHints] = useState([])
  // hint text is only sent by the server once a hint is revealed: { [index]: text }
  const [hintTexts, setHintTexts] = useState({})
  const [xpGained, setXpGained] = useState(0)
  const [userRole, setUserRole] = useState(null)
  const [isQuestCompleted, setIsQuestCompleted] = useState(false)
  // one graded submission PER LANGUAGE: { python: {...}, java: {...} }. A language locks on its own;
  // the other ticked languages stay open (the professor's language rule says whether they are required).
  const [submissionsByLang, setSubmissionsByLang] = useState({})
  const [languageRule, setLanguageRule] = useState(null)   // 'required' | 'optional' | null (single language)
  const hasSubmitted = !!submissionsByLang[language]
  const priorSubmission = submissionsByLang[language] || null
  const [savedCode, setSavedCode] = useState('')
  const [showSuccessAnim, setShowSuccessAnim] = useState(false)
  const [combo, setCombo] = useState(0)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [draftRecord, setDraftRecord] = useState(null)
  const draftRequestRef = useRef(0)
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
    // Load saved code for this quest + language. localStorage is checked
    // first so there's no flash of starter code while the network request
    // is in flight; the server draft (if any) then takes over once it
    // comes back, since that's the copy that survives a wiped browser,
    // a crashed machine, or opening the quest somewhere else.
    const saved = localStorage.getItem(getStorageKey(quest.id, language))
    if (saved) {
      setSavedCode(saved)
      setCode(saved)
    } else if (quest?.starter_code) {
      const starter = typeof quest.starter_code === 'string'
        ? JSON.parse(quest.starter_code)
        : quest.starter_code
      setCode(starter?.[language] || '')
    }

    const loadServerDraft = async () => {
      try {
        const res = await api.get(`/api/problems/${quest.id}/draft?language=${language}`)
        if (res?.code) {
          setSavedCode(res.code)
          setCode(res.code)
          localStorage.setItem(getStorageKey(quest.id, language), res.code)
        }
      } catch (err) {
        console.error('Failed to load server draft:', err)
      }
    }
    loadServerDraft()

    // wrapped in a named async function so it's easier to follow
    const checkSubmission = async () => {
      try {
        const token = localStorage.getItem('token')
        const subRes = await authFetch(`${API_BASE}/api/problems/${quest.id}/my-submission`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (subRes.ok) {
          const subData = await subRes.json()
          setLanguageRule(subData.language_rule || null)
          if (subData.has_submitted) {
            const map = {}
            ;(subData.submissions || [{ language: subData.language, status: subData.status, score: subData.score }])
              .forEach(x => { map[x.language] = x })
            setSubmissionsByLang(map)
            setIsQuestCompleted(Object.values(map).some(x => x.status === 'accepted'))
          } else {
            setSubmissionsByLang({})
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
        setHintTexts(res.texts || {})
      } catch (err) {
        console.error('Failed to load revealed hints:', err)
      }
    }
    loadRevealedHints()
  }, [quest?.id])

  // Report server confirmation, not merely a local write. Late responses from
  // another quest/language/code snapshot cannot claim this version is saved.
  const persistDraft = useCallback(async () => {
    if (!quest?.id || hasSubmitted) return
    const requestId = ++draftRequestRef.current
    const record = { questId: quest.id, language, code }
    setDraftRecord({ ...record, status: 'saving' })
    try {
      localStorage.setItem(getStorageKey(quest.id, language), code)
      await api.put(`/api/problems/${quest.id}/draft`, { code, language })
      if (requestId === draftRequestRef.current) setDraftRecord({ ...record, status: 'saved' })
    } catch (err) {
      console.error('Failed to save draft:', err)
      if (requestId === draftRequestRef.current) setDraftRecord({ ...record, status: 'failed' })
    }
  }, [quest?.id, language, code, hasSubmitted])

  // Auto-save every 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (quest?.id && code && !hasSubmitted) {
        persistDraft()
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [code, quest?.id, hasSubmitted, persistDraft])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleRunCode()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        if (hasSubmitted) return
        persistDraft()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [code, language, quest, hasSubmitted, persistDraft])

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

      const res = await authFetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, language })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Execution is unavailable. Please try again.')
      // Normalize to same shape as submission result for display
      setOutput({
        ...data,
        status: Number(data.total) > 0 && data.passed === data.total ? 'accepted' : 'wrong_answer',
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
      const res = await authFetch(`${API_BASE}/api/problems/${quest.id}/test`, {
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

      // The graded code is stored with the submission itself. The server locks the
      // draft once a final submission exists, so nothing is written here.

      // Lock submit after ANY submission (accepted, error, partial, etc.)
      setSubmissionsByLang(prev => ({ ...prev, [data.language || language]: data }))

      // The submission is committed at this point. Ask for achievements in the
      // background: the store never rejects, and nothing here can turn a
      // committed submit into a reported failure.
      achievementStore.refreshAfterSubmit()

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
        setSubmissionsByLang(prev => ({ ...prev, [language]: prev[language] || { status: 'error' } }))
        setOutput({
          error: 'You have already submitted this problem in this language. Use Run to test your code.',
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
  const handleReset = () => { if (!hasSubmitted) setShowResetConfirm(true) }

  const confirmReset = () => {
    const starter = typeof quest.starter_code === 'string'
      ? JSON.parse(quest.starter_code)
      : quest.starter_code
    setCode(starter[language] || '')
    localStorage.removeItem(getStorageKey(quest.id, language))
    api.delete(`/api/problems/${quest.id}/draft?language=${language}`)
      .catch(err => console.error('Failed to clear draft on server:', err))
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
    // records the reveal on the server first: it's permanent once recorded,
    // and the server is also what sends back the hint text
    try {
      const res = await api.post(`/api/problems/${quest.id}/hints/${hintId}/reveal`, {})
      setHintTexts(prev => ({ ...prev, [hintId]: res?.text ?? '' }))
      setUsedHints(prev => (prev.includes(hintId) ? prev : [...prev, hintId]))
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
    minimap: { enabled: false },
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6, useShadows: false },
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
      className="flex flex-col bg-[#070b18] text-slate-100 overflow-hidden"
      style={{ height: '100vh' }}
    >

      {/* Success Animation Overlay */}
      {showSuccessAnim && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300 pointer-events-auto">
          <div className="bg-gradient-to-br from-[#0f1836] to-[#0a1024] border border-amber-300/60 rounded-2xl p-8 text-center shadow-2xl shadow-amber-300/10 max-w-sm mx-4">
            <svg viewBox="0 0 24 24" width="56" height="56" className="mx-auto mb-4 animate-[bounce_0.5s_ease-in-out_3]" aria-hidden="true"><path d="M12 2.500 18 12l-6 9.500L6 12z" fill="#a78bfa" /><path d="M12 2.500 18 12h-6z" fill="#c4b5fd" /></svg>
            <h2 className="font-cinzel text-2xl font-bold tracking-wide text-amber-200 mb-2">Quest Complete!</h2>
            <p className="text-slate-400 mb-4">All tests passed, hero!</p>
            {combo > 1 && (
              <div className="mb-4 px-4 py-2 bg-orange-600/20 border border-orange-600/40 rounded-lg">
                <p className="text-orange-400 font-bold">🔥 {combo}x Combo!</p>
              </div>
            )}
            <div className="bg-amber-300/10 border border-amber-300/35 rounded-xl p-4 mb-4">
              <p className="font-cinzel text-amber-200 font-bold text-xl">+{xpGained} XP</p>
              <p className="text-slate-400 text-sm mt-1">Forge your legend!</p>
            </div>
            <button
              onClick={onReturn}
              className="px-6 py-2.5 bg-gradient-to-b from-[#f6dc92] via-[#e0b84f] to-[#b8862b] text-[#2a1a05] border border-amber-200/70 shadow-[0_4px_16px_-4px_rgba(224,184,79,0.55)] hover:brightness-110 rounded-lg font-bold uppercase tracking-[0.16em] text-xs transition max-sm:min-h-[44px]"
            >
              Continue Adventure
            </button>
          </div>
        </div>
      )}

      {/* Final-submission confirmation: Submit is graded once and cannot be repeated */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="submit-confirm-title">
          <div className="bg-[#12183a] border border-amber-300/60 rounded-xl p-6 w-full max-w-sm shadow-2xl shadow-violet-950/60">
            <div className="mb-3 flex items-center gap-3"><img src={submitSeal} width="48" height="48" alt="" aria-hidden="true" className="h-12 w-12 shrink-0 object-contain" /><h3 id="submit-confirm-title" className="text-[13px] font-bold uppercase leading-relaxed tracking-[0.16em] text-amber-200">Submit your final answer?</h3></div>
            <p className="text-sm text-slate-400 mb-4">
              This is graded once for <b>{language}</b> and cannot be submitted again in that language
              {(quest.languages?.length || 0) > 1 ? ' (your other languages stay open)' : ''}. Use <b>Run</b> as many times as you like to test
              your code first. Run is not graded and gives no XP.
            </p>
            {languageRule !== 'required' && (quest.languages?.length || 0) > 1 && Object.keys(submissionsByLang).length > 0 && (
              <div className="mb-4 rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                ⚠️ <b>Bonus language.</b> You already submitted another language, so {language} only earns the +25% bonus
                for tests it passes. A failing or wrong answer earns 0 bonus XP and still locks {language}. Run it until it passes before you submit.
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 py-2 bg-[#0b1224] hover:bg-slate-900 border border-amber-300/50 rounded-lg text-amber-200 text-xs font-bold uppercase tracking-[0.14em] transition max-sm:min-h-[44px]">Keep editing</button>
              <button
                onClick={async () => {
                  setShowSubmitConfirm(false)
                  // keep the saved draft identical to the code being graded, before the server locks it
                  try { await api.put(`/api/problems/${quest.id}/draft`, { code, language }) } catch { /* the submission still stores the code */ }
                  handleSubmit()
                }}
                className="flex-1 py-2 bg-gradient-to-b from-[#f6dc92] via-[#e0b84f] to-[#b8862b] text-[#2a1a05] border border-amber-200/70 shadow-[0_4px_16px_-4px_rgba(224,184,79,0.55)] hover:brightness-110 rounded-lg font-bold text-xs uppercase tracking-[0.14em] transition max-sm:min-h-[44px]">Submit final answer</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset-code confirm dialog — same style as the sandbox's save dialog,
          replaces the plain browser confirm() popup */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center px-4">
          <div className="bg-gradient-to-br from-[#0f1836] to-[#0a1024] border border-amber-300/40 rounded-2xl p-6 w-full max-w-xs shadow-2xl">
            <h3 className="text-[13px] font-bold uppercase tracking-[0.2em] text-amber-300 mb-2">Reset code?</h3>
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
      <header className="min-h-14 bg-[#0a1024]/95 border-b border-amber-300/25 flex items-center justify-between gap-2 px-3 sm:px-4 py-2 shrink-0 z-10">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <button
            onClick={onReturn}
            className="flex items-center gap-1.5 rounded-lg border border-amber-300/35 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-200 hover:border-amber-300/70 hover:text-amber-100 transition shrink-0 min-w-[32px] max-sm:min-h-[44px]"
          >
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">Back to Quests</span>
          </button>
          <div className="h-6 w-px bg-slate-700 hidden sm:block shrink-0"></div>
          <div className="min-w-0">
            <h1 className="font-cinzel font-bold tracking-wide text-[#f3e3b0] text-sm sm:text-base truncate">{quest.title}</h1>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-400 mt-0.5">
              <span className={`px-2 py-0.5 rounded border shrink-0 ${
                quest.difficulty === 'Easy'   ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300' :
                quest.difficulty === 'Medium' ? 'border-amber-300/40 bg-amber-400/10 text-amber-200' :
                                                'border-rose-400/40 bg-rose-500/10 text-rose-300'
              }`}>
                {quest.difficulty}
              </span>
              <span className="shrink-0 font-bold text-amber-200">+{quest.xp_reward} XP</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">{quest.problem_type || 'coding'}</span>
              {quest.is_event_quest && (
                <span className="shrink-0 px-2 py-0.5 bg-gradient-to-r from-yellow-600 to-purple-600 text-white text-[9px] font-bold rounded-full animate-pulse">
                  🎉 EVENT
                </span>
              )}
              <span role="status" className={`text-[11px] ${draftRecord?.status === 'failed' ? 'text-rose-300' : 'text-slate-400'}`}>
                {hasSubmitted ? 'Final answer stored · Run remains available'
                  : draftRecord?.questId === quest.id && draftRecord?.language === language && draftRecord?.code === code
                    ? draftRecord.status === 'saved' ? 'Draft saved' : draftRecord.status === 'failed' ? 'Draft not saved to server · Ctrl+S to retry' : 'Saving draft…'
                    : 'Changes save automatically'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-1 bg-violet-600/20 px-4 py-1.5 rounded-full border border-amber-300/50">
            <span className="text-amber-200 font-bold text-[11px] uppercase tracking-[0.2em]">Lvl {heroLevel}</span>
          </div>
        </div>
      </header>

      {/* ── MOBILE PANEL SWITCHER (below md, only one panel fits) ── */}
      <div className="md:hidden flex border-b border-amber-300/15 bg-[#0a1024]/80 shrink-0">
        <button
          onClick={() => setMobilePanel('problem')}
          className={`flex-1 px-4 py-2.5 min-h-[44px] text-[11px] font-bold uppercase tracking-[0.2em] transition ${
            mobilePanel === 'problem'
              ? 'bg-violet-600/15 text-amber-300 border-b-2 border-amber-300'
              : 'text-slate-400'
          }`}
        >
          Problem
        </button>
        <button
          onClick={() => setMobilePanel('code')}
          className={`flex-1 px-4 py-2.5 min-h-[44px] text-[11px] font-bold uppercase tracking-[0.2em] transition ${
            mobilePanel === 'code'
              ? 'bg-violet-600/15 text-amber-300 border-b-2 border-amber-300'
              : 'text-slate-400'
          }`}
        >
          Code
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
        <div className={`${mobilePanel === 'problem' ? 'flex' : 'hidden'} md:flex border-r-0 md:border-r border-amber-300/15 flex-col bg-[#070b18] overflow-hidden md:min-w-[300px]`}>

          {/* Tabs */}
          <div className="flex border-b border-amber-300/15 bg-[#0a1024]/80 shrink-0">
            <button
              onClick={() => setActiveTab('problem')}
              className={`flex-1 px-2 py-2.5 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] transition ${
                activeTab === 'problem'
                  ? 'bg-violet-600/15 text-amber-300 border-b-2 border-amber-300'
                  : 'text-slate-400 hover:text-amber-100'
              }`}
            >
              Problem
            </button>
            <button
              onClick={() => setActiveTab('testcases')}
              className={`flex-1 px-2 py-2.5 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] transition ${
                activeTab === 'testcases'
                  ? 'bg-violet-600/15 text-amber-300 border-b-2 border-amber-300'
                  : 'text-slate-400 hover:text-amber-100'
              }`}
            >
              Test Cases
            </button>
            <button
              onClick={() => setActiveTab('hints')}
              className={`flex-1 px-2 py-2.5 whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.14em] transition relative ${
                activeTab === 'hints'
                  ? 'bg-violet-600/15 text-amber-300 border-b-2 border-amber-300'
                  : 'text-slate-400 hover:text-amber-100'
              }`}
            >
              Hints
              {quest.hints?.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-600 text-white text-[8px] rounded-full flex items-center justify-center">
                  {quest.hints.length}
                </span>
              )}
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto quiet-scroll p-5" style={{ minHeight: 0 }}>
            {activeTab === 'problem' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300 mb-3">Quest Details</h2>
                  <div className="text-slate-300 leading-relaxed whitespace-pre-line text-sm">{quest.description}</div>
                </div>
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300 mb-2">Examples</h3>
                  <div className="space-y-3">
                    {quest.test_cases?.filter(tc => tc.visible !== false).slice(0, 3).map((tc, idx) => (
                      <div key={idx} className="bg-[#0a1024] rounded-xl p-3 border border-indigo-300/25">
                        <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Input</p>
                        <code className="text-green-400 text-xs font-mono block mb-2 break-all whitespace-pre-wrap">{tc.input}</code>
                        <p className="text-[10px] text-slate-500 mb-1 uppercase tracking-wider">Expected Output</p>
                        <code className="text-blue-400 text-xs font-mono block break-all whitespace-pre-wrap">{tc.expected}</code>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t border-amber-300/15">
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
                <h3 className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300 mb-3">All Test Cases</h3>
                {quest.test_cases?.map((tc, idx) => (
                  <div key={idx} className="bg-[#0a1024] rounded-xl p-3 border border-indigo-300/25">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-violet-300">Test Case {idx + 1}</span>
                      {output?.test_results?.[idx] && (
                        <span className={`text-[10px] px-2 py-0.5 rounded ${
                          output.test_results[idx].passed
                            ? 'bg-green-600/20 text-green-400'
                            : 'bg-red-600/20 text-red-400'
                        }`}>
                          {output.test_results[idx].passed ? 'PASSED' : 'FAILED'}
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
                            {output.test_results[idx].kind === 'runtime_error' ? formatErrorOutput(output.test_results[idx].output, language) : output.test_results[idx].output}
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
                <h3 className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300 mb-3">Ancient Scrolls (Hints)</h3>
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
                        {isUsed
                          ? (hintTexts[idx] ?? hint.text ?? '')
                          : 'This scroll stays sealed until you reveal it.'}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className={`${mobilePanel === 'code' ? 'flex' : 'hidden'} md:flex flex-col bg-[#070b18] overflow-hidden`}>

          {/* Toolbar (~48px, shrink-0) — icon-only below sm, full labels sm+
              (side by side, this row has 3+ buttons plus a filename label;
              at phone width that overflows unless text collapses to icons) */}
          <div className="flex items-center justify-between px-2 sm:px-4 py-2 bg-[#0a1024] border-b border-amber-300/15 shrink-0 gap-2 flex-wrap">
            <div className="flex gap-1 shrink-0">
              {quest.languages?.map(lang => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-3 sm:px-4 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-[0.16em] transition flex items-center gap-1.5 max-sm:min-h-[44px] ${
                    language === lang
                      ? `${LANG_CHIP[lang]} bg-white/5 shadow-[0_0_14px_-3px_currentColor]`
                      : `${LANG_CHIP[lang]} opacity-75 hover:opacity-100`
                  }`}
                >
                  {submissionsByLang[lang] && '✓'} <span>{lang === 'csharp' ? 'C#' : lang}</span>
                </button>
              ))}
              {(quest.languages?.length || 0) > 1 && (
                <span className="hidden min-[1700px]:inline self-center ml-2 text-[10px] text-slate-500">
                  {languageRule === 'required'
                    ? `Required: ${Object.keys(submissionsByLang).length} of ${quest.languages.length} languages submitted`
                    : `Optional: ${Object.keys(submissionsByLang).length} of ${quest.languages.length} submitted · each extra language earns +25% XP`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* try in sandbox button */}
              {onOpenSandbox && (
                <button
                  onClick={() => onOpenSandbox(code, language)}
                  className="rounded-xl border border-amber-300/30 bg-[#0b1224] hover:border-amber-300/60 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200 hover:text-amber-100 transition flex items-center gap-1 px-2 sm:px-3 py-1.5 max-sm:min-h-[44px] max-sm:min-w-[44px] max-sm:justify-center"
                  title="Take your current code to the sandbox to experiment"
                >
                  <span className="sm:hidden" aria-hidden="true">🧪</span><span className="hidden sm:inline">Try in Sandbox</span>
                </button>
              )}

              <button
                onClick={handleReset}
                className="rounded-xl border border-amber-300/30 bg-[#0b1224] hover:border-amber-300/60 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200 hover:text-amber-100 transition flex items-center gap-1 px-2 sm:px-3 py-1.5 max-sm:min-h-[44px] max-sm:min-w-[44px] max-sm:justify-center"
              >
                <span className="sm:hidden" aria-hidden="true">↺</span><span className="hidden sm:inline">Reset</span>
              </button>
              <button
                onClick={handleDownload}
                className="rounded-xl border border-amber-300/30 bg-[#0b1224] hover:border-amber-300/60 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-200 hover:text-amber-100 transition flex items-center gap-1 px-2 sm:px-3 py-1.5 max-sm:min-h-[44px] max-sm:min-w-[44px] max-sm:justify-center"
              >
                <span className="sm:hidden"><DownloadIcon size={13} /></span><span className="hidden sm:inline">Download</span>
              </button>
              <span className="hidden 2xl:inline text-[10px] text-slate-500">
                Main.{language === 'python' ? 'py' : language === 'java' ? 'java' : 'cs'}
              </span>
            </div>
          </div>

          {/* Monaco Editor (flex-1, min-height:0 — this is the critical pair) */}
          <div
            id="editor-wrapper"
            ref={editorContainerRef}
            className="mx-3 mt-3 rounded-xl border border-indigo-300/25"
            style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden', position: 'relative' }}
          >
            <Editor
              height="100%"
              width="100%"
              language={language}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="forge-citadel"
              beforeMount={(monaco) => monaco.editor.defineTheme('forge-citadel', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#070b18', 'editorGutter.background': '#070b18', 'editor.lineHighlightBackground': '#0f1836', 'editorLineNumber.foreground': '#475072', 'editorLineNumber.activeForeground': '#f3d78a' } })}
              // Submit (graded, one-shot) stays locked by its own disabled=hasSubmitted
              // below -- the editor itself used to go readOnly on hasSubmitted too, which
              // blocked Run (ungraded, no XP, no lock) on every language once ANY language
              // was conquered. That read as the page silently breaking: a student curious
              // how they'd have solved it in another language got a cursor that accepted
              // no input and no explanation why. Run carries no grading risk, so the editor
              // stays writable after submission; only the graded Submit call is blocked.
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
            className="flex flex-col bg-[#0a1024] border border-amber-300/40 rounded-xl m-3"
            style={{ height: 'clamp(192px, 32vh, 320px)', minHeight: '192px', flexShrink: 0, overflow: 'hidden' }}
          >
            {/* Instructor mode banner */}
            {(userRole === 'instructor' || userRole === 'administrator') && (
              <div className="px-4 py-1 bg-yellow-600/10 border-b border-yellow-600/20 text-[10px] text-yellow-400 text-center shrink-0">
                ⚠️ Test mode: Results won't be saved or affect XP
              </div>
            )}
            {/* Console header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-amber-300/15 bg-[#0b1224] shrink-0">
              <span className="text-[11px] font-bold text-amber-300 uppercase tracking-[0.2em] flex items-center gap-2">
                Crystal Ball (Console)
                {isLoading && <span className="text-blue-400 animate-pulse">• Casting spell...</span>}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleRunCode}
                  disabled={isLoading}
                  className="px-4 py-1.5 bg-slate-950/50 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-xs font-bold text-amber-100 transition flex items-center gap-1.5 border border-amber-300/40 hover:border-amber-300/70 max-sm:min-h-[44px]"
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
                    onClick={() => setShowSubmitConfirm(true)}
                    disabled={isLoading || hasSubmitted}
                    className={`px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-[0.14em] transition flex items-center gap-1.5 max-sm:min-h-[44px] ${
                      hasSubmitted
                        ? 'bg-[#0b1224] text-emerald-300 cursor-not-allowed border border-amber-300/40'
                        : 'bg-gradient-to-b from-[#f6dc92] via-[#e0b84f] to-[#b8862b] text-[#2a1a05] border border-amber-200/70 shadow-[0_4px_16px_-4px_rgba(224,184,79,0.55)] hover:brightness-110'
                    }`}
                  >
                    {isLoading ? '⏳' : ''} {hasSubmitted
                      ? (priorSubmission?.status === 'accepted'
                          ? ((languageRule === 'required' && (quest?.languages?.length || 1) > 1 && Object.keys(submissionsByLang).length < quest.languages.length)
                              ? `✓ Submitted (${Object.keys(submissionsByLang).length} of ${quest.languages.length})`
                              : '✓ Conquered')
                          : 'Submitted')
                      : 'Submit'}
                  </button>
                )}
              </div>
            </div>

            {/* Console output (scrollable within the 192px) */}
            <div className="console-output overflow-y-auto quiet-scroll p-4 font-mono text-xs" style={{ flex: '1 1 0', minHeight: 0 }}>
              {!output && !isLoading && (
                <div className="text-center py-4 text-slate-500">
                  <p className="mb-2 text-amber-300/70" aria-hidden="true">◆</p>
                  <p>Cast your spell to see the results...</p>
                  <p className="text-xs mt-2">Press Ctrl+Enter to run your code. Run is a preview and gives no XP.</p>
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
                  <QuestResultSummary output={output} xpGained={xpGained} language={language}
                    remainingLanguages={languageRule === 'required' ? (quest.languages || []).filter(l => !submissionsByLang[l]) : []} />

                  <div className="grid grid-cols-1 items-start gap-3 min-[1100px]:grid-cols-2">
                  {output.test_results?.map((tc, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        tc.passed ? 'bg-green-900/10 border-green-600/30' : 'bg-red-900/10 border-red-600/30'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-xs font-bold ${tc.passed ? 'text-green-400' : 'text-red-400'}`}>
                          Test {idx + 1}{tc.hidden || tc.is_hidden ? ' (hidden)' : ''}: {tc.passed ? 'PASSED' : 'FAILED'}
                        </span>
                        <span className="text-xs text-slate-500">{tc.runtime}</span>
                      </div>
                      {!tc.passed && !tc.hidden && !tc.is_hidden && (
                        <div className="space-y-2 mt-2 text-xs">
                          <div>
                            <p className="text-slate-500 mb-1 text-[10px] uppercase tracking-[0.14em]">Expected</p>
                            <code className="text-blue-400 font-mono block bg-slate-950 p-2 rounded whitespace-pre-wrap">{tc.expected}</code>
                          </div>
                          <div>
                            <p className="text-slate-500 mb-1 text-[10px] uppercase tracking-[0.14em]">{tc.kind === 'runtime_error' ? 'Error' : tc.kind === 'timeout' ? 'Timeout' : 'Your output'}</p>
                            <code className="text-red-400 font-mono block bg-slate-950 p-2 rounded whitespace-pre-wrap">
                              {tc.kind === 'runtime_error' ? formatErrorOutput(tc.output, language) : tc.output}
                            </code>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  </div>

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