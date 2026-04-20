import { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Search, Filter, Download, 
  ChevronLeft, ChevronRight, TrendingUp, AlertCircle,
  CheckCircle, XCircle, Clock, Calendar, BarChart3, FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function InstructorProblems() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/instructor/problems', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProblems(data.problems || []);
      }
    } catch (err) {
      console.error('Error fetching problems:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this problem? This action cannot be undone.')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/instructor/problems/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (response.ok) {
        fetchProblems();
        showNotification('success', 'Problem deleted successfully!');
      } else {
        showNotification('error', data.msg || 'Failed to delete problem');
      }
    } catch (err) {
      console.error('Error:', err);
      showNotification('error', 'An error occurred while deleting the problem.');
    }
  };

  const showNotification = (type, message) => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 ${
      type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
    }`;
    notification.innerHTML = `
      <div class="flex items-center gap-2">
        ${type === 'success' ? '<CheckCircle size={20} />' : '<AlertCircle size={20} />'}
        <span>${message}</span>
      </div>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  // Filter Logic
  const filteredProblems = problems.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDifficulty = difficultyFilter === 'all' || p.difficulty === difficultyFilter;
    
    return matchesSearch && matchesDifficulty;
  });

  const paginatedProblems = filteredProblems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalPages = Math.ceil(filteredProblems.length / itemsPerPage);

  // Statistics
  const totalProblems = problems.length;
  const easyProblems = problems.filter(p => p.difficulty === 'easy').length;
  const mediumProblems = problems.filter(p => p.difficulty === 'medium').length;
  const hardProblems = problems.filter(p => p.difficulty === 'hard').length;

  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'easy': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'hard': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div className="p-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <FileText className="text-blue-400" size={32} />
              Problem Management
            </h1>
            <p className="text-slate-400">Create and manage coding challenges for your students</p>
          </div>
          <button 
            onClick={() => navigate('/instructor/problems/create')}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition shadow-lg shadow-blue-500/20"
          >
            <Plus size={20} />
            Create Problem
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Total Problems</p>
                <p className="text-2xl font-bold text-white">{totalProblems}</p>
              </div>
              <FileText className="text-blue-400" size={24} />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Easy</p>
                <p className="text-2xl font-bold text-white">{easyProblems}</p>
              </div>
              <CheckCircle className="text-green-400" size={24} />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Medium</p>
                <p className="text-2xl font-bold text-white">{mediumProblems}</p>
              </div>
              <AlertCircle className="text-yellow-400" size={24} />
            </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Hard</p>
                <p className="text-2xl font-bold text-white">{hardProblems}</p>
              </div>
              <XCircle className="text-red-400" size={24} />
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
            placeholder="Search by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 outline-none transition-colors"
          />
        </div>
        <div className="flex gap-3">
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors min-w-[150px]"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
        <span>Showing {paginatedProblems.length} of {filteredProblems.length} results</span>
        {filteredProblems.length > 0 && (
          <span>Page {currentPage} of {totalPages}</span>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-slate-500">Loading problems...</p>
        </div>
      ) : filteredProblems.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
          <FileText size={64} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Problems Found</h3>
          <p className="text-slate-400 mb-4">
            {searchTerm || difficultyFilter !== 'all'
              ? 'Try adjusting your search or filters' 
              : 'Create your first problem to get started'}
          </p>
          {(searchTerm || difficultyFilter !== 'all') && (
            <button
              onClick={() => { setSearchTerm(''); setDifficultyFilter('all'); }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Problems Grid */}
          <div className="grid gap-4">
            {paginatedProblems.map((problem) => (
              <div 
                key={problem.id} 
                className="bg-slate-900 border border-slate-800 rounded-xl p-6 transition-all duration-200 hover:shadow-lg hover:border-blue-500/30"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{problem.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty}
                      </span>
                    </div>
                    
                    {problem.description && (
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2">{problem.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="flex items-center gap-2 text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full">
                        <BarChart3 size={14} /> 
                        <span className="font-semibold text-white">{problem.submission_count || 0}</span> Submissions
                      </span>
                      {problem.avg_score && (
                        <span className="flex items-center gap-2 text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full">
                          <TrendingUp size={14} /> 
                          <span className="font-semibold text-white">{Math.round(problem.avg_score)}%</span> Avg Score
                        </span>
                      )}
                      <span className="flex items-center gap-2 text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full">
                        <Clock size={14} /> 
                        <span className="font-semibold text-white">{problem.xp_reward || 100}</span> XP
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button 
                      onClick={() => navigate(`/instructor/problems/edit/${problem.id}`)}
                      className="p-2 text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                      title="Edit Problem"
                    >
                      <Edit size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(problem.id)}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Delete Problem"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredProblems.length)} of {filteredProblems.length} entries
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
                            ? 'bg-blue-600 text-white'
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

export default InstructorProblems;