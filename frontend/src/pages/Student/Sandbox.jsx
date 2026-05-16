import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import { api } from '../../api/client'

// ─── Starter spell templates ───────────────────────────────────────────────
const SPELL_TEMPLATES = {
  python: {
    blank: '# ✨ The Arcane Sandbox — write anything, cast freely\n\n',
    hello: '# 🪄 Hello World Spell\nprint("Greetings, brave coder!")\n',
    loop: '# 🔄 Loop Incantation\nfor i in range(1, 6):\n    print(f"Casting spell #{i}...")\n',
    function: '# ⚡ Function Ritual\ndef power_of(base, exp):\n    return base ** exp\n\nresult = power_of(2, 10)\nprint(f"2 to the 10th power: {result}")\n',
    list: '# 📜 List Sorcery\nhero_spells = ["Fireball", "Ice Lance", "Lightning Bolt"]\n\nfor spell in hero_spells:\n    print(f"🔥 Casting: {spell}")\n\n# Sort and filter\npowerful = [s for s in hero_spells if len(s) > 8]\nprint(f"\\nPowerful spells: {powerful}")\n',
    recursion: '# 🌀 Recursive Dragon (Fibonacci)\ndef dragon_sequence(n):\n    if n <= 1:\n        return n\n    return dragon_sequence(n-1) + dragon_sequence(n-2)\n\nfor i in range(10):\n    print(f"Dragon scale {i}: {dragon_sequence(i)}")\n',
  },
  java: {
    blank: '// ✨ The Arcane Sandbox — write anything, cast freely\npublic class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n',
    hello: '// 🪄 Hello World Spell\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Greetings, brave coder!");\n    }\n}\n',
    loop: '// 🔄 Loop Incantation\npublic class Main {\n    public static void main(String[] args) {\n        for (int i = 1; i <= 5; i++) {\n            System.out.println("Casting spell #" + i + "...");\n        }\n    }\n}\n',
    function: '// ⚡ Function Ritual\npublic class Main {\n    static int powerOf(int base, int exp) {\n        return (int) Math.pow(base, exp);\n    }\n    \n    public static void main(String[] args) {\n        int result = powerOf(2, 10);\n        System.out.println("2 to the 10th power: " + result);\n    }\n}\n',
  },
  csharp: {
    blank: '// ✨ The Arcane Sandbox — write anything, cast freely\nusing System;\n\npublic class Program\n{\n    public static void Main()\n    {\n        \n    }\n}\n',
    hello: '// 🪄 Hello World Spell\nusing System;\n\npublic class Program\n{\n    public static void Main()\n    {\n        Console.WriteLine("Greetings, brave coder!");\n    }\n}\n',
    loop: '// 🔄 Loop Incantation\nusing System;\n\npublic class Program\n{\n    public static void Main()\n    {\n        for (int i = 1; i <= 5; i++)\n        {\n            Console.WriteLine($"Casting spell #{i}...");\n        }\n    }\n}\n',
    function: '// ⚡ Function Ritual\nusing System;\n\npublic class Program\n{\n    static int PowerOf(int baseNum, int exp)\n    {\n        return (int)Math.Pow(baseNum, exp);\n    }\n    \n    public static void Main()\n    {\n        int result = PowerOf(2, 10);\n        Console.WriteLine($"2 to the 10th power: {result}");\n    }\n}\n',
  },
}

const LANG_META = {
  python: { icon: '🐍', label: 'Python', ext: 'py', color: 'from-cyan-500 to-blue-600' },
  java:   { icon: '☕', label: 'Java',   ext: 'java', color: 'from-orange-500 to-red-600' },
  csharp: { icon: '🔷', label: 'C#',     ext: 'cs', color: 'from-purple-500 to-pink-600' }, 
}

const TEMPLATE_LABELS = {
  blank:     { icon: '📄', label: 'Blank Scroll' },
  hello:     { icon: '👋', label: 'Hello World' },
  loop:      { icon: '🔄', label: 'Loop Magic' },
  function:  { icon: '⚡', label: 'Functions' },
  list:      { icon: '📜', label: 'List Sorcery' },
  recursion: { icon: '🌀', label: 'Recursion Dragon' },
}

function formatSandboxError(raw, language) {
  if (!raw) return raw

  if (language === 'python') {
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
    const errorDesc = lines.find(l =>
      /^(\w+Error|NameError|TypeError|ValueError|SyntaxError|AttributeError|Exception)/.test(l)
    ) || lines.filter(l =>
      !l.startsWith('Traceback') && !l.startsWith('File ') && !l.includes('most recent')
    ).pop() || 'Runtime error'
    const lineMatch = raw.match(/line (\d+)/)
    return lineMatch ? `Line ${lineMatch[1]}: ${errorDesc}` : errorDesc
  }

  if (language === 'java') {
    const errors = []
    const seen = new Set()
    // Match full path or just filename: /tmp/sandbox/Main.java:4: error: msg
    const regex = /(?:\/[^\s]*\/)?Main\.java:(\d+):\s*error:\s*(.+?)(?=\n|$)/gm
    let match
    while ((match = regex.exec(raw)) !== null) {
      const msg = `Line ${match[1]}: ${match[2].trim()}`
      if (!seen.has(msg)) { seen.add(msg); errors.push(msg) }
    }
    if (errors.length > 0) return errors.join('\n')
    // Fallback: grab first meaningful error line
    const fallback = raw.split('\n')
      .find(l => l.includes('error:') && !l.includes('error: '))
    return fallback?.trim() || raw.split('\n').filter(Boolean)[0] || raw
  }

  if (language === 'csharp') {
    const errors = []
    const seen = new Set()
    // Match: Program.cs(9,41): error CS1002: message [path]
    const regex = /Program\.cs\((\d+),(\d+)\):\s*error\s+(\w+):\s*(.+?)(?:\s*\[.*?\])?$/gm
    let match
    while ((match = regex.exec(raw)) !== null) {
      const msg = `Line ${match[1]}, Col ${match[2]}: ${match[4].trim()} (${match[3]})`
      if (!seen.has(msg)) { seen.add(msg); errors.push(msg) }
    }
    if (errors.length > 0) return errors.join('\n')
  }

  // Generic fallback — strip /tmp paths and return clean text
  return raw
    .split('\n')
    .map(l => l.replace(/\/tmp\/\S+/g, '').replace(/\[.*?\]/g, '').trim())
    .filter(Boolean)
    .join('\n')
}

// ─── Execution time formatter ──────────────────────────────────────────────
function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function Sandbox({ onClose, initialCode = null, initialLanguage = 'python' }) {
  const [language, setLanguage]           = useState(initialLanguage)
  const [code, setCode]                   = useState(initialCode || SPELL_TEMPLATES.python.blank)
  const [output, setOutput]               = useState(null)
  const [isRunning, setIsRunning]         = useState(false)
  const [runCount, setRunCount]           = useState(0)
  const [history, setHistory]             = useState([])   // [{code, output, lang, ts}]
  const [showHistory, setShowHistory]     = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSettings, setShowSettings]  = useState(false)
  const [fontSize, setFontSize]           = useState(14)
  const [savedScrolls, setSavedScrolls]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('sandbox_saved') || '[]') } catch { return [] }
  })
  const [saveNameInput, setSaveNameInput] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [particles, setParticles]         = useState([])

  const editorRef        = useRef(null)
  const editorContainerRef = useRef(null)
  const outputRef        = useRef(null)

  // ── Particle burst on run ──────────────────────────────────────────────
  const burstParticles = (success) => {
    const count = success ? 12 : 6
    const newP = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      emoji: success
        ? ['✨', '⚡', '🔮', '💫', '🌟'][Math.floor(Math.random() * 5)]
        : ['💥', '⚠️', '🔥'][Math.floor(Math.random() * 3)],
    }))
    setParticles(newP)
    setTimeout(() => setParticles([]), 1500)
  }

  // ── Language switch ────────────────────────────────────────────────────
  const handleLanguageChange = (lang) => {
    setLanguage(lang)
    if (!initialCode) {
      setCode(SPELL_TEMPLATES[lang]?.blank || '')
    }
    setOutput(null)
  }

  // ── Template select ────────────────────────────────────────────────────
  const applyTemplate = (key) => {
    const tpl = SPELL_TEMPLATES[language]?.[key]
    if (tpl) {
      setCode(tpl)
      setOutput(null)
      setShowTemplates(false)
    }
  }

  // ── Run code ───────────────────────────────────────────────────────────
   const handleRun = async () => {
    if (isRunning) return
    setIsRunning(true)
    setOutput(null)
    const start = Date.now()

    try {
      // Centralized API client handles auth & auto-refresh
      const data = await api.post('/api/sandbox/run', { code, language })
      const elapsed = Date.now() - start
      const result = { ...data, elapsed }

      setOutput(result)
      setRunCount(c => c + 1)
      burstParticles(!data.error)

      // Add to history
      setHistory(prev => [
        { code, output: result, lang: language, ts: new Date().toLocaleTimeString() },
        ...prev.slice(0, 9),
      ])
    } catch (err) {
      const elapsed = Date.now() - start
      setOutput({ error: err.message || 'Execution failed', elapsed })
      burstParticles(false)
    } finally {
      setIsRunning(false)
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  // ── Keyboard shortcut ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleRun()
      }
      if (e.key === 'Escape' && onClose) onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [code, language])

  // ── Persist sandbox code across refreshes ─────────────────────────────
  useEffect(() => {
    if (!initialCode) {
      const saved = localStorage.getItem(`sandbox_code_${language}`)
      if (saved) setCode(saved)
    }
  }, [language])

  useEffect(() => {
    if (!initialCode && code !== SPELL_TEMPLATES[language]?.blank) {
      localStorage.setItem(`sandbox_code_${language}`, code)
    }
  }, [code, language])

  // ── ResizeObserver for Monaco ─────────────────────────────────────────
  useEffect(() => {
    if (!editorContainerRef.current) return
    const obs = new ResizeObserver(() => editorRef.current?.layout())
    obs.observe(editorContainerRef.current)
    return () => obs.disconnect()
  }, [])

  // ── Save a scroll ──────────────────────────────────────────────────────
  const handleSave = () => {
    if (!saveNameInput.trim()) return
    const scroll = {
      id: Date.now(),
      name: saveNameInput.trim(),
      code,
      language,
      ts: new Date().toLocaleDateString(),
    }
    const updated = [scroll, ...savedScrolls.slice(0, 7)]
    setSavedScrolls(updated)
    localStorage.setItem('sandbox_saved', JSON.stringify(updated))
    setSaveNameInput('')
    setShowSaveDialog(false)
  }

  const loadScroll = (scroll) => {
    setLanguage(scroll.language)
    setCode(scroll.code)
    setOutput(null)
  }

  const deleteScroll = (id) => {
    const updated = savedScrolls.filter(s => s.id !== id)
    setSavedScrolls(updated)
    localStorage.setItem('sandbox_saved', JSON.stringify(updated))
  }

  // ── Download code ──────────────────────────────────────────────────────
  const handleDownload = () => {
    const ext = LANG_META[language].ext
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `arcane_sandbox.${ext}`
    a.click()
  }

  const editorOptions = {
    minimap: { enabled: false },
    fontSize,
    lineHeight: 1.7,
    fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace",
    fontLigatures: true,
    automaticLayout: false,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    tabSize: 4,
    padding: { top: 16, bottom: 16 },
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    smoothScrolling: true,
    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
    glyphMargin: false,
    lineNumbersMinChars: 3,
  }

  const langMeta = LANG_META[language]

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 99998, overflow: 'hidden' }}
      className="flex flex-col bg-slate-950"
    >
      {/* ── Particle burst overlay ────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-[99999]">
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute text-2xl animate-bounce"
            style={{
              left: `${p.x}%`,
              top: '40%',
              animation: 'sandboxParticle 1.2s ease-out forwards',
            }}
          >
            {p.emoji}
          </div>
        ))}
      </div>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <header className="h-14 shrink-0 bg-slate-900/95 border-b border-emerald-600/30 flex items-center justify-between px-4 gap-3">

        {/* Left: identity */}
        <div className="flex items-center gap-3 min-w-0">
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition text-sm flex items-center gap-1"
            >
              ← Back
            </button>
          )}
          <div className="h-6 w-px bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="text-xl">🧪</span>
            <div>
              <h1 className="font-black text-white text-sm leading-none">Arcane Sandbox</h1>
              <p className="text-[10px] text-emerald-400 leading-none mt-0.5">Free experimentation zone</p>
            </div>
          </div>
          {initialCode && (
            <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-purple-600/20 border border-purple-600/40 rounded-full text-[10px] text-purple-300 font-bold">
              🔗 Carried from Quest
            </span>
          )}
        </div>

        {/* Center: language selector */}
        <div className="flex gap-1">
          {Object.entries(LANG_META).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => handleLanguageChange(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border ${
                language === key
                  ? `bg-gradient-to-r ${meta.color} text-white border-white/20 shadow-lg`
                  : 'text-slate-400 hover:text-white border-slate-700 hover:border-slate-500'
              }`}
            >
              {meta.icon} {meta.label}
            </button>
          ))}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5">
          {/* Spell count badge */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-lg border border-slate-700">
            <span className="text-[10px] text-slate-400">Spells cast:</span>
            <span className="text-emerald-400 font-black text-xs">{runCount}</span>
          </div>

          {/* Templates */}
          <div className="relative">
            <button
              onClick={() => { setShowTemplates(!showTemplates); setShowHistory(false); setShowSettings(false) }}
              className="px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-slate-700 flex items-center gap-1"
            >
              📜 <span className="hidden sm:inline">Scrolls</span>
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-slate-900 border border-emerald-600/30 rounded-xl shadow-2xl z-50 overflow-hidden">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider px-3 pt-3 pb-1">Spell Templates</p>
                {Object.entries(TEMPLATE_LABELS).map(([key, meta]) => {
                  const available = SPELL_TEMPLATES[language]?.[key]
                  return (
                    <button
                      key={key}
                      onClick={() => available && applyTemplate(key)}
                      disabled={!available}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition text-left ${
                        available
                          ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                          : 'text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      <span>{meta.icon}</span> {meta.label}
                      {!available && <span className="ml-auto text-[9px] text-slate-600">Python only</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Saved scrolls */}
          <div className="relative">
            <button
              onClick={() => { setShowHistory(!showHistory); setShowTemplates(false); setShowSettings(false) }}
              className="px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-slate-700 flex items-center gap-1"
            >
              🗂️ <span className="hidden sm:inline">Saved</span>
              {savedScrolls.length > 0 && (
                <span className="w-4 h-4 bg-emerald-600 text-white text-[8px] rounded-full flex items-center justify-center">
                  {savedScrolls.length}
                </span>
              )}
            </button>
            {showHistory && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-slate-900 border border-emerald-600/30 rounded-xl shadow-2xl z-50 overflow-hidden">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider px-3 pt-3 pb-1">Saved Scrolls</p>
                {savedScrolls.length === 0 ? (
                  <p className="px-3 pb-3 text-xs text-slate-500">No saved scrolls yet.</p>
                ) : (
                  savedScrolls.map(s => (
                    <div key={s.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 group">
                      <button onClick={() => { loadScroll(s); setShowHistory(false) }} className="flex-1 text-left">
                        <p className="text-sm text-slate-300 group-hover:text-white truncate">{s.name}</p>
                        <p className="text-[10px] text-slate-500">{LANG_META[s.language]?.icon} {s.ts}</p>
                      </button>
                      <button onClick={() => deleteScroll(s.id)} className="text-slate-600 hover:text-red-400 text-xs transition">✕</button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="relative">
            <button
              onClick={() => { setShowSettings(!showSettings); setShowTemplates(false); setShowHistory(false) }}
              className="px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-slate-700"
            >
              ⚙️
            </button>
            {showSettings && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-3 space-y-3">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Font Size</p>
                  <div className="flex gap-1">
                    {[12, 14, 16, 18].map(s => (
                      <button
                        key={s}
                        onClick={() => setFontSize(s)}
                        className={`flex-1 py-1 rounded text-xs font-bold transition ${
                          fontSize === s ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleDownload}
            className="px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-slate-700"
            title="Download code"
          >
            📥
          </button>

          <button
            onClick={() => setShowSaveDialog(true)}
            className="px-2 py-1.5 text-xs text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-emerald-600/40"
            title="Save scroll"
          >
            💾
          </button>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={isRunning}
            className={`px-4 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-2 border ${
              isRunning
                ? 'bg-slate-700 border-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-emerald-400/30 text-white shadow-lg shadow-emerald-600/20'
            }`}
          >
            {isRunning ? (
              <>
                <span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                Casting...
              </>
            ) : (
              <>▶ Cast <span className="hidden sm:inline text-emerald-200 font-normal">(Ctrl+Enter)</span></>
            )}
          </button>
        </div>
      </header>

      {/* ── Save dialog overlay ───────────────────────────────────────── */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex items-center justify-center">
          <div className="bg-slate-900 border-2 border-emerald-600/50 rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="font-bold text-white mb-4 flex items-center gap-2">💾 Name Your Scroll</h3>
            <input
              autoFocus
              type="text"
              value={saveNameInput}
              onChange={e => setSaveNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g. My Fibonacci Spell"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500 mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => { setShowSaveDialog(false); setSaveNameInput('') }} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={!saveNameInput.trim()} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-white font-bold text-sm transition">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Body: editor + output ─────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>

        {/* Editor pane */}
        <div
          ref={editorContainerRef}
          style={{ flex: output ? '1 1 55%' : '1 1 100%', minWidth: 0, position: 'relative', transition: 'flex 0.3s ease' }}
          className="overflow-hidden"
        >
          {/* Decorative top strip */}
          <div className={`h-0.5 w-full bg-gradient-to-r ${langMeta.color} opacity-60`} />

          <Editor
            height="100%"
            width="100%"
            language={language}
            value={code}
            onChange={v => setCode(v || '')}
            theme="vs-dark"
            options={editorOptions}
            onMount={(editor, monaco) => {
              editorRef.current = editor

              // Custom sand box theme — emerald tinted
              monaco.editor.defineTheme('arcane-sandbox', {
                base: 'vs-dark',
                inherit: true,
                rules: [
                  { token: 'keyword',  foreground: '34d399' },  // emerald
                  { token: 'string',   foreground: 'a3e635' },  // lime
                  { token: 'comment',  foreground: '4b5563', fontStyle: 'italic' },
                  { token: 'number',   foreground: 'fb923c' },  // orange
                  { token: 'function', foreground: '38bdf8' },  // sky
                ],
                colors: {
                  'editor.background':               '#020617',
                  'editor.lineHighlightBackground':  '#064e3b22',
                  'editorCursor.foreground':         '#34d399',
                  'editor.selectionBackground':      '#05966940',
                  'editorLineNumber.foreground':     '#1f2937',
                  'editorLineNumber.activeForeground': '#34d399',
                },
              })
              monaco.editor.setTheme('arcane-sandbox')
              setTimeout(() => editor.layout(), 100)
            }}
          />

          {/* Overlay hint when output is empty */}
          {!output && !isRunning && runCount === 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 border border-emerald-600/20 rounded-full text-xs text-slate-400 backdrop-blur">
                <span className="text-emerald-400">▶</span> Press Ctrl+Enter to cast your spell
              </div>
            </div>
          )}
        </div>

        {/* Output pane — slides in when output exists */}
        {(output || isRunning) && (
          <div
            ref={outputRef}
            className="flex flex-col border-l border-emerald-600/20 bg-slate-950"
            style={{ flex: '1 1 45%', minWidth: 0, minHeight: 0 }}
          >
            {/* Output header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-emerald-600/20">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                🔮 Crystal Output
                {output && !output.error && (
                  <span className="text-emerald-400 font-normal normal-case tracking-normal">
                    ✓ {formatTime(output.elapsed)}
                    {output.memory_mb && ` · ${output.memory_mb}MB`}
                  </span>
                )}
                {output?.error && (
                  <span className="text-red-400 font-normal normal-case tracking-normal">
                    Error · {formatTime(output.elapsed)}
                  </span>
                )}
              </span>
              <button
                onClick={() => setOutput(null)}
                className="text-slate-600 hover:text-slate-400 text-xs transition"
                title="Clear output"
              >
                ✕ Clear
              </button>
            </div>

            {/* Output body */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-sm" style={{ minHeight: 0 }}>
              {isRunning && !output && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
                  <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-emerald-400 animate-pulse text-xs">Consulting the oracle...</p>
                </div>
              )}

              {output && (
                <>
                <pre style={{fontSize:'9px', color:'#666', marginBottom:'8px'}}>
                  {JSON.stringify({returncode: output.returncode, hasStdout: !!output.stdout, hasStderr: !!output.stderr, hasError: !!output.error}, null, 2)}
                </pre>
                  {/* Status banner */}
                  <div className={`flex items-center gap-2 mb-4 pb-3 border-b ${
                    output.error ? 'border-red-800' : 'border-emerald-900'
                  }`}>
                    <span className="text-xl">{output.error ? '💥' : '✨'}</span>
                    <span className={`text-xs font-bold ${output.error ? 'text-red-400' : 'text-emerald-400'}`}>
                      {output.error ? 'Spell fizzled' : 'Spell cast successfully!'}
                    </span>
                  </div>

                  {/* stdout — only show if it's clean output, not compiler errors */}
                  {output.stdout && output.returncode === 0 && (
                    <div className="mb-4">
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Output</p>
                      <pre className="text-emerald-300 whitespace-pre-wrap break-all text-xs leading-relaxed bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-3">
                        {output.stdout}
                      </pre>
                    </div>
                  )}

                  {/* errors — compiler stdout errors + stderr + api errors all go here */}
                  {(output.returncode !== 0 || output.error) && (
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Error</p>
                      <pre className="text-red-300 whitespace-pre-wrap break-all text-xs leading-relaxed bg-red-950/30 border border-red-900/50 rounded-lg p-3">
                        {formatSandboxError(output.stdout || output.stderr || output.error, language)}
                      </pre>
                    </div>
                  )}

                  {/* Stats row */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex gap-4 text-[10px] text-slate-500">
                    <span>⏱ {formatTime(output.elapsed)}</span>
                    {output.memory_mb && <span>💾 {output.memory_mb}MB</span>}
                    <span>🔢 Run #{runCount}</span>
                    <span className="capitalize">{LANG_META[language]?.icon} {language}</span>
                  </div>
                </>
              )}
            </div>

            {/* Run history strip at bottom */}
            {history.length > 1 && (
              <div className="shrink-0 border-t border-slate-800 px-4 py-2 flex gap-2 overflow-x-auto">
                <span className="text-[9px] text-slate-600 uppercase tracking-wider self-center whitespace-nowrap mr-1">History</span>
                {history.slice(1).map((h, i) => (
                  <button
                    key={i}
                    onClick={() => { setCode(h.code); setLanguage(h.lang); setOutput(h.output) }}
                    className={`shrink-0 px-2 py-1 rounded text-[9px] border transition ${
                      h.output.error
                        ? 'bg-red-900/20 border-red-800/40 text-red-400 hover:bg-red-900/40'
                        : 'bg-emerald-900/20 border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/40'
                    }`}
                    title={`Restore run at ${h.ts}`}
                  >
                    {h.output.error ? '💥' : '✨'} {h.ts}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CSS for particle animation ────────────────────────────────── */}
      <style>{`
        @keyframes sandboxParticle {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-120px) scale(1.5); }
        }
      `}</style>
    </div>
  )
} 