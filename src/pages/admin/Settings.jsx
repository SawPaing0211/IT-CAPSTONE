import { useState } from 'react';
import { 
  Save, 
  Code, 
  Clock, 
  Shield, 
  Bell, 
  CheckCircle2
} from 'lucide-react';

function AdminSettings() {
  // Mock State for Settings
  const [settings, setSettings] = useState({
    languages: { python: true, java: true, csharp: true },
    execution: { timeout: 10, memory: 256 },
    plagiarism: { threshold: 70, aiEnabled: true },
    submissions: { maxPerDay: 50, allowLate: false },
    grading: { autoGrade: true, showTestCases: true },
    notifications: { emailAlerts: true, systemMaintenance: true }
  });

  const [saveStatus, setSaveStatus] = useState('idle'); 

  const handleToggle = (section, key) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: !prev[section][key]
      }
    }));
  };

  const handleNumberChange = (section, key, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: parseInt(value) || 0
      }
    }));
  };

  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">System Configuration</h2>
          <p className="text-gray-400 text-sm">Manage global settings and execution limits</p>
        </div>
        
        <button 
          onClick={handleSave}
          disabled={saveStatus === 'saving'}
          className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition ${
            saveStatus === 'success' 
              ? 'bg-green-600 text-white' 
              : 'bg-[#eab308] hover:bg-yellow-500 text-black'
          }`}
        >
          {saveStatus === 'saving' ? (
            <>Saving...</>
          ) : saveStatus === 'success' ? (
            <><CheckCircle2 size={18} /> Saved!</>
          ) : (
            <><Save size={18} /> Save Changes</>
          )}
        </button>
      </div>

      {/* Settings Sections - REMOVED max-w-4xl to let Layout handle centering */}
      <div className="space-y-6">
        
        {/* 1. Programming Languages */}
        <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg"><Code className="text-blue-500" size={20} /></div>
            <h3 className="text-lg font-bold text-white">Supported Languages</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(settings.languages).map(([lang, enabled]) => (
              <label key={lang} className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition ${enabled ? 'bg-blue-500/5 border-blue-500/50' : 'bg-[#0f172a] border-gray-700 opacity-60'}`}>
                <span className="font-medium capitalize text-white">{lang === 'csharp' ? 'C#' : lang}</span>
                <input 
                  type="checkbox" 
                  checked={enabled} 
                  onChange={() => handleToggle('languages', lang)}
                  className="w-5 h-5 accent-blue-500" 
                />
              </label>
            ))}
          </div>
        </div>

        {/* 2. Execution Limits */}
        <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-500/10 rounded-lg"><Clock className="text-purple-500" size={20} /></div>
            <h3 className="text-lg font-bold text-white">Execution Limits (Docker Sandbox)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Time Limit (seconds)</label>
              <input 
                type="number" 
                value={settings.execution.timeout}
                onChange={(e) => handleNumberChange('execution', 'timeout', e.target.value)}
                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#eab308] focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Max time allowed for code execution before timeout.</p>
            </div>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Memory Limit (MB)</label>
              <input 
                type="number" 
                value={settings.execution.memory}
                onChange={(e) => handleNumberChange('execution', 'memory', e.target.value)}
                className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-[#eab308] focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Max RAM allocated per container.</p>
            </div>
          </div>
        </div>

        {/* 3. Plagiarism & AI */}
        <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-red-500/10 rounded-lg"><Shield className="text-red-500" size={20} /></div>
            <h3 className="text-lg font-bold text-white">Plagiarism Detection (AI)</h3>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-[#0f172a] rounded-lg border border-gray-700">
              <div>
                <p className="font-medium text-white">Enable AI Plagiarism Checking</p>
                <p className="text-xs text-gray-500">Use advanced algorithms to detect code similarity.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.plagiarism.aiEnabled}
                  onChange={() => handleToggle('plagiarism', 'aiEnabled')}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#eab308]"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Similarity Threshold (%)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="50" 
                  max="95" 
                  value={settings.plagiarism.threshold}
                  onChange={(e) => handleNumberChange('plagiarism', 'threshold', e.target.value)}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#eab308]"
                />
                <span className="text-xl font-bold text-white w-12 text-right">{settings.plagiarism.threshold}%</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Flag submissions with similarity above this percentage.</p>
            </div>
          </div>
        </div>

        {/* 4. Notifications */}
        <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg"><Bell className="text-green-500" size={20} /></div>
            <h3 className="text-lg font-bold text-white">Notifications</h3>
          </div>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg border border-gray-700 cursor-pointer hover:border-gray-600">
              <span className="text-white">Email Alerts for Critical Errors</span>
              <input 
                type="checkbox" 
                checked={settings.notifications.emailAlerts}
                onChange={() => handleToggle('notifications', 'emailAlerts')}
                className="w-5 h-5 accent-green-500" 
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-[#0f172a] rounded-lg border border-gray-700 cursor-pointer hover:border-gray-600">
              <span className="text-white">System Maintenance Notices</span>
              <input 
                type="checkbox" 
                checked={settings.notifications.systemMaintenance}
                onChange={() => handleToggle('notifications', 'systemMaintenance')}
                className="w-5 h-5 accent-green-500" 
              />
            </label>
          </div>
        </div>

      </div>
    </div>
  );
}

export default AdminSettings;