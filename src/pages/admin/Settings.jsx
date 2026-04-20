import { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, Database, Shield, Bell, 
  Save, AlertTriangle, CheckCircle, Lock, Clock, Users 
} from 'lucide-react';

function AdminSettings() {
  const [settings, setSettings] = useState({
    maintenance_mode: false,
    session_timeout: 60,
    allow_registration: true,
    password_min_length: 8,
    email_notifications: true,
    last_backup: null
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load settings from database
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/settings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });
      
      if (response.ok) {
        alert('✅ Settings saved successfully!');
      } else {
        alert('❌ Failed to save settings');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('❌ Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  const handleBackup = async () => {
    if (!confirm('Create a database backup now?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/settings/backup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings({...settings, last_backup: data.timestamp});
        alert('✅ Backup created successfully!');
      }
    } catch (err) {
      console.error('Error creating backup:', err);
      alert('❌ Failed to create backup');
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('⚠️ Delete all activity logs older than 30 days?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/settings/clear-logs', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`✅ ${data.deleted_count} old logs cleared!`);
      }
    } catch (err) {
      console.error('Error clearing logs:', err);
      alert('❌ Failed to clear logs');
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header - Centered */}
      <div className="max-w-4xl mx-auto mb-8 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-purple-500/10 rounded-2xl mb-4">
          <SettingsIcon className="text-purple-400" size={32} />
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">System Settings</h1>
        <p className="text-slate-400 text-lg">Configure system-wide settings and preferences</p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* System Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Database className="text-blue-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">System Configuration</h2>
          </div>
          
          <div className="space-y-4">
            {/* Maintenance Mode */}
            <div className="flex items-center justify-between p-5 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition border border-slate-800">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <AlertTriangle size={20} className="text-orange-400" />
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">Maintenance Mode</p>
                  <p className="text-sm text-slate-400">Temporarily disable all student and instructor access</p>
                </div>
              </div>
              <button
                onClick={() => setSettings({...settings, maintenance_mode: !settings.maintenance_mode})}
                className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
                  settings.maintenance_mode 
                    ? 'bg-red-500/20 text-red-400 border-2 border-red-500/50 shadow-lg shadow-red-500/20' 
                    : 'bg-green-500/20 text-green-400 border-2 border-green-500/50'
                }`}
              >
                {settings.maintenance_mode ? '⚠️ Enabled' : '✅ Disabled'}
              </button>
            </div>

            {/* Allow Registrations */}
            <div className="flex items-center justify-between p-5 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition border border-slate-800">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Users size={20} className="text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">Allow New Registrations</p>
                  <p className="text-sm text-slate-400">Permit new user signups and account creation</p>
                </div>
              </div>
              <button
                onClick={() => setSettings({...settings, allow_registration: !settings.allow_registration})}
                className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
                  settings.allow_registration 
                    ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50' 
                    : 'bg-red-500/20 text-red-400 border-2 border-red-500/50'
                }`}
              >
                {settings.allow_registration ? '✅ Enabled' : '❌ Disabled'}
              </button>
            </div>

            {/* Session Timeout */}
            <div className="p-5 bg-slate-800/30 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <Clock size={20} className="text-blue-400" />
                <label className="block text-sm font-semibold text-slate-300">
                  Session Timeout (minutes)
                </label>
              </div>
              <p className="text-sm text-slate-400 mb-4 ml-8">Auto-logout users after inactivity</p>
              <div className="max-w-xs ml-8">
                <input
                  type="number"
                  value={settings.session_timeout}
                  onChange={(e) => setSettings({...settings, session_timeout: parseInt(e.target.value)})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition"
                  min="5"
                  max="240"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Shield className="text-green-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Security Settings</h2>
          </div>
          
          <div className="space-y-4">
            {/* Password Length */}
            <div className="p-5 bg-slate-800/30 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3 mb-3">
                <Lock size={20} className="text-green-400" />
                <label className="block text-sm font-semibold text-slate-300">
                  Minimum Password Length
                </label>
              </div>
              <p className="text-sm text-slate-400 mb-4 ml-8">Enforce password complexity requirements</p>
              <div className="max-w-xs ml-8">
                <input
                  type="number"
                  value={settings.password_min_length}
                  onChange={(e) => setSettings({...settings, password_min_length: parseInt(e.target.value)})}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition"
                  min="6"
                  max="20"
                />
                <div className="flex gap-2 mt-2 text-xs text-slate-500">
                  <span className={settings.password_min_length >= 8 ? 'text-green-400' : 'text-orange-400'}>
                    {settings.password_min_length < 8 ? '⚠️ Recommended: 8+' : '✅ Secure'}
                  </span>
                </div>
              </div>
            </div>

            {/* Email Notifications */}
            <div className="flex items-center justify-between p-5 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition border border-slate-800">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <Bell size={20} className="text-yellow-400" />
                </div>
                <div>
                  <p className="font-semibold text-white mb-1">Email Notifications</p>
                  <p className="text-sm text-slate-400">Send alerts for user registrations and system events</p>
                </div>
              </div>
              <button
                onClick={() => setSettings({...settings, email_notifications: !settings.email_notifications})}
                className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
                  settings.email_notifications 
                    ? 'bg-green-500/20 text-green-400 border-2 border-green-500/50' 
                    : 'bg-slate-700 text-slate-400 border-2 border-slate-600'
                }`}
              >
                {settings.email_notifications ? '🔔 On' : '🔕 Off'}
              </button>
            </div>
          </div>
        </div>

        {/* Database Management */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Database className="text-purple-400" size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Database Management</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={handleBackup}
              className="p-5 bg-blue-600/10 hover:bg-blue-600/20 border-2 border-blue-500/30 rounded-xl transition-all group text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <Database size={24} className="text-blue-400 group-hover:scale-110 transition" />
                <span className="font-bold text-white text-lg">Backup Database</span>
              </div>
              <p className="text-sm text-slate-400">Download a complete backup of all data</p>
              {settings.last_backup && (
                <p className="text-xs text-slate-500 mt-2">
                  Last backup: {new Date(settings.last_backup).toLocaleString()}
                </p>
              )}
            </button>
            
            <button 
              onClick={handleClearLogs}
              className="p-5 bg-slate-700/30 hover:bg-slate-700/50 border-2 border-slate-600/50 rounded-xl transition-all group text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle size={24} className="text-orange-400 group-hover:scale-110 transition" />
                <span className="font-bold text-white text-lg">Clear Old Logs</span>
              </div>
              <p className="text-sm text-slate-400">Delete activity logs older than 30 days</p>
            </button>
          </div>
        </div>

        {/* System Information */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="text-green-400" size={20} />
            System Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-950/50 rounded-xl">
              <p className="text-sm text-slate-400 mb-1">Platform Version</p>
              <p className="text-lg font-bold text-white font-mono">v1.0.0</p>
            </div>
            <div className="p-4 bg-slate-950/50 rounded-xl">
              <p className="text-sm text-slate-400 mb-1">Database Status</p>
              <p className="text-lg font-bold text-green-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Connected
              </p>
            </div>
            <div className="p-4 bg-slate-950/50 rounded-xl">
              <p className="text-sm text-slate-400 mb-1">Last Backup</p>
              <p className="text-lg font-bold text-white">
                {settings.last_backup ? new Date(settings.last_backup).toLocaleString() : 'Never'}
              </p>
            </div>
            <div className="p-4 bg-slate-950/50 rounded-xl">
              <p className="text-sm text-slate-400 mb-1">Server Time</p>
              <p className="text-lg font-bold text-white font-mono">{new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Save Button - Centered & Prominent */}
        <div className="flex justify-center pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-12 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl font-bold text-lg transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105"
          >
            {saving ? (
              <>
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save size={24} />
                Save All Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminSettings;