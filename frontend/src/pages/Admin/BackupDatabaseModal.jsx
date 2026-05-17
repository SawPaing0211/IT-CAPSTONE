import { useState, useRef } from 'react'

// our backend base url — change this if we ever move to prod
const API = 'http://localhost:5000'

// these match the exact tables our backend /api/admin/backup exports
// added subject_sections, announcements, system_config because they're in our schema too
const TABLES = [
  { key: 'users',               label: 'Users',         icon: '👥', desc: 'All user accounts & credentials'  },
  { key: 'subjects',            label: 'Subjects',      icon: '📖', desc: 'IT course subjects'                },
  { key: 'subject_sections',    label: 'Class Codes',   icon: '🗂️', desc: 'Section schedules & capacity'      },
  { key: 'problems',            label: 'Activities',    icon: '🧩', desc: 'Coding quests & test cases'         },
  { key: 'submissions',         label: 'Submissions',   icon: '📝', desc: 'Student code submissions'           },
  { key: 'audit_logs',          label: 'Audit Logs',    icon: '📜', desc: 'Admin activity history'             },
  { key: 'achievements',        label: 'Achievements',  icon: '🏆', desc: 'Badge definitions & XP rewards'     },
  { key: 'teacher_assignments', label: 'Assignments',   icon: '👨‍🏫', desc: 'Instructor–subject–section links'   },
  { key: 'announcements',       label: 'Announcements', icon: '📢', desc: 'Instructor announcements'            },
  { key: 'system_config',       label: 'System Config', icon: '⚙️', desc: 'Platform configuration keys'        },
]

// these are the fake progress steps we animate while the real request runs
// purely cosmetic so it doesn't feel like nothing is happening
const PROGRESS_STEPS = [
  { label: 'Connecting to database…',         pct: 12  },
  { label: 'Locking tables for consistency…', pct: 28  },
  { label: 'Exporting schema definitions…',   pct: 44  },
  { label: 'Dumping table data…',             pct: 65  },
  { label: 'Compressing backup file…',        pct: 82  },
  { label: 'Verifying data integrity…',       pct: 94  },
  { label: 'Finalising…',                     pct: 100 },
]

// just a tiny helper so we don't have to write new Promise everywhere
const delay = (ms) => new Promise(r => setTimeout(r, ms))

// ── checkbox row for each table in the selective list ────────────────────────
function TableRow({ table, checked, onToggle }) {
  return (
    <label
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-700/40 cursor-pointer transition-colors group select-none"
      onClick={onToggle}
    >
      {/* custom checkbox because the default html one looks bad in dark mode */}
      <div className={`
        w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all
        ${checked
          ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/40'
          : 'border-slate-600 group-hover:border-slate-400'}
      `}>
        {checked && (
          <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-base leading-none flex-shrink-0">{table.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium leading-tight">{table.label}</p>
        <p className="text-[11px] text-slate-500 mt-0.5 truncate">{table.desc}</p>
      </div>
    </label>
  )
}

// ── key-value row used in the success result card ─────────────────────────────
function ResultRow({ icon, label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-slate-700/30 last:border-0">
      <span className="flex items-center gap-1.5 text-xs text-slate-500 flex-shrink-0">
        <span>{icon}</span>{label}
      </span>
      <span className="text-xs text-right text-white">{children}</span>
    </div>
  )
}

// ── main modal component ──────────────────────────────────────────────────────
export default function BackupDatabaseModal({ onClose }) {

  // 'full' backs up everything, 'selective' lets admin pick tables
  const [mode, setMode] = useState('full')

  // starts fully checked so selective mode is ready without extra clicks
  const [selectedTables, setSelectedTables] = useState(TABLES.map(t => t.key))

  // controls which screen we're showing: idle → running → done or error
  const [stage, setStage] = useState('idle')

  // progress bar percentage and the current step label
  const [progress,  setProgress]  = useState(0)
  const [stepLabel, setStepLabel] = useState('')

  // we store the backup details here after success to show in the result card
  const [result,   setResult]   = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  // keeping the blob url in a ref so it doesn't cause extra re-renders
  // we need this for the download button to work
  const blobUrlRef = useRef(null)

  // toggle one table key in or out of our selected list
  const toggleTable = (key) => {
    setSelectedTables(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  // either select all or clear all depending on current state
  const toggleAll = () => {
    setSelectedTables(
      selectedTables.length === TABLES.length ? [] : TABLES.map(t => t.key)
    )
  }

  // this runs the fake progress animation AND the real api call at the same time
  // we use Promise.all so both have to finish before we move to the done screen
  const runBackup = async () => {
    if (mode === 'selective' && selectedTables.length === 0) return

    setStage('running')
    setProgress(0)
    setErrorMsg('')

    // animate the steps — purely cosmetic while the real request runs in background
    const animateSteps = async () => {
      for (const step of PROGRESS_STEPS) {
        setStepLabel(step.label)
        await delay(460)
        setProgress(step.pct)
      }
    }

    // send 'all' for full backup or just the selected keys for selective
    const payload = {
      tables: mode === 'full' ? 'all' : selectedTables,
    }

    try {
      // using 'token' here — that's what our login flow saves it as in localStorage
      const token = localStorage.getItem('token')

      // run animation and fetch at the same time — animation usually finishes first
      const [, res] = await Promise.all([
        animateSteps(),
        fetch(`${API}/api/admin/backup`, {
          method:  'POST',
          headers: {
            Authorization:  `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }),
      ])

      // backend returned a non-ok status — read the error message and throw
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Server returned ${res.status}`)
      }

      // convert the response body into a blob so we can make a download link
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      blobUrlRef.current = url // store it here so the download button can use it

      const ts = new Date()

      // build the result object we display in the done screen
      setResult({
        filename:  `forge_backup_${ts.toISOString().replace(/[:.]/g, '-').slice(0, 19)}.sql`,
        timestamp: ts.toLocaleString('en-PH', {
          year: 'numeric', month: 'long', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }),
        tableCount: mode === 'full' ? TABLES.length : selectedTables.length,
        // show a human-friendly size label (B / KB / MB)
        sizeLabel: blob.size < 1024
          ? `${blob.size} B`
          : blob.size < 1024 * 1024
            ? `${Math.round(blob.size / 1024)} KB`
            : `${(blob.size / (1024 * 1024)).toFixed(2)} MB`,
      })

      setStage('done')

    } catch (err) {
      // something broke — surface the message so we know what happened
      setErrorMsg(err.message || 'Unknown error. Check the Flask console.')
      setStage('error')
    }
  }

  // triggers the actual browser download using the blob url we created earlier
  const downloadFile = () => {
    if (!blobUrlRef.current || !result) return
    const a = document.createElement('a')
    a.href     = blobUrlRef.current
    a.download = result.filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // cleanup the blob url when closing so we don't leak browser memory
  const handleClose = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    onClose()
  }

  // reset everything back to idle so they can run another backup without reopening
  const handleReset = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setStage('idle')
    setProgress(0)
    setResult(null)
    setErrorMsg('')
  }

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    // dark backdrop — click outside to close (disabled while running)
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={stage !== 'running' ? handleClose : undefined}
    >
      <div
        className="bg-slate-900 border border-emerald-600/30 rounded-2xl w-full max-w-md shadow-2xl shadow-emerald-900/20 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()} // prevent backdrop click from firing inside
      >

        {/* ── header ── */}
        <div className="bg-gradient-to-r from-emerald-900/50 to-green-900/30 px-6 py-5 border-b border-emerald-600/25 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-emerald-600/30">
              💾
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Database Backup</h2>
              <p className="text-emerald-300/60 text-xs mt-0.5">Export all platform data securely</p>
            </div>
          </div>

          {/* we hide this while running so they can't accidentally dismiss the modal */}
          {stage !== 'running' && (
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-xl leading-none"
              aria-label="Close modal"
            >
              ×
            </button>
          )}
        </div>

        {/* ── scrollable content area ── */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 overscroll-contain scroll-smooth [transform:translatez(0)]">

          {/* ════ IDLE — the selection / config screen ════ */}
          {stage === 'idle' && (
            <>
              {/* backup type toggle */}
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Backup Type
                </p>
                <div className="grid grid-cols-2 gap-3">

                  <button
                    onClick={() => setMode('full')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      mode === 'full'
                        ? 'bg-emerald-600/15 border-emerald-500/60 shadow-sm shadow-emerald-500/10'
                        : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">🗄️</div>
                    <p className={`font-bold text-sm ${mode === 'full' ? 'text-white' : 'text-slate-300'}`}>
                      Full Backup
                    </p>
                    <p className={`text-xs mt-0.5 ${mode === 'full' ? 'text-emerald-300/70' : 'text-slate-500'}`}>
                      All {TABLES.length} tables included
                    </p>
                  </button>

                  <button
                    onClick={() => setMode('selective')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      mode === 'selective'
                        ? 'bg-emerald-600/15 border-emerald-500/60 shadow-sm shadow-emerald-500/10'
                        : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <div className="text-2xl mb-2">🗂️</div>
                    <p className={`font-bold text-sm ${mode === 'selective' ? 'text-white' : 'text-slate-300'}`}>
                      Selective
                    </p>
                    <p className={`text-xs mt-0.5 ${mode === 'selective' ? 'text-emerald-300/70' : 'text-slate-500'}`}>
                      Choose specific tables
                    </p>
                  </button>

                </div>
              </div>

              {/* table checklist — only visible when selective mode is active */}
              {mode === 'selective' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                      Select Tables
                      {/* live count so they know how many are picked */}
                      <span className="ml-2 text-emerald-400 normal-case font-semibold">
                        {selectedTables.length}/{TABLES.length}
                      </span>
                    </p>
                    <button
                      onClick={toggleAll}
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition font-medium"
                    >
                      {selectedTables.length === TABLES.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  {/* scrollable table list */}
                  <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-1.5 max-h-56 overflow-y-auto space-y-0.5 overscroll-contain will-change-scroll">
                    {TABLES.map(table => (
                      <TableRow
                        key={table.key}
                        table={table}
                        checked={selectedTables.includes(table.key)}
                        onToggle={() => toggleTable(table.key)}
                      />
                    ))}
                  </div>

                  {/* warn if nothing is selected — the start button will also be disabled */}
                  {selectedTables.length === 0 && (
                    <p className="text-red-400 text-xs mt-2 flex items-center gap-1.5">
                      <span>⚠️</span> Select at least one table to continue
                    </p>
                  )}
                </div>
              )}

              {/* data sensitivity reminder — always shown */}
              <div className="flex items-start gap-3 p-3.5 bg-amber-900/20 border border-amber-600/30 rounded-xl">
                <span className="text-amber-400 text-base flex-shrink-0 mt-0.5">⚠️</span>
                <p className="text-amber-200/70 text-xs leading-relaxed">
                  Backups contain sensitive data including password hashes and emails.
                  Store the file securely and follow the institution's data retention policies.
                </p>
              </div>

              {/* footer buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleClose}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/50 rounded-xl text-white font-semibold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={runBackup}
                  // disable if selective mode has nothing selected
                  disabled={mode === 'selective' && selectedTables.length === 0}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white font-bold text-sm transition shadow-lg shadow-emerald-700/30 flex items-center justify-center gap-2"
                >
                  <span>💾</span> Start Backup
                </button>
              </div>
            </>
          )}

          {/* ════ RUNNING — progress animation while we wait for the response ════ */}
          {stage === 'running' && (
            <div className="text-center space-y-5 py-6">

              {/* double-ring spinner with the save icon in the middle */}
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-900/40 border-t-emerald-400 animate-spin" />
                <div
                  className="absolute inset-2 rounded-full border-2 border-emerald-800/30 border-t-emerald-600/60 animate-spin"
                  style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-2xl">💾</div>
              </div>

              <div>
                <p className="text-white font-bold text-base">Backup in Progress</p>
                {/* step label updates as the animation runs */}
                <p className="text-slate-400 text-sm mt-1 min-h-[20px]">{stepLabel}</p>
              </div>

              {/* progress bar */}
              <div className="w-full bg-slate-800/80 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-green-400 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-slate-600 truncate mr-2">{stepLabel}</span>
                <span className="text-emerald-400 font-mono font-bold flex-shrink-0">{progress}%</span>
              </div>

              <p className="text-slate-600 text-xs">
                Do not close this window until the backup is complete
              </p>
            </div>
          )}

          {/* ════ DONE — success screen with download button ════ */}
          {stage === 'done' && result && (
            <div className="space-y-5">

              {/* success indicator */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto bg-emerald-600/15 border-2 border-emerald-500/40 rounded-full flex items-center justify-center text-3xl">
                  ✅
                </div>
                <h3 className="text-lg font-black text-white">Backup Complete!</h3>
                <p className="text-slate-400 text-xs">Your database was exported successfully.</p>
              </div>

              {/* result detail card */}
              <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-1">
                <ResultRow icon="📁" label="Filename">
                  <span className="font-mono text-[11px] text-emerald-300 break-all">{result.filename}</span>
                </ResultRow>
                <ResultRow icon="📅" label="Generated">{result.timestamp}</ResultRow>
                <ResultRow icon="📊" label="Tables">{result.tableCount} tables</ResultRow>
                <ResultRow icon="💽" label="File size">{result.sizeLabel}</ResultRow>
              </div>

              {/* this is what they actually want — download the .sql file */}
              <button
                onClick={downloadFile}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl text-white font-bold text-sm transition shadow-lg shadow-emerald-700/30 flex items-center justify-center gap-2"
              >
                <span>⬇️</span> Download Backup File
              </button>

              {/* secondary actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/50 rounded-xl text-slate-300 font-semibold text-sm transition"
                >
                  ↩ New Backup
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/50 rounded-xl text-slate-300 font-semibold text-sm transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* ════ ERROR — something went wrong on the backend ════ */}
          {stage === 'error' && (
            <div className="space-y-5">

              {/* error indicator */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 mx-auto bg-red-600/15 border-2 border-red-500/40 rounded-full flex items-center justify-center text-3xl">
                  ❌
                </div>
                <h3 className="text-lg font-black text-white">Backup Failed</h3>
                <p className="text-slate-400 text-xs">Something went wrong on the server.</p>
              </div>

              {/* show the actual error message from the backend */}
              <div className="p-4 bg-red-900/20 border border-red-600/30 rounded-xl">
                <p className="text-red-300 text-xs leading-relaxed font-mono break-all">{errorMsg}</p>
              </div>

              <p className="text-slate-600 text-xs text-center">
                Check the Flask terminal for the full traceback.
              </p>

              {/* give them the option to retry without reopening the whole modal */}
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 rounded-xl text-white font-bold text-sm transition"
                >
                  ↩ Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/50 rounded-xl text-slate-300 font-semibold text-sm transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
