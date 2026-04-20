import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 IMPORTED FOR NAVIGATION
import { 
  Users, BookOpen, TrendingUp, Activity, Clock, Calendar, AlertCircle, 
  CheckCircle, XCircle, ArrowUpRight, ArrowDownRight, RefreshCw, Settings,
  UserPlus, BookOpen as BookIcon, BarChart3, Shield, Database, Server
} from 'lucide-react';

function AdminOverview() {
  const navigate = useNavigate(); //  INITIALIZED
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    database: 'connected',
    health: 'operational',
    lastBackup: 'Today'
  });

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentActivity(data.recent_activity || []);
        
        // Update system status based on real data if available, otherwise defaults
        setSystemStatus({
          database: 'connected',
          health: 'operational',
          lastBackup: data.last_backup || formatDate(new Date())
        });
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  // 👈 NEW: Handle Backup Function
  const handleBackup = async () => {
    if (!confirm("Are you sure you want to trigger a database backup?")) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/settings/backup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        alert("✅ Backup created successfully!");
        setSystemStatus(prev => ({ ...prev, lastBackup: 'Just Now' }));
        fetchDashboard(); // Refresh dashboard data
      } else {
        alert("❌ Failed to create backup.");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Network error during backup.");
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getActionIcon = (action) => {
    if (action.includes('CREATE')) return <UserPlus size={16} className="text-green-400" />;
    if (action.includes('UPDATE')) return <Settings size={16} className="text-blue-400" />;
    if (action.includes('DELETE')) return <XCircle size={16} className="text-red-400" />;
    return <Activity size={16} className="text-slate-400" />;
  };

  const getActionColor = (action) => {
    if (action.includes('CREATE')) return 'bg-green-500/10 text-green-400 border-green-500/20';
    if (action.includes('UPDATE')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (action.includes('DELETE')) return 'bg-red-500/10 text-red-400 border-red-500/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    { 
      title: 'Total Students', 
      value: stats?.total_students || 0, 
      icon: Users, 
      color: 'blue',
      description: 'Active student accounts',
      trend: '+12%',
      trendUp: true
    },
    { 
      title: 'Total Instructors', 
      value: stats?.total_instructors || 0, 
      icon: BookOpen, 
      color: 'green',
      description: 'Active instructor accounts',
      trend: '+5%',
      trendUp: true
    },
    { 
      title: 'Total Blocks', 
      value: stats?.total_blocks || 0, 
      icon: BookIcon, 
      color: 'purple',
      description: 'Class sections',
      trend: '+8%',
      trendUp: true
    },
    { 
      title: 'Active Sessions', 
      value: '24', 
      icon: Activity, 
      color: 'yellow',
      description: 'Current active users',
      trend: '-3%',
      trendUp: false
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Shield className="text-purple-400" size={32} />
              Admin Dashboard
            </h1>
            <p className="text-slate-400">System overview and user management</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 text-white rounded-lg transition-colors border border-slate-700 disabled:cursor-not-allowed"
          >
            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Today's Logins</p>
                <p className="text-2xl font-bold text-white">156</p>
              </div>
              <ArrowUpRight className="text-green-400" size={24} />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Submissions</p>
                <p className="text-2xl font-bold text-white">89</p>
              </div>
              <BarChart3 className="text-blue-400" size={24} />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Avg Response</p>
                <p className="text-2xl font-bold text-white">2.3s</p>
              </div>
              <Clock className="text-yellow-400" size={24} />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Success Rate</p>
                <p className="text-2xl font-bold text-white">98%</p>
              </div>
              <CheckCircle className="text-green-400" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-purple-500/30 transition-all duration-200 group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 bg-${stat.color}-500/10 rounded-lg group-hover:bg-${stat.color}-500/20 transition`}>
                <stat.icon size={24} className={`text-${stat.color}-400`} />
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium ${
                stat.trendUp ? 'text-green-400' : 'text-red-400'
              }`}>
                {stat.trendUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {stat.trend}
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
            <p className="text-slate-400 text-sm mb-1">{stat.title}</p>
            <p className="text-slate-500 text-xs">{stat.description}</p>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Actions - NOW INTERACTIVE */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Quick Actions</h3>
              <Settings size={20} className="text-slate-400" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Navigate to Users */}
              <button 
                onClick={() => navigate('/admin/users')}
                className="flex items-center gap-3 p-4 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 rounded-lg transition-all duration-200 group cursor-pointer"
              >
                <div className="p-2 bg-blue-600/20 rounded-lg group-hover:bg-blue-600/30 transition">
                  <UserPlus size={20} className="text-blue-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">Create New User</p>
                  <p className="text-sm text-slate-400">Add students or instructors</p>
                </div>
              </button>
              
              {/* Navigate to Blocks */}
              <button 
                onClick={() => navigate('/admin/blocks')}
                className="flex items-center gap-3 p-4 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-600/30 rounded-lg transition-all duration-200 group cursor-pointer"
              >
                <div className="p-2 bg-purple-600/20 rounded-lg group-hover:bg-purple-600/30 transition">
                  <BookIcon size={20} className="text-purple-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">Create New Block</p>
                  <p className="text-sm text-slate-400">Set up class sections</p>
                </div>
              </button>

              {/* Trigger Backup API */}
              <button 
                onClick={handleBackup}
                className="flex items-center gap-3 p-4 bg-green-600/10 hover:bg-green-600/20 border border-green-600/30 rounded-lg transition-all duration-200 group cursor-pointer"
              >
                <div className="p-2 bg-green-600/20 rounded-lg group-hover:bg-green-600/30 transition">
                  <Database size={20} className="text-green-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">Backup Database</p>
                  <p className="text-sm text-slate-400">Create system backup</p>
                </div>
              </button>

              {/* Navigate to Settings */}
              <button 
                onClick={() => navigate('/admin/settings')}
                className="flex items-center gap-3 p-4 bg-yellow-600/10 hover:bg-yellow-600/20 border border-yellow-600/30 rounded-lg transition-all duration-200 group cursor-pointer"
              >
                <div className="p-2 bg-yellow-600/20 rounded-lg group-hover:bg-yellow-600/30 transition">
                  <Server size={20} className="text-yellow-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">System Settings</p>
                  <p className="text-sm text-slate-400">Configure system options</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* System Status */}
        <div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">System Status</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm text-green-400">Healthy</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Database size={18} className="text-green-400" />
                  <span className="text-sm text-slate-300">Database</span>
                </div>
                <span className="text-sm text-green-400 font-medium">Connected</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Server size={18} className="text-blue-400" />
                  <span className="text-sm text-slate-300">API Server</span>
                </div>
                <span className="text-sm text-green-400 font-medium">Operational</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Clock size={18} className="text-yellow-400" />
                  <span className="text-sm text-slate-300">Last Backup</span>
                </div>
                <span className="text-sm text-slate-300">{systemStatus.lastBackup}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity size={18} className="text-purple-400" />
                  <span className="text-sm text-slate-300">Uptime</span>
                </div>
                <span className="text-sm text-slate-300">99.9%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white">Recent Activity</h3>
          <Calendar size={20} className="text-slate-400" />
        </div>
        
        {recentActivity.length === 0 ? (
          <div className="text-center py-12">
            <Activity size={48} className="mx-auto text-slate-600 mb-4" />
            <p className="text-slate-400">No recent activity recorded</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.slice(0, 5).map((activity, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition">
                <div className="p-2 bg-slate-800 rounded-lg">
                  {getActionIcon(activity.action)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-white">{activity.name || 'Unknown'}</span>
                    <span className={`px-2 py-1 rounded text-xs font-semibold border ${getActionColor(activity.action)}`}>
                      {activity.action}
                    </span>
                    <span className="text-xs text-slate-500">{formatTimeAgo(activity.created_at)}</span>
                  </div>
                  <p className="text-sm text-slate-400">
                    {activity.details || `Performed ${activity.action.toLowerCase()}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminOverview;