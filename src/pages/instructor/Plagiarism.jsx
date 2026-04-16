import { useState } from 'react';
import { 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  Filter, 
  Search,
  BrainCircuit,
  AlertTriangle,
  UserCheck,
  Download,
  Calendar,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

function InstructorPlagiarism() {
  // State for Filters
  const [filterBlock, setFilterBlock] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFlags, setSelectedFlags] = useState([]);
  const [expandedFlag, setExpandedFlag] = useState(null);

  // Mock Data with Blocks, Subjects, and Dates
  const allFlags = [
    { 
      id: 1, 
      studentA: 'Niño, Sasan', 
      studentB: 'Kakazu, King', 
      block: '301',
      subject: 'Fundamentals of Programming',
      problem: 'Array Sorting', 
      similarity: 87, 
      status: 'Pending', 
      date: '2026-04-15', 
      snippetA: `1. def sort_array(arr):
2.     for i in range(len(arr)):
3.         for j in range(i+1, len(arr)):
4.             if arr[i] > arr[j]:
5.                 arr[i], arr[j] = arr[j], arr[i]
6.     return arr`,
      snippetB: `1. def sort_array(arr):
2.     for i in range(len(arr)):
3.         for j in range(i+1, len(arr)):
4.             if arr[i] > arr[j]:
5.                 arr[i], arr[j] = arr[j], arr[i]
6.     return arr`,
      aiConfidence: 'High',
      matchedLines: [2, 3, 4, 5] // Lines that are similar
    },
    { 
      id: 2, 
      studentA: 'Flores, Maria', 
      studentB: 'Guzman, Iverson', 
      block: '302',
      subject: 'Computer Programming 1',
      problem: 'Loop Debugging', 
      similarity: 62, 
      status: 'Reviewed', 
      date: '2026-04-14', 
      snippetA: `1. for i in range(10):
2.     print(i)
3.     if i == 5:
4.         break`,
      snippetB: `1. for i in range(10):
2.     print(i)
3.     if i == 5:
4.         break`,
      aiConfidence: 'Medium',
      matchedLines: [1, 2, 3, 4]
    },
    { 
      id: 3, 
      studentA: 'Rejano, Caleb', 
      studentB: 'Santos, John', 
      block: '303',
      subject: 'Introduction to Computing',
      problem: 'String Reversal', 
      similarity: 45, 
      status: 'Dismissed', 
      date: '2026-04-13', 
      snippetA: `1. return s[::-1]`,
      snippetB: `1. return "".join(reversed(s))`,
      aiConfidence: 'Low',
      matchedLines: []
    },
    { 
      id: 4, 
      studentA: 'Dela Cruz, Juan', 
      studentB: 'Reyes, Ana', 
      block: '301',
      subject: 'Fundamentals of Programming',
      problem: 'Binary Search', 
      similarity: 92, 
      status: 'Pending', 
      date: '2026-04-15', 
      snippetA: `1. def binary_search(arr, target):
2.     left, right = 0, len(arr) - 1
3.     while left <= right:
4.         mid = (left + right) // 2
5.         if arr[mid] == target:
6.             return mid`,
      snippetB: `1. def binary_search(arr, target):
2.     left, right = 0, len(arr) - 1
3.     while left <= right:
4.         mid = (left + right) // 2
5.         if arr[mid] == target:
6.             return mid`,
      aiConfidence: 'High',
      matchedLines: [1, 2, 3, 4, 5, 6]
    },
  ];

  // Filter Logic
  const filteredFlags = allFlags.filter(flag => {
    const matchBlock = filterBlock === 'all' || flag.block === filterBlock;
    const matchSubject = filterSubject === 'all' || flag.subject === filterSubject;
    const matchSearch = flag.studentA.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        flag.studentB.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        flag.problem.toLowerCase().includes(searchTerm.toLowerCase());
    return matchBlock && matchSubject && matchSearch;
  });

  // Stats Calculation
  const stats = {
    total: filteredFlags.length,
    highRisk: filteredFlags.filter(f => f.similarity >= 80).length,
    mediumRisk: filteredFlags.filter(f => f.similarity >= 60 && f.similarity < 80).length,
    lowRisk: filteredFlags.filter(f => f.similarity < 60).length,
    pending: filteredFlags.filter(f => f.status === 'Pending').length,
    resolved: filteredFlags.filter(f => f.status !== 'Pending').length,
  };

  const handleAction = (id, action) => {
    // Mock action handler
    console.log(`Flag ${id} marked as ${action}`);
  };

  const handleBatchAction = (action) => {
    if (selectedFlags.length === 0) return;
    console.log(`Batch action: ${action} on ${selectedFlags.length} flags`);
    setSelectedFlags([]);
  };

  const toggleSelect = (id) => {
    if (selectedFlags.includes(id)) {
      setSelectedFlags(selectedFlags.filter(fid => fid !== id));
    } else {
      setSelectedFlags([...selectedFlags, id]);
    }
  };

  const getSimilarityColor = (score) => {
    if (score >= 80) return 'text-red-500 bg-red-500/10 border-red-500/20';
    if (score >= 60) return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
    return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
  };

  const getConfidenceBadge = (level) => {
    const colors = {
      'High': 'bg-red-500/20 text-red-400 border-red-500/30',
      'Medium': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Low': 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    };
    return colors[level] || colors['Low'];
  };

  const blocks = ['all', '301', '302', '303', '304', '305', '306', '307'];
  const subjects = ['all', 'Introduction to Computing', 'Fundamentals of Programming', 'Computer Programming 1', 'Computer Programming 2'];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BrainCircuit className="text-[#eab308]" size={24} />
            AI Plagiarism Detection
          </h2>
          <p className="text-gray-400 text-sm">Automated code similarity analysis powered by AI</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => console.log('Exporting...')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] hover:bg-[#2a3850] border border-gray-700 rounded-lg text-sm font-medium transition"
          >
            <Download size={16} /> Export Report
          </button>
          <button className="px-4 py-2 bg-[#eab308] hover:bg-yellow-500 text-black rounded-lg text-sm font-bold transition">
            Run New Scan
          </button>
        </div>
      </div>

      {/* Enhanced Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-[#1e293b] p-4 rounded-xl border border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="text-gray-400" size={18} />
            <span className="text-gray-400 text-xs">Total Flags</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-[#1e293b] p-4 rounded-xl border border-red-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-red-500" size={18} />
            <span className="text-red-400 text-xs">High Risk (&gt;80%)</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{stats.highRisk}</p>
        </div>
        <div className="bg-[#1e293b] p-4 rounded-xl border border-yellow-500/30">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="text-yellow-500" size={18} />
            <span className="text-yellow-400 text-xs">Medium Risk</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{stats.mediumRisk}</p>
        </div>
        <div className="bg-[#1e293b] p-4 rounded-xl border border-blue-500/30">
          <div className="flex items-center gap-2 mb-2">
            <Info className="text-blue-500" size={18} />
            <span className="text-blue-400 text-xs">Low Risk</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{stats.lowRisk}</p>
        </div>
        <div className="bg-[#1e293b] p-4 rounded-xl border border-yellow-500/30">
          <div className="flex items-center gap-2 mb-2">
            <UserCheck className="text-yellow-500" size={18} />
            <span className="text-yellow-400 text-xs">Pending</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">{stats.pending}</p>
        </div>
        <div className="bg-[#1e293b] p-4 rounded-xl border border-green-500/30">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="text-green-500" size={18} />
            <span className="text-green-400 text-xs">Resolved</span>
          </div>
          <p className="text-2xl font-bold text-green-400">{stats.resolved}</p>
        </div>
      </div>

      {/* Filters Row */}
      <div className="bg-[#1e293b] p-4 rounded-xl border border-gray-700 flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={16} />
          <input 
            type="text" 
            placeholder="Search students or problems..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0f172a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-[#eab308]"
          />
        </div>

        {/* Block Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Block:</span>
          <select 
            value={filterBlock}
            onChange={(e) => setFilterBlock(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#eab308]"
          >
            {blocks.map(b => <option key={b} value={b}>{b === 'all' ? 'All Blocks' : `Block ${b}`}</option>)}
          </select>
        </div>

        {/* Subject Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Subject:</span>
          <select 
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#eab308]"
          >
            {subjects.map(s => <option key={s} value={s}>{s === 'all' ? 'All Subjects' : s}</option>)}
          </select>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Date:</span>
          <select 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#eab308]"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
      </div>

      {/* Batch Actions Bar (Shows when items selected) */}
      {selectedFlags.length > 0 && (
        <div className="bg-[#eab308]/10 border border-[#eab308]/30 p-3 rounded-lg flex items-center justify-between">
          <span className="text-[#eab308] text-sm font-medium">
            {selectedFlags.length} case(s) selected
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => handleBatchAction('reviewed')}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded transition"
            >
              Mark Reviewed
            </button>
            <button 
              onClick={() => handleBatchAction('dismissed')}
              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs font-bold rounded transition"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Flags List */}
      <div className="space-y-4">
        {filteredFlags.length > 0 ? (
          filteredFlags.map((flag) => (
            <div key={flag.id} className={`bg-[#1e293b] rounded-xl border transition ${expandedFlag === flag.id ? 'border-[#eab308]' : 'border-gray-700 hover:border-gray-600'}`}>
              
              {/* Header Row */}
              <div className="p-6 flex flex-col md:flex-row gap-4 items-start">
                {/* Checkbox */}
                <div className="pt-1">
                  <input 
                    type="checkbox" 
                    checked={selectedFlags.includes(flag.id)}
                    onChange={() => toggleSelect(flag.id)}
                    className="w-5 h-5 accent-[#eab308] cursor-pointer"
                  />
                </div>

                {/* Main Info */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getSimilarityColor(flag.similarity)}`}>
                      {flag.similarity}% Similarity
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getConfidenceBadge(flag.aiConfidence)}`} title="AI confidence in this detection">
                      AI: {flag.aiConfidence}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      flag.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500' :
                      flag.status === 'Reviewed' ? 'bg-green-500/10 text-green-500' :
                      'bg-gray-500/10 text-gray-500'
                    }`}>
                      {flag.status}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">{flag.date}</span>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-1">{flag.problem}</h3>
                  <p className="text-gray-400 text-sm">
                    <span className="text-white font-medium">{flag.studentA}</span> (Block {flag.block}) vs <span className="text-white font-medium">{flag.studentB}</span>
                    <span className="mx-2">•</span>
                    <span className="text-xs bg-[#0f172a] px-2 py-0.5 rounded border border-gray-700">{flag.subject}</span>
                  </p>
                </div>
                
                {/* Expand/Collapse Button */}
                <button 
                  onClick={() => setExpandedFlag(expandedFlag === flag.id ? null : flag.id)}
                  className="p-2 text-gray-400 hover:text-[#eab308] hover:bg-[#eab308]/10 rounded-lg transition"
                >
                  {expandedFlag === flag.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              </div>

              {/* Expanded Details (Code Comparison) */}
              {expandedFlag === flag.id && (
                <div className="px-6 pb-6 border-t border-gray-800 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    
                    {/* Student A Code */}
                    <div className="bg-[#0f172a] p-4 rounded-lg border border-gray-700">
                      <h4 className="text-sm font-bold text-blue-400 mb-3 flex items-center gap-2">
                        {flag.studentA} (Block {flag.block})
                      </h4>
                      <div className="font-mono text-xs overflow-x-auto">
                        {flag.snippetA.split('\n').map((line, idx) => {
                          const lineNum = idx + 1;
                          const isMatched = flag.matchedLines.includes(lineNum);
                          return (
                            <div key={idx} className={`flex ${isMatched ? 'bg-red-500/10' : ''}`}>
                              <span className="w-8 text-gray-600 select-none text-right pr-2 border-r border-gray-800 mr-2">{lineNum}</span>
                              <span className={`flex-1 whitespace-pre ${isMatched ? 'text-red-300' : 'text-gray-300'}`}>
                                {line}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Student B Code */}
                    <div className="bg-[#0f172a] p-4 rounded-lg border border-gray-700">
                      <h4 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                        {flag.studentB} (Block {flag.block})
                      </h4>
                      <div className="font-mono text-xs overflow-x-auto">
                        {flag.snippetB.split('\n').map((line, idx) => {
                          const lineNum = idx + 1;
                          const isMatched = flag.matchedLines.includes(lineNum);
                          return (
                            <div key={idx} className={`flex ${isMatched ? 'bg-red-500/10' : ''}`}>
                              <span className="w-8 text-gray-600 select-none text-right pr-2 border-r border-gray-800 mr-2">{lineNum}</span>
                              <span className={`flex-1 whitespace-pre ${isMatched ? 'text-red-300' : 'text-gray-300'}`}>
                                {line}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* AI Analysis Note */}
                  <div className="mt-4 bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                    <p className="text-blue-400 text-sm font-medium mb-1 flex items-center gap-2">
                      <BrainCircuit size={14} /> AI Analysis:
                    </p>
                    <p className="text-gray-300 text-sm">
                      Detected structural similarity in loop implementation and variable naming conventions. 
                      Confidence level: <strong>{flag.aiConfidence}</strong>. 
                      {flag.matchedLines.length > 0 && ` Matched lines: ${flag.matchedLines.join(', ')}.`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-4 mt-6 pt-4 border-t border-gray-800">
                    <button 
                      onClick={() => handleAction(flag.id, 'Reviewed')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold transition"
                    >
                      <CheckCircle2 size={18} /> Mark as Reviewed
                    </button>
                    <button 
                      onClick={() => handleAction(flag.id, 'Dismissed')}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-bold transition"
                    >
                      <XCircle size={18} /> Dismiss False Positive
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <ShieldAlert size={48} className="mx-auto mb-4 opacity-50" />
            <p>No plagiarism flags found matching your filters.</p>
          </div>
        )}
      </div>

    </div>
  );
}

export default InstructorPlagiarism;