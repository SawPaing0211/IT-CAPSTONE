import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bug, 
  Search, 
  Filter, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Zap, 
  Target,
  Star,
  Sparkles,
  Flame,
  Grid3X3,
  List,
  ArrowUpDown,
  Eye,
  AlertTriangle
} from 'lucide-react';

function DebugMode() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterBugType, setFilterBugType] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');
  const [viewMode, setViewMode] = useState('list');
  const [previewChallenge, setPreviewChallenge] = useState(null);

  // Mock Debug Challenges
  const challenges = [
    { 
      id: 1, 
      title: 'Off-by-One Error in Loop', 
      difficulty: 'Easy', 
      bugType: 'Logic',
      topic: 'Loops',
      xp: 100, 
      status: 'completed',
      submissions: 1,
      avgTime: '5 min',
      solvedBy: 85,
      description: 'Fix the loop that skips the last element in the array',
      isNew: false,
      isRecommended: false
    },
    { 
      id: 2, 
      title: 'Wrong Comparison Operator', 
      difficulty: 'Easy', 
      bugType: 'Syntax',
      topic: 'Conditionals',
      xp: 75, 
      status: 'completed',
      submissions: 1,
      avgTime: '3 min',
      solvedBy: 92,
      description: 'Fix the condition that uses assignment instead of comparison',
      isNew: false,
      isRecommended: false
    },
    { 
      id: 3, 
      title: 'Infinite Loop Bug', 
      difficulty: 'Medium', 
      bugType: 'Logic',
      topic: 'Loops',
      xp: 150, 
      status: 'attempted',
      submissions: 3,
      avgTime: '12 min',
      solvedBy: 58,
      description: 'Fix the loop that never terminates',
      isNew: false,
      isRecommended: true
    },
    { 
      id: 4, 
      title: 'Undefined Variable', 
      difficulty: 'Easy', 
      bugType: 'NameError',
      topic: 'Variables',
      xp: 75, 
      status: 'not_started',
      submissions: 0,
      avgTime: '4 min',
      solvedBy: 88,
      description: 'Fix the code that references an undefined variable',
      isNew: true,
      isRecommended: true
    },
    { 
      id: 5, 
      title: 'Wrong Return Type', 
      difficulty: 'Medium', 
      bugType: 'Type',
      topic: 'Functions',
      xp: 125, 
      status: 'not_started',
      submissions: 0,
      avgTime: '8 min',
      solvedBy: 65,
      description: 'Fix the function that returns a string instead of a number',
      isNew: false,
      isRecommended: false
    },
    { 
      id: 6, 
      title: 'Missing Base Case in Recursion', 
      difficulty: 'Hard', 
      bugType: 'Logic',
      topic: 'Recursion',
      xp: 200, 
      status: 'not_started',
      submissions: 0,
      avgTime: '18 min',
      solvedBy: 32,
      description: 'Fix the recursive function that causes stack overflow',
      isNew: true,
      isRecommended: true
    },
    { 
      id: 7, 
      title: 'Index Out of Range', 
      difficulty: 'Medium', 
      bugType: 'IndexError',
      topic: 'Arrays',
      xp: 125, 
      status: 'not_started',
      submissions: 0,
      avgTime: '10 min',
      solvedBy: 71,
      description: 'Fix the array access that goes out of bounds',
      isNew: false,
      isRecommended: false
    },
    { 
      id: 8, 
      title: 'Incorrect Indentation', 
      difficulty: 'Easy', 
      bugType: 'Syntax',
      topic: 'Python Basics',
      xp: 50, 
      status: 'not_started',
      submissions: 0,
      avgTime: '2 min',
      solvedBy: 95,
      description: 'Fix the indentation error in the function',
      isNew: false,
      isRecommended: false
    },
  ];

  const bugTypes = ['all', 'Logic', 'Syntax', 'NameError', 'Type', 'IndexError'];
  const difficulties = ['all', 'Easy', 'Medium', 'Hard'];
  const sortOptions = [
    { value: 'recommended', label: 'Recommended' },
    { value: 'xp', label: 'XP (High to Low)' },
    { value: 'difficulty', label: 'Difficulty' },
    { value: 'alphabetical', label: 'A-Z' },
  ];

  // Filter & Sort challenges
  const filteredChallenges = challenges
    .filter(challenge => {
      const matchesSearch = challenge.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            challenge.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDifficulty = filterDifficulty === 'all' || challenge.difficulty === filterDifficulty;
      const matchesBugType = filterBugType === 'all' || challenge.bugType === filterBugType;
      return matchesSearch && matchesDifficulty && matchesBugType;
    })
    .sort((a, b) => {
      if (sortBy === 'xp') return b.xp - a.xp;
      if (sortBy === 'difficulty') {
        const order = { 'Hard': 3, 'Medium': 2, 'Easy': 1 };
        return order[b.difficulty] - order[a.difficulty];
      }
      if (sortBy === 'alphabetical') return a.title.localeCompare(b.title);
      // recommended: new first, then recommended, then by XP
      if (a.isNew && !b.isNew) return -1;
      if (!a.isNew && b.isNew) return 1;
      if (a.isRecommended && !b.isRecommended) return -1;
      if (!a.isRecommended && b.isRecommended) return 1;
      return b.xp - a.xp;
    });

  // Stats
  const completed = challenges.filter(c => c.status === 'completed').length;
  const totalXP = challenges.filter(c => c.status === 'completed').reduce((sum, c) => sum + c.xp, 0);

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'Easy': return 'text-green-500 bg-green-500/10 border-green-500/20';
      case 'Medium': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
      case 'Hard': return 'text-red-500 bg-red-500/10 border-red-500/20';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusIcon = (status) => {
    if (status === 'completed') return <CheckCircle2 size={20} className="text-green-500" />;
    if (status === 'attempted') return <Clock size={20} className="text-yellow-500" />;
    return <Circle size={20} className="text-gray-500" />;
  };

  const getBugTypeIcon = (bugType) => {
    switch(bugType) {
      case 'Logic': return '🧠';
      case 'Syntax': return '🔤';
      case 'NameError': return '❓';
      case 'Type': return '🔢';
      case 'IndexError': return '📋';
      default: return '🐛';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/10 rounded-xl">
            <Bug size={24} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Debug Mode</h2>
            <p className="text-gray-400 text-sm">Find and fix bugs in code snippets</p>
          </div>
        </div>
      </div>

      {/* Progress & Stats */}
      <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 p-6 rounded-xl border border-red-500/30">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{completed}</div>
              <div className="text-xs text-gray-400">Bugs Fixed</div>
            </div>
            <div className="w-px h-12 bg-gray-700"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-400">{new Set(challenges.map(c => c.bugType)).size}</div>
              <div className="text-xs text-gray-400">Bug Types</div>
            </div>
            <div className="w-px h-12 bg-gray-700"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-400">8 min</div>
              <div className="text-xs text-gray-400">Avg. Time</div>
            </div>
          </div>
          
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-[#eab308]">{totalXP}</div>
              <div className="text-xs text-gray-400">Total XP</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400 flex items-center gap-1">
                <CheckCircle2 size={20} />
                {Math.round((completed / challenges.length) * 100)}%
              </div>
              <div className="text-xs text-gray-400">Completion</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-4 rounded-xl border border-gray-700 flex flex-wrap gap-4 items-center">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search challenges..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0f172a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-red-500 transition"
          />
        </div>

        {/* Difficulty Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Difficulty:</span>
          <select 
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500"
          >
            {difficulties.map(d => <option key={d} value={d}>{d === 'all' ? 'All Difficulties' : d}</option>)}
          </select>
        </div>

        {/* Bug Type Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Bug Type:</span>
          <select 
            value={filterBugType}
            onChange={(e) => setFilterBugType(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500"
          >
            {bugTypes.map(t => <option key={t} value={t}>{t === 'all' ? 'All Bug Types' : t}</option>)}
          </select>
        </div>

        {/* Sort & View Toggle */}
        <div className="flex items-center gap-2 ml-auto">
          <ArrowUpDown size={14} className="text-gray-400" />
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500"
          >
            {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          
          <div className="flex bg-[#0f172a] p-1 rounded-lg border border-gray-700">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition ${viewMode === 'list' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'}`}
              title="List View"
            >
              <List size={16} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition ${viewMode === 'grid' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white'}`}
              title="Grid View"
            >
              <Grid3X3 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Challenges List/Grid */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
        {filteredChallenges.length > 0 ? (
          filteredChallenges.map((challenge) => (
            <div 
              key={challenge.id} 
              className={`bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl border border-gray-700 p-5 hover:border-red-500/50 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300 group cursor-pointer ${
                viewMode === 'grid' ? '' : ''
              }`}
              onClick={() => navigate(`/student/challenge/${challenge.id}?mode=debug`)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getBugTypeIcon(challenge.bugType)}</span>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">
                      {challenge.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(challenge.status)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`px-2 py-1 rounded text-xs font-bold border ${getDifficultyColor(challenge.difficulty)}`}>
                  {challenge.difficulty}
                </span>
                <span className="px-2 py-1 bg-[#0f172a] border border-gray-700 rounded text-xs text-gray-300">
                  {challenge.bugType}
                </span>
                <span className="px-2 py-1 bg-[#0f172a] border border-gray-700 rounded text-xs text-gray-300">
                  {challenge.topic}
                </span>
                {challenge.isNew && (
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs font-bold border border-blue-500/20 flex items-center gap-1">
                    <Sparkles size={10} /> New
                  </span>
                )}
                {challenge.isRecommended && (
                  <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs font-bold border border-purple-500/20 flex items-center gap-1">
                    <Star size={10} fill="currentColor" /> Recommended
                  </span>
                )}
              </div>
              
              {/* Description */}
              <p className="text-gray-400 text-sm mb-4 line-clamp-2">{challenge.description}</p>
              
              {/* Meta Info */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 text-gray-500">
                  <span className="flex items-center gap-1 text-[#eab308]">
                    <Zap size={12} />
                    {challenge.xp} XP
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {challenge.avgTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target size={12} />
                    {challenge.solvedBy}% solved
                  </span>
                </div>
                
                {challenge.status === 'completed' ? (
                  <span className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-sm font-medium border border-green-500/20 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Fixed
                  </span>
                ) : challenge.status === 'attempted' ? (
                  <span className="px-3 py-1.5 bg-yellow-500/10 text-yellow-500 rounded-lg text-sm font-medium border border-yellow-500/20 flex items-center gap-1">
                    <Clock size={14} /> In Progress
                  </span>
                ) : (
                  <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition flex items-center gap-2 group-hover:scale-105">
                    <Bug size={14} />
                    Debug Now
                  </button>
                )}
              </div>

              {/* Quick Preview Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewChallenge(challenge);
                }}
                className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-red-400 transition"
              >
                <Eye size={12} /> Quick Preview
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-[#1e293b] rounded-xl border border-gray-700 col-span-full">
            <Bug size={48} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-bold text-white mb-2">No Challenges Found</h3>
            <p className="text-gray-400">Try adjusting your filters or search term.</p>
          </div>
        )}
      </div>

      {/* Quick Preview Modal */}
      {previewChallenge && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getBugTypeIcon(previewChallenge.bugType)}</span>
                <h3 className="text-xl font-bold text-white">{previewChallenge.title}</h3>
              </div>
              <button 
                onClick={() => setPreviewChallenge(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`px-2 py-1 rounded text-xs font-bold border ${getDifficultyColor(previewChallenge.difficulty)}`}>
                  {previewChallenge.difficulty}
                </span>
                <span className="px-2 py-1 bg-[#0f172a] border border-gray-700 rounded text-xs text-gray-300">
                  {previewChallenge.bugType}
                </span>
                <span className="px-2 py-1 bg-[#0f172a] border border-gray-700 rounded text-xs text-gray-300">
                  {previewChallenge.topic}
                </span>
                <span className="flex items-center gap-1 text-[#eab308] text-xs">
                  <Zap size={12} /> {previewChallenge.xp} XP
                </span>
              </div>
              
              <p className="text-gray-300 leading-relaxed">{previewChallenge.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-[#0f172a] p-3 rounded-lg">
                  <div className="text-gray-400 mb-1">Avg. Time</div>
                  <div className="font-bold text-white">{previewChallenge.avgTime}</div>
                </div>
                <div className="bg-[#0f172a] p-3 rounded-lg">
                  <div className="text-gray-400 mb-1">Solved By</div>
                  <div className="font-bold text-white">{previewChallenge.solvedBy}%</div>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={16} className="text-red-400" />
                  <span className="font-bold text-red-400">Bug Type</span>
                </div>
                <p className="text-sm text-gray-300">
                  This challenge contains a <span className="font-bold text-white">{previewChallenge.bugType}</span> bug. 
                  Carefully review the code to identify what's wrong!
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    setPreviewChallenge(null);
                    navigate(`/student/challenge/${previewChallenge.id}?mode=debug`);
                  }}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
                >
                  <Bug size={16} />
                  Start Debugging
                </button>
                <button 
                  onClick={() => setPreviewChallenge(null)}
                  className="px-6 py-3 bg-[#1e293b] hover:bg-[#2a3850] border border-gray-700 rounded-lg font-medium transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DebugMode;