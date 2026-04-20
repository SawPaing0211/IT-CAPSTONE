import { useState, useEffect } from 'react';
import { 
  Activity, Shield, UserPlus, UserMinus, UserCheck, Database, AlertCircle, 
  Search, Filter, Download, Trash2, ChevronLeft, ChevronRight, Clock, MapPin 
} from 'lucide-react';

function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/activity', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else {
        console.error('Failed to fetch logs:', response.statusText);
      }
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    if (action.includes('CREATE_USER')) return <UserPlus size={18} className="text-green-400" />;
    if (action.includes('UPDATE_USER')) return <UserCheck size={18} className="text-blue-400" />;
    if (action.includes('DELETE_USER')) return <UserMinus size={18} className="text-red-400" />;
    if (action.includes('BLOCK')) return <Database size={18} className="text-purple-400" />;
    if (action.includes('SETTINGS')) return <Shield size={18} className="text-yellow-400" />;
    return <Activity size={18} className="text-slate-400" />;
  };

  const getActionBadgeColor = (action) => {
    if (action.includes('CREATE')) return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (action.includes('UPDATE')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (action.includes('DELETE')) return 'bg-red-500/10 text-red-400 border-red-500/20';
    if (action.includes('BLOCK')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (action.includes('SETTINGS')) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.action.toLowerCase().includes(filter.toLowerCase());
    const matchesSearch = searchTerm === '' || 
      log.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip_address?.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  const exportToCSV = () => {
    const headers = ['ID', 'User', 'Action', 'Details', 'IP Address', 'Timestamp'];
    const csvData = filteredLogs.map(log => [
      log.id,
      log.name || 'Unknown',
      log.action,
      log.details || '',
      log.ip_address || '',
      new Date(log.created_at).toLocaleString()
    ]);

    const csvContent = [headers, ...csvData].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const clearOldLogs = async () => {
    if (!confirm('Are you sure you want to delete logs older than 30 days? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/settings/clear-logs', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert('Old logs cleared successfully!');
        fetchLogs(); // Refresh the list
      } else {
        alert('Failed to clear logs. Please try again.');
      }
    } catch (err) {
      console.error('Error clearing logs:', err);
      alert('An error occurred while clearing logs.');
    }
  };

  return (
    <div className="p-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Activity className="text-purple-400" size={32} />
              Activity Logs
            </h1>
            <p className="text-slate-400">Comprehensive audit trail of all administrative actions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700"
            >
              <Download size={18} />
              Export CSV
            </button>
            <button
              onClick={clearOldLogs}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors border border-red-600/30"
            >
              <Trash2 size={18} />
              Clear Old Logs
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Actions</p>
                <p className="text-2xl font-bold text-white">{logs.length}</p>
              </div>
              <Activity className="text-purple-400" size={24} />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Today</p>
                <p className="text-2xl font-bold text-white">
                  {logs.filter(log => {
                    const today = new Date().toDateString();
                    return new Date(log.created_at).toDateString() === today;
                  }).length}
                </p>
              </div>
              <Clock className="text-blue-400" size={24} />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Unique Users</p>
                <p className="text-2xl font-bold text-white">
                  {new Set(logs.map(log => log.user_id)).size}
                </p>
              </div>
              <UserCheck className="text-green-400" size={24} />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Last Activity</p>
                <p className="text-lg font-bold text-white">
                  {logs.length > 0 ? formatTimeAgo(logs[0].created_at) : 'Never'}
                </p>
              </div>
              <Shield className="text-yellow-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by user, action, details, or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:border-purple-500 outline-none transition-colors"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-purple-500 outline-none transition-colors min-w-[200px]"
          >
            <option value="all">All Actions</option>
            <option value="USER">User Management</option>
            <option value="BLOCK">Block Management</option>
            <option value="CREATE">Create Actions</option>
            <option value="UPDATE">Update Actions</option>
            <option value="DELETE">Delete Actions</option>
            <option value="SETTINGS">System Settings</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
        <span>Showing {paginatedLogs.length} of {filteredLogs.length} results</span>
        {filteredLogs.length > 0 && (
          <span>Page {currentPage} of {totalPages}</span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading activity logs...</p>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
          <Activity size={64} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Activity Found</h3>
          <p className="text-slate-400 mb-4">
            {searchTerm || filter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Admin actions will appear here once they occur'}
          </p>
          {(searchTerm || filter !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setFilter('all'); }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Logs Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-800/50 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Action
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-800 rounded-lg">
                            {getActionIcon(log.action)}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getActionBadgeColor(log.action)}`}>
                            {log.action}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{log.name || 'Unknown Admin'}</div>
                        <div className="text-xs text-slate-500">ID: {log.user_id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-300 max-w-md truncate" title={log.details}>
                          {log.details || 'No details provided'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {log.ip_address ? (
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <MapPin size={14} className="text-slate-500" />
                            {log.ip_address}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-300">{formatTimeAgo(log.created_at)}</div>
                        <div className="text-xs text-slate-500">
                          {new Date(log.created_at).toLocaleDateString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredLogs.length)} of {filteredLogs.length} entries
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-lg transition-colors border border-slate-700 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>
                
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-purple-600 text-white'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 text-white rounded-lg transition-colors border border-slate-700 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdminLogs;