import { useState } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Users, 
  Calendar,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Trophy,
  BrainCircuit,
  Clock,
  ChevronDown,
  HelpCircle,
  Zap
} from 'lucide-react';

function InstructorAnalytics() {
  const [selectedBlock, setSelectedBlock] = useState('all');
  const [compareBlock, setCompareBlock] = useState('none');
  const [timeRange, setTimeRange] = useState('month');
  const [showTooltips, setShowTooltips] = useState(true);
  const [exportFormat, setExportFormat] = useState('pdf');

  // Mock Data
  const performanceData = [
    { date: 'Week 1', avgScore: 65, submissions: 45, block301: 68, block302: 62 },
    { date: 'Week 2', avgScore: 72, submissions: 52, block301: 75, block302: 69 },
    { date: 'Week 3', avgScore: 68, submissions: 48, block301: 70, block302: 66 },
    { date: 'Week 4', avgScore: 75, submissions: 58, block301: 78, block302: 72 },
    { date: 'Week 5', avgScore: 78, submissions: 62, block301: 82, block302: 74 },
    { date: 'Week 6', avgScore: 82, submissions: 65, block301: 85, block302: 79 },
  ];

  const topStudents = [
    { rank: 1, name: 'Niño, Sasan', block: '301', avgScore: 96, trend: 'up', badge: '🏆 Top Performer' },
    { rank: 2, name: 'Guzman, Iverson', block: '303', avgScore: 94, trend: 'up', badge: '⭐ Consistent' },
    { rank: 3, name: 'Kakazu, King', block: '302', avgScore: 91, trend: 'stable', badge: ' Rising Star' },
    { rank: 4, name: 'Rejano, Caleb', block: '304', avgScore: 89, trend: 'up', badge: null },
    { rank: 5, name: 'Santos, John', block: '305', avgScore: 87, trend: 'down', badge: null },
  ];

  const strugglingStudents = [
    { name: 'Flores, Maria', block: '301', avgScore: 42, lastSubmission: '5 days ago', issue: 'Low engagement' },
    { name: 'Dela Cruz, Juan', block: '302', avgScore: 38, lastSubmission: '1 week ago', issue: 'Missing assignments' },
    { name: 'Reyes, Ana', block: '303', avgScore: 45, lastSubmission: '3 days ago', issue: 'Concept gaps' },
  ];

  const aiInsights = [
    { type: 'positive', icon: TrendingUp, title: 'Strong Improvement', message: 'Block 303 shows 15% higher engagement than average. Consider sharing their study strategies.' },
    { type: 'warning', icon: AlertCircle, title: 'Attention Needed', message: '"Binary Search" has only 34% pass rate. Consider adding a review session or extra practice problems.' },
    { type: 'info', icon: Clock, title: 'Peak Activity', message: 'Most submissions occur between 7-9 PM. Consider extending deadlines to accommodate this pattern.' },
    { type: 'success', icon: Trophy, title: 'Milestone Reached', message: 'Class average has crossed 75% for the first time this semester!' },
  ];

  const challengingProblems = [
    { name: 'Binary Search', passRate: 34, attempts: 120, avgTime: '45 min' },
    { name: 'Recursion Basics', passRate: 42, attempts: 98, avgTime: '38 min' },
    { name: 'Dynamic Programming', passRate: 28, attempts: 45, avgTime: '62 min' },
  ];

  const heatmapData = [
    { day: 'Mon', hours: [2, 5, 8, 12, 15, 18, 22, 25, 20, 15, 10, 5, 3, 2, 1, 1, 2, 4, 8, 12, 18, 22, 25, 20] },
    { day: 'Tue', hours: [3, 6, 9, 14, 18, 22, 28, 32, 25, 18, 12, 6, 4, 3, 2, 2, 3, 5, 10, 15, 20, 25, 28, 22] },
    { day: 'Wed', hours: [2, 4, 7, 11, 14, 17, 21, 24, 19, 14, 9, 4, 2, 1, 1, 1, 2, 4, 7, 11, 16, 20, 23, 18] },
    { day: 'Thu', hours: [3, 7, 10, 15, 19, 24, 30, 35, 28, 20, 14, 7, 5, 3, 2, 2, 4, 6, 12, 17, 23, 28, 32, 25] },
    { day: 'Fri', hours: [4, 8, 12, 18, 24, 30, 38, 45, 35, 25, 18, 10, 6, 4, 3, 3, 5, 8, 15, 22, 30, 38, 42, 32] },
    { day: 'Sat', hours: [1, 2, 3, 5, 8, 12, 18, 25, 32, 28, 22, 15, 10, 6, 4, 3, 4, 6, 10, 16, 24, 32, 38, 30] },
    { day: 'Sun', hours: [1, 1, 2, 4, 6, 10, 15, 22, 30, 35, 30, 22, 15, 8, 5, 3, 4, 6, 12, 20, 28, 35, 40, 32] },
  ];

  const blocks = ['all', '301', '302', '303', '304', '305', '306', '307'];
  const timeRanges = [
    { value: 'week', label: 'Last Week' },
    { value: 'month', label: 'Last Month' },
    { value: 'semester', label: 'This Semester' }
  ];
  const exportFormats = [
    { value: 'pdf', label: 'PDF Report' },
    { value: 'csv', label: 'CSV Data' },
    { value: 'excel', label: 'Excel Spreadsheet' }
  ];

  const getHeatmapColor = (value) => {
    if (value === 0) return 'bg-gray-800';
    if (value < 10) return 'bg-blue-900/30';
    if (value < 20) return 'bg-blue-700/50';
    if (value < 30) return 'bg-blue-500/70';
    return 'bg-[#eab308]';
  };

  return (
    <div className="space-y-6">
      
      {/* Header with Advanced Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#eab308]/10 rounded-xl">
            <BarChart3 size={24} className="text-[#eab308]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Class Analytics</h2>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Performance insights and trend analysis</span>
              <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Zap size={10} /> Live
              </span>
              <span className="text-xs text-gray-500">• Last updated: Just now</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-3">
          {/* Export Dropdown */}
          <div className="relative">
            <select 
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="appearance-none bg-[#1e293b] hover:bg-[#2a3850] border border-gray-700 rounded-lg pl-4 pr-10 py-2 text-sm font-medium transition cursor-pointer"
            >
              {exportFormats.map(fmt => (
                <option key={fmt.value} value={fmt.value}>{fmt.label}</option>
              ))}
            </select>
            <Download size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2 bg-[#eab308] hover:bg-yellow-500 text-black rounded-lg text-sm font-bold transition shadow-lg shadow-yellow-500/20">
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-4 rounded-xl border border-gray-700 flex flex-wrap gap-4 items-center">
        {/* Block Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Primary Block:</span>
          <select 
            value={selectedBlock}
            onChange={(e) => setSelectedBlock(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#eab308]"
          >
            {blocks.map(b => <option key={b} value={b}>{b === 'all' ? 'All Blocks' : `Block ${b}`}</option>)}
          </select>
        </div>

        {/* Comparison Mode */}
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Compare With:</span>
          <select 
            value={compareBlock}
            onChange={(e) => setCompareBlock(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#eab308]"
          >
            <option value="none">No Comparison</option>
            {blocks.filter(b => b !== 'all').map(b => (
              <option key={b} value={b}>Block {b}</option>
            ))}
          </select>
        </div>

        {/* Time Range */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Time Range:</span>
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#eab308]"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>{range.label}</option>
            ))}
          </select>
        </div>

        {/* Tooltip Toggle */}
        <label className="flex items-center gap-2 ml-auto cursor-pointer">
          <input 
            type="checkbox" 
            checked={showTooltips}
            onChange={(e) => setShowTooltips(e.target.checked)}
            className="w-4 h-4 accent-[#eab308]"
          />
          <span className="text-sm text-gray-400">Show Tooltips</span>
          <HelpCircle size={14} className="text-gray-500" title="Hover over charts to see details" />
        </label>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-6 rounded-xl border border-gray-700 hover:border-gray-600 transition group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg group-hover:scale-110 transition-transform">
              <Users size={20} className="text-blue-500" />
            </div>
            <ArrowUpRight size={16} className="text-green-400" />
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Total Students</h3>
          <p className="text-3xl font-bold text-white">142</p>
          <p className="text-xs text-green-400 mt-1">+5 this week</p>
        </div>

        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-6 rounded-xl border border-gray-700 hover:border-gray-600 transition group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-500/10 rounded-lg group-hover:scale-110 transition-transform">
              <TrendingUp size={20} className="text-green-500" />
            </div>
            <ArrowUpRight size={16} className="text-green-400" />
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Class Average</h3>
          <p className="text-3xl font-bold text-white">78%</p>
          <p className="text-xs text-green-400 mt-1">+2% vs last week</p>
        </div>

        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-6 rounded-xl border border-gray-700 hover:border-gray-600 transition group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-yellow-500/10 rounded-lg group-hover:scale-110 transition-transform">
              <BarChart3 size={20} className="text-yellow-500" />
            </div>
            <ArrowDownRight size={16} className="text-red-400" />
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Completion Rate</h3>
          <p className="text-3xl font-bold text-white">85%</p>
          <p className="text-xs text-red-400 mt-1">-3% vs last week</p>
        </div>

        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-6 rounded-xl border border-gray-700 hover:border-gray-600 transition group">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-500/10 rounded-lg group-hover:scale-110 transition-transform">
              <PieChart size={20} className="text-purple-500" />
            </div>
            <ArrowUpRight size={16} className="text-green-400" />
          </div>
          <h3 className="text-gray-400 text-sm mb-1">Active Problems</h3>
          <p className="text-3xl font-bold text-white">48</p>
          <p className="text-xs text-green-400 mt-1">+2 new this week</p>
        </div>
      </div>

      {/* AI Insights Panel */}
      <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 p-6 rounded-xl border border-blue-500/30">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <BrainCircuit size={20} className="text-[#eab308]" />
          AI Insights & Recommendations
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aiInsights.map((insight, idx) => (
            <div key={idx} className={`p-4 rounded-lg border ${
              insight.type === 'positive' ? 'bg-green-500/5 border-green-500/20' :
              insight.type === 'warning' ? 'bg-yellow-500/5 border-yellow-500/20' :
              insight.type === 'success' ? 'bg-blue-500/5 border-blue-500/20' :
              'bg-gray-500/5 border-gray-500/20'
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  insight.type === 'positive' ? 'bg-green-500/10' :
                  insight.type === 'warning' ? 'bg-yellow-500/10' :
                  insight.type === 'success' ? 'bg-blue-500/10' :
                  'bg-gray-500/10'
                }`}>
                  <insight.icon size={16} className={
                    insight.type === 'positive' ? 'text-green-400' :
                    insight.type === 'warning' ? 'text-yellow-400' :
                    insight.type === 'success' ? 'text-blue-400' :
                    'text-gray-400'
                  } />
                </div>
                <div>
                  <h4 className="font-medium text-white text-sm mb-1">{insight.title}</h4>
                  <p className="text-gray-300 text-xs leading-relaxed">{insight.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Performance Chart + Top Students */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Performance Trend Chart */}
        <div className="lg:col-span-2 bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-[#eab308]" />
            Performance Trend
            {compareBlock !== 'none' && <span className="text-xs text-gray-400">(vs Block {compareBlock})</span>}
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-end gap-2 h-64 border-b border-gray-700 pb-2 relative">
              {performanceData.map((data, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="w-full relative flex gap-1">
                    {/* Primary Bar */}
                    <div 
                      className="flex-1 bg-gradient-to-t from-[#eab308] to-yellow-400 rounded-t-lg transition-all duration-300 hover:opacity-80 relative"
                      style={{ height: `${data.avgScore * 2}px` }}
                    >
                      {showTooltips && (
                        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-[#0f172a] border border-gray-700 px-3 py-2 rounded-lg text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-xl">
                          <div className="font-bold text-white">{data.avgScore}% Avg</div>
                          <div className="text-gray-400">{data.submissions} submissions</div>
                          <div className="text-gray-500 text-xs mt-1">{data.date}</div>
                        </div>
                      )}
                    </div>
                    
                    {/* Comparison Bar */}
                    {compareBlock !== 'none' && (
                      <div 
                        className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all duration-300 hover:opacity-80"
                        style={{ height: `${data[`block${compareBlock}`] * 2}px` }}
                      ></div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 rotate-45 origin-left translate-x-2">{data.date}</span>
                </div>
              ))}
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-[#eab308] rounded"></div>
                  <span className="text-gray-400">Block {selectedBlock === 'all' ? 'Average' : selectedBlock}</span>
                </div>
                {compareBlock !== 'none' && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-gray-400">Block {compareBlock}</span>
                  </div>
                )}
              </div>
              <span className="text-green-400 font-medium">+17% overall improvement</span>
            </div>
          </div>
        </div>

        {/* Top Performing Students */}
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Trophy size={20} className="text-[#eab308]" />
            Top Performers
          </h3>
          
          <div className="space-y-3">
            {topStudents.map((student, idx) => (
              <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border transition ${
                idx === 0 ? 'bg-[#eab308]/10 border-[#eab308]/30' : 'bg-[#0f172a] border-gray-800 hover:border-gray-700'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  idx === 0 ? 'bg-[#eab308] text-black' :
                  idx === 1 ? 'bg-gray-400 text-black' :
                  idx === 2 ? 'bg-orange-600 text-white' :
                  'bg-[#1e293b] text-gray-400'
                }`}>
                  {student.rank}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-white text-sm">{student.name}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span>Block {student.block}</span>
                    {student.badge && (
                      <span className="text-[#eab308]">{student.badge}</span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-white">{student.avgScore}%</div>
                  <div className={`text-xs ${
                    student.trend === 'up' ? 'text-green-400' :
                    student.trend === 'down' ? 'text-red-400' :
                    'text-gray-400'
                  }`}>
                    {student.trend === 'up' ? '↑' : student.trend === 'down' ? '↓' : '→'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Three Column Layout: Struggling, Challenging, Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Struggling Students Alert */}
        <div className="bg-gradient-to-br from-red-900/10 to-orange-900/10 p-6 rounded-xl border border-red-500/30">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertCircle size={20} className="text-red-400" />
            Needs Attention
          </h3>
          
          <div className="space-y-3">
            {strugglingStudents.map((student, idx) => (
              <div key={idx} className="p-3 bg-[#0f172a] rounded-lg border border-red-500/20 hover:border-red-500/40 transition">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-white text-sm">{student.name}</div>
                    <div className="text-xs text-gray-400">Block {student.block}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-400">{student.avgScore}%</div>
                    <div className="text-xs text-gray-500">{student.lastSubmission}</div>
                  </div>
                </div>
                <div className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded inline-block">
                  {student.issue}
                </div>
              </div>
            ))}
          </div>
          
          <button className="w-full mt-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition">
            View All At-Risk Students
          </button>
        </div>

        {/* Most Challenging Problems */}
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-[#eab308]" />
            Most Challenging
          </h3>
          
          <div className="space-y-3">
            {challengingProblems.map((problem, idx) => (
              <div key={idx} className="p-3 bg-[#0f172a] rounded-lg border border-gray-800 hover:border-gray-700 transition">
                <div className="font-medium text-white text-sm mb-2">{problem.name}</div>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                  <span>{problem.attempts} attempts</span>
                  <span>Avg: {problem.avgTime}</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${
                      problem.passRate < 40 ? 'bg-red-500' :
                      problem.passRate < 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${problem.passRate}%` }}
                  ></div>
                </div>
                <div className="text-right text-xs font-bold text-white mt-1">{problem.passRate}% Pass</div>
              </div>
            ))}
          </div>
        </div>

        {/* Submission Heatmap */}
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-6 rounded-xl border border-gray-700">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Clock size={20} className="text-[#eab308]" />
            Activity Heatmap
          </h3>
          
          <div className="grid grid-cols-8 gap-1 text-xs">
            {/* Header Row (Hours) */}
            <div className="text-gray-500 font-medium">Day</div>
            {[0, 4, 8, 12, 16, 20].map(hour => (
              <div key={hour} className="text-gray-500 text-center font-medium">{hour}:00</div>
            ))}
            
            {/* Data Rows */}
            {heatmapData.map((day, dayIdx) => (
              <>
                <div key={`day-${dayIdx}`} className="text-gray-400 font-medium py-1">{day.day}</div>
                {day.hours.slice(0, 6).map((value, hourIdx) => (
                  <div 
                    key={`cell-${dayIdx}-${hourIdx}`}
                    className={`h-6 rounded ${getHeatmapColor(value)} transition-colors duration-300 relative group`}
                    title={`${value} submissions at ${hourIdx * 4}:00`}
                  >
                    {showTooltips && value > 0 && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 bg-[#0f172a] border border-gray-700 px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {value} subs
                      </div>
                    )}
                  </div>
                ))}
              </>
            ))}
          </div>
          
          <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
            <span>Low Activity</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-gray-800 rounded"></div>
              <div className="w-3 h-3 bg-blue-900/30 rounded"></div>
              <div className="w-3 h-3 bg-blue-500/70 rounded"></div>
              <div className="w-3 h-3 bg-[#eab308] rounded"></div>
            </div>
            <span>High Activity</span>
          </div>
        </div>
      </div>

    </div>
  );
}

export default InstructorAnalytics;