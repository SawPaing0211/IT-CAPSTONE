import { useState } from 'react';
import { 
  Search, 
  Download, 
  Filter, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  Terminal, 
  ShieldAlert,
  Server,
  Database,
  Clock
} from 'lucide-react';

function AdminLogs() {
  // Mock Data - Technical System Events
  const [logs, setLogs] = useState([
    { id: 1, timestamp: '2026-04-15 17:52:03', type: 'info', category: 'Docker', message: 'Container executed successfully for submission #9821', details: 'Python3.9 | 0.4s | 45MB', user: 'System' },
    { id: 2, timestamp: '2026-04-15 17:48:15', type: 'error', category: 'API', message: 'Database connection timeout', details: 'Retry attempt 3/3 failed', user: 'System' },
    { id: 3, timestamp: '2026-04-15 17:45:00', type: 'success', category: 'Backup', message: 'Daily database backup completed', details: 'Size: 1.2GB | Duration: 4m 12s', user: 'System' },
    { id: 4, timestamp: '2026-04-15 17:30:22', type: 'warning', category: 'Security', message: 'Multiple failed login attempts detected', details: 'IP: 192.168.1.105 | Count: 5', user: 'Niño, Sasan' },
    { id: 5, timestamp: '2026-04-15 17:15:10', type: 'info', category: 'User', message: 'New user registered', details: 'Role: Student | Section: BSIT-2A', user: 'Kakazu, King' },
    { id: 6, timestamp: '2026-04-15 16:55:33', type: 'error', category: 'Execution', message: 'Code execution time limit exceeded', details: 'Submission #9815 | Limit: 10s | Actual: 12.3s', user: 'Guzman, Iverson' },
    { id: 7, timestamp: '2026-04-15 16:40:00', type: 'info', category: 'System', message: 'Server health check passed', details: 'CPU: 24% | RAM: 68% | Disk: 45%', user: 'System' },
    { id: 8, timestamp: '2026-04-15 16:20:18', type: 'warning', category: 'Plagiarism', message: 'High similarity detected', details: 'Submissions #9801 & #9802 | 87% match', user: 'System' },
    { id: 9, timestamp: '2026-04-15 15:55:42', type: 'success', category: 'Deployment', message: 'New frontend version deployed', details: 'Version: v1.2.4 | Build: #442', user: 'Admin Rejano' },
    { id: 10, timestamp: '2026-04-15 15:30:00', type: 'info', category: 'Docker', message: 'Container cleanup completed', details: 'Removed 15 stopped containers', user: 'System' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Filter logic
  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || log.type === filterType;
    const matchesCategory = filterCategory === 'all' || log.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  // Helper for icon/color based on type
  const getTypeConfig = (type) => {
    switch(type) {
      case 'success': return { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' };
      case 'error': return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' };
      case 'warning': return { icon: ShieldAlert, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
      default: return { icon: Info, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
    }
  };

  const handleExport = () => {
    alert('Exporting logs to CSV... (Mock action)');
    // Later: Convert filteredLogs to CSV and trigger download
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">System Activity Logs</h2>
          <p className="text-gray-400 text-sm">Monitor system events, errors, and security alerts</p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] hover:bg-[#2a3850] border border-gray-700 rounded-lg text-sm font-medium transition"
        >
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[#1e293b] p-4 rounded-xl border border-gray-700 flex flex-col md:flex-row gap-4 items-center">
        
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search logs..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0f172a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#eab308] transition"
          />
        </div>

        {/* Type Filter */}
        <select 
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#eab308] min-w-[140px]"
        >
          <option value="all">All Types</option>
          <option value="success">Success</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>

        {/* Category Filter */}
        <select 
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#eab308] min-w-[140px]"
        >
          <option value="all">All Categories</option>
          <option value="Docker">Docker</option>
          <option value="API">API</option>
          <option value="Backup">Backup</option>
          <option value="Security">Security</option>
          <option value="User">User</option>
          <option value="Execution">Execution</option>
          <option value="System">System</option>
          <option value="Plagiarism">Plagiarism</option>
          <option value="Deployment">Deployment</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f172a] border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Time</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Message</th>
                <th className="p-4 font-semibold hidden lg:table-cell">Details</th>
                <th className="p-4 font-semibold hidden md:table-cell">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const config = getTypeConfig(log.type);
                  const Icon = config.icon;
                  
                  return (
                    <tr key={log.id} className="hover:bg-[#2a3850]/50 transition text-sm">
                      <td className="p-4 text-gray-400 whitespace-nowrap font-mono text-xs">
                        {log.timestamp}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${config.bg} ${config.color} ${config.border}`}>
                          <Icon size={12} />
                          {log.type.charAt(0).toUpperCase() + log.type.slice(1)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-300 bg-[#0f172a] px-2 py-1 rounded border border-gray-700 text-xs">
                          {log.category}
                        </span>
                      </td>
                      <td className="p-4 text-white font-medium max-w-xs truncate" title={log.message}>
                        {log.message}
                      </td>
                      <td className="p-4 text-gray-400 text-xs hidden lg:table-cell max-w-xs truncate" title={log.details}>
                        {log.details}
                      </td>
                      <td className="p-4 text-gray-400 text-xs hidden md:table-cell">
                        {log.user}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
                    No logs found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="flex justify-between items-center text-sm text-gray-400">
        <span>Showing {filteredLogs.length} of {logs.length} logs</span>
        <div className="flex items-center gap-2">
          <Clock size={14} />
          <span>Last updated: Just now</span>
        </div>
      </div>

    </div>
  );
}

export default AdminLogs;