import { useState, useEffect } from 'react';
import { 
  Users, TrendingUp, Clock, FileText, Plus, Search, Filter,
  AlertCircle, CheckCircle, BarChart3, BookOpen, ArrowRight,
  MessageSquare, Eye, Download, RefreshCw, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function InstructorOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [assignedBlocks, setAssignedBlocks] = useState([]);
  const [challengingProblems, setChallengingProblems] = useState([]);
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [selectedBlock, setSelectedBlock] = useState('all');
  const [performanceFilter, setPerformanceFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchInstructorData();
  }, []);

  const fetchInstructorData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/instructor/dashboard', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
        setRecentSubmissions(data.recent_submissions || []);
        setAssignedBlocks(data.assigned_blocks || []);
        
        // Fetch additional data for new widgets
        fetchChallengingProblems(token, data.assigned_blocks);
        fetchAtRiskStudents(token, data.assigned_blocks);
      }
    } catch (err) {
      console.error('Error fetching instructor ', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChallengingProblems = async (token, blocks) => {
    try {
      // This would be a real API call in production
      // For now, using mock data that matches your system
      const mockProblems = [
        { name: 'Binary Search', passRate: 34, attempts: 120, avgTime: '45 min' },
        { name: 'Recursion Basics', passRate: 42, attempts: 98, avgTime: '38 min' },
        { name: 'Dynamic Programming', passRate: 28, attempts: 45, avgTime: '62 min' }
      ];
      setChallengingProblems(mockProblems);
    } catch (err) {
      console.error('Error fetching challenging problems:', err);
    }
  };

  const fetchAtRiskStudents = async (token, blocks) => {
    try {
      // This would be a real API call in production
      const mockStudents = [
        { name: 'Flores, Maria', block: '301', avgScore: 42, lastSubmission: '5 days ago', issue: 'Low engagement' },
        { name: 'Dela Cruz, Juan', block: '302', avgScore: 38, lastSubmission: '1 week ago', issue: 'Missing assignments' },
        { name: 'Reyes, Ana', block: '303', avgScore: 45, lastSubmission: '3 days ago', issue: 'Concept gaps' }
      ];
      setAtRiskStudents(mockStudents);
    } catch (err) {
      console.error('Error fetching at-risk students:', err);
    }
  };

  // Filter students based on selected criteria
  const getFilteredStudents = () => {
    let filtered = [...atRiskStudents];
    
    if (selectedBlock !== 'all') {
      filtered = filtered.filter(student => student.block === selectedBlock);
    }
    
    if (performanceFilter === 'low') {
      filtered = filtered.filter(student => student.avgScore < 50);
    } else if (performanceFilter === 'medium') {
      filtered = filtered.filter(student => student.avgScore >= 50 && student.avgScore < 70);
    } else if (performanceFilter === 'high') {
      filtered = filtered.filter(student => student.avgScore >= 70);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(student => 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.block.includes(searchTerm)
      );
    }
    
    return filtered;
  };

  if (loading) {
    return (
      <div className="p-8">
        {/* Skeleton Loading State */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
              <div className="h-8 bg-slate-700 rounded mb-4"></div>
              <div className="h-12 bg-slate-700 rounded mb-2"></div>
              <div className="h-4 bg-slate-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-pulse">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6 h-96"></div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 h-96"></div>
        </div>
      </div>
    );
  }

  const filteredStudents = getFilteredStudents();
  const hasData = stats && (stats.total_students > 0 || assignedBlocks.length > 0);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <BookOpen className="text-blue-400" size={32} />
          Instructor Dashboard
        </h1>
        <p className="text-slate-400">Manage your classes, problems, and student progress</p>
      </div>

      {!hasData ? (
        /* Empty State - Get Started Guide */
        <div className="text-center py-20 bg-gradient-to-br from-slate-900/50 to-slate-800/50 rounded-2xl border border-dashed border-slate-700">
          <div className="max-w-2xl mx-auto px-6">
            <BookOpen size={64} className="mx-auto text-blue-400 mb-6 opacity-50" />
            <h2 className="text-2xl font-bold text-white mb-4">Welcome to Forge.Instructor!</h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Your dashboard is ready! To get started, you'll need to have classes assigned to you. 
              Contact your administrator to assign you to class blocks, or create problems for your existing classes.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <Users size={24} className="text-blue-400 mx-auto mb-2" />
                <h3 className="font-semibold text-white mb-2">Assign Classes</h3>
                <p className="text-sm text-slate-400">Contact admin to assign you to class blocks</p>
              </div>
              
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <FileText size={24} className="text-green-400 mx-auto mb-2" />
                <h3 className="font-semibold text-white mb-2">Create Problems</h3>
                <p className="text-sm text-slate-400">Start creating coding challenges for your students</p>
              </div>
              
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <MessageSquare size={24} className="text-purple-400 mx-auto mb-2" />
                <h3 className="font-semibold text-white mb-2">Post Announcements</h3>
                <p className="text-sm text-slate-400">Keep your students informed with updates</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => navigate('/instructor/problems/create')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Create First Problem
              </button>
              
              <button 
                onClick={() => navigate('/instructor/announcements')}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
              >
                <MessageSquare size={20} />
                Post Announcement
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className={`bg-slate-900 border p-6 rounded-xl transition group ${
              stats?.total_students > 0 ? 'border-blue-500/30 hover:border-blue-500/50' : 'border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-500/10 rounded-lg group-hover:scale-110 transition-transform">
                  <Users size={24} className="text-blue-400" />
                </div>
                {stats?.total_students > 0 && (
                  <TrendingUp size={16} className="text-green-400" />
                )}
              </div>
              <p className="text-slate-400 text-sm mb-1">Total Students</p>
              <p className="text-3xl font-bold text-white">{stats?.total_students || 0}</p>
              {stats?.total_students > 0 && (
                <p className="text-xs text-green-400 mt-1">Active this week</p>
              )}
            </div>

            <div className={`bg-slate-900 border p-6 rounded-xl transition group ${
              stats?.avg_score > 70 ? 'border-green-500/30 hover:border-green-500/50' : 
              stats?.avg_score > 50 ? 'border-yellow-500/30 hover:border-yellow-500/50' : 
              'border-red-500/30 hover:border-red-500/50'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-500/10 rounded-lg group-hover:scale-110 transition-transform">
                  <BarChart3 size={24} className="text-green-400" />
                </div>
                {stats?.avg_score > 70 ? (
                  <TrendingUp size={16} className="text-green-400" />
                ) : stats?.avg_score > 50 ? (
                  <TrendingUp size={16} className="text-yellow-400" />
                ) : (
                  <TrendingUp size={16} className="text-red-400" />
                )}
              </div>
              <p className="text-slate-400 text-sm mb-1">Avg Class Score</p>
              <p className="text-3xl font-bold text-white">{stats?.avg_score || 0}%</p>
              <p className={`text-xs mt-1 ${
                stats?.avg_score > 70 ? 'text-green-400' : 
                stats?.avg_score > 50 ? 'text-yellow-400' : 
                'text-red-400'
              }`}>
                {stats?.avg_score > 70 ? 'Excellent performance' : 
                 stats?.avg_score > 50 ? 'Needs improvement' : 
                 'Critical attention needed'}
              </p>
            </div>

            <div className={`bg-slate-900 border p-6 rounded-xl transition group ${
              stats?.pending_submissions > 0 ? 'border-yellow-500/30 hover:border-yellow-500/50' : 'border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-yellow-500/10 rounded-lg group-hover:scale-110 transition-transform">
                  <Clock size={24} className="text-yellow-400" />
                </div>
                {stats?.pending_submissions > 0 && (
                  <AlertCircle size={16} className="text-yellow-400" />
                )}
              </div>
              <p className="text-slate-400 text-sm mb-1">Pending Reviews</p>
              <p className="text-3xl font-bold text-white">{stats?.pending_submissions || 0}</p>
              {stats?.pending_submissions > 0 && (
                <p className="text-xs text-yellow-400 mt-1">Requires attention</p>
              )}
            </div>

            <div className={`bg-slate-900 border p-6 rounded-xl transition group ${
              stats?.total_problems > 0 ? 'border-purple-500/30 hover:border-purple-500/50' : 'border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-500/10 rounded-lg group-hover:scale-110 transition-transform">
                  <FileText size={24} className="text-purple-400" />
                </div>
                {stats?.total_problems > 0 && (
                  <Plus size={16} className="text-purple-400" />
                )}
              </div>
              <p className="text-slate-400 text-sm mb-1">Active Problems</p>
              <p className="text-3xl font-bold text-white">{stats?.total_problems || 0}</p>
              {stats?.total_problems > 0 && (
                <p className="text-xs text-purple-400 mt-1">Ready for students</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Assigned Classes */}
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white">My Classes</h3>
                <button 
                  onClick={() => navigate('/instructor/courses')}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  View All <ArrowRight size={16} />
                </button>
              </div>
              
              {assignedBlocks.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-slate-500 mb-4">No classes assigned yet</p>
                  <button 
                    onClick={() => navigate('/instructor/courses')}
                    className="px-4 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 rounded-lg text-sm font-medium transition"
                  >
                    Browse Available Classes
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {assignedBlocks.map((block) => (
                    <div 
                      key={block.id} 
                      onClick={() => navigate(`/instructor/courses/${block.block_number}`)}
                      className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500/20 transition">
                          <BookOpen size={20} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white">Block {block.block_number}</h4>
                          <p className="text-sm text-slate-400">{block.course_name || 'No course name'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-slate-300">{block.student_count || 0} Students</span>
                        <div className="text-xs text-slate-500 mt-1">View Details →</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Quick Actions</h3>
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/instructor/problems/create')}
                  className="w-full flex items-center gap-3 p-4 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-600/30 rounded-lg transition group"
                >
                  <div className="p-2 bg-blue-600/20 rounded-lg group-hover:bg-blue-600/30 transition">
                    <Plus size={20} className="text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white">Create Problem</p>
                    <p className="text-sm text-slate-400">Add new challenge</p>
                  </div>
                </button>

                <button 
                  onClick={() => navigate('/instructor/courses')}
                  className="w-full flex items-center gap-3 p-4 bg-green-600/10 hover:bg-green-600/20 border border-green-600/30 rounded-lg transition group"
                >
                  <div className="p-2 bg-green-600/20 rounded-lg group-hover:bg-green-600/30 transition">
                    <Users size={20} className="text-green-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white">View Classes</p>
                    <p className="text-sm text-slate-400">Manage class list</p>
                  </div>
                </button>

                <button 
                  onClick={() => navigate('/instructor/problems')}
                  className="w-full flex items-center gap-3 p-4 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-600/30 rounded-lg transition group"
                >
                  <div className="p-2 bg-purple-600/20 rounded-lg group-hover:bg-purple-600/30 transition">
                    <FileText size={20} className="text-purple-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white">Manage Problems</p>
                    <p className="text-sm text-slate-400">Edit existing problems</p>
                  </div>
                </button>

                <button 
                  onClick={() => navigate('/instructor/announcements')}
                  className="w-full flex items-center gap-3 p-4 bg-orange-600/10 hover:bg-orange-600/20 border border-orange-600/30 rounded-lg transition group"
                >
                  <div className="p-2 bg-orange-600/20 rounded-lg group-hover:bg-orange-600/30 transition">
                    <MessageSquare size={20} className="text-orange-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-white">Post Announcement</p>
                    <p className="text-sm text-slate-400">Communicate with students</p>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Two Column Layout: Challenging Problems + At-Risk Students */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Most Challenging Problems */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertCircle size={20} className="text-red-400" />
                  Most Challenging Problems
                </h3>
                <button className="text-sm text-blue-400 hover:text-blue-300">View All</button>
              </div>
              
              {challengingProblems.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle size={48} className="mx-auto mb-4 opacity-30" />
                  <p>No challenging problems detected</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {challengingProblems.map((problem, idx) => (
                    <div key={idx} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-red-500/30 transition">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{problem.name}</h4>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          problem.passRate < 40 ? 'bg-red-500/10 text-red-400' :
                          problem.passRate < 60 ? 'bg-yellow-500/10 text-yellow-400' :
                          'bg-green-500/10 text-green-400'
                        }`}>
                          {problem.passRate}% Pass
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>{problem.attempts} attempts</span>
                        <span>Avg: {problem.avgTime}</span>
                      </div>
                      <div className="mt-2 w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            problem.passRate < 40 ? 'bg-red-500' :
                            problem.passRate < 60 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${problem.passRate}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Students Needing Attention */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <AlertCircle size={20} className="text-orange-400" />
                  Students Needing Attention
                </h3>
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedBlock}
                    onChange={(e) => setSelectedBlock(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="all">All Blocks</option>
                    {assignedBlocks.map(block => (
                      <option key={block.id} value={block.block_number}>Block {block.block_number}</option>
                    ))}
                  </select>
                  
                  <select 
                    value={performanceFilter}
                    onChange={(e) => setPerformanceFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="all">All Performance</option>
                    <option value="low">Low (&lt;50%)</option>
                    <option value="medium">Medium (50-70%)</option>
                    <option value="high">High (&gt;70%)</option>
                  </select>
                </div>
              </div>

              <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>
              
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle size={48} className="mx-auto mb-4 opacity-30" />
                  <p>No students need attention</p>
                  {searchTerm && (
                    <button 
                      onClick={() => setSearchTerm('')}
                      className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      Clear search
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {filteredStudents.map((student, idx) => (
                    <div key={idx} className="p-4 bg-slate-800/50 rounded-lg border border-orange-500/20 hover:border-orange-500/40 transition">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-white text-sm">{student.name}</div>
                          <div className="text-xs text-slate-400">Block {student.block}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-orange-400">{student.avgScore}%</div>
                          <div className="text-xs text-slate-500">{student.lastSubmission}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded">
                          {student.issue}
                        </span>
                        <button className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                          <MessageSquare size={12} />
                          Message
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock size={20} className="text-blue-400" />
                Recent Student Activity
              </h3>
              <button className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>
            
            {recentSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <Clock size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-slate-500">No recent activity</p>
                <p className="text-sm text-slate-600 mt-2">Activity will appear here once students start submitting code</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSubmissions.map((sub, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg hover:bg-slate-800/50 transition">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg ${
                        sub.status === 'passed' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                      }`}>
                        {sub.status === 'passed' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                      </div>
                      <div>
                        <p className="font-medium text-white">{sub.student_name}</p>
                        <p className="text-sm text-slate-400">Submitted: {sub.problem_title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-500">
                        {sub.submitted_at ? new Date(sub.submitted_at).toLocaleTimeString() : 'Recently'}
                      </span>
                      <button className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1">
                        <Eye size={14} />
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default InstructorOverview;