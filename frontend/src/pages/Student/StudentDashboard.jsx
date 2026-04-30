import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import ProblemList from './ProblemList'
import StudentCodeEditor from './StudentCodeEditor'
import Leaderboard from './components/Leaderboard'
import ProgressStats from './components/ProgressStats'
import QuestLog from './QuestLog'
import MySubjects from './MySubjects'
import { api } from '../../api/client'

// ─── Spell templates per language ─────────────────────────────────────────
const SPELL_TEMPLATES = {
  python: {
    blank:     { label: 'Blank Scroll',     icon: '📄', code: '# ✨ Arcane Sandbox — write freely, no grading here\n\n' },
    hello:     { label: 'Hello World',       icon: '👋', code: '# 🪄 Hello World\nprint("Greetings, brave coder!")\n' },
    loop:      { label: 'Loop Magic',        icon: '🔄', code: '# 🔄 Loop Incantation\nfor i in range(1, 6):\n    print(f"Casting spell #{i}...")\n' },
    function:  { label: 'Functions',         icon: '⚡', code: '# ⚡ Function Ritual\ndef power_of(base, exp):\n    return base ** exp\n\nresult = power_of(2, 10)\nprint(f"2 to the 10th power: {result}")\n' },
    list:      { label: 'List Sorcery',      icon: '📜', code: '# 📜 List Sorcery\nhero_spells = ["Fireball", "Ice Lance", "Lightning Bolt"]\n\nfor spell in hero_spells:\n    print(f"🔥 Casting: {spell}")\n\npowerful = [s for s in hero_spells if len(s) > 8]\nprint(f"\\nPowerful spells: {powerful}")\n' },
    recursion: { label: 'Recursion Dragon',  icon: '🌀', code: '# 🌀 Recursive Dragon (Fibonacci)\ndef dragon_sequence(n):\n    if n <= 1:\n        return n\n    return dragon_sequence(n-1) + dragon_sequence(n-2)\n\nfor i in range(10):\n    print(f"Dragon scale {i}: {dragon_sequence(i)}")\n' },
    class_:    { label: 'Classes & Objects', icon: '🏰', code: '# 🏰 Hero Class Ritual\nclass Hero:\n    def __init__(self, name, level):\n        self.name = name\n        self.level = level\n        self.xp = 0\n\n    def gain_xp(self, amount):\n        self.xp += amount\n        print(f"{self.name} gained {amount} XP! Total: {self.xp}")\n\nhero = Hero("Aether", 1)\nhero.gain_xp(100)\nhero.gain_xp(50)\nprint(f"Hero: {hero.name}, Level: {hero.level}")\n' },
  },
  java: {
    blank:    { label: 'Blank Scroll', icon: '📄', code: '// ✨ Arcane Sandbox\npublic class Main {\n    public static void main(String[] args) {\n        \n    }\n}\n' },
    hello:    { label: 'Hello World',  icon: '👋', code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Greetings, brave coder!");\n    }\n}\n' },
    loop:     { label: 'Loop Magic',   icon: '🔄', code: 'public class Main {\n    public static void main(String[] args) {\n        for (int i = 1; i <= 5; i++) {\n            System.out.println("Casting spell #" + i + "...");\n        }\n    }\n}\n' },
    function: { label: 'Functions',   icon: '⚡', code: 'public class Main {\n    static int powerOf(int base, int exp) {\n        return (int) Math.pow(base, exp);\n    }\n    public static void main(String[] args) {\n        System.out.println("2^10 = " + powerOf(2, 10));\n    }\n}\n' },
  },
  csharp: {
    blank:    { label: 'Blank Scroll', icon: '📄', code: '// ✨ Arcane Sandbox\nusing System;\n\npublic class Program {\n    public static void Main() {\n        \n    }\n}\n' },
    hello:    { label: 'Hello World',  icon: '👋', code: 'using System;\n\npublic class Program {\n    public static void Main() {\n        Console.WriteLine("Greetings, brave coder!");\n    }\n}\n' },
    loop:     { label: 'Loop Magic',   icon: '🔄', code: 'using System;\n\npublic class Program {\n    public static void Main() {\n        for (int i = 1; i <= 5; i++) {\n            Console.WriteLine($"Casting spell #{i}...");\n        }\n    }\n}\n' },
    function: { label: 'Functions',   icon: '⚡', code: 'using System;\n\npublic class Program {\n    static int PowerOf(int b, int e) => (int)Math.Pow(b, e);\n\n    public static void Main() {\n        Console.WriteLine($"2^10 = {PowerOf(2, 10)}");\n    }\n}\n' },
  },
}

const LANG_META = {
  python: { icon: '🐍', label: 'Python', ext: 'py',   monaco: 'python' },
  java:   { icon: '☕', label: 'Java',   ext: 'java',  monaco: 'java'   },
  csharp: { icon: '🔷', label: 'C#',     ext: 'cs',    monaco: 'csharp' },
}

// ─── Docker health banner ──────────────────────────────────────────────────
function SandboxHealthBanner({ health }) {
  if (!health || health.all_ready) return null

  if (!health.docker_running) {
    return (
      <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-red-900/30 border border-red-600/50 rounded-xl">
        <span className="text-xl shrink-0 mt-0.5">🐳</span>
        <div>
          <p className="text-red-300 font-bold text-sm">Docker is not running</p>
          <p className="text-red-400/80 text-xs mt-0.5">
            Start Docker Desktop, then reload this page. The sandbox needs Docker to safely execute code.
          </p>
        </div>
      </div>
    )
  }

  const missing = Object.entries(health.images || {})
    .filter(([, ready]) => !ready)
    .map(([lang]) => lang)

  if (missing.length === 0) return null

  return (
    <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-yellow-900/30 border border-yellow-600/50 rounded-xl">
      <span className="text-xl shrink-0 mt-0.5">⚠️</span>
      <div>
        <p className="text-yellow-300 font-bold text-sm">Some sandbox images not built yet</p>
        <p className="text-yellow-400/80 text-xs mt-0.5">
          Missing: <span className="font-mono">{missing.join(', ')}</span>.
          Run <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded">build_images.bat</span> in the <span className="font-mono">forge-sandbox\</span> folder.
        </p>
      </div>
    </div>
  )
}

// ─── Arcane Sandbox Component (inline, no separate file) ──────────────────
function ArcaneSandbox({ seedCode = null, seedLanguage = 'python', sandboxHealth }) {
  const [lang, setLang]                 = useState(seedLanguage)
  const [code, setCode]                 = useState(
    seedCode || SPELL_TEMPLATES.python.blank.code
  )
  const [output, setOutput]             = useState(null)
  const [isRunning, setIsRunning]       = useState(false)
  const [runCount, setRunCount]         = useState(0)
  const [fontSize, setFontSize]         = useState(14)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showSaved, setShowSaved]       = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [savedScrolls, setSavedScrolls] = useState(() => {
    try { return JSON.parse(localStorage.getItem('arcane_saved') || '[]') } catch { return [] }
  })
  const [saveDialog, setSaveDialog]     = useState(false)
  const [saveName, setSaveName]         = useState('')
  const [runHistory, setRunHistory]     = useState([])
  const [particles, setParticles]       = useState([])

  const editorRef          = useRef(null)
  const editorContainerRef = useRef(null)
  const outputRef          = useRef(null)

  // Seed from quest carry-over
  useEffect(() => {
    if (seedCode) { setCode(seedCode); setLang(seedLanguage) }
  }, [seedCode, seedLanguage])

  // Persist code per language
  useEffect(() => {
    if (!seedCode) {
      const saved = localStorage.getItem(`arcane_code_${lang}`)
      setCode(saved || SPELL_TEMPLATES[lang]?.blank?.code || '')
    }
  }, [lang])

  useEffect(() => {
    if (!seedCode && code) localStorage.setItem(`arcane_code_${lang}`, code)
  }, [code, lang])

  // ResizeObserver
  useEffect(() => {
    if (!editorContainerRef.current) return
    const obs = new ResizeObserver(() => editorRef.current?.layout())
    obs.observe(editorContainerRef.current)
    return () => obs.disconnect()
  }, [])

  // Ctrl+Enter shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault(); handleRun()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [code, lang])

  const burstParticles = (success) => {
    const emojis = success
      ? ['✨', '⚡', '🔮', '💫', '🌟', '🎯', '']
      : ['', '⚠️', '🔥', '❌']
    const newP = Array.from({ length: success ? 14 : 7 }, (_, i) => ({
      id: Date.now() + i,
      x: 20 + Math.random() * 60,
      y: 30 + Math.random() * 40,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      delay: Math.random() * 300,
    }))
    setParticles(newP)
    setTimeout(() => setParticles([]), 1800)
  }

  const handleRun = async () => {
    if (isRunning) return
    setIsRunning(true)
    setOutput(null)
    const start = Date.now()
    try {
      const data = await api.post('/api/sandbox/run', { code, language: lang })
      const elapsed = Date.now() - start
      const result = { ...data, elapsed }
      setOutput(result)
      setRunCount(c => c + 1)
      const isSuccess = !data.error && !data.stderr?.trim() && data.returncode === 0
      burstParticles(isSuccess)
      setRunHistory(prev => [{ code, lang, result, ts: new Date().toLocaleTimeString() }, ...prev.slice(0, 9)])
      setTimeout(() => outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100)
    } catch (err) {
      setOutput({ error: err.message, elapsed: Date.now() - start })
      burstParticles(false)
    } finally {
      setIsRunning(false)
    }
  }

  const applyTemplate = (key) => {
    const tpl = SPELL_TEMPLATES[lang]?.[key]
    if (tpl) { setCode(tpl.code); setOutput(null); setShowTemplates(false) }
  }

  const handleSave = () => {
    if (!saveName.trim()) return
    const scroll = { id: Date.now(), name: saveName.trim(), code, language: lang, ts: new Date().toLocaleDateString() }
    const updated = [scroll, ...savedScrolls.slice(0, 7)]
    setSavedScrolls(updated)
    localStorage.setItem('arcane_saved', JSON.stringify(updated))
    setSaveName(''); setSaveDialog(false)
  }

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `arcane_spell.${LANG_META[lang].ext}`; a.click()
  }

  const formatTime = (ms) => ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
  const hasError = output && (output.error || (output.stderr?.trim()))

  const sandboxEditorOptions = {
    minimap: { enabled: false },
    fontSize,
    lineHeight: 1.7,
    fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
    fontLigatures: true,
    automaticLayout: false,
    scrollBeyondLastLine: false,
    wordWrap: 'on',
    tabSize: 4,
    padding: { top: 16, bottom: 16 },
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    smoothScrolling: true,
    scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5, useShadows: false },
    glyphMargin: false,
    suggest: { showKeywords: true, showSnippets: true },
  }

  return (
    <div className="flex flex-col h-full min-h-0 relative">

      {/* Particles */}
      <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
        {particles.map(p => (
          <div key={p.id} className="absolute text-2xl"
            style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${p.delay}ms`, animation: 'sandboxBurst 1.4s ease-out forwards' }}>
            {p.emoji}
          </div>
        ))}
      </div>

      {/* Save dialog */}
      {saveDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-slate-900 border-2 border-emerald-600/50 rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="font-bold text-white mb-4">💾 Name Your Scroll</h3>
            <input autoFocus type="text" value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g. My Fibonacci Spell"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-emerald-500 mb-4" />
            <div className="flex gap-2">
              <button onClick={() => { setSaveDialog(false); setSaveName('') }}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm transition">Cancel</button>
              <button onClick={handleSave} disabled={!saveName.trim()}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg text-white font-bold text-sm transition">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sandbox Header ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-emerald-600/30 gap-2 flex-wrap">

        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-sm shadow shadow-emerald-600/30">🧪</div>
            <div>
              <p className="text-xs font-black text-emerald-300 leading-none">Arcane Sandbox</p>
              <p className="text-[9px] text-slate-500 leading-none mt-0.5">
                Docker isolated · {sandboxHealth?.limits?.timeout_s ?? 10}s limit · {sandboxHealth?.limits?.memory_mb ?? 128}MB RAM
              </p>
            </div>
          </div>
          {seedCode && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-600/20 border border-purple-600/40 rounded-full text-[9px] text-purple-300 font-bold">
              🔗 Carried from Quest
            </span>
          )}
          {runCount > 0 && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-lg border border-slate-700">
              <span className="text-[9px] text-slate-400">Spells cast:</span>
              <span className="text-emerald-400 font-black text-xs">{runCount}</span>
            </div>
          )}
        </div>

        {/* Center: language */}
        <div className="flex gap-1">
          {Object.entries(LANG_META).map(([key, meta]) => {
            const langReady = !sandboxHealth || sandboxHealth.docker_running === false
              ? false
              : (sandboxHealth.images?.[key] !== false)
            return (
              <button key={key} onClick={() => { setLang(key); setOutput(null) }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border relative ${
                  lang === key
                    ? 'bg-emerald-600/30 border-emerald-500/60 text-emerald-300 shadow shadow-emerald-600/20'
                    : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                }`}>
                {meta.icon} {meta.label}
                {/* Red dot if image missing */}
                {sandboxHealth && sandboxHealth.images?.[key] === false && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" title="Image not built" />
                )}
              </button>
            )
          })}
        </div>

        {/* Right: toolbar */}
        <div className="flex items-center gap-1">

          {/* Templates */}
          <div className="relative">
            <button onClick={() => { setShowTemplates(!showTemplates); setShowSaved(false); setShowSettings(false) }}
              className="px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition flex items-center gap-1 border border-transparent hover:border-slate-700">
              📜 <span className="hidden md:inline">Scrolls</span>
            </button>
            {showTemplates && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-slate-900 border border-emerald-600/30 rounded-xl shadow-2xl z-50 overflow-hidden">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider px-3 pt-3 pb-1 font-bold">Spell Templates</p>
                {Object.entries(SPELL_TEMPLATES[lang] || {}).map(([key, tpl]) => (
                  <button key={key} onClick={() => applyTemplate(key)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition text-left">
                    <span>{tpl.icon}</span> {tpl.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Saved */}
          <div className="relative">
            <button onClick={() => { setShowSaved(!showSaved); setShowTemplates(false); setShowSettings(false) }}
              className="px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition flex items-center gap-1 border border-transparent hover:border-slate-700">
              🗂️
              {savedScrolls.length > 0 && (
                <span className="w-3.5 h-3.5 bg-emerald-600 text-white text-[7px] rounded-full flex items-center justify-center font-bold">
                  {savedScrolls.length}
                </span>
              )}
            </button>
            {showSaved && (
              <div className="absolute right-0 top-full mt-1 w-60 bg-slate-900 border border-emerald-600/30 rounded-xl shadow-2xl z-50 overflow-hidden">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider px-3 pt-3 pb-1 font-bold">Saved Scrolls</p>
                {savedScrolls.length === 0
                  ? <p className="px-3 pb-3 text-xs text-slate-500">No saved scrolls yet.</p>
                  : savedScrolls.map(s => (
                    <div key={s.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 group">
                      <button onClick={() => { setLang(s.language); setCode(s.code); setOutput(null); setShowSaved(false) }} className="flex-1 text-left">
                        <p className="text-xs text-slate-300 group-hover:text-white truncate">{s.name}</p>
                        <p className="text-[9px] text-slate-500">{LANG_META[s.language]?.icon} {s.ts}</p>
                      </button>
                      <button onClick={() => {
                        const u = savedScrolls.filter(x => x.id !== s.id)
                        setSavedScrolls(u); localStorage.setItem('arcane_saved', JSON.stringify(u))
                      }} className="text-slate-600 hover:text-red-400 text-xs transition">✕</button>
                    </div>
                  ))
                }
              </div>
            )}
          </div>

          {/* Settings */}
          <div className="relative">
            <button onClick={() => { setShowSettings(!showSettings); setShowTemplates(false); setShowSaved(false) }}
              className="px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-slate-700">⚙️</button>
            {showSettings && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-3">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-2 font-bold">Font Size</p>
                <div className="flex gap-1">
                  {[12, 14, 16, 18].map(s => (
                    <button key={s} onClick={() => setFontSize(s)}
                      className={`flex-1 py-1 rounded text-xs font-bold transition ${fontSize === s ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{s}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button onClick={handleDownload} title="Download" className="px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-slate-700">📥</button>
          <button onClick={() => setSaveDialog(true)} title="Save scroll" className="px-2 py-1.5 text-xs text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-emerald-600/40">💾</button>

          {/* Run */}
          <button onClick={handleRun} disabled={isRunning}
            className={`ml-1 px-4 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 border ${
              isRunning
                ? 'bg-slate-700 border-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 border-emerald-400/30 text-white shadow shadow-emerald-600/20'
            }`}>
            {isRunning
              ? <><span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Casting...</>
              : <>▶ Cast <span className="hidden sm:inline text-emerald-200 font-normal">(Ctrl+Enter)</span></>
            }
          </button>
        </div>
      </div>

      {/* ── Editor + Output ── */}
      <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>

        {/* Editor */}
        <div ref={editorContainerRef} className="overflow-hidden flex flex-col"
          style={{ flex: output ? '1 1 55%' : '1 1 100%', minWidth: 0, transition: 'flex 0.3s ease', position: 'relative' }}>
          <div className="h-0.5 w-full bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 opacity-70 shrink-0" />
          <Editor
            height="100%"
            width="100%"
            language={LANG_META[lang].monaco}
            value={code}
            onChange={v => setCode(v || '')}
            theme="vs-dark"
            options={sandboxEditorOptions}
            onMount={(editor, monaco) => {
              editorRef.current = editor
              monaco.editor.defineTheme('arcane-emerald', {
                base: 'vs-dark', inherit: true,
                rules: [
                  { token: 'keyword',  foreground: '34d399' },
                  { token: 'string',   foreground: 'a3e635' },
                  { token: 'comment',  foreground: '374151', fontStyle: 'italic' },
                  { token: 'number',   foreground: 'fb923c' },
                  { token: 'function', foreground: '38bdf8' },
                ],
                colors: {
                  'editor.background':                '#020617',
                  'editor.lineHighlightBackground':   '#064e3b18',
                  'editorCursor.foreground':          '#34d399',
                  'editor.selectionBackground':       '#05966940',
                  'editorLineNumber.foreground':      '#1f2937',
                  'editorLineNumber.activeForeground':'#34d399',
                },
              })
              monaco.editor.setTheme('arcane-emerald')
              setTimeout(() => editor.layout(), 100)
            }}
          />
          {!output && !isRunning && runCount === 0 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-900/90 border border-emerald-600/20 rounded-full text-xs text-slate-400 backdrop-blur shadow">
                <span className="text-emerald-400">▶</span>
                Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-emerald-300 border border-slate-700 mx-1">Ctrl+Enter</kbd> to cast your spell
              </div>
            </div>
          )}
        </div>

        {/* Output pane */}
        {(output || isRunning) && (
          <div ref={outputRef} className="flex flex-col border-l border-emerald-600/20 bg-slate-950"
            style={{ flex: '1 1 45%', minWidth: 0, minHeight: 0 }}>
            <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-emerald-600/20">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                🔮 Crystal Output
                {output && !hasError && <span className="text-emerald-400 font-normal normal-case tracking-normal text-[11px]">✓ {formatTime(output.elapsed)}</span>}
                {output && hasError  && <span className="text-red-400 font-normal normal-case tracking-normal text-[11px]">Error · {formatTime(output.elapsed)}</span>}
              </span>
              <button onClick={() => setOutput(null)} className="text-slate-600 hover:text-slate-400 text-xs transition">✕ Clear</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs" style={{ minHeight: 0 }}>
              {isRunning && !output && (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-emerald-400 animate-pulse text-xs">Consulting the oracle...</p>
                  <p className="text-slate-600 text-[10px]">Docker container spinning up...</p>
                </div>
              )}

              {output && (
                <>
                  <div className={`flex items-center gap-2 mb-4 pb-3 border-b ${hasError ? 'border-red-900' : 'border-emerald-900'}`}>
                    <span className="text-xl">{hasError ? '💥' : '✨'}</span>
                    <span className={`text-xs font-bold ${hasError ? 'text-red-400' : 'text-emerald-400'}`}>
                      {hasError ? 'Spell fizzled!' : 'Spell cast successfully!'}
                    </span>
                    <span className="ml-auto text-[10px] text-slate-500">Run #{runCount}</span>
                  </div>

                  {output.stdout && (
                    <div className="mb-4">
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Output</p>
                      <pre className="text-emerald-300 whitespace-pre-wrap break-all text-xs leading-relaxed bg-emerald-950/40 border border-emerald-900/50 rounded-lg p-3">
                        {output.stdout}
                      </pre>
                    </div>
                  )}

                  {(output.stderr || output.error) && (
                    <div className="mb-4">
                      <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Error</p>
                      <pre className="text-red-300 whitespace-pre-wrap break-all text-xs leading-relaxed bg-red-950/30 border border-red-900/50 rounded-lg p-3">
                        {output.stderr || output.error}
                      </pre>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-slate-800 flex gap-4 text-[10px] text-slate-500 flex-wrap">
                    <span>⏱ {formatTime(output.elapsed)}</span>
                    <span className="capitalize">{LANG_META[lang]?.icon} {lang}</span>
                    <span>🐳 Docker isolated</span>
                    {output.returncode !== undefined && <span>Exit: {output.returncode}</span>}
                  </div>
                </>
              )}
            </div>

            {/* History strip */}
            {runHistory.length > 1 && (
              <div className="shrink-0 border-t border-slate-800 px-3 py-1.5 flex gap-1.5 overflow-x-auto">
                <span className="text-[9px] text-slate-600 uppercase tracking-wider self-center whitespace-nowrap mr-1 font-bold">History</span>
                {runHistory.slice(1, 8).map((h, i) => {
                  const hErr = h.result.error || h.result.stderr
                  return (
                    <button key={i}
                      onClick={() => { setCode(h.code); setLang(h.lang); setOutput(h.result) }}
                      className={`shrink-0 px-2 py-0.5 rounded text-[9px] border transition ${
                        hErr ? 'bg-red-900/20 border-red-800/40 text-red-400 hover:bg-red-900/40'
                              : 'bg-emerald-900/20 border-emerald-800/40 text-emerald-400 hover:bg-emerald-900/40'
                      }`} title={`Restore run at ${h.ts}`}>
                      {hErr ? '💥' : '✨'} {h.ts}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes sandboxBurst {
          0%   { opacity: 1; transform: translateY(0) scale(1) rotate(0deg); }
          100% { opacity: 0; transform: translateY(-100px) scale(1.8) rotate(20deg); }
        }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  Main StudentDashboard
// ═══════════════════════════════════════════════════════════════════════════
export default function StudentDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab]             = useState('subjects')  // ✅ Changed from 'quests'
  const [selectedQuest, setSelectedQuest]     = useState(null)
  const [heroStats, setHeroStats]             = useState(null)
  const [loading, setLoading]                 = useState(true)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [sandboxSeed, setSandboxSeed]         = useState(null)   // { code, language }
  const [sandboxHealth, setSandboxHealth]     = useState(null)   // Docker health data
  const [selectedBlock, setSelectedBlock]   = useState(null)   // Tracks which subject is open
  const [courseTab, setCourseTab]           = useState('board') // Tracks tabs inside a subject

  const profileRef      = useRef(null)
  const notificationRef = useRef(null)
  const backgroundRef   = useRef(null)

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false)
      if (notificationRef.current && !notificationRef.current.contains(e.target)) setShowNotifications(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Parallax
  useEffect(() => {
    const handler = (e) => {
      if (backgroundRef.current) {
        const x = (e.clientX - window.innerWidth / 2) / 50
        const y = (e.clientY - window.innerHeight / 2) / 50
        backgroundRef.current.style.transform = `translate(${x}px, ${y}px)`
      }
    }
    window.addEventListener('mousemove', handler)
    return () => window.removeEventListener('mousemove', handler)
  }, [])

  // Hero stats
  useEffect(() => {
    const fetch_ = async () => {
      try {
        setHeroStats({ total_xp: 0, level: 1, streak: 1, total_submissions: 5, accepted_submissions: 0, success_rate: 0 })
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    fetch_()
  }, [])

  // Check Docker sandbox health when sandbox tab is first opened
  useEffect(() => {
    if (activeTab === 'sandbox' && sandboxHealth === null) {
      api.get('/api/sandbox/health')
        .then(data => setSandboxHealth(data))
        .catch(() => setSandboxHealth({ docker_running: false, all_ready: false, images: {} }))
    }
  }, [activeTab])

  // Lock body scroll for editor
  useEffect(() => {
    if (activeTab === 'spellforge' && selectedQuest) {
      document.body.classList.add('editor-active')
    } else {
      document.body.classList.remove('editor-active')
    }
    return () => document.body.classList.remove('editor-active')
  }, [activeTab, selectedQuest])

  const handleQuestSelect = (quest) => { setSelectedQuest(quest); setActiveTab('spellforge') }
  const handleVictory = (xpEarned, newLevel) => {
    setHeroStats(prev => ({ ...prev, total_xp: (prev?.total_xp || 0) + xpEarned, level: newLevel }))
  }
  const handleReturnFromQuest = () => { setSelectedQuest(null); setActiveTab('quests') }
  const handleCarryToSandbox = (code, language) => {
    setSandboxSeed({ code, language })
    setActiveTab('sandbox')
  }
  const handleLogoutClick = () => { setShowProfileMenu(false); onLogout() }
  
  // Navigation handlers for nested subject view
  const handleEnterSubject = (block) => {
    setSelectedBlock(block)
    setCourseTab('board')
  }

  const handleExitSubject = () => {
    setSelectedBlock(null)
  }

  const notifications = [
    { id: 1, title: 'Midterm Exam Tomorrow', content: 'Remember to review Array and Looping problems. Exam starts at 9 AM in Block 301.', priority: 'urgent', instructor: 'Prof. Johnson', block: 'Block 301', date: 'Apr 24, 2024', time: '2:30 PM', read: false },
    { id: 2, title: "New Quest Available: Dragon's Loop", content: 'A new Medium difficulty quest has been added. Practice your looping skills!', priority: 'important', instructor: 'Prof. Smith', block: 'Block 301', date: 'Apr 23, 2024', time: '10:15 AM', read: false },
    { id: 3, title: 'System Maintenance', content: 'Platform will be down for maintenance on Apr 26 from 2-4 AM. Plan accordingly.', priority: 'info', instructor: 'System', block: 'All Blocks', date: 'Apr 22, 2024', time: '9:00 AM', read: true },
    { id: 4, title: 'Event Quest: Holiday Challenge', content: 'Limited time event quest available! Complete it for bonus XP and exclusive badge.', priority: 'important', instructor: 'Prof. Martinez', block: 'Block 301', date: 'Apr 20, 2024', time: '3:45 PM', read: true },
    { id: 5, title: 'Welcome to Forge.Dev!', content: 'Your adventure begins now. Complete your first quest to earn your First Steps badge!', priority: 'info', instructor: 'System', block: 'All Blocks', date: 'Apr 15, 2024', time: '8:00 AM', read: true },
  ]
  const unreadCount = notifications.filter(n => !n.read).length
  const priorityColors = { urgent: 'bg-red-600/20 border-red-600/40 text-red-400', important: 'bg-yellow-600/20 border-yellow-600/40 text-yellow-400', info: 'bg-blue-600/20 border-blue-600/40 text-blue-400' }
  const priorityIcons  = { urgent: '🔴', important: '🟡', info: '🔵' }

  // ── Spellforge portal ─────────────────────────────────────────────────────
  if (activeTab === 'spellforge' && selectedQuest) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, overflow: 'hidden', height: '100vh', width: '100vw' }}>
        <StudentCodeEditor
          quest={selectedQuest}
          onVictory={handleVictory}
          onReturn={handleReturnFromQuest}
          heroLevel={heroStats?.level || 1}
          onOpenSandbox={handleCarryToSandbox}
        />
      </div>
    )
  }

  const tabs = [
    { id: 'subjects',   label: '🎓 My Subjects' },
    { id: 'hall',       label: '👑 Hall of Champions' },
    { id: 'hero',       label: '🧙 Hero Sheet' },
    { id: 'sandbox',    label: '🧪 Sandbox' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/30 to-slate-950 text-white relative">

      {/* Background particles */}
      <div ref={backgroundRef} className="absolute inset-0 pointer-events-none transition-transform duration-100 ease-out">
        {[...Array(50)].map((_, i) => (
          <div key={i} className="absolute w-1 h-1 bg-white/30 rounded-full animate-float"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${3 + Math.random() * 4}s`, opacity: 0.3 + Math.random() * 0.5, boxShadow: '0 0 4px rgba(168, 85, 247, 0.5)' }} />
        ))}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-purple-950/20" />
      </div>

      {/* ── Header ── */}
      <header className="relative z-20 bg-slate-900/90 backdrop-blur border-b border-purple-600/40 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sticky top-0">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-xl shadow-lg shadow-purple-600/30 animate-pulse-slow">⚔️</div>
          <div>
            <h1 className="font-black text-base sm:text-lg bg-gradient-to-r from-purple-300 via-pink-300 to-purple-300 bg-clip-text text-transparent drop-shadow">Adventure Realm</h1>
            <p className="text-[10px] text-slate-400 -mt-0.5">Powered by Forge.Dev</p>
          </div>
        </div>

        {/* Hero stats */}
        {heroStats && (
          <div className="flex items-center gap-3 sm:gap-4 bg-gradient-to-r from-slate-800/90 to-purple-900/40 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl border border-purple-600/50 shadow-lg">
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-medium">Level</p>
              <p className="font-black text-purple-300 text-lg sm:text-xl drop-shadow">{heroStats.level}</p>
            </div>
            <div className="w-px h-10 sm:h-12 bg-gradient-to-b from-transparent via-purple-600/60 to-transparent" />
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-medium">XP</p>
              <p className="font-black text-yellow-300 text-lg sm:text-xl drop-shadow">{heroStats.total_xp}</p>
            </div>
            <div className="w-px h-10 sm:h-12 bg-gradient-to-b from-transparent via-purple-600/60 to-transparent" />
            <div className="text-center">
              <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-medium">Streak</p>
              <p className="font-black text-orange-300 text-lg sm:text-xl flex items-center gap-1 drop-shadow">🔥 {heroStats.streak}</p>
            </div>
            <div className="hidden md:block w-32">
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-500" style={{ width: `${heroStats.total_xp % 100}%` }} />
              </div>
              <p className="text-[9px] text-slate-400 text-center mt-1">{100 - (heroStats.total_xp % 100)} XP to next</p>
            </div>
          </div>
        )}

        {/* Notifications + Profile */}
        <div className="flex items-center gap-3">
          <div className="relative" ref={notificationRef}>
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 hover:bg-slate-800/80 rounded-lg transition group">
              <span className="text-xl group-hover:scale-110 transition-transform">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse border-2 border-slate-900">{unreadCount}</span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-purple-600/40 rounded-xl shadow-2xl shadow-purple-900/50 z-50 overflow-hidden">
                <div className="p-4 border-b border-purple-600/30 flex justify-between items-center">
                  <p className="font-bold text-white">Notifications</p>
                  <span className="text-xs text-slate-400">{unreadCount} unread</span>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.map(note => (
                    <div key={note.id} className={`p-4 border-b border-slate-800 hover:bg-slate-800/40 transition cursor-pointer ${!note.read ? 'bg-purple-900/10' : ''}`}>
                      <div className="flex items-start gap-3">
                        <span className="text-lg">{priorityIcons[note.priority]}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${priorityColors[note.priority]}`}>{note.priority.toUpperCase()}</span>
                            <span className="text-xs text-slate-400">{note.block}</span>
                          </div>
                          <p className="text-sm font-semibold text-white truncate">{note.title}</p>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">{note.content}</p>
                          <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                            <span>👨‍🏫 {note.instructor}</span>
                            <span>{note.date} • {note.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-purple-600/30 text-center">
                  <button className="text-xs text-purple-400 hover:text-purple-300 transition">View All Notifications →</button>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-3 px-3 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-purple-600/40 rounded-xl transition group">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg">{user.username?.[0]?.toUpperCase() || 'U'}</div>
              <div className="hidden sm:block text-left">
                <p className="font-semibold text-sm text-white">{user.username}</p>
                <p className="text-[10px] text-slate-400">Level {heroStats?.level || 1}</p>
              </div>
              <span className="text-slate-400 group-hover:text-white transition">▼</span>
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 border border-purple-600/40 rounded-xl shadow-2xl shadow-purple-900/50 z-50 overflow-hidden">
                <div className="p-4 border-b border-purple-600/30">
                  <p className="font-bold text-white">{user.username}</p>
                  <p className="text-xs text-slate-400">{user.email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-600/30 text-purple-300 text-xs rounded-full">Lvl {heroStats?.level || 1}</span>
                    <span className="px-2 py-0.5 bg-yellow-600/30 text-yellow-300 text-xs rounded-full">{heroStats?.total_xp || 0} XP</span>
                  </div>
                </div>
                <div className="py-2">
                  <button className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition flex items-center gap-3"><span>👤</span> View Profile</button>
                  <button className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition flex items-center gap-3"><span>⚙️</span> Settings</button>
                  <button className="w-full px-4 py-2.5 text-left text-sm text-slate-300 hover:text-white hover:bg-slate-800/80 transition flex items-center gap-3"><span>📊</span> My Progress</button>
                  <div className="border-t border-purple-600/30 my-2" />
                  <button onClick={handleLogoutClick} className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:text-red-300 hover:bg-red-600/10 transition flex items-center gap-3"><span>🚪</span> Logout</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="relative z-10 container mx-auto px-4 py-6">

        {/* Tabs - Only show when NOT in a subject (Dashboard mode) */}
        {!selectedBlock && (
          <div className="flex gap-2 mb-6 border-b border-purple-600/40 pb-2 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => !tab.disabled && setActiveTab(tab.id)} disabled={tab.disabled}
                className={`px-4 sm:px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 whitespace-nowrap border-2 ${
                  tab.disabled
                    ? 'text-slate-500 border-slate-800 cursor-not-allowed opacity-50'
                    : activeTab === tab.id
                      ? tab.id === 'sandbox'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/40 transform scale-105 font-bold'
                        : 'bg-gradient-to-r from-purple-600 to-pink-600 border-purple-400 text-white shadow-lg shadow-purple-600/50 transform scale-105 font-bold'
                      : tab.id === 'sandbox'
                        ? 'text-emerald-300 border-emerald-800/50 hover:text-white hover:border-emerald-500/60 hover:bg-emerald-900/20 hover:scale-105'
                        : 'text-slate-300 border-slate-700 hover:text-white hover:border-purple-500/60 hover:bg-slate-800/80 hover:scale-105'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Sandbox tab */}
        {activeTab === 'sandbox' && (
          <div>
            <SandboxHealthBanner health={sandboxHealth} />
            <div className="rounded-2xl overflow-hidden border border-emerald-600/30 shadow-2xl shadow-emerald-900/20"
              style={{ height: 'calc(100vh - 240px)', minHeight: 480 }}>
              <ArcaneSandbox
                seedCode={sandboxSeed?.code || null}
                seedLanguage={sandboxSeed?.language || 'python'}
                sandboxHealth={sandboxHealth}
              />
            </div>
          </div>
        )}

                {/* ================= MODE 1: DASHBOARD (No Subject Selected) ================= */}
        {!selectedBlock ? (
          <div className="animate-fade-in">
            {activeTab === 'subjects' && <MySubjects onSelectSubject={handleEnterSubject} />}
            {activeTab === 'hall' && <Leaderboard currentUsername={user.username} />}
            {activeTab === 'hero' && heroStats && <ProgressStats stats={heroStats} username={user.username} />}
            {activeTab === 'sandbox' && (
              <div>
                <SandboxHealthBanner health={sandboxHealth} />
                <div className="rounded-2xl overflow-hidden border border-emerald-600/30 shadow-2xl shadow-emerald-900/20" style={{ height: 'calc(100vh - 240px)', minHeight: 480 }}>
                  <ArcaneSandbox sandboxHealth={sandboxHealth} />
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ================= MODE 2: COURSE VIEW (Subject Selected) ================= */}
            <div className="animate-fade-in space-y-6">
            
            {/* Course Header */}
            <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-purple-600/30">
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleExitSubject}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold transition flex items-center gap-2"
                >
                  ← Back to Subjects
                </button>
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedBlock.section_code}</h2>
                  <p className="text-sm text-slate-400">{selectedBlock.name}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-purple-600/20 text-purple-300 rounded-full text-xs font-bold border border-purple-600/40">
                  {selectedBlock.semester}
                </span>
              </div>
            </div>

            {/* Course Navigation Tabs */}
            <div className="flex gap-2 border-b border-purple-600/40 pb-2">
              {[
                { id: 'board', label: '🗺️ Quest Board' },
                { id: 'log', label: '📜 Quest Log' },
                { id: 'sandbox', label: '🧪 Sandbox' },
                { id: 'hero', label: '🧙 Hero Sheet' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCourseTab(tab.id)}
                  className={`px-4 py-2 rounded-lg font-semibold transition ${
                    courseTab === tab.id 
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/50' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Course Content Area */}
            <div className="min-h-[500px]">
              {courseTab === 'board' && (
                <ProblemList 
                  onSelectQuest={handleQuestSelect} 
                  currentLevel={heroStats?.level || 1}
                  blockId={selectedBlock.id}
                />
              )}
              {courseTab === 'log' && (
                <QuestLog 
                  blockId={selectedBlock.id}
                />
              )}
              {courseTab === 'sandbox' && (
                 <div className="h-[600px] rounded-xl overflow-hidden border border-emerald-600/30">
                    <ArcaneSandbox sandboxHealth={sandboxHealth} />
                 </div>
              )}
              {courseTab === 'hero' && heroStats && (
                <ProgressStats stats={heroStats} username={user.username} />
              )}
            </div>
          </div>
          </>
        )}

        {loading && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-600 border-t-transparent mx-auto mb-4" />
              <p className="text-white font-mono text-lg drop-shadow-lg animate-pulse">Summoning your adventure...</p>
            </div>
          </div>
        )}
      </main>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-20px) translateX(5px); opacity: 0.8; }
          50% { transform: translateY(-10px) translateX(-5px); opacity: 0.5; }
          75% { transform: translateY(-30px) translateX(3px); opacity: 0.9; }
        }
        .animate-float { animation: float 4s ease-in-out infinite; }
        @keyframes pulse-slow {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(0.98); }
        }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
      `}</style>
    </div>
  )
}