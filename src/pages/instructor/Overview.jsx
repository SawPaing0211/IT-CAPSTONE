import { useState, useMemo } from 'react';
import { Users, FileText, TrendingUp, AlertTriangle, Clock, Filter, ArrowUpRight, Activity } from 'lucide-react';

function InstructorOverview() {
  const [selectedBlock, setSelectedBlock] = useState('all');
  
  // Mock Data with Adamson Blocks
  const allSubmissions = [
    { id: 1, student: 'Niño, Sasan', block: '301', problem: 'Array Sorting', score: '100%', time: '2 min ago', status: 'Passed' },
    { id: 2, student: 'Kakazu, King', block: '302', problem: 'Loop Debugging', score: '85%', time: '5 min ago', status: 'Partial' },
    { id: 3, student: 'Flores, Maria', block: '301', problem: 'String Reversal', score: '0%', time: '12 min ago', status: 'Failed' },
    { id: 4, student: 'Guzman, Iverson', block: '303', problem: 'Array Sorting', score: '100%', time: '1 hr ago', status: 'Passed' },
    { id: 5, student: 'Rejano, Caleb', block: '304', problem: 'Binary Search', score: '90%', time: '2 hrs ago', status: 'Passed' },
    { id: 6, student: 'Santos, John', block: '305', problem: 'Fundamentals Quiz', score: '75%', time: '3 hrs ago', status: 'Passed' },
  ];

  // Filter submissions based on selected block
  const filteredSubmissions = useMemo(() => 
    selectedBlock === 'all' 
      ? allSubmissions 
      : allSubmissions.filter(s => s.block === selectedBlock),
    [selectedBlock, allSubmissions]
  );

  // Calculate stats based on filtered data
  const stats = useMemo(() => {
    const totalStudents = new Set(filteredSubmissions.map(s => s.student)).size * 2; // Mock multiplier
    const pendingCount = filteredSubmissions.filter(s => s.status === 'Partial').length;
    const avgScore = filteredSubmissions.length > 0 
      ? Math.round(filteredSubmissions.reduce((sum, s) => sum + parseInt(s.score), 0) / filteredSubmissions.length)
      : 0;
    const plagiarismFlags = selectedBlock === 'all' ? 3 : Math.floor(Math.random() * 2); // Mock logic

    return [
      { title: 'Total Students', value: totalStudents.toString(), change: '+5 this week', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: 'up' },
      { title: 'Pending Submissions', value: pendingCount.toString(), change: 'Needs grading', icon: FileText, color: 'text-yellow-500', bg: 'bg-yellow-500/10', trend: 'neutral' },
      { title: 'Avg Class Score', value: `${avgScore}%`, change: '+2% vs last week', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10', trend: 'up' },
      { title: 'Plagiarism Flags', value: plagiarismFlags.toString(), change: 'Requires review', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10', trend: 'down' },
    ];
  }, [filteredSubmissions, selectedBlock]);

  const blocks = ['all', '301', '302', '303', '304', '305', '306', '307'];

  return (
    <div className="space-y-8">
      
      {/* Header with Filter - Styled to match layout header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#eab308]/10 rounded-lg">
            <Clock size={20} className="text-[#eab308]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Overview Dashboard</h2>
            <p className="text-gray-400 text-sm">Monitor class performance and student activity</p>
          </div>
        </div>
        
        {/* Block Filter - Now local to this page */}
        <div className="flex items-center gap-2 bg-[#1e293b] p-1.5 rounded-lg border border-gray-700">
          <Filter size={16} className="text-gray-400" />
          <select 
            value={selectedBlock}
            onChange={(e) => setSelectedBlock(e.target.value)}
            className="bg-transparent text-sm text-white focus:outline-none cursor-pointer"
          >
            {blocks.map(b => (
              <option key={b} value={b} className="bg-[#0b1120]">
                {b === 'all' ? 'All Blocks' : `Block ${b}`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Enhanced Stats Grid - Updates based on filter */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-6 rounded-xl border border-gray-700 hover:border-gray-600 transition group">
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-lg ${stat.bg} group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} className={stat.color} />
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className={`${stat.trend === 'up' ? 'text-green-400' : stat.trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
                  {stat.change}
                </span>
                {stat.trend === 'up' && <ArrowUpRight size={12} className="text-green-400" />}
              </div>
            </div>
            <h3 className="text-gray-400 text-sm font-medium mb-1">{stat.title}</h3>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold text-white">{stat.value}</p>
              {stat.trend === 'up' && <Activity size={16} className="text-green-500" />}
            </div>
          </div>
        ))}
      </div>
      
      {/* Recent Submissions - NO duplicate filter, uses local state */}
      <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#eab308]/10 rounded-lg">
              <Clock size={20} className="text-[#eab308]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Recent Submissions</h2>
              <p className="text-gray-400 text-sm">
                {selectedBlock === 'all' 
                  ? 'Latest student activity across all blocks' 
                  : `Latest student activity for Block ${selectedBlock}`}
              </p>
            </div>
          </div>
          
          <div className="text-sm text-gray-400">
            Showing {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#0f172a]/50 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Student</th>
                <th className="p-4 font-semibold">Block</th>
                <th className="p-4 font-semibold">Problem</th>
                <th className="p-4 font-semibold">Score</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-[#2a3850]/50 transition group">
                    <td className="p-4 font-medium text-white group-hover:text-[#eab308] transition-colors">{sub.student}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-[#0f172a] border border-gray-700 rounded text-xs text-white">
                        Block {sub.block}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300 font-medium">{sub.problem}</td>
                    <td className="p-4 font-bold text-white">{sub.score}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        sub.status === 'Passed' ? 'bg-green-500/10 text-green-500' :
                        sub.status === 'Partial' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-400 text-sm">{sub.time}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500">
                    No submissions found for {selectedBlock === 'all' ? 'any block' : `Block ${selectedBlock}`}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default InstructorOverview;