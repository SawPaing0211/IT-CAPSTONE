import { useState } from 'react';
import { 
  Users, 
  ShieldCheck, 
  BookOpen, 
  Activity, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  Database
} from 'lucide-react';

function AdminOverview() {
  // Mock Data
  const stats = [
    { title: 'Total Students', value: '482', change: '+12 this week', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Instructors', value: '18', change: '+2 this month', icon: ShieldCheck, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { title: 'Active Courses', value: '9', change: '3 archived', icon: BookOpen, color: 'text-green-500', bg: 'bg-green-500/10' },
    { title: 'System Health', value: '99.8%', change: 'Operational', icon: Activity, color: 'text-[#eab308]', bg: 'bg-[#eab308]/10' },
  ];

  const activityLog = [
    { event: 'New student registered', actor: 'Niño, Sasan', time: '2 min ago', type: 'success' },
    { event: 'User suspended', actor: 'Admin Rejano', time: '10 min ago', type: 'warning' },
    { event: 'Course updated', actor: 'Doc. Leonard Alejandro', time: '1 hr ago', type: 'info' },
    { event: 'System backup completed', actor: 'System', time: '6 hr ago', type: 'success' },
    { event: 'New problem published', actor: 'Prof. Louise Sasan', time: '2 hrs ago', type: 'info' },
  ];

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-[#1e293b] p-6 rounded-xl border border-gray-700 hover:border-gray-600 transition">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon size={24} className={stat.color} />
              </div>
              {stat.change.includes('+') || stat.change.includes('Operational') ? (
                <span className="text-xs text-green-400 font-medium bg-green-400/10 px-2 py-1 rounded">{stat.change}</span>
              ) : (
                <span className="text-xs text-gray-400">{stat.change}</span>
              )}
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">{stat.title}</h3>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Activity Log */}
      <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Clock size={20} className="text-[#eab308]" />
          System Activity Log
        </h2>
        
        <div className="space-y-4">
          {activityLog.map((log, idx) => (
            <div key={idx} className="flex items-start gap-4 pb-4 border-b border-gray-800 last:border-0 last:pb-0">
              <div className={`mt-1 p-1 rounded-full ${
                log.type === 'success' ? 'bg-green-500/10 text-green-500' :
                log.type === 'warning' ? 'bg-red-500/10 text-red-500' :
                'bg-blue-500/10 text-blue-500'
              }`}>
                {log.type === 'success' ? <CheckCircle2 size={16} /> :
                 log.type === 'warning' ? <AlertCircle size={16} /> :
                 <Database size={16} />}
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">{log.event}</p>
                <p className="text-gray-500 text-sm">By {log.actor}</p>
              </div>
              <span className="text-gray-500 text-xs whitespace-nowrap">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminOverview;