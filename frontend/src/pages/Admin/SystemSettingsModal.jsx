import { useState, useEffect } from 'react'

const API = 'http://localhost:5000'

const TABS = [
  { id: 'general',       label: 'General',       icon: '🏫' },
  { id: 'security',      label: 'Security',       icon: '🔐' },
  { id: 'execution',     label: 'Execution',      icon: '⚡' },
  { id: 'gamification',  label: 'Gamification',   icon: '🎮' },
  { id: 'plagiarism',    label: 'Plagiarism',     icon: '🔍' },
]

export default function SystemSettingsModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('general')
  const [config, setConfig] = useState({
    // General
    system_name: 'Forge.dev',
    institution_name: '',
    timezone: 'Asia/Manila',
    // Security
    maintenance_mode: 'false',
    min_password_length: '8',
    session_timeout: '60',
    jwt_expiration_hours: '24',
    // Execution
    execution_timeout: '5',
    enabled_languages: 'python,java,csharp',
    memory_limit_mb: '256',
    // Gamification
    xp_multiplier: '1.0',
    easy_xp_max: '100',
    medium_xp_max: '250',
    hard_xp_max: '500',
    // Plagiarism
    plagiarism_threshold: '0.85',
    plagiarism_auto_flag: 'true',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [dirty, setDirty] = useState(false)

  useEffect(() => { fetchConfig() }, [])

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`${API}/api/admin/config`, { headers: { 'Authorization': `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setConfig(prev => ({ ...prev, ...data }))
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const update = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')

      // Send ALL configurable fields matching the backend allowed set
      const payload = {
        // General
        system_name:          config.system_name,
        institution_name:     config.institution_name,
        timezone:             config.timezone,
        // Security
        maintenance_mode:     config.maintenance_mode,
        min_password_length:  config.min_password_length,
        session_timeout:      config.session_timeout,
        jwt_expiration_hours: config.jwt_expiration_hours,
        // Execution
        execution_timeout:    config.execution_timeout,
        enabled_languages:    config.enabled_languages,
        memory_limit_mb:      config.memory_limit_mb,
        // Gamification
        xp_multiplier:        config.xp_multiplier,
        easy_xp_max:          config.easy_xp_max,
        medium_xp_max:        config.medium_xp_max,
        hard_xp_max:          config.hard_xp_max,
        // Plagiarism
        plagiarism_threshold: config.plagiarism_threshold,
        plagiarism_auto_flag: config.plagiarism_auto_flag,
      }

      const res = await fetch(`${API}/api/admin/config`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        showToast('Settings saved successfully!', 'success')
        setDirty(false)
      } else {
        const err = await res.json()
        showToast(err.error || 'Failed to save', 'error')
      }
    } catch {
      showToast('Network error', 'error')
    } finally {
      setSaving(false)
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const languageList = config.enabled_languages.split(',').map(l => l.trim()).filter(Boolean)
  const toggleLanguage = (lang) => {
    const list = languageList.includes(lang) ? languageList.filter(l => l !== lang) : [...languageList, lang]
    update('enabled_languages', list.join(','))
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {toast && (
        <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl font-semibold text-white shadow-xl ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.message}
        </div>
      )}

      <div className="bg-slate-900 border-2 border-purple-600/40 rounded-2xl w-full max-w-2xl shadow-2xl shadow-purple-900/30 overflow-hidden flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/60 to-pink-900/40 px-6 py-5 border-b border-purple-600/30 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center text-xl">⚙️</div>
            <div>
              <h2 className="text-xl font-black text-white">System Settings</h2>
              <p className="text-purple-300/70 text-xs">Configure platform-wide behaviour</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dirty && <span className="text-amber-400 text-xs font-semibold px-2 py-0.5 bg-amber-400/10 border border-amber-400/30 rounded-full animate-pulse">Unsaved changes</span>}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition text-lg">×</button>
          </div>
        </div>

        <div className="flex flex-1 min-h-0">

          {/* Sidebar tabs */}
          <div className="w-40 bg-slate-900/80 border-r border-slate-800 p-2 flex-shrink-0">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition mb-1 ${activeTab === t.id ? 'bg-purple-600/30 text-white border border-purple-600/50' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                <span>{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-5">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-600 border-t-transparent"></div>
              </div>
            ) : (
              <>
                {/* GENERAL */}
                {activeTab === 'general' && (
                  <SettingsSection title="General Configuration" icon="🏫">
                    <Field label="System Name" hint="Displayed in the header and emails">
                      <input type="text" value={config.system_name} onChange={e => update('system_name', e.target.value)}
                        className="settings-input" placeholder="Forge.dev" />
                    </Field>
                    <Field label="Institution Name" hint="Your university or college name">
                      <input type="text" value={config.institution_name} onChange={e => update('institution_name', e.target.value)}
                        className="settings-input" placeholder="e.g., University of Technology" />
                    </Field>
                    <Field label="Timezone" hint="Used for timestamps and schedules">
                      <select value={config.timezone} onChange={e => update('timezone', e.target.value)} className="settings-input">
                        <option value="Asia/Manila">Asia/Manila (PHT, UTC+8)</option>
                        <option value="Asia/Singapore">Asia/Singapore (SGT, UTC+8)</option>
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                      </select>
                    </Field>
                    <Field label="Maintenance Mode" hint="Disables student & instructor access temporarily">
                      <Toggle value={config.maintenance_mode === 'true'} onChange={v => update('maintenance_mode', v ? 'true' : 'false')} />
                    </Field>
                  </SettingsSection>
                )}

                {/* SECURITY */}
                {activeTab === 'security' && (
                  <SettingsSection title="Security Settings" icon="🔐">
                    <Field label="Min. Password Length" hint="Enforce stronger passwords (minimum 6)">
                      <NumberInput value={config.min_password_length} onChange={v => update('min_password_length', v)} min={6} max={32} />
                    </Field>
                    <Field label="Session Timeout (minutes)" hint="Auto-logout users after inactivity">
                      <NumberInput value={config.session_timeout} onChange={v => update('session_timeout', v)} min={5} max={480} />
                    </Field>
                    <Field label="JWT Expiration (hours)" hint="How long access tokens remain valid">
                      <NumberInput value={config.jwt_expiration_hours} onChange={v => update('jwt_expiration_hours', v)} min={1} max={168} />
                    </Field>
                  </SettingsSection>
                )}

                {/* EXECUTION */}
                {activeTab === 'execution' && (
                  <SettingsSection title="Code Execution Engine" icon="⚡">
                    <Field label="Execution Timeout (seconds)" hint="Max time a student's code is allowed to run">
                      <NumberInput value={config.execution_timeout} onChange={v => update('execution_timeout', v)} min={1} max={30} />
                    </Field>
                    <Field label="Memory Limit (MB)" hint="Container memory cap per execution">
                      <NumberInput value={config.memory_limit_mb} onChange={v => update('memory_limit_mb', v)} min={64} max={512} />
                    </Field>
                    <Field label="Enabled Languages" hint="Toggle which languages students can submit in">
                      <div className="flex gap-2 flex-wrap">
                        {['python', 'java', 'csharp'].map(lang => (
                          <button key={lang} onClick={() => toggleLanguage(lang)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition ${languageList.includes(lang) ? 'bg-purple-600/30 border-purple-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                            {lang === 'python' && '🐍 '}{lang === 'java' && '☕ '}{lang === 'csharp' && '🔷 '}
                            {lang}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </SettingsSection>
                )}

                {/* GAMIFICATION */}
                {activeTab === 'gamification' && (
                  <SettingsSection title="Gamification & XP" icon="🎮">
                    <Field label="XP Multiplier" hint="Global multiplier applied to all XP rewards (1.0 = normal)">
                      <input type="number" step="0.1" min="0.1" max="5" value={config.xp_multiplier} onChange={e => update('xp_multiplier', e.target.value)}
                        className="settings-input w-28" />
                    </Field>
                    <Field label="Easy Quest Max XP" hint="Maximum XP reward for Easy difficulty">
                      <NumberInput value={config.easy_xp_max} onChange={v => update('easy_xp_max', v)} min={10} max={500} />
                    </Field>
                    <Field label="Medium Quest Max XP" hint="Maximum XP reward for Medium difficulty">
                      <NumberInput value={config.medium_xp_max} onChange={v => update('medium_xp_max', v)} min={50} max={1000} />
                    </Field>
                    <Field label="Hard Quest Max XP" hint="Maximum XP reward for Hard difficulty">
                      <NumberInput value={config.hard_xp_max} onChange={v => update('hard_xp_max', v)} min={100} max={2000} />
                    </Field>
                  </SettingsSection>
                )}

                {/* PLAGIARISM */}
                {activeTab === 'plagiarism' && (
                  <SettingsSection title="Plagiarism Detection" icon="🔍">
                    <Field label="Similarity Threshold" hint="Submissions above this score are flagged (0.0–1.0)">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <input type="range" min="0.5" max="1.0" step="0.01"
                            value={config.plagiarism_threshold}
                            onChange={e => update('plagiarism_threshold', e.target.value)}
                            className="flex-1 accent-purple-500" />
                          <span className="text-white font-mono font-bold w-12 text-right">{parseFloat(config.plagiarism_threshold).toFixed(2)}</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          {parseFloat(config.plagiarism_threshold) >= 0.90 && '🟢 Conservative — only near-identical code flagged'}
                          {parseFloat(config.plagiarism_threshold) >= 0.80 && parseFloat(config.plagiarism_threshold) < 0.90 && '🟡 Balanced — recommended setting'}
                          {parseFloat(config.plagiarism_threshold) < 0.80 && '🔴 Aggressive — many false positives possible'}
                        </p>
                      </div>
                    </Field>
                    <Field label="Auto-Flag Suspicious Submissions" hint="Automatically mark for review without admin action">
                      <Toggle value={config.plagiarism_auto_flag === 'true'} onChange={v => update('plagiarism_auto_flag', v ? 'true' : 'false')} />
                    </Field>
                  </SettingsSection>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900 flex-shrink-0">
          <button onClick={() => { if (window.confirm('Reset all settings to defaults?')) fetchConfig() }}
            className="text-slate-500 hover:text-slate-300 text-sm transition">↺ Reset to defaults</button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white font-bold transition text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving || !dirty}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 rounded-lg text-white font-bold transition shadow-lg shadow-purple-600/30 text-sm flex items-center gap-2">
              {saving ? <><span className="animate-spin">⟳</span> Saving…</> : '💾 Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <style>{`.settings-input { width: 100%; background: #1e293b; border: 1px solid #334155; border-radius: 0.5rem; padding: 0.5rem 1rem; color: white; outline: none; transition: border-color 0.15s; } .settings-input:focus { border-color: #9333ea; }`}</style>
    </div>
  )
}

function SettingsSection({ title, icon, children }) {
  return (
    <div className="space-y-4">
      <h3 className="text-white font-bold text-base flex items-center gap-2 pb-2 border-b border-slate-800">
        <span>{icon}</span>{title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-white text-sm font-semibold">{label}</label>
      </div>
      {children}
      {hint && <p className="text-slate-500 text-xs mt-1.5">{hint}</p>}
    </div>
  )
}

function NumberInput({ value, onChange, min, max }) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onChange(String(Math.max(min, parseInt(value || 0) - 1)))}
        className="w-8 h-8 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white flex items-center justify-center font-bold transition">−</button>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} min={min} max={max}
        className="w-20 text-center settings-input" />
      <button onClick={() => onChange(String(Math.min(max, parseInt(value || 0) + 1)))}
        className="w-8 h-8 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-white flex items-center justify-center font-bold transition">+</button>
      <span className="text-slate-600 text-xs">{min}–{max}</span>
    </div>
  )
}

function Toggle({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`relative w-14 h-7 rounded-full transition-colors ${value ? 'bg-purple-600' : 'bg-slate-700'}`}>
      <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform shadow ${value ? 'translate-x-7' : ''}`} />
    </button>
  )
}
