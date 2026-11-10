import AdminActionDialog from './AdminActionDialog'
import AdminToast from './AdminToast'
import settingsEmblem from '../../assets/admin/system-settings.png'
import { useState, useEffect } from 'react'
import { API_BASE, authFetch } from '../../api/client'

const API = API_BASE

// ─── inline icons (no icon library — keeps this self-contained) ──────
function Icon({ children, className = 'w-4 h-4', fill = 'none' }) {
  return (
    <svg viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      {children}
    </svg>
  )
}
const IconSchool = (p) => (
  <Icon {...p}><path d="M22 10 12 5 2 10l10 5 10-5Z" /><path d="M6 12v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5" /></Icon>
)
const IconLock = (p) => (
  <Icon {...p}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Icon>
)
const IconZap = (p) => (
  <Icon {...p} fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Icon>
)
const IconGamepad = (p) => (
  <Icon {...p}><line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" />
    <circle cx="15" cy="13" r="1" /><circle cx="18" cy="11" r="1" />
    <rect x="2" y="6" width="20" height="12" rx="6" /></Icon>
)
const IconSearch = (p) => (
  <Icon {...p}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Icon>
)
const IconAlertTriangle = (p) => (
  <Icon {...p}><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Icon>
)
const IconSave = (p) => (
  <Icon {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
    <polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></Icon>
)
const IconRotateCcw = (p) => (
  <Icon {...p}><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" /></Icon>
)


// Only Maintenance Mode changes how the system behaves. Everything else on these
// tabs is a read-only view of the values the running system really uses, loaded
// from the server, so nothing here can look adjustable when it is not.
const TABS = [
  { id: 'access',     label: 'Access',      icon: IconLock },
  { id: 'execution',  label: 'Execution',   icon: IconZap },
  { id: 'xp',         label: 'XP rules',    icon: IconGamepad },
  { id: 'plagiarism', label: 'Plagiarism',  icon: IconSearch },
]

const LANG_LABEL = { python: 'Python', java: 'Java', csharp: 'C#' }

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-800/70">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="text-white text-sm font-semibold text-right">{value}</span>
    </div>
  )
}

function ReadOnlyNote() {
  return (
    <div className="flex items-start gap-2 p-3 bg-slate-800/60 border border-slate-700 rounded-lg text-xs text-slate-300">
      <IconAlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
      <span>These values are built into the application and cannot be changed on this page.</span>
    </div>
  )
}

export default function SystemSettingsModal({ onClose, onSaved }) {
  const [activeTab, setActiveTab] = useState('access')
  const [maintenance, setMaintenance] = useState(false)
  const [effective, setEffective] = useState(null)
  const [effectiveFailed, setEffectiveFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMaintenance, setSavedMaintenance] = useState(null)
  const dirty = savedMaintenance !== null && maintenance !== savedMaintenance
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await authFetch(`${API}/api/admin/config`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) {
            const enabled = data.maintenance_mode === 'true'
            setMaintenance(enabled)
            setSavedMaintenance(enabled)
          }
        } else if (res.status === 401) {
          showToast('Your session has expired. Please log in again.', 'error')
        } else {
          showToast('Failed to load settings', 'error')
        }
      } catch {
        showToast('Network error while loading settings', 'error')
      }
      try {
        const res = await authFetch(`${API}/api/admin/effective-settings`)
        if (res.ok) { const d = await res.json(); if (!cancelled) setEffective(d) }
        else if (!cancelled) setEffectiveFailed(true)
      } catch {
        if (!cancelled) setEffectiveFailed(true)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleSave = async () => {
    if (saving || !dirty) return
    setSaving(true)
    try {
      const res = await authFetch(`${API}/api/admin/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenance_mode: maintenance ? 'true' : 'false' }),
      })
      if (res.ok) {
        showToast('Maintenance flag saved')
        setSavedMaintenance(maintenance)
        void onSaved?.()
      } else {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || 'Failed to save', 'error')
      }
    } catch {
      showToast('Network error', 'error')
    } finally {
      setSaving(false)
    }
  }

  const renderEffective = (render) => {
    if (effectiveFailed) return <p className="text-red-300 text-sm">Could not load the current values from the server.</p>
    if (!effective) return null
    return <>{render(effective)}<ReadOnlyNote /></>
  }

  return (
    <AdminActionDialog title="System Settings" description="Change the maintenance status or review the platform’s current rules." emblem={settingsEmblem} onClose={onClose} busy={saving}>
      <AdminToast toast={toast} onDone={() => setToast(null)} />

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <div className="grid shrink-0 grid-cols-2 gap-1 border-b border-amber-300/20 p-2 sm:block sm:w-40 sm:border-b-0 sm:border-r">
            {TABS.map(t => {
              const TabIcon = t.icon
              return (
                <button key={t.id} type="button" aria-pressed={activeTab === t.id} onClick={() => setActiveTab(t.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition mb-1 ${activeTab === t.id ? 'bg-purple-600/30 text-white border border-purple-600/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                  <TabIcon className="w-4 h-4 flex-shrink-0" />{t.label}
                </button>
              )
            })}
          </div>

          <div className="admin-action-scroll flex-1 space-y-5 p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
              </div>
            ) : (
              <>
                {activeTab === 'access' && (
                  <>
                    <SettingsSection title="Access" icon={IconSchool}>
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-white text-sm font-semibold">Maintenance Mode</p>
                          <p className="text-slate-500 text-xs mt-1">Shows a Maintenance status on the administrator dashboard. It is a status flag only and does not block anyone from signing in.</p>
                        </div>
                        <Toggle value={maintenance} disabled={saving || savedMaintenance === null} onChange={setMaintenance} />
                      </div>
                      {savedMaintenance === null && <p role="status" className="text-sm text-rose-300">Maintenance status is unavailable. Reopen settings to try again.</p>}
                    </SettingsSection>
                    {effective && (
                      <SettingsSection title="Sign-in sessions (read-only)" icon={IconLock}>
                        <Row label="Access token lifetime" value={`${effective.authentication.access_token_minutes} minutes`} />
                        <Row label="Refresh token lifetime" value={`${effective.authentication.refresh_token_days} days`} />
                        <ReadOnlyNote />
                      </SettingsSection>
                    )}
                  </>
                )}

                {activeTab === 'execution' && (
                  <SettingsSection title="Code execution limits" icon={IconZap}>
                    {renderEffective(e => (
                      <>
                        {Object.entries(e.execution.per_language).map(([lang, v]) => (
                          <Row key={lang} label={LANG_LABEL[lang] || lang} value={`${v.timeout_seconds} s, ${v.memory_mb} MB`} />
                        ))}
                        <Row label="CPU per run" value={`${e.execution.cpu_cores} core`} />
                        <Row label="Max processes" value={e.execution.max_processes} />
                        <Row label="Max code length" value={`${e.execution.max_code_characters} characters`} />
                        <Row label="Network" value={e.execution.network} />
                      </>
                    ))}
                  </SettingsSection>
                )}

                {activeTab === 'xp' && (
                  <SettingsSection title="XP rules" icon={IconGamepad}>
                    {renderEffective(e => (
                      <>
                        {Object.entries(e.xp.max_xp_by_difficulty).map(([d, v]) => (
                          <Row key={d} label={`${d} problem, max XP`} value={v} />
                        ))}
                        <Row label="Level" value={e.xp.level_rule} />
                        <Row label="Failed attempt" value={e.xp.failed_attempt_minimum} />
                        <Row label="Hint penalty" value={e.xp.hint_penalty} />
                      </>
                    ))}
                  </SettingsSection>
                )}

                {activeTab === 'plagiarism' && (
                  <SettingsSection title="Plagiarism checks" icon={IconSearch}>
                    {renderEffective(e => (
                      <>
                        <Row label="Similarity threshold" value={e.plagiarism.threshold} />
                        <Row label="Scan started" value={e.plagiarism.scan_trigger} />
                        <Row label="AI explanation" value={e.plagiarism.ai_verdict_configured ? 'Configured' : 'Not configured'} />
                      </>
                    ))}
                  </SettingsSection>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-amber-300/20 bg-[#10162b] p-3 sm:px-6">
          <button type="button" onClick={onClose} disabled={saving} className="admin-button px-5 py-2 rounded-lg text-white font-bold transition text-sm">Close</button>
          {dirty && <span className="mr-auto text-xs text-amber-200">Unsaved changes</span>}
          <button type="button" onClick={handleSave} disabled={saving || !dirty}
            className="admin-button admin-button-primary px-6 py-2 disabled:opacity-40 rounded-lg text-white font-bold transition text-sm flex items-center gap-2">
            {saving ? <><IconRotateCcw className="w-4 h-4 animate-spin" /> Saving…</> : <><IconSave className="w-4 h-4" /> Save maintenance flag</>}
          </button>
        </div>
    </AdminActionDialog>
  )
}

function SettingsSection({ title, icon: SectionIcon, children }) {
  return (
    <div className="space-y-4">
      <h3 className="font-cinzel text-white font-semibold text-base flex items-center gap-2 pb-2 border-b border-slate-800">
        {SectionIcon && <SectionIcon className="w-4 h-4 text-purple-300 flex-shrink-0" />}{title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Toggle({ value, disabled, onChange }) {
  return (
    <button type="button" role="switch" aria-label="Maintenance mode" aria-checked={value} disabled={disabled} onClick={() => onChange(!value)}
      className={`relative w-14 h-7 shrink-0 rounded-full transition-colors disabled:opacity-50 ${value ? 'bg-purple-600' : 'bg-slate-700'}`}>
      <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow ${value ? 'translate-x-7' : ''}`} />
    </button>
  )
}
