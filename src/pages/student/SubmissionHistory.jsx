import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  History, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Zap, 
  Target,
  Grid3X3,
  List,
  ArrowUpDown,
  Eye,
  RotateCcw,
  Terminal,
  BarChart3,
  TrendingUp,
  Calendar
} from 'lucide-react';

function SubmissionHistory() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLanguage, setFilterLanguage] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [viewMode, setViewMode] = useState('list');
  const [previewSub, setPreviewSub] = useState(null);

  // Mock Submission Data
  const submissions = [
    { 
      id: 1, 
      problem: 'Array Sorting Master', 
      language: 'Python', 
      difficulty: 'Medium',
      status: 'passed', 
      score: 100, 
      runtime: '45ms', 
      memory: '12.5 MB', 
      submittedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      testCases: [
        { case: 1, status: 'passed', input: '[5,2,8,1,9]', expected: '[1,2,5,8,9]', actual: '[1,2,5,8,9]' },
        { case: 2, status: 'passed', input: '[1]', expected: '[1]', actual: '[1]' },
        { case: 3, status: 'passed', input: '[3,1,2]', expected: '[1,2,3]', actual: '[1,2,3]' }
      ]
    },
    { 
      id: 2, 
      problem: 'Binary Search', 
      language: 'Java', 
      difficulty: 'Hard',
      status: 'failed', 
      score: 33, 
      runtime: '12ms', 
      memory: '8.2 MB', 
      submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
      testCases: [
        { case: 1, status: 'passed', input: '[1,3,5,7,9], 7', expected: '3', actual: '3' },
        { case: 2, status: 'failed', input: '[1,3,5,7,9], 2', expected: '-1', actual: '1' },
        { case: 3, status: 'failed', input: '[], 5', expected: '-1', actual: 'IndexOutOfBounds' }
      ]
    },
    { 
      id: 3, 
      problem: 'String Reversal', 
      language: 'Python', 
      difficulty: 'Easy',
      status: 'passed', 
      score: 100, 
      runtime: '8ms', 
      memory: '4.1 MB', 
      submittedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      testCases: [
        { case: 1, status: 'passed', input: '"hello"', expected: '"olleh"', actual: '"olleh"' },
        { case: 2, status: 'passed', input: '"a"', expected: '"a"', actual: '"a"' }
      ]
    },
    { 
      id: 4, 
      problem: 'Valid Parentheses', 
      language: 'C#', 
      difficulty: 'Easy',
      status: 'partial', 
      score: 66, 
      runtime: '22ms', 
      memory: '6.8 MB', 
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      testCases: [
        { case: 1, status: 'passed', input: '"()"', expected: 'true', actual: 'true' },
        { case: 2, status: 'passed', input: '"()[]{}"', expected: 'true', actual: 'true' },
        { case: 3, status: 'failed', input: '"(]"', expected: 'false', actual: 'true' }
      ]
    },
    { 
      id: 5, 
      problem: 'Maximum Subarray', 
      language: 'JavaScript', 
      difficulty: 'Medium',
      status: 'passed', 
      score: 100, 
      runtime: '38ms', 
      memory: '10.2 MB', 
      submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      testCases: [
        { case: 1, status: 'passed', input: '[-2,1,-3,4,-1,2,1,-5,4]', expected: '6', actual: '6' }
      ]
    },
    { 
      id: 6, 
      problem: 'Fibonacci Sequence', 
      language: 'Python', 
      difficulty: 'Easy',
      status: 'failed', 
      score: 0, 
      runtime: 'Timeout', 
      memory: 'N/A', 
      submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      testCases: [
        { case: 1, status: 'failed', input: '50', expected: '12586269025', actual: 'Timeout Error' }
      ]
    },
  ];

  const languages = ['all', 'Python', 'Java', 'JavaScript', 'C#'];
  const statuses = ['all', 'passed', 'failed', 'partial'];
  const sortOptions = [
    { value: 'recent', label: 'Most Recent' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'score', label: 'Highest Score' },
    { value: 'fastest', label: 'Fastest Runtime' },
  ];

  // Format relative time
  const formatRelativeTime = (date) => {
    const diffMs = Date.now() - date;
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Filter & Sort
  const filteredSubs = useMemo(() => {
    return submissions
      .filter(sub => {
        const matchesSearch = sub.problem.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesLang = filterLanguage === 'all' || sub.language === filterLanguage;
        const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
        return matchesSearch && matchesLang && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'score') return b.score - a.score;
        if (sortBy === 'fastest') return parseInt(a.runtime) - parseInt(b.runtime);
        if (sortBy === 'oldest') return a.submittedAt - b.submittedAt;
        return b.submittedAt - a.submittedAt;
      });
  }, [searchTerm, filterLanguage, filterStatus, sortBy]);

  // Stats
  const totalSubs = submissions.length;
  const passRate = Math.round((submissions.filter(s => s.status === 'passed').length / totalSubs) * 100);
  const avgRuntime = Math.round(submissions.filter(s => s.runtime !== 'Timeout').reduce((sum, s) => sum + parseInt(s.runtime), 0) / submissions.filter(s => s.runtime !== 'Timeout').length);
  const bestStreak = 5;

  const getLanguageColor = (lang) => {
    const colors = {
      'Python': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
      'Java': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
      'JavaScript': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
      'C#': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    };
    return colors[lang] || 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'passed': return <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 rounded text-xs font-bold border border-green-500/20"><CheckCircle2 size={12} /> Passed</span>;
      case 'failed': return <span className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs font-bold border border-red-500/20"><XCircle size={12} /> Failed</span>;
      case 'partial': return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs font-bold border border-yellow-500/20"><AlertCircle size={12} /> Partial</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-xl">
            <History size={24} className="text-emerald-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Submission History</h2>
            <p className="text-gray-400 text-sm">Track your progress and review past attempts</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-4 rounded-xl border border-gray-700 group hover:border-emerald-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:scale-110 transition-transform">
              <Terminal size={18} className="text-emerald-400" />
            </div>
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">+3 today</span>
          </div>
          <p className="text-2xl font-bold text-white">{totalSubs}</p>
          <p className="text-xs text-gray-500 mt-1">Total submissions</p>
        </div>
        
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-4 rounded-xl border border-gray-700 group hover:border-green-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg group-hover:scale-110 transition-transform">
              <CheckCircle2 size={18} className="text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{passRate}%</p>
          <p className="text-xs text-gray-500 mt-1">Pass rate</p>
        </div>
        
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-4 rounded-xl border border-gray-700 group hover:border-cyan-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-cyan-500/10 rounded-lg group-hover:scale-110 transition-transform">
              <Clock size={18} className="text-cyan-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{avgRuntime}ms</p>
          <p className="text-xs text-gray-500 mt-1">Avg. runtime</p>
        </div>
        
        <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-4 rounded-xl border border-gray-700 group hover:border-orange-500/50 transition">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-orange-500/10 rounded-lg group-hover:scale-110 transition-transform">
              <TrendingUp size={18} className="text-orange-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{bestStreak}</p>
          <p className="text-xs text-gray-500 mt-1">Day streak</p>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-4 rounded-xl border border-gray-700 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search problems..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0f172a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Lang:</span>
          <select value={filterLanguage} onChange={(e) => setFilterLanguage(e.target.value)} className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500">
            {languages.map(l => <option key={l} value={l}>{l === 'all' ? 'All' : l}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Status:</span>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500">
            {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <ArrowUpDown size={14} className="text-gray-400" />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-emerald-500">
            {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          
          <div className="flex bg-[#0f172a] p-1 rounded-lg border border-gray-700">
            <button onClick={() => setViewMode('list')} className={`p-2 rounded transition ${viewMode === 'list' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}>
              <List size={16} />
            </button>
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded transition ${viewMode === 'grid' ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'}`}>
              <Grid3X3 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Submissions List/Grid */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
        {filteredSubs.length > 0 ? (
          filteredSubs.map((sub) => (
            <div 
              key={sub.id} 
              className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl border border-gray-700 p-5 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 group cursor-pointer"
              onClick={() => setPreviewSub(sub)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors truncate">
                      {sub.problem}
                    </h3>
                    {getStatusBadge(sub.status)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <span className={`px-1.5 py-0.5 rounded border ${getLanguageColor(sub.language)}`}>{sub.language}</span>
                    <span className="flex items-center gap-1"><Calendar size={10} /> {formatRelativeTime(sub.submittedAt)}</span>
                    <span className="px-1.5 py-0.5 bg-[#0f172a] border border-gray-700 rounded text-gray-300">{sub.difficulty}</span>
                  </div>
                </div>
              </div>

              {/* Score Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Score</span>
                  <span className={`font-bold ${sub.score === 100 ? 'text-green-400' : sub.score > 50 ? 'text-yellow-400' : 'text-red-400'}`}>{sub.score}%</span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      sub.score === 100 ? 'bg-green-500' : sub.score > 50 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${sub.score}%` }}
                  ></div>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-800">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Zap size={12} /> {sub.runtime}</span>
                  <span className="flex items-center gap-1"><Target size={12} /> {sub.memory}</span>
                  <span className="flex items-center gap-1"><BarChart3 size={12} /> {sub.testCases.filter(t => t.status === 'passed').length}/{sub.testCases.length} cases</span>
                </div>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate(`/student/challenge/${sub.id}?retry=true`); }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 rounded-lg text-xs font-medium transition group-hover:scale-105"
                >
                  <RotateCcw size={12} /> Retry
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-16 bg-[#1e293b] rounded-xl border border-gray-700 col-span-full">
            <History size={48} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-bold text-white mb-2">No Submissions Found</h3>
            <p className="text-gray-400 mb-4">Try adjusting your filters or start solving some challenges!</p>
            <button onClick={() => navigate('/student/code-editor')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition flex items-center gap-2 mx-auto">
              <Zap size={16} /> Go to Challenges
            </button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {previewSub && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-xl border border-gray-700 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">{previewSub.problem}</h3>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <span className={`px-1.5 py-0.5 rounded border ${getLanguageColor(previewSub.language)}`}>{previewSub.language}</span>
                  <span>{formatRelativeTime(previewSub.submittedAt)}</span>
                </div>
              </div>
              <button onClick={() => setPreviewSub(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Overview */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-[#0f172a] p-3 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Score</div>
                  <div className={`text-xl font-bold ${previewSub.score === 100 ? 'text-green-400' : 'text-yellow-400'}`}>{previewSub.score}%</div>
                </div>
                <div className="bg-[#0f172a] p-3 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Runtime</div>
                  <div className="text-xl font-bold text-white">{previewSub.runtime}</div>
                </div>
                <div className="bg-[#0f172a] p-3 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Memory</div>
                  <div className="text-xl font-bold text-white">{previewSub.memory}</div>
                </div>
              </div>

              {/* Test Cases */}
              <div>
                <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                  <Terminal size={16} className="text-emerald-400" />
                  Test Case Results
                </h4>
                <div className="space-y-2">
                  {previewSub.testCases.map((tc, idx) => (
                    <div key={idx} className="bg-[#0f172a] p-3 rounded-lg border border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-300">Test Case {tc.case}</span>
                        {tc.status === 'passed' ? (
                          <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 size={12} /> Passed</span>
                        ) : (
                          <span className="text-xs text-red-400 flex items-center gap-1"><XCircle size={12} /> Failed</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-gray-500 mb-0.5">Input</div>
                          <div className="text-white font-mono bg-[#1e293b] px-2 py-1 rounded truncate">{tc.input}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 mb-0.5">Expected</div>
                          <div className="text-green-400 font-mono bg-[#1e293b] px-2 py-1 rounded truncate">{tc.expected}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 mb-0.5">Actual</div>
                          <div className={`font-mono bg-[#1e293b] px-2 py-1 rounded truncate ${tc.status === 'passed' ? 'text-green-400' : 'text-red-400'}`}>{tc.actual}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button 
                  onClick={() => { setPreviewSub(null); navigate(`/student/challenge/${previewSub.id}?retry=true`); }}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
                >
                  <RotateCcw size={16} /> Retry Problem
                </button>
                <button 
                  onClick={() => { setPreviewSub(null); navigate('/student/code-editor'); }}
                  className="px-6 py-3 bg-[#1e293b] hover:bg-[#2a3850] border border-gray-700 rounded-lg font-medium transition"
                >
                  Back to Challenges
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubmissionHistory;