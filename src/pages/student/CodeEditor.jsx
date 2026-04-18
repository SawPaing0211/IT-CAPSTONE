import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Code2, 
  Search, 
  Filter, 
  CheckCircle2, 
  Circle, 
  TrendingUp, 
  Clock,
  Star,
  Zap,
  Target,
  Bookmark,
  BookmarkCheck,
  Grid3X3,
  List,
  ArrowUpDown,
  Eye,
  Sparkles,
  Flame
} from 'lucide-react';

function CodeEditor() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterTopic, setFilterTopic] = useState('all');
  const [sortBy, setSortBy] = useState('recommended'); // recommended, xp, difficulty, alphabetical
  const [viewMode, setViewMode] = useState('list'); // list, grid
  const [previewProblem, setPreviewProblem] = useState(null);
  const [bookmarks, setBookmarks] = useState([3, 7]); // Mock bookmarked problem IDs

  // Mock Problems Data
  const problems = [
    { 
      id: 1, 
      title: 'Array Sorting Master', 
      difficulty: 'Medium', 
      topic: 'Arrays',
      xp: 150, 
      status: 'completed',
      submissions: 3,
      avgTime: '12 min',
      solvedBy: 78,
      description: 'Sort an array of integers in ascending order without built-in sort functions',
      isNew: false,
      isRecommended: false,
      streakBonus: false
    },
    { 
      id: 2, 
      title: 'String Reversal', 
      difficulty: 'Easy', 
      topic: 'Strings',
      xp: 75, 
      status: 'completed',
      submissions: 1,
      avgTime: '5 min',
      solvedBy: 92,
      description: 'Reverse a string without using built-in reverse methods',
      isNew: false,
      isRecommended: false,
      streakBonus: false
    },
    { 
      id: 3, 
      title: 'Binary Search', 
      difficulty: 'Hard', 
      topic: 'Algorithms',
      xp: 200, 
      status: 'attempted',
      submissions: 5,
      avgTime: '25 min',
      solvedBy: 34,
      description: 'Implement binary search to find an element in a sorted array',
      isNew: false,
      isRecommended: true,
      streakBonus: false
    },
    { 
      id: 4, 
      title: 'Two Sum Problem', 
      difficulty: 'Easy', 
      topic: 'Arrays',
      xp: 100, 
      status: 'not_started',
      submissions: 0,
      avgTime: '8 min',
      solvedBy: 85,
      description: 'Find two numbers in an array that add up to a target sum',
      isNew: true,
      isRecommended: true,
      streakBonus: true
    },
    { 
      id: 5, 
      title: 'Palindrome Checker', 
      difficulty: 'Easy', 
      topic: 'Strings',
      xp: 75, 
      status: 'not_started',
      submissions: 0,
      avgTime: '6 min',
      solvedBy: 88,
      description: 'Check if a string is a palindrome (reads the same forwards and backwards)',
      isNew: false,
      isRecommended: false,
      streakBonus: false
    },
    { 
      id: 6, 
      title: 'Merge Sort Implementation', 
      difficulty: 'Hard', 
      topic: 'Algorithms',
      xp: 250, 
      status: 'not_started',
      submissions: 0,
      avgTime: '35 min',
      solvedBy: 22,
      description: 'Implement the merge sort algorithm from scratch',
      isNew: true,
      isRecommended: false,
      streakBonus: false
    },
    { 
      id: 7, 
      title: 'Linked List Reversal', 
      difficulty: 'Medium', 
      topic: 'Data Structures',
      xp: 175, 
      status: 'not_started',
      submissions: 0,
      avgTime: '18 min',
      solvedBy: 45,
      description: 'Reverse a singly linked list iteratively and recursively',
      isNew: false,
      isRecommended: true,
      streakBonus: false
    },
    { 
      id: 8, 
      title: 'Valid Parentheses', 
      difficulty: 'Easy', 
      topic: 'Stacks',
      xp: 100, 
      status: 'not_started',
      submissions: 0,
      avgTime: '10 min',
      solvedBy: 72,
      description: 'Check if a string of parentheses is valid',
      isNew: false,
      isRecommended: false,
      streakBonus: false
    },
    { 
      id: 9, 
      title: 'Maximum Subarray', 
      difficulty: 'Medium', 
      topic: 'Arrays',
      xp: 150, 
      status: 'not_started',
      submissions: 0,
      avgTime: '15 min',
      solvedBy: 51,
      description: 'Find the contiguous subarray with the largest sum',
      isNew: false,
      isRecommended: false,
      streakBonus: false
    },
    { 
      id: 10, 
      title: 'Fibonacci Sequence', 
      difficulty: 'Easy', 
      topic: 'Recursion',
      xp: 100, 
      status: 'not_started',
      submissions: 0,
      avgTime: '12 min',
      solvedBy: 68,
      description: 'Generate the nth Fibonacci number using recursion and memoization',
      isNew: false,
      isRecommended: false,
      streakBonus: false
    },
  ];

  const topics = ['all', 'Arrays', 'Strings', 'Algorithms', 'Data Structures', 'Stacks', 'Recursion'];
  const difficulties = ['all', 'Easy', 'Medium', 'Hard'];
  const sortOptions = [
    { value: 'recommended', label: 'Recommended' },
    { value: 'xp', label: 'XP (High to Low)' },
    { value: 'difficulty', label: 'Difficulty' },
    { value: 'alphabetical', label: 'A-Z' },
  ];

  // Filter & Sort problems
  const filteredProblems = problems
    .filter(problem => {
      const matchesSearch = problem.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            problem.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDifficulty = filterDifficulty === 'all' || problem.difficulty === filterDifficulty;
      const matchesTopic = filterTopic === 'all' || problem.topic === filterTopic;
      return matchesSearch && matchesDifficulty && matchesTopic;
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
  const completed = problems.filter(p => p.status === 'completed').length;
  const totalXP = problems.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.xp, 0);
  const nextLevelXP = 3000;
  const currentLevel = 12;
  const xpProgress = Math.min((totalXP % 1000) / 1000 * 100, 100);

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

  const toggleBookmark = (e, id) => {
    e.stopPropagation();
    setBookmarks(prev => 
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#eab308]/10 rounded-xl">
            <Code2 size={24} className="text-[#eab308]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Code Editor</h2>
            <p className="text-gray-400 text-sm">Practice coding challenges and earn XP</p>
          </div>
        </div>
      </div>

      {/* Progress & Stats */}
      <div className="bg-gradient-to-r from-[#eab308]/10 to-purple-500/10 p-6 rounded-xl border border-[#eab308]/30">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{currentLevel}</div>
              <div className="text-xs text-gray-400">Level</div>
            </div>
            <div className="flex-1 max-w-md">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-300">XP to Next Level</span>
                <span className="text-[#eab308] font-bold">{totalXP % 1000}/1000</span>
              </div>
              <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-[#eab308] to-yellow-400 transition-all duration-500"
                  style={{ width: `${xpProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-green-400">{completed}</div>
              <div className="text-xs text-gray-400">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#eab308]">{totalXP}</div>
              <div className="text-xs text-gray-400">Total XP</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-400 flex items-center gap-1">
                <Flame size={16} />15
              </div>
              <div className="text-xs text-gray-400">Day Streak</div>
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
            placeholder="Search problems..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0f172a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#eab308] transition"
          />
        </div>

        {/* Difficulty Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Difficulty:</span>
          <select 
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-[#eab308]"
          >
            {difficulties.map(d => <option key={d} value={d}>{d === 'all' ? 'All Difficulties' : d}</option>)}
          </select>
        </div>

        {/* Topic Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Topic:</span>
          <select 
            value={filterTopic}
            onChange={(e) => setFilterTopic(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-[#eab308]"
          >
            {topics.map(t => <option key={t} value={t}>{t === 'all' ? 'All Topics' : t}</option>)}
          </select>
        </div>

        {/* Sort & View Toggle */}
        <div className="flex items-center gap-2 ml-auto">
          <ArrowUpDown size={14} className="text-gray-400" />
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-[#eab308]"
          >
            {sortOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          
          <div className="flex bg-[#0f172a] p-1 rounded-lg border border-gray-700">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded transition ${viewMode === 'list' ? 'bg-[#eab308] text-black' : 'text-gray-400 hover:text-white'}`}
              title="List View"
            >
              <List size={16} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition ${viewMode === 'grid' ? 'bg-[#eab308] text-black' : 'text-gray-400 hover:text-white'}`}
              title="Grid View"
            >
              <Grid3X3 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Problems List/Grid */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-3'}>
        {filteredProblems.length > 0 ? (
          filteredProblems.map((problem) => (
            <div 
              key={problem.id} 
              className={`bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl border border-gray-700 p-5 hover:border-gray-600 hover:shadow-lg hover:shadow-[#eab308]/10 transition-all duration-300 group cursor-pointer ${
                viewMode === 'grid' ? '' : ''
              }`}
              onClick={() => navigate(`/student/challenge/${problem.id}`)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(problem.status)}
                  <h3 className="text-lg font-bold text-white group-hover:text-[#eab308] transition-colors">
                    {problem.title}
                  </h3>
                </div>
                
                <button 
                  onClick={(e) => toggleBookmark(e, problem.id)}
                  className="p-1.5 text-gray-400 hover:text-[#eab308] hover:bg-[#eab308]/10 rounded transition"
                  title={bookmarks.includes(problem.id) ? "Remove bookmark" : "Save for later"}
                >
                  {bookmarks.includes(problem.id) ? (
                    <BookmarkCheck size={18} className="text-[#eab308]" />
                  ) : (
                    <Bookmark size={18} />
                  )}
                </button>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className={`px-2 py-1 rounded text-xs font-bold border ${getDifficultyColor(problem.difficulty)}`}>
                  {problem.difficulty}
                </span>
                <span className="px-2 py-1 bg-[#0f172a] border border-gray-700 rounded text-xs text-gray-300">
                  {problem.topic}
                </span>
                {problem.isNew && (
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs font-bold border border-blue-500/20 flex items-center gap-1">
                    <Sparkles size={10} /> New
                  </span>
                )}
                {problem.isRecommended && (
                  <span className="px-2 py-1 bg-purple-500/10 text-purple-400 rounded text-xs font-bold border border-purple-500/20 flex items-center gap-1">
                    <Star size={10} fill="currentColor" /> Recommended
                  </span>
                )}
                {problem.streakBonus && (
                  <span className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded text-xs font-bold border border-orange-500/20 flex items-center gap-1">
                    <Flame size={10} /> +50% XP
                  </span>
                )}
              </div>
              
              {/* Description */}
              <p className="text-gray-400 text-sm mb-4 line-clamp-2">{problem.description}</p>
              
              {/* Meta Info */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 text-gray-500">
                  <span className="flex items-center gap-1 text-[#eab308]">
                    <Zap size={12} />
                    {problem.xp} XP
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {problem.avgTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Target size={12} />
                    {problem.solvedBy}% solved
                  </span>
                </div>
                
                {problem.status === 'completed' ? (
                  <span className="px-3 py-1.5 bg-green-500/10 text-green-500 rounded-lg text-sm font-medium border border-green-500/20 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Completed
                  </span>
                ) : problem.status === 'attempted' ? (
                  <span className="px-3 py-1.5 bg-yellow-500/10 text-yellow-500 rounded-lg text-sm font-medium border border-yellow-500/20 flex items-center gap-1">
                    <Clock size={14} /> In Progress
                  </span>
                ) : (
                  <button className="px-4 py-2 bg-[#eab308] hover:bg-yellow-500 text-black rounded-lg text-sm font-bold transition flex items-center gap-2 group-hover:scale-105">
                    Start Challenge
                  </button>
                )}
              </div>

              {/* Quick Preview Button */}
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewProblem(problem);
                }}
                className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-[#eab308] transition"
              >
                <Eye size={12} /> Quick Preview
              </button>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-[#1e293b] rounded-xl border border-gray-700 col-span-full">
            <Code2 size={48} className="mx-auto mb-4 text-gray-600" />
            <h3 className="text-lg font-bold text-white mb-2">No Problems Found</h3>
            <p className="text-gray-400">Try adjusting your filters or search term.</p>
          </div>
        )}
      </div>

      {/* Quick Preview Modal */}
      {previewProblem && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-xl font-bold text-white">{previewProblem.title}</h3>
              <button 
                onClick={() => setPreviewProblem(null)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className={`px-2 py-1 rounded text-xs font-bold border ${getDifficultyColor(previewProblem.difficulty)}`}>
                  {previewProblem.difficulty}
                </span>
                <span className="px-2 py-1 bg-[#0f172a] border border-gray-700 rounded text-xs text-gray-300">
                  {previewProblem.topic}
                </span>
                <span className="flex items-center gap-1 text-[#eab308] text-xs">
                  <Zap size={12} /> {previewProblem.xp} XP
                </span>
              </div>
              
              <p className="text-gray-300 leading-relaxed">{previewProblem.description}</p>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-[#0f172a] p-3 rounded-lg">
                  <div className="text-gray-400 mb-1">Avg. Time</div>
                  <div className="font-bold text-white">{previewProblem.avgTime}</div>
                </div>
                <div className="bg-[#0f172a] p-3 rounded-lg">
                  <div className="text-gray-400 mb-1">Solved By</div>
                  <div className="font-bold text-white">{previewProblem.solvedBy}%</div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => {
                    setPreviewProblem(null);
                    navigate(`/student/challenge/${previewProblem.id}`);
                  }}
                  className="flex-1 py-3 bg-[#eab308] hover:bg-yellow-500 text-black rounded-lg font-bold transition"
                >
                  Start Challenge
                </button>
                <button 
                  onClick={() => setPreviewProblem(null)}
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

export default CodeEditor;