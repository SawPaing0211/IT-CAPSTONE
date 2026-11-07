import { useState, useEffect, useRef } from 'react'
import { openChangePassword } from '../../utils/accountEvents'
import Editor from '@monaco-editor/react'
import ProblemList from './ProblemList'
import StudentCodeEditor from './StudentCodeEditor'
import Leaderboard from './components/Leaderboard'
import ProgressStats from './components/ProgressStats'
import QuestLog from './QuestLog'
import MySubjects from './MySubjects'
import CourseGrid, { CourseEmblem } from './components/CourseGrid'
import BountyPreview from './components/BountyPreview'
import HeroPanel from './components/HeroPanel'
import BountyBoard from './BountyBoard'
import QuestSpotlight from './components/QuestSpotlight'
import StudentSidebar from './components/StudentSidebar'
import { api, API_BASE, authFetch } from '../../api/client'
import MobileSheet from '../../components/MobileSheet'
import NotificationsPanel from './components/NotificationsPanel'
import BottomNav from '../../components/BottomNav'
import StudentLessons from './StudentLessons'
import StudentAnnouncements from './StudentAnnouncements'
import crystalLogo from '../../assets/landing/forge-crystal-logo.webp'
import passwordEmblem from '../../assets/account-password.png'
import progressEmblem from '../../assets/account-progress.png'
import exitPortal from '../../assets/account-logout.png'
import '../../components/AccountPanels.css'

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
    loop:     { label: 'Loop Magic',   icon: '🔄', code: 'using System;\n\npublic class Program {\n    public static void Main() {\n        for (int i = 1; i <= 5; i++)\n        {\n            Console.WriteLine($"Casting spell #{i}...");\n        }\n    }\n}\n' },
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

// localStorage here is shared by the whole browser -- without the
// student's own id in the key, sandbox code and saved scrolls would leak
// to whoever else uses the same machine/browser next. Falls back to
// 'anon' only if there's genuinely no token yet.
const getSandboxUid = () => {
  const token = localStorage.getItem('token')
  if (!token) return 'anon'
  try {
    return JSON.parse(atob(token.split('.')[1])).sub || 'anon'
  } catch (err) {
    return 'anon'
  }
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
  const templatesAnchorRef = useRef(null)
  const savedAnchorRef     = useRef(null)
  const settingsAnchorRef  = useRef(null)
  const [savedScrolls, setSavedScrolls] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`arcane_saved_${getSandboxUid()}`) || '[]') } catch { return [] }
  })
  const [saveDialog, setSaveDialog]     = useState(false)
  const [saveName, setSaveName]         = useState('')
  const [mobileTab, setMobileTab]       = useState('code')  // Code/Output tabs, mobile only
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
      const saved = localStorage.getItem(`arcane_code_${getSandboxUid()}_${lang}`)
      setCode(saved || SPELL_TEMPLATES[lang]?.blank?.code || '')
    }
  }, [lang])

  // Save code to localStorage whenever it changes
  useEffect(() => {
    if (!seedCode && code) localStorage.setItem(`arcane_code_${getSandboxUid()}_${lang}`, code)
  }, [code, lang])

  // ResizeObserver — catches the editor's own box changing size (Monaco's
  // automaticLayout option already does this too, but doubling up here is
  // harmless and layout() is cheap to call again)
  useEffect(() => {
    if (!editorContainerRef.current) return
    const obs = new ResizeObserver(() => editorRef.current?.layout())
    obs.observe(editorContainerRef.current)
    return () => obs.disconnect()
  }, [])

  // Mobile browsers resize the *visible* viewport (not the CSS one) when the
  // on-screen keyboard opens/closes or the address bar collapses on scroll —
  // that doesn't fire a ResizeObserver on our container, so Monaco can be
  // left with stale layout metrics: the blinking cursor and text look right,
  // but the hidden textarea Monaco uses to capture typing/backspace ends up
  // positioned against the old metrics, so keys stop registering until
  // something else forces a relayout (e.g. switching tabs). Re-running
  // layout() on every viewport resize keeps it in sync.
  useEffect(() => {
    const relayout = () => editorRef.current?.layout()
    window.visualViewport?.addEventListener('resize', relayout)
    window.addEventListener('orientationchange', relayout)
    return () => {
      window.visualViewport?.removeEventListener('resize', relayout)
      window.removeEventListener('orientationchange', relayout)
    }
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

  // Trigger a particle burst animation after running code
  const burstParticles = (success) => {
    const emojis = success
      ? ['✦', '◆', '✧', '✦', '◆']
      : ['◆', '×']
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

  // Run the code in the sandbox and record the result
  const handleRun = async () => {
    if (isRunning) return
    setIsRunning(true)
    setOutput(null)
    setMobileTab('output')
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

  // Load a starter template into the editor
  const applyTemplate = (key) => {
    const tpl = SPELL_TEMPLATES[lang]?.[key]
    if (tpl) { setCode(tpl.code); setOutput(null); setShowTemplates(false) }
  }

  // Save the current code as a named scroll
  const handleSave = () => {
    if (!saveName.trim()) return
    const scroll = { id: Date.now(), name: saveName.trim(), code, language: lang, ts: new Date().toLocaleDateString() }
    const updated = [scroll, ...savedScrolls.slice(0, 7)]
    setSavedScrolls(updated)
    localStorage.setItem(`arcane_saved_${getSandboxUid()}`, JSON.stringify(updated))
    setSaveName(''); setSaveDialog(false)
  }

  // Download the current code as a file
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
    automaticLayout: true,
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
          <div key={p.id} className="absolute text-2xl text-amber-300"
            style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${p.delay}ms`, animation: 'sandboxBurst 1.4s ease-out forwards' }}>
            {p.emoji}
          </div>
        ))}
      </div>

      {/* Save dialog */}
      {saveDialog && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-[#0b1224] border border-amber-300/40 rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="font-cinzel font-bold text-amber-100 mb-4">Name your scroll</h3>
            <input autoFocus type="text" value={saveName}
              onChange={e => setSaveName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="e.g. My Fibonacci Spell"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-300/60 mb-4" />
            <div className="flex gap-2">
              <button onClick={() => { setSaveDialog(false); setSaveName('') }}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm transition">Cancel</button>
              <button onClick={handleSave} disabled={!saveName.trim()}
                className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 border border-amber-300/50 disabled:opacity-50 rounded-lg text-white font-bold text-sm transition">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sandbox Header ── */}
      <div className="relative shrink-0 flex items-center justify-between px-4 py-2.5 bg-[#0b1224] border-b border-amber-300/25 gap-2 flex-wrap">

        {/* Left */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg border border-amber-300/40 bg-amber-300/10 flex items-center justify-center" aria-hidden="true"><span className="block w-2 h-2 rotate-45 bg-amber-300" /></div>
            <div>
              <p className="font-cinzel text-sm font-bold text-amber-100 leading-none">Arcane Sandbox</p>
              <p className="text-[10px] text-slate-500 leading-none mt-1">
                Docker isolated · {sandboxHealth?.limits?.timeout_s ?? 10}s limit · {sandboxHealth?.limits?.memory_mb ?? 128}MB RAM
              </p>
            </div>
          </div>
          {seedCode && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-600/20 border border-purple-600/40 rounded-full text-[9px] text-purple-300 font-bold">
              Carried from quest
            </span>
          )}
          {runCount > 0 && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-800 rounded-lg border border-slate-700">
              <span className="text-[9px] text-slate-400">Spells cast:</span>
              <span className="text-amber-300 font-black text-xs">{runCount}</span>
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
                className={`max-sm:min-h-[44px] px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 border relative ${
                  lang === key
                    ? 'bg-amber-300/10 border-amber-300/60 text-amber-200'
                    : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                }`}>
                {meta.label}
                {/* Red dot if image missing */}
                {sandboxHealth && sandboxHealth.images?.[key] === false && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" title="Image not built" />
                )}
              </button>
            )
          })}
        </div>

        {/* Right: toolbar */}
        <div className="flex flex-wrap items-center gap-1">

          {/* Templates */}
          <div ref={templatesAnchorRef}>
            <button onClick={() => { setShowTemplates(!showTemplates); setShowSaved(false); setShowSettings(false) }}
              className="max-sm:min-h-[44px] max-sm:min-w-[44px] max-sm:justify-center px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition flex items-center gap-1 border border-transparent hover:border-slate-700">
              <span className="text-[11px] font-bold uppercase tracking-wider">Scrolls</span>
            </button>
            <MobileSheet show={showTemplates} onClose={() => setShowTemplates(false)} widthClass="sm:w-52" anchorRef={templatesAnchorRef}>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider px-3 pt-1 sm:pt-3 pb-1 font-bold">Spell Templates</p>
              {Object.entries(SPELL_TEMPLATES[lang] || {}).map(([key, tpl]) => (
                <button key={key} onClick={() => { applyTemplate(key); setShowTemplates(false) }}
                  className="w-full flex items-center gap-2 px-3 py-3 sm:py-2 text-sm sm:text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition text-left">
                  {tpl.label}
                </button>
              ))}
            </MobileSheet>
          </div>

          {/* Saved */}
          <div ref={savedAnchorRef}>
            <button onClick={() => { setShowSaved(!showSaved); setShowTemplates(false); setShowSettings(false) }}
              className="max-sm:min-h-[44px] max-sm:min-w-[44px] max-sm:justify-center px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition flex items-center gap-1 border border-transparent hover:border-slate-700">
              <span className="text-[11px] font-bold uppercase tracking-wider hidden md:inline">Saved</span><span className="text-[11px] font-bold uppercase tracking-wider md:hidden">Saved</span>
              {savedScrolls.length > 0 && (
                <span className="w-3.5 h-3.5 bg-amber-400 text-slate-900 text-[7px] rounded-full flex items-center justify-center font-bold">
                  {savedScrolls.length}
                </span>
              )}
            </button>
            <MobileSheet show={showSaved} onClose={() => setShowSaved(false)} widthClass="sm:w-60" anchorRef={savedAnchorRef}>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider px-3 pt-1 sm:pt-3 pb-1 font-bold">Saved Scrolls</p>
              {savedScrolls.length === 0
                ? <p className="px-3 pb-3 text-xs text-slate-500">No saved scrolls yet.</p>
                : savedScrolls.map(s => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-800 group">
                    <button onClick={() => { setLang(s.language); setCode(s.code); setOutput(null); setShowSaved(false) }} className="flex-1 text-left">
                      <p className="text-sm sm:text-xs text-slate-300 group-hover:text-white truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-500">{LANG_META[s.language]?.label} · {s.ts}</p>
                    </button>
                    <button onClick={() => {
                      const u = savedScrolls.filter(x => x.id !== s.id)
                      setSavedScrolls(u); localStorage.setItem(`arcane_saved_${getSandboxUid()}`, JSON.stringify(u))
                    }} className="text-slate-600 hover:text-red-400 text-xs transition">✕</button>
                  </div>
                ))
              }
            </MobileSheet>
          </div>

          {/* Settings */}
          <div ref={settingsAnchorRef}>
            <button onClick={() => { setShowSettings(!showSettings); setShowTemplates(false); setShowSaved(false) }}
              className="px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center text-[11px] font-bold uppercase tracking-wider">Size</button>
            <MobileSheet show={showSettings} onClose={() => setShowSettings(false)} widthClass="sm:w-44" anchorRef={settingsAnchorRef}>
              <div className="px-3 pb-3 sm:p-3">
                <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-2 font-bold">Font Size</p>
                <div className="flex gap-1">
                  {[12, 14, 16, 18].map(s => (
                    <button key={s} onClick={() => setFontSize(s)}
                      className={`flex-1 py-2 sm:py-1 rounded text-xs font-bold transition ${fontSize === s ? 'bg-amber-300 text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{s}</button>
                  ))}
                </div>
              </div>
            </MobileSheet>
          </div>

          <button onClick={handleDownload} title="Download" className="px-2 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-slate-700 min-w-[44px] min-h-[44px] flex items-center justify-center text-[11px] font-bold uppercase tracking-wider">Export</button>
          <button onClick={() => setSaveDialog(true)} title="Save scroll" className="px-2 py-1.5 text-xs text-slate-400 hover:text-amber-200 hover:bg-slate-800 rounded-lg transition border border-transparent hover:border-amber-300/40 min-w-[44px] min-h-[44px] flex items-center justify-center text-[11px] font-bold uppercase tracking-wider">Save</button>

          {/* Run */}
          <button onClick={handleRun} disabled={isRunning}
            className={`ml-1 max-sm:min-h-[44px] px-4 py-1.5 rounded-lg text-xs font-black transition flex items-center gap-1.5 border ${
              isRunning
                ? 'bg-slate-700 border-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-b from-violet-500 via-violet-600 to-violet-800 hover:from-violet-400 border-amber-300/55 text-white shadow-[0_4px_16px_-4px_rgba(124,58,237,0.65)]'
            }`}>
            {isRunning
              ? <><span className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /> Casting…</>
              : <>Cast <span className="hidden sm:inline text-amber-200/80 font-normal">(Ctrl+Enter)</span></>
            }
          </button>
        </div>
      </div>

      {/* ── Editor + Output ── */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>

        {/* Mobile-only Code/Output tabs, shown once there's something to switch to */}
        {(output || isRunning) && (
          <div className="md:hidden shrink-0 flex border-b border-amber-300/15 bg-slate-900/60">
            <button
              onClick={() => setMobileTab('code')}
              className={`flex-1 py-2 text-xs font-bold transition ${mobileTab === 'code' ? 'text-amber-200 border-b-2 border-amber-300' : 'text-slate-500'}`}
            >
              Code
            </button>
            <button
              onClick={() => setMobileTab('output')}
              className={`flex-1 py-2 text-xs font-bold transition ${mobileTab === 'output' ? 'text-amber-200 border-b-2 border-amber-300' : 'text-slate-500'}`}
            >
              Output
            </button>
          </div>
        )}

        <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>

        {/* Editor */}
        <div ref={editorContainerRef} className={`overflow-hidden flex-col ${(output || isRunning) && mobileTab === 'output' ? 'hidden' : 'flex'} md:flex`}
          style={{ flex: output ? '1 1 55%' : '1 1 100%', minWidth: 0, transition: 'flex 0.3s ease', position: 'relative' }}>
          <div className="h-0.5 w-full bg-gradient-to-r from-violet-600 via-amber-300 to-violet-600 opacity-70 shrink-0" />
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
              monaco.editor.defineTheme('forge-citadel', {
                base: 'vs-dark', inherit: true,
                rules: [
                  { token: 'keyword',  foreground: 'c4b5fd' },
                  { token: 'string',   foreground: 'f3d78a' },
                  { token: 'comment',  foreground: '374151', fontStyle: 'italic' },
                  { token: 'number',   foreground: 'fb923c' },
                  { token: 'function', foreground: '38bdf8' },
                ],
                colors: {
                  'editor.background':                '#070b18',
                  'editor.lineHighlightBackground':   '#e0b84f12',
                  'editorCursor.foreground':          '#e0b84f',
                  'editor.selectionBackground':       '#7c3aed40',
                  'editorLineNumber.foreground':      '#1f2937',
                  'editorLineNumber.activeForeground':'#e0b84f',
                },
              })
              monaco.editor.setTheme('forge-citadel')
              setTimeout(() => editor.layout(), 100)
            }}
          />
          {!output && !isRunning && runCount === 0 && (
            <div className="hidden sm:block absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
              <div className="flex items-center gap-2 whitespace-nowrap px-4 py-2 bg-slate-900/90 border border-amber-300/15 rounded-full text-xs text-slate-400 backdrop-blur shadow">
                Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-amber-200 border border-slate-700 mx-1">Ctrl+Enter</kbd> to cast your spell
              </div>
            </div>
          )}
        </div>

        {/* Output pane */}
        {(output || isRunning) && (
          <div ref={outputRef} className={`flex-col border-l-0 md:border-l border-amber-300/15 bg-[#070b18] ${mobileTab === 'code' ? 'hidden' : 'flex'} md:flex`}
            style={{ flex: '1 1 45%', minWidth: 0, minHeight: 0 }}>
            <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-[#0b1224] border-b border-amber-300/15">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                Crystal Output
                {output && !hasError && <span className="text-emerald-400 font-normal normal-case tracking-normal text-[11px]">✓ {formatTime(output.elapsed)}</span>}
                {output && hasError  && <span className="text-red-400 font-normal normal-case tracking-normal text-[11px]">Error · {formatTime(output.elapsed)}</span>}
              </span>
              <button onClick={() => setOutput(null)} className="text-slate-600 hover:text-slate-400 text-xs transition">✕ Clear</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs" style={{ minHeight: 0 }}>
              {isRunning && !output && (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <div className="w-10 h-10 border-4 border-amber-300 border-t-transparent rounded-full animate-spin" />
                  <p className="text-amber-200 animate-pulse text-xs">Consulting the oracle…</p>
                  <p className="text-slate-600 text-[10px]">Docker container spinning up…</p>
                </div>
              )}

              {output && (
                <>
                  <div className={`flex items-center gap-2 mb-4 pb-3 border-b ${hasError ? 'border-red-900' : 'border-emerald-900'}`}>
                    <span className={`w-2 h-2 rotate-45 ${hasError ? 'bg-rose-400' : 'bg-emerald-400'}`} aria-hidden="true" />
                    <span className={`text-xs font-bold ${hasError ? 'text-red-400' : 'text-emerald-400'}`}>
                      {hasError ? 'Spell fizzled' : 'Spell cast successfully'}
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
                    <span>{formatTime(output.elapsed)}</span>
                    <span>{LANG_META[lang]?.label}</span>
                    <span>Docker isolated</span>
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
                      {hErr ? 'Error' : 'OK'} · {h.ts}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
        </div>
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

// heads up to myself: the tabs got renamed a while back ('quests' -> 'subjects')
// so anything setting activeTab needs to use 'subjects', not the old name
export default function StudentDashboard({ user, onLogout }) {
  const [activeTab, setActiveTab]             = useState('dashboard')
  const [selectedQuest, setSelectedQuest]     = useState(null)
  const [heroStats, setHeroStats]             = useState(null)
  const [loading, setLoading]                 = useState(true)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [sandboxSeed, setSandboxSeed]         = useState(null)
  const [sandboxHealth, setSandboxHealth]     = useState(null)
  const [selectedSection, setSelectedSection]   = useState(null)
  const [courseTab, setCourseTab] = useState('lessons')

  const profileRef      = useRef(null)
  const profileTriggerRef = useRef(null)
  const profileActionRef = useRef(null)
  const notificationRef = useRef(null)
  const backgroundRef   = useRef(null)

  useEffect(() => {
    if (showProfileMenu) profileActionRef.current?.focus({ preventScroll: true })
  }, [showProfileMenu])

  const closeProfile = () => {
    setShowProfileMenu(false)
    profileTriggerRef.current?.focus({ preventScroll: true })
  }

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      const insidePortaledSheet = e.target.closest?.('[data-mobile-sheet-portal]')
      if (insidePortaledSheet) return
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfileMenu(false)
      if (notificationRef.current && !notificationRef.current.contains(e.target)) setShowNotifications(false)
    }
    const handleEscape = e => {
      if (e.key === 'Escape') { setShowNotifications(false); setShowProfileMenu(false) }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  // Parallax
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)')
    let frame = 0
    const reset = () => {
      cancelAnimationFrame(frame)
      if (backgroundRef.current) backgroundRef.current.style.transform = ''
    }
    const handler = (e) => {
      if (motion.matches || !pointer.matches) return
      const x = Math.max(-24, Math.min(24, (e.clientX - window.innerWidth / 2) / 50))
      const y = Math.max(-24, Math.min(24, (e.clientY - window.innerHeight / 2) / 50))
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (backgroundRef.current) backgroundRef.current.style.transform = `translate(${x}px, ${y}px)`
      })
    }
    window.addEventListener('mousemove', handler, { passive: true })
    window.addEventListener('blur', reset)
    motion.addEventListener('change', reset)
    pointer.addEventListener('change', reset)
    return () => {
      reset()
      window.removeEventListener('mousemove', handler)
      window.removeEventListener('blur', reset)
      motion.removeEventListener('change', reset)
      pointer.removeEventListener('change', reset)
    }
  }, [])

  // Hero stats
  useEffect(() => {
    const fetch_ = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await authFetch(`${API_BASE}/api/student/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json()
          setHeroStats({
            total_xp: data.total_xp ?? 0,
            level: data.level ?? 1,
            streak: data.streak ?? 0,
            total_submissions: data.total_submissions ?? 0,
            accepted_submissions: data.accepted_submissions ?? 0,
            quests_done: data.quests_done ?? data.accepted_submissions ?? 0,
            success_rate: data.success_rate ?? 0,
          })
        } else {
          setHeroStats({ total_xp: 0, level: 1, streak: 0, total_submissions: 0, accepted_submissions: 0, success_rate: 0 })
        }
      } catch (err) {
        console.error(err)
        setHeroStats({ total_xp: 0, level: 1, streak: 0, total_submissions: 0, accepted_submissions: 0, success_rate: 0 })
      } finally {
        setLoading(false)
      }
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

  // Open a quest in the code editor
  const handleQuestSelect = (quest) => {
  console.log(`📚 Selected quest: ${quest.id} - ${quest.title}`)
  // Check if this quest is already completed
  const isCompleted = localStorage.getItem(`quest_completed_${user?.username || 'anon'}_${quest.id}`)
  if (isCompleted === 'true') {
    console.log(`✅ Quest ${quest.id} is already completed!`)
  }
  setSelectedQuest(quest)
  setActiveTab('spellforge')
}
  // Award XP and level up after completing a quest
  const handleVictory = (xpEarned, newLevel) => {
  // Mark quest as completed in localStorage
  if (selectedQuest?.id) {
    localStorage.setItem(`quest_completed_${user?.username || 'anon'}_${selectedQuest.id}`, 'true')
    console.log(`✅ Quest ${selectedQuest.id} marked as completed`)
  }

  setHeroStats(prev => ({ ...prev, total_xp: (prev?.total_xp || 0) + xpEarned, level: newLevel }))
}

  // uses 'subjects' not the old 'quests' tab id, see the note up top
  const handleReturnFromQuest = () => { setSelectedQuest(null); setActiveTab('subjects') }
  // Carry the current code over into the sandbox
  const handleCarryToSandbox = (code, language) => {
    setSandboxSeed({ code, language })
    setActiveTab('sandbox')
  }
  const handleLogoutClick = () => { setShowProfileMenu(false); onLogout() }

  // Navigation handlers for nested subject view
  const handleEnterSubject = (subject) => {
    console.log('📚 Entering subject:', subject)
  // subject contains: { id, name, section_id, section_no, semester, instructor }
    setSelectedSection({
      id: subject.section_id,
      section_code: subject.section_no,
      name: subject.name,
      semester: subject.semester,
      instructor: subject.instructor,
      subject_id: subject.id,
      quests_total: subject.quests_total,
      quests_done: subject.quests_done,
    })
  setCourseTab('lessons')
}

  const handleExitSubject = () => {
    setSelectedSection(null)
  }
  // sidebar / bottom nav: leave any open course, then switch tab
  const goTab = (id) => { setSelectedSection(null); setActiveTab(id) }

  // "My Progress" in the account dropdown jumps to the one real Hero Sheet —
  // the dashboard-level one, since it's account-wide anyway. Exits out of
  // any open course first so the tab actually renders.
  const handleGoToProgress = () => {
    setShowProfileMenu(false)
    setSelectedSection(null)
    setActiveTab('hero')
  }

  // Jump into a quest picked from the bounty board
  const handleBountyQuestSelect = (quest, group) => {
    handleEnterSubject({
      id: group.subject_id,
      name: group.subject_name,
      section_id: group.section_id,
      section_no: group.section_no,
      semester: group.semester,
      instructor: group.instructor
    })
    setCourseTab('board')
    handleQuestSelect(quest)
  }

  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(true)
  const [notificationsError, setNotificationsError] = useState(null)
  const [notificationsReload, setNotificationsReload] = useState(0)

  // Read state still isn't tracked on the backend, so it's kept client-side
  // in localStorage, per student (by username) — an id in this set stays
  // "read" across refreshes and future logins, instead of resetting to
  // "everything unread" every time the dropdown is opened.
  const readStorageKey = `readAnnouncements_${user?.username || 'anon'}`
  const loadReadIds = () => {
    try {
      return new Set(JSON.parse(localStorage.getItem(readStorageKey)) || [])
    } catch {
      return new Set()
    }
  }
  const saveReadIds = (ids) => {
    try {
      localStorage.setItem(readStorageKey, JSON.stringify([...ids]))
    } catch { /* best effort — a full/blocked localStorage just skips persistence */ }
  }

  // real announcements from every subject this student is enrolled in —
  // reshaped to the same field names the dropdown below already expects
  // (class_label/date/time/read), so the render JSX didn't need to change
  useEffect(() => {
    const fetchNotifications = async () => {
      setNotificationsLoading(true)
      setNotificationsError(null)
      try {
        const data = await api.get('/api/student/announcements')
        const readIds = loadReadIds()
        setNotifications(data.map(a => {
          const created = new Date(a.created_at)
          return {
            id: a.id,
            title: a.title,
            content: a.content,
            priority: a.priority,
            instructor: a.instructor,
            class_label: a.section_no ? `${a.subject_name} · ${a.section_no}` : a.subject_name,
            date: created.toLocaleDateString(),
            time: created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: readIds.has(a.id),
            // carried through so clicking a notification can navigate to
            // the right subject's Announcements tab
            class_id: a.class_id,
            subject_id: a.subject_id,
            section_no: a.section_no,
            subject_name: a.subject_name,
          }
        }))
      } catch (err) {
        console.error('Failed to load notifications:', err)
        setNotificationsError('Could not load announcements. Please try again.')
      } finally {
        setNotificationsLoading(false)
      }
    }
    fetchNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notificationsReload])

  // Mark one notification read (bell badge count drops immediately) and
  // persist it so it stays read next time the dropdown or page reloads.
  const markNotificationRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    const ids = loadReadIds()
    ids.add(id)
    saveReadIds(ids)
  }

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    const ids = loadReadIds()
    notifications.forEach(n => ids.add(n.id))
    saveReadIds(ids)
  }

  const unreadCount = notifications.filter(n => !n.read).length
  // matches the real priority values instructors actually pick from
  // (low/medium/high/urgent) — the old urgent/important/info set didn't
  // match 3 of those 4 real values at all
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
    { id: 'dashboard',  label: '🏠 Dashboard',          icon: '🏠', shortLabel: 'Home' },
    { id: 'subjects',   label: '🎓 My Subjects',       icon: '🎓', shortLabel: 'Subjects' },
    { id: 'bounty',     label: '🏴 Bounty Board',       icon: '🏴', shortLabel: 'Bounty' },
    { id: 'hall',       label: '👑 Hall of Champions',  icon: '👑', shortLabel: 'Champions' },
    { id: 'hero',       label: '🧙 Hero Sheet',         icon: '🧙', shortLabel: 'Hero' },
    { id: 'sandbox',    label: '🧪 Sandbox',            icon: '🧪', shortLabel: 'Sandbox' },
  ]

  const courseTabs = [
    { id: 'lessons',       label: 'Lessons',        icon: '📚', shortLabel: 'Lessons' },
    { id: 'announcements', label: 'Announcements',  icon: '📢', shortLabel: 'News' },
    { id: 'board',         label: 'Quest Board',    icon: '🗺️', shortLabel: 'Quests' },
    { id: 'log',           label: 'Quest Log',      icon: '📜', shortLabel: 'Log' },
    { id: 'sandbox',       label: 'Sandbox',        icon: '🧪', shortLabel: 'Sandbox' },
  ]

  return (
    <div className="min-h-screen max-w-screen overflow-x-hidden bg-gradient-to-b from-slate-950 via-purple-950/30 to-slate-950 text-white relative isolate lg:pl-[232px]">

      <StudentSidebar activeId={selectedSection ? 'subjects' : activeTab} onSelect={goTab} />

      {/* Background particles */}
      <div aria-hidden="true" className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      <div ref={backgroundRef} className="absolute -inset-8 transition-transform duration-100 ease-out motion-reduce:transition-none overflow-hidden">
        {/* Ambient nebula glow — echoes the landing/login sky so the dashboard
            reads as the same world, without competing with the UI on top */}
        <div className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full bg-purple-700/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 w-[460px] h-[460px] rounded-full bg-fuchsia-600/15 blur-[130px]" />
        <div className="absolute bottom-0 left-1/4 w-[420px] h-[420px] rounded-full bg-indigo-600/15 blur-[110px]" />
        {[...Array(50)].map((_, i) => {
          const gold = i % 7 === 0
          return (
            <div key={i} className={`absolute rounded-full animate-float ${gold ? 'w-1 h-1 bg-amber-200/70' : 'w-1 h-1 bg-white/30'}`}
              style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 5}s`, animationDuration: `${3 + Math.random() * 4}s`, opacity: 0.3 + Math.random() * 0.5, boxShadow: gold ? '0 0 6px rgba(252, 211, 77, 0.7)' : '0 0 4px rgba(168, 85, 247, 0.5)' }} />
          )
        })}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-purple-950/20" />
      </div>
      </div>

      {/* ── Header ── */}
      <header className="relative z-20 bg-gradient-to-b from-[#0e1733]/95 to-[#0a1024]/95 backdrop-blur border-b border-amber-300/20 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-5 sm:sticky sm:top-0">
        {/* Logo — below 1024px only; from 1024px the sidebar carries the brand */}
        <div className="flex items-center gap-2.5 lg:hidden">
          <img src={crystalLogo} alt="" className="h-11 w-auto shrink-0 select-none" draggable="false" />
          <span className="font-cinzel font-bold text-lg tracking-wide text-white">FORGE.DEV</span>
        </div>

        {/* Hero stats: level medallion, XP bar, streak pill */}
        {heroStats && (() => {
          const xpInLevel = (heroStats.total_xp || 0) % 100
          return (
            <div className="flex items-center gap-3 sm:gap-4 w-full sm:flex-1 sm:min-w-0 lg:justify-center">
              <div
                className="relative shrink-0 w-12 h-12 sm:w-[52px] sm:h-[52px] rounded-full p-[3px] bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-lg shadow-amber-500/20"
                role="img"
                aria-label={`Level ${heroStats.level}`}
              >
                <div className="w-full h-full rounded-full bg-[#0b1224] border border-violet-500/40 flex flex-col items-center justify-center leading-none">
                  <span className="text-[7px] font-bold tracking-widest text-amber-200">LV</span>
                  <span className="text-lg sm:text-xl font-black text-white">{heroStats.level}</span>
                </div>
              </div>
              <div className="flex-1 min-w-[120px] max-w-[300px]">
                <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-200 mb-1">{heroStats.total_xp} XP</p>
                <div
                  className="relative h-2.5 rounded-full bg-[#070b18] border border-slate-700/70 overflow-hidden"
                  role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={xpInLevel} aria-label="Progress to next level"
                >
                  <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-500" style={{ width: `${Math.max(xpInLevel, 3)}%` }} />
                  <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, transparent calc(10% - 1px), rgba(0,0,0,0.55) calc(10% - 1px), rgba(0,0,0,0.55) 10%)', backgroundSize: '10% 100%' }} />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-slate-400">
                  <span>{xpInLevel} / 100 XP</span>
                  <span className="text-slate-500">{100 - xpInLevel} to next level</span>
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-2 h-[38px] px-3.5 rounded-full bg-[#0b1326] border border-slate-700/70" aria-label={`Streak: ${heroStats.streak}`}>
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2c1 4-3 5.5-3 9.5a3 3 0 0 0 6 0c0-1-.4-1.800-1-2.500 3 1.500 5 4 5 7A7 7 0 0 1 5 16c0-3 1.500-5 3-6.500C9 8 11 5.500 12 2z" fill="#fb923c" /></svg>
                <span className="text-base font-bold text-slate-100 leading-none">{heroStats.streak}</span>
                <span className="text-[8px] font-bold tracking-[0.2em] text-slate-500 uppercase">Streak</span>
              </div>
            </div>
          )
        })()}

        {/* Notifications + Profile — pinned to the top-right corner on mobile so it sits
            next to the logo instead of stacking under the stats badge full-width */}
        <div className="absolute top-3 right-4 sm:static sm:top-auto sm:right-auto flex items-center gap-3">
          <div ref={notificationRef}>
            <button onClick={() => setShowNotifications(!showNotifications)} className="relative rounded-full bg-[#0b1326] border border-slate-700/70 hover:border-amber-300/50 hover:bg-slate-800/80 transition group w-[44px] h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300" aria-label="Notifications" aria-expanded={showNotifications} aria-controls={showNotifications ? 'student-notifications-panel' : undefined}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-slate-300 group-hover:text-amber-200 transition"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.500 2H4.500zM10 21h4" /></svg>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse border-2 border-slate-900">{unreadCount}</span>
              )}
            </button>
            <MobileSheet show={showNotifications} onClose={() => setShowNotifications(false)} widthClass="sm:w-[400px]" anchorRef={notificationRef} panelClassName="!border-amber-300/65 shadow-[0_0_24px_rgba(168,85,247,0.2)]">
              <NotificationsPanel notifications={notifications} unreadCount={unreadCount}
                loading={notificationsLoading} error={notificationsError}
                onRetry={() => setNotificationsReload(n => n + 1)} onMarkAllRead={markAllNotificationsRead}
                onSelect={note => {
                  markNotificationRead(note.id)
                  setShowNotifications(false)
                  if (note.class_id && note.subject_id) {
                    handleEnterSubject({ id: note.subject_id, name: note.subject_name, section_id: note.class_id, section_no: note.section_no, semester: null, instructor: note.instructor })
                    setCourseTab('announcements')
                  }
                }}
                onBrowse={() => { setShowNotifications(false); setActiveTab('subjects') }} />
            </MobileSheet>
          </div>

          <div ref={profileRef}>
            <button ref={profileTriggerRef} type="button" aria-label="Account options" aria-expanded={showProfileMenu} aria-controls={showProfileMenu ? 'student-account-panel' : undefined} onClick={() => { setShowNotifications(false); setShowProfileMenu(!showProfileMenu) }} className="flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 bg-[#0b1326] hover:bg-slate-800/80 border border-slate-700/70 hover:border-amber-300/50 rounded-full transition group focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-lg">{(user.full_name || user.username)?.[0]?.toUpperCase() || 'U'}</div>
              <div className="hidden sm:block text-left">
                <p className="font-semibold text-sm text-white">{user.full_name || user.username}</p>
                <p className="text-[10px] text-slate-400">{user.username}</p>
              </div>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="text-amber-200"><path d="m4 6 4 4 4-4" /></svg>
            </button>
            <MobileSheet show={showProfileMenu} onClose={closeProfile} widthClass="sm:w-72" anchorRef={profileRef} panelClassName="forge-account-sheet">
                <section id="student-account-panel" aria-labelledby="student-account-name" onKeyDown={e => {
                  if (e.key === 'Escape') {
                    e.stopPropagation()
                    closeProfile()
                  }
                }}>
                  <div className="forge-account-identity">
                    <h2 id="student-account-name" className="font-cinzel">{user.full_name || user.username}</h2>
                    <p><span className="forge-account-emblem forge-account-emblem-id" aria-hidden="true" /><span>{user.username}</span></p>
                    {user.email && <p><span className="forge-account-emblem forge-account-emblem-mail" aria-hidden="true" /><span>{user.email}</span></p>}
                    <div className="forge-account-stats">
                      <span>Level {heroStats?.level || 1}</span>
                      <span>{heroStats?.total_xp || 0} XP</span>
                    </div>
                  </div>
                  <div className="forge-account-actions">
                    <button ref={profileActionRef} type="button" onClick={handleGoToProgress}>
                      <img src={progressEmblem} alt="" />
                      My Progress
                    </button>
                    <button type="button" onClick={() => { closeProfile(); openChangePassword() }}><img src={passwordEmblem} alt="" />Change password</button>
                    <button type="button" className="forge-account-sign-out" onClick={handleLogoutClick}><img src={exitPortal} alt="" />Logout</button>
                  </div>
                </section>
            </MobileSheet>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="relative z-10 container mx-auto px-4 py-6 pb-24 lg:pb-6 overflow-x-hidden">

        {/* Tabs - Only show when NOT in a subject (Dashboard mode). Desktop only —
            mobile gets the fixed BottomNav below instead. */}
        {!selectedSection && (
          <div className="hidden gap-2 mb-6 border-b border-purple-600/40 pb-2 overflow-x-auto">
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

        {/* Mobile bottom tab bar — only in dashboard mode, same tabs as above */}
        {!selectedSection && (
          <BottomNav tabs={tabs} activeId={activeTab} onSelect={goTab} accentId="sandbox" />
        )}

        {/* ================= MODE 1: DASHBOARD (No Subject Selected) ================= */}
        {!selectedSection ? (
          <div className="animate-fade-in">
            {activeTab === 'dashboard' && (
              <>
                <div className="px-4 sm:px-6 pt-4 sm:pt-6 max-w-6xl mx-auto">
                  <QuestSpotlight onSelectQuest={handleBountyQuestSelect} onBrowse={() => setActiveTab('bounty')} />
                  <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-x-8 items-start">
                    <div className="min-w-0">
                      <CourseGrid onSelectSubject={handleEnterSubject} onViewAll={() => setActiveTab('subjects')} />
                      <BountyPreview onSelectQuest={handleBountyQuestSelect} onBrowseBoard={() => setActiveTab('bounty')} onBrowseCourses={() => setActiveTab('subjects')} />
                    </div>
                    <HeroPanel stats={heroStats} user={user} onOpenHeroSheet={() => setActiveTab('hero')} />
                  </div>
                </div>
              </>
            )}
            {activeTab === 'subjects' && <MySubjects onSelectSubject={handleEnterSubject} user={user} stats={heroStats} />}
            {activeTab === 'bounty' && <BountyBoard onSelectQuest={handleBountyQuestSelect} />}
            {activeTab === 'hall' && (
              <div className="overflow-hidden">
                <Leaderboard currentUsername={user.username} />
              </div>
            )}
            {activeTab === 'hero' && heroStats && <ProgressStats stats={heroStats} username={user.username} fullName={user.full_name} onOpenQuests={() => setActiveTab('bounty')} />}
            {activeTab === 'sandbox' && (
              <div>
                <SandboxHealthBanner health={sandboxHealth} />
                <div className="rounded-2xl overflow-hidden border border-amber-300/25 shadow-2xl" style={{ height: 'calc(100vh - 240px)', minHeight: 480 }}>
                  <ArcaneSandbox
                    seedCode={sandboxSeed?.code || null}
                    seedLanguage={sandboxSeed?.language || 'python'}
                    sandboxHealth={sandboxHealth}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* ================= MODE 2: COURSE VIEW (Subject Selected) ================= */}
            <div className="animate-fade-in space-y-6">

            {/* Course header: back link + hero panel with class details and quest progress */}
            <button
              onClick={handleExitSubject}
              className="flex items-center gap-2 min-h-[44px] sm:min-h-0 text-[11px] font-bold uppercase tracking-[0.2em] text-amber-300 hover:text-amber-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 rounded"
            >
              <span aria-hidden="true">&lsaquo;</span> Back to My Subjects
            </button>

            <section aria-label={selectedSection.name} className="flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-8 rounded-xl border border-amber-300/30 bg-gradient-to-br from-[#0f1836] to-[#0a1024] p-4 sm:p-6">
              <div className="flex items-start gap-4 min-w-0 flex-1">
                <div className="shrink-0 w-16 h-16 sm:w-[84px] sm:h-[84px] rounded-2xl border border-amber-300/60 bg-gradient-to-br from-violet-500 to-fuchsia-700 flex items-center justify-center shadow-[0_0_24px_-6px_rgba(168,85,247,0.7)]" aria-hidden="true">
                  <CourseEmblem name={selectedSection.name} className="w-9 h-9 sm:w-12 sm:h-12" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-cinzel font-bold uppercase tracking-wide text-xl sm:text-3xl text-white leading-tight break-words">{selectedSection.name}</h2>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.14em]">
                    {selectedSection.section_code && <span className="px-2.5 py-1 rounded-full border border-amber-300/60 text-amber-200 bg-amber-300/5">Class code &middot; {selectedSection.section_code}</span>}
                    {selectedSection.semester && <span className="px-2.5 py-1 rounded-full border border-slate-600 text-slate-300">{selectedSection.semester}</span>}
                    <span className="px-2.5 py-1 rounded-full border border-slate-600 text-slate-300 max-w-full truncate">Instructor &middot; {selectedSection.instructor || 'TBA'}</span>
                  </div>
                  <p className="mt-2.5 text-sm text-slate-400">Read lessons, clear quests, and climb the class standing.</p>
                </div>
              </div>

              {typeof selectedSection.quests_total === 'number' && (() => {
                const total = selectedSection.quests_total || 0
                const done = selectedSection.quests_done || 0
                const pct = total > 0 ? Math.round((done / total) * 100) : 0
                return (
                  <div className="lg:w-[320px] shrink-0 lg:border-l lg:border-slate-700/60 lg:pl-8">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Subject progress</p>
                    <p className="mt-1 flex items-baseline gap-3">
                      <span className="font-cinzel text-3xl font-bold text-amber-200">{done} / {total}</span>
                      <span className="text-sm text-slate-400">{total === 1 ? 'quest' : 'quests'} cleared</span>
                    </p>
                    <div className="mt-2 h-2 rounded-full bg-[#070b18] border border-slate-700/60 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${done} of ${total} quests cleared`}>
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })()}
            </section>

            {/* Course Navigation Tabs: desktop only, mobile gets the fixed BottomNav below */}
            <div role="tablist" aria-label="Course sections" className="hidden lg:flex gap-1 border-b border-slate-700/60 overflow-x-auto">
              {courseTabs.map(tab => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={courseTab === tab.id}
                  onClick={() => setCourseTab(tab.id)}
                  className={`px-6 py-3 text-[12px] font-bold uppercase tracking-[0.18em] whitespace-nowrap border-b-2 -mb-px transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-300 ${
                    courseTab === tab.id
                      ? 'text-amber-200 border-amber-300 bg-gradient-to-b from-transparent to-amber-300/10'
                      : 'text-slate-400 border-transparent hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <BottomNav tabs={courseTabs} activeId={courseTab} onSelect={setCourseTab} accentId="sandbox" />

            {/* Course Content Area */}
            <div className="min-h-[500px]">
              {/* Lessons Tab Content */}
              {courseTab === 'lessons' && (
                <StudentLessons subjectId={selectedSection.subject_id} sectionId={selectedSection.id} sectionName={selectedSection.name} info={selectedSection} />
              )}

              {courseTab === 'announcements' && (
                <StudentAnnouncements classId={selectedSection.id} sectionName={selectedSection.name} readIds={new Set(notifications.filter(n => n.read).map(n => n.id))} onMarkRead={markNotificationRead} />
              )}
              {courseTab === 'board' && (
                <ProblemList
                  onSelectQuest={handleQuestSelect}
                  currentLevel={heroStats?.level || 1}
                  sectionId={selectedSection.id}
                  subjectId={selectedSection.subject_id}
                />
              )}
              {courseTab === 'log' && (
                <QuestLog
                  sectionId={selectedSection.id}
                />
              )}
              {courseTab === 'sandbox' && (
                 <div className="h-[600px] rounded-xl overflow-hidden border border-amber-300/25 bg-[#070b18]">
                    <ArcaneSandbox sandboxHealth={sandboxHealth} />
                 </div>
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

        /* ── Custom Scrollbar ── */
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(15, 10, 30, 0.6);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #7c3aed, #db2777);
          border-radius: 10px;
          box-shadow: 0 0 8px rgba(168, 85, 247, 0.6);
        }
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #9333ea, #ec4899);
          box-shadow: 0 0 14px rgba(168, 85, 247, 0.9);
        }
        ::-webkit-scrollbar-corner {
          background: transparent;
        }
      `}</style>
    </div>
  )
}
