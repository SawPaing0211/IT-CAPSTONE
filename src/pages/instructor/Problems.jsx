import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Added import
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  BarChart3,
  Code,
  Bug,
  CheckCircle2,
  XCircle
} from 'lucide-react';

function InstructorProblems() {
  const navigate = useNavigate(); // Initialize navigate hook
  
  // Mock Data with Blocks and Subjects
  const [problems, setProblems] = useState([
    { id: 1, title: 'Array Sorting', type: 'Code', difficulty: 'Easy', language: 'Python', submissions: 142, passRate: 78, course: 'CS101', subject: 'Fundamentals of Programming', block: '301', status: 'Active' },
    { id: 2, title: 'Loop Debugging', type: 'Debug', difficulty: 'Medium', language: 'Java', submissions: 98, passRate: 65, course: 'CS102', subject: 'Computer Programming 1', block: '302', status: 'Active' },
    { id: 3, title: 'String Reversal', type: 'Code', difficulty: 'Easy', language: 'Python', submissions: 203, passRate: 92, course: 'CS101', subject: 'Fundamentals of Programming', block: '301', status: 'Active' },
    { id: 4, title: 'Binary Search', type: 'Code', difficulty: 'Hard', language: 'C#', submissions: 45, passRate: 34, course: 'CS201', subject: 'Computer Programming 2', block: '303', status: 'Active' },
    { id: 5, title: 'Fix Off-by-One Error', type: 'Debug', difficulty: 'Medium', language: 'Java', submissions: 76, passRate: 58, course: 'CS102', subject: 'Computer Programming 1', block: '302', status: 'Draft' },
    { id: 6, title: 'Bubble Sort Implementation', type: 'Code', difficulty: 'Easy', language: 'Python', submissions: 120, passRate: 88, course: 'IT115', subject: 'Introduction to Computing', block: '304', status: 'Active' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterBlock, setFilterBlock] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');

  // Filter problems
  const filteredProblems = problems.filter(problem => {
    const matchesSearch = problem.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDifficulty = filterDifficulty === 'all' || problem.difficulty === filterDifficulty;
    const matchesType = filterType === 'all' || problem.type === filterType;
    const matchesBlock = filterBlock === 'all' || problem.block === filterBlock;
    const matchesSubject = filterSubject === 'all' || problem.subject === filterSubject;
    
    return matchesSearch && matchesDifficulty && matchesType && matchesBlock && matchesSubject;
  });

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this problem? This action cannot be undone.')) {
      setProblems(problems.filter(p => p.id !== id));
    }
  };

  const blocks = ['all', '301', '302', '303', '304', '305', '306', '307'];
  const subjects = ['all', 'Introduction to Computing', 'Fundamentals of Programming', 'Computer Programming 1', 'Computer Programming 2'];

  return (
    <div className="space-y-6">
      
      {/* Header - Single Button with Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Problem Management</h2>
          <p className="text-gray-400 text-sm">Create and manage coding challenges</p>
        </div>
        <button 
          onClick={() => navigate('/instructor/create-problem')}
          className="flex items-center gap-2 px-4 py-2 bg-[#eab308] hover:bg-yellow-500 text-black rounded-lg text-sm font-bold transition shadow-lg shadow-yellow-500/20"
        >
          <Plus size={16} /> Create New Problem
        </button>
      </div>

      {/* Enhanced Filters */}
      <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-4 rounded-xl border border-gray-700 flex flex-wrap gap-4 items-center">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Search problems..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0f172a] border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#eab308] transition"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Type:</span>
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#eab308]"
          >
            <option value="all">All Types</option>
            <option value="Code">Code Challenge</option>
            <option value="Debug">Debug Challenge</option>
          </select>
        </div>

        {/* Difficulty Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Difficulty:</span>
          <select 
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#eab308]"
          >
            <option value="all">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
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
      </div>

      {/* Problems Table */}
      <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f172a]/50 border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Problem</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Difficulty</th>
                <th className="p-4 font-semibold hidden md:table-cell">Subject</th>
                <th className="p-4 font-semibold hidden lg:table-cell">Block</th>
                <th className="p-4 font-semibold hidden lg:table-cell">Language</th>
                <th className="p-4 font-semibold hidden lg:table-cell">Submissions</th>
                <th className="p-4 font-semibold hidden lg:table-cell">Pass Rate</th>
                <th className="p-4 font-semibold hidden md:table-cell">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredProblems.length > 0 ? (
                filteredProblems.map((problem) => (
                  <tr key={problem.id} className="hover:bg-[#2a3850]/50 transition group">
                    <td className="p-4">
                      <div className="font-medium text-white group-hover:text-[#eab308] transition-colors">{problem.title}</div>
                      <div className="text-xs text-gray-500">{problem.course}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        problem.type === 'Code' 
                          ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                          : 'bg-purple-500/10 text-purple-500 border border-purple-500/20'
                      }`}>
                        {problem.type === 'Code' ? <Code size={12} /> : <Bug size={12} />}
                        {problem.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        problem.difficulty === 'Easy' ? 'bg-green-500/10 text-green-500' :
                        problem.difficulty === 'Medium' ? 'bg-yellow-500/10 text-yellow-500' :
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {problem.difficulty}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300 text-sm hidden md:table-cell">
                      {problem.subject}
                    </td>
                    <td className="p-4 text-gray-300 text-sm hidden lg:table-cell">
                      Block {problem.block}
                    </td>
                    <td className="p-4 text-gray-300 text-sm hidden lg:table-cell">{problem.language}</td>
                    <td className="p-4 text-gray-300 text-sm hidden lg:table-cell">{problem.submissions}</td>
                    <td className="p-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${
                              problem.passRate >= 70 ? 'bg-green-500' :
                              problem.passRate >= 50 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${problem.passRate}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-300">{problem.passRate}%</span>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        problem.status === 'Active' 
                          ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                          : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                      }`}>
                        {problem.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition" title="Edit">
                          <Edit2 size={18} />
                        </button>
                        <button className="p-2 text-gray-400 hover:text-[#eab308] hover:bg-[#eab308]/10 rounded-lg transition" title="View Stats">
                          <BarChart3 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(problem.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition" 
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-gray-500">
                    No problems found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer */}
      <div className="flex justify-between items-center text-sm text-gray-400">
        <span>Showing {filteredProblems.length} of {problems.length} problems</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><CheckCircle2 size={14} className="text-green-500" /> {problems.filter(p => p.status === 'Active').length} Active</span>
          <span className="flex items-center gap-1"><XCircle size={14} className="text-gray-500" /> {problems.filter(p => p.status === 'Draft').length} Draft</span>
        </div>
      </div>

    </div>
  );
}

export default InstructorProblems;