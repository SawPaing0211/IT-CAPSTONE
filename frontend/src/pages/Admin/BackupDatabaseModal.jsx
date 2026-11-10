import AdminActionDialog from './AdminActionDialog'
import AdminIcon, { INLINE } from './AdminIcons'
import backupEmblem from '../../assets/admin/database-backup.png'
import selectedDiamond from '../../assets/instructor/quest-selected-diamond.png'
import { useEffect, useState, useRef } from 'react'
import { API_BASE, authFetch } from '../../api/client'

// our backend base url — change this if we ever move to prod
const API = API_BASE

// these match the exact tables our backend /api/admin/backup exports
// added subject_sections, announcements, system_config because they're in our schema too
const TABLES = [
  { key: 'users',               label: 'Users',         icon: 'users', desc: 'User records and password hashes'  },
  { key: 'subjects',            label: 'Subjects',      icon: 'book', desc: 'IT course subjects'                },
  { key: 'subject_sections',    label: 'Class Codes',   icon: 'layers', desc: 'Section schedules & capacity'      },
  { key: 'problems',            label: 'Activities',    icon: 'puzzle', desc: 'Coding quests & test cases'         },
  { key: 'submissions',         label: 'Submissions',   icon: 'filetext', desc: 'Student code submissions'           },
  { key: 'audit_logs',          label: 'Audit Logs',    icon: 'filetext', desc: 'Admin activity history'             },
  { key: 'achievements',        label: 'Achievements',  icon: 'trophy', desc: 'Badge definitions & XP rewards'     },
  { key: 'teacher_assignments', label: 'Assignments',   icon: 'link', desc: 'Instructor–subject–section links'   },
  { key: 'announcements',       label: 'Announcements', icon: 'megaphone', desc: 'Instructor announcements'            },
  { key: 'system_config',       label: 'System Config', icon: 'gear', desc: 'Platform configuration keys'        },
]

// ── checkbox row for each table in the selective list ────────────────────────
function TableRow({ table, checked, onToggle }) {
  return (
    <label
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-700/40 cursor-pointer transition-colors group select-none"
    >
      <input type="checkbox" checked={checked} onChange={onToggle} className="peer sr-only" />
      <span aria-hidden="true" className="grid size-6 shrink-0 place-items-center rounded-sm peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-amber-300">
        {checked ? <img src={selectedDiamond} alt="" className="size-6 object-contain" />
          : <span className="size-3 rotate-45 rounded-[1px] border border-amber-200" />}
      </span>
      <AdminIcon name={table.icon} className="size-5 shrink-0 text-amber-200" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium leading-tight">{table.label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{table.desc}</p>
      </div>
    </label>
  )
}

// ── key-value row used in the success result card ─────────────────────────────
function ResultRow({ icon, label, children }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-slate-700/30 last:border-0">
      <span className="flex items-center gap-1.5 text-xs text-slate-400 flex-shrink-0">
        <AdminIcon name={icon} className="size-3.5" />{label}
      </span>
      <span className="min-w-0 break-words text-xs text-right text-white">{children}</span>
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


  // we store the backup details here after success to show in the result card
  const [result,   setResult]   = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  // keeping the blob url in a ref so it doesn't cause extra re-renders
  // we need this for the download button to work
  const blobUrlRef = useRef(null)
  useEffect(() => () => {
    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
  }, [])

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

  const runBackup = async () => {
    if (stage !== 'idle' || (mode === 'selective' && selectedTables.length === 0)) return

    setStage('running')
    setErrorMsg('')

    // send 'all' for full backup or just the selected keys for selective
    const payload = {
      tables: mode === 'full' ? 'all' : selectedTables,
    }

    try {
      const res = await authFetch(`${API}/api/admin/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      // backend returned a non-ok status — read the error message and throw
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Server returned ${res.status}`)
      }

      // convert the response body into a blob so we can make a download link
      if (res.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/sql') {
        throw new Error('The server did not return a SQL export.')
      }
      const blob = await res.blob()
      if (!blob.size) throw new Error('The server returned an empty export.')
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
        tableScope: mode === 'full' ? 'All application tables' : `${selectedTables.length} selected tables`,
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
    setResult(null)
    setErrorMsg('')
  }

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <AdminActionDialog
      title="Database Backup"
      description="Export application data as a SQL file."
      emblem={backupEmblem}
      onClose={handleClose}
      busy={stage === 'running'}
    >
        {/* ── scrollable content area ── */}
        <div className="admin-action-scroll flex-1 space-y-5 p-4 sm:p-6">

          {/* ════ IDLE — the selection / config screen ════ */}
          {stage === 'idle' && (
            <>
              {/* backup type toggle */}
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  Backup Type
                </p>
                <div className="grid gap-3 sm:grid-cols-2">

                  <button
                    type="button"
                    aria-pressed={mode === 'full'}
                    onClick={() => setMode('full')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      mode === 'full'
                        ? 'bg-violet-950/60 border-amber-300/75'
                        : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <p className={`font-bold text-sm ${mode === 'full' ? 'text-white' : 'text-slate-300'}`}>
                      Full Backup
                    </p>
                    <p className={`text-xs mt-0.5 ${mode === 'full' ? 'text-amber-100' : 'text-slate-400'}`}>
                      All application tables
                    </p>
                  </button>

                  <button
                    type="button"
                    aria-pressed={mode === 'selective'}
                    onClick={() => setMode('selective')}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      mode === 'selective'
                        ? 'bg-violet-950/60 border-amber-300/75'
                        : 'bg-slate-800/50 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    <p className={`font-bold text-sm ${mode === 'selective' ? 'text-white' : 'text-slate-300'}`}>
                      Selective
                    </p>
                    <p className={`text-xs mt-0.5 ${mode === 'selective' ? 'text-amber-100' : 'text-slate-400'}`}>
                      Choose specific tables
                    </p>
                  </button>

                </div>
              </div>

              {/* table checklist — only visible when selective mode is active */}
              {mode === 'selective' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
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
                      <AdminIcon name="alert" className="size-3.5 shrink-0" /> Select at least one table to continue
                    </p>
                  )}
                </div>
              )}

              {/* data sensitivity reminder — always shown */}
              <div className="flex items-start gap-3 p-3.5 bg-amber-900/20 border border-amber-600/30 rounded-xl">
                <AdminIcon name="alert" className="mt-0.5 size-5 shrink-0 text-amber-400" />
                <p className="text-amber-200/70 text-xs leading-relaxed">
                  Backups contain sensitive data including password hashes and emails.
                  Store the file securely and follow the institution's data retention policies.
                </p>
              </div>

              {/* footer buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleClose}
                  className="admin-button flex-1 py-2.5 border rounded-xl text-white font-semibold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={runBackup}
                  // disable if selective mode has nothing selected
                  disabled={mode === 'selective' && selectedTables.length === 0}
                  className="admin-button admin-button-primary flex-1 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white font-bold text-sm transition flex items-center justify-center gap-2"
                >
                  <AdminIcon name="save" className="size-4" /> Start Backup
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
                <div className="absolute inset-0 flex items-center justify-center text-emerald-300"><AdminIcon name="save" className="size-7" /></div>
              </div>

              <div>
                <p className="text-white font-bold text-base">Backup in Progress</p>
                <p className="text-slate-400 text-sm mt-1" role="status">Waiting for the SQL export…</p>
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
                <div className="w-16 h-16 mx-auto bg-emerald-600/15 border-2 border-emerald-500/40 rounded-full flex items-center justify-center text-emerald-300">
                  <AdminIcon name="check" className="size-8" />
                </div>
                <h3 className="text-lg font-black text-white">SQL export ready</h3>
                <p className="text-slate-400 text-xs">This file contains table data. Uploaded lesson files are stored separately.</p>
              </div>

              {/* result detail card */}
              <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-4 py-1">
                <ResultRow icon="folder" label="Filename">
                  <span className="font-mono text-[11px] text-emerald-300 break-all">{result.filename}</span>
                </ResultRow>
                <ResultRow icon="calendar" label="Generated">{result.timestamp}</ResultRow>
                <ResultRow icon="table" label="Tables">{result.tableScope}</ResultRow>
                <ResultRow icon="disk" label="File size">{result.sizeLabel}</ResultRow>
              </div>

              {/* this is what they actually want — download the .sql file */}
              <button
                onClick={downloadFile}
                className="admin-button admin-button-primary w-full py-3 rounded-xl text-white font-bold text-sm transition flex items-center justify-center gap-2"
              >
                <AdminIcon name="download" className="size-4" /> Download Backup File
              </button>

              {/* secondary actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleReset}
                  className="admin-button flex-1 py-2.5 border rounded-xl text-slate-300 font-semibold text-sm transition"
                >
                  <AdminIcon name="redo" className={INLINE} />New Backup
                </button>
                <button
                  onClick={handleClose}
                  className="admin-button flex-1 py-2.5 border rounded-xl text-slate-300 font-semibold text-sm transition"
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
                <div className="w-16 h-16 mx-auto bg-red-600/15 border-2 border-red-500/40 rounded-full flex items-center justify-center text-red-300">
                  <AdminIcon name="x" className="size-8" />
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
                  className="admin-button admin-button-primary flex-1 py-2.5 rounded-xl text-white font-bold text-sm transition"
                >
                  <AdminIcon name="redo" className={INLINE} />Try Again
                </button>
                <button
                  onClick={handleClose}
                  className="admin-button flex-1 py-2.5 border rounded-xl text-slate-300 font-semibold text-sm transition"
                >
                  Close
                </button>
              </div>
            </div>
          )}

        </div>
    </AdminActionDialog>
  )
}
