import { useState, useEffect } from 'react'

export default function SystemSettings() {
  const [config, setConfig] = useState({
    maintenance_mode: false,
    allow_registrations: true,
    session_timeout: 60,
    min_password_length: 8,
    email_notifications: true
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/system-config', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setConfig({
          maintenance_mode: data.maintenance_mode === 'true',
          allow_registrations: data.allow_registrations === 'true',
          session_timeout: parseInt(data.session_timeout) || 60,
          min_password_length: parseInt(data.min_password_length) || 8,
          email_notifications: data.email_notifications === 'true'
        })
      }
    } catch (err) {
      console.error('Failed to fetch config:', err)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/system-config', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      })
      if (res.ok) {
        alert('Settings saved successfully!')
      }
    } catch (err) {
      console.error('Failed to save config:', err)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* System Configuration */}
      <div className="bg-slate-900/80 rounded-2xl border border-purple-600/30 p-8">
        <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
          <span className="text-3xl">🗄️</span>
          System Configuration
        </h3>
        
        <div className="space-y-6">
          {/* Maintenance Mode */}
          <div className="flex items-center justify-between p-6 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-orange-600/30 rounded-xl flex items-center justify-center text-3xl border border-orange-600/50">
                ⚠️
              </div>
              <div>
                <h4 className="font-bold text-white text-lg">Maintenance Mode</h4>
                <p className="text-slate-400 text-sm">Temporarily disable all student and instructor access</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={config.maintenance_mode}
              onChange={(value) => setConfig({...config, maintenance_mode: value})}
            />
          </div>

          {/* Allow Registrations */}
          <div className="flex items-center justify-between p-6 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-600/30 rounded-xl flex items-center justify-center text-3xl border border-green-600/50">
                👤
              </div>
              <div>
                <h4 className="font-bold text-white text-lg">Allow New Registrations</h4>
                <p className="text-slate-400 text-sm">Permit new user signups and account creation</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={config.allow_registrations}
              onChange={(value) => setConfig({...config, allow_registrations: value})}
            />
          </div>

          {/* Session Timeout */}
          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-blue-600/30 rounded-xl flex items-center justify-center text-3xl border border-blue-600/50">
                ⏱️
              </div>
              <div>
                <h4 className="font-bold text-white text-lg">Session Timeout (minutes)</h4>
                <p className="text-slate-400 text-sm">Auto-logout users after inactivity</p>
              </div>
            </div>
            <input
              type="number"
              value={config.session_timeout}
              onChange={(e) => setConfig({...config, session_timeout: parseInt(e.target.value)})}
              className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-slate-900/80 rounded-2xl border border-purple-600/30 p-8">
        <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
          <span className="text-3xl">🔐</span>
          Security Settings
        </h3>
        
        <div className="space-y-6">
          {/* Minimum Password Length */}
          <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 bg-purple-600/30 rounded-xl flex items-center justify-center text-3xl border border-purple-600/50">
                🔒
              </div>
              <div>
                <h4 className="font-bold text-white text-lg">Minimum Password Length</h4>
                <p className="text-slate-400 text-sm">Enforce password complexity requirements</p>
              </div>
            </div>
            <input
              type="number"
              value={config.min_password_length}
              onChange={(e) => setConfig({...config, min_password_length: parseInt(e.target.value)})}
              className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none"
            />
            <div className="flex items-center gap-2 mt-3">
              <span className="text-green-400">✓</span>
              <span className="text-green-400 text-sm font-medium">Secure</span>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="flex items-center justify-between p-6 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-yellow-600/30 rounded-xl flex items-center justify-center text-3xl border border-yellow-600/50">
                🔔
              </div>
              <div>
                <h4 className="font-bold text-white text-lg">Email Notifications</h4>
                <p className="text-slate-400 text-sm">Send alerts for user registrations and system events</p>
              </div>
            </div>
            <ToggleSwitch
              enabled={config.email_notifications}
              onChange={(value) => setConfig({...config, email_notifications: value})}
            />
          </div>
        </div>
      </div>

      {/* Database Management */}
      <div className="bg-slate-900/80 rounded-2xl border border-purple-600/30 p-8">
        <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
          <span className="text-3xl">🗄️</span>
          Database Management
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-blue-600/20 border-2 border-blue-600/40 rounded-xl hover:border-blue-600/60 transition cursor-pointer group">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl group-hover:scale-110 transition">💾</span>
              <h4 className="font-bold text-white text-lg">Backup Database</h4>
            </div>
            <p className="text-slate-400 text-sm mb-2">Download a complete backup of all data</p>
            <p className="text-slate-500 text-xs">Last backup: 4/20/2026, 3:48:59 PM</p>
          </div>

          <div className="p-6 bg-orange-600/20 border-2 border-orange-600/40 rounded-xl hover:border-orange-600/60 transition cursor-pointer group">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl group-hover:scale-110 transition">⚠️</span>
              <h4 className="font-bold text-white text-lg">Clear Old Logs</h4>
            </div>
            <p className="text-slate-400 text-sm mb-2">Delete activity logs older than 30 days</p>
          </div>
        </div>
      </div>

      {/* System Information */}
      <div className="bg-slate-900/80 rounded-2xl border border-purple-600/30 p-8">
        <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
          <span className="text-3xl">✅</span>
          System Information
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 bg-slate-800/50 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-sm mb-2">Platform Version</p>
            <p className="text-white font-mono font-bold text-lg">v1.0.0</p>
          </div>
          <div className="p-5 bg-slate-800/50 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-sm mb-2">Database Status</p>
            <p className="text-green-400 font-bold flex items-center gap-2 text-lg">
              <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
              Connected
            </p>
          </div>
          <div className="p-5 bg-slate-800/50 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-sm mb-2">Last Backup</p>
            <p className="text-white font-mono text-lg">4/20/2026, 3:48:59 PM</p>
          </div>
          <div className="p-5 bg-slate-800/50 rounded-xl border border-slate-700">
            <p className="text-slate-400 text-sm mb-2">Server Time</p>
            <p className="text-white font-mono text-lg">{new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-center pt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-12 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 rounded-2xl font-black text-white shadow-2xl transition transform hover:scale-105 text-lg flex items-center gap-3"
        >
          <span>💾</span>
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  )
}

function ToggleSwitch({ enabled, onChange }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`relative w-16 h-8 rounded-full transition-colors ${
        enabled ? 'bg-green-600' : 'bg-slate-600'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform ${
          enabled ? 'translate-x-8' : 'translate-x-0'
        }`}
      />
    </button>
  )
}