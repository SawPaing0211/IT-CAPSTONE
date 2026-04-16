import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Plus, 
  Eye, 
  Users, 
  FileText, 
  TrendingUp,
  Calendar,
  Filter,
  BookOpen
} from 'lucide-react';

function InstructorCourses() {
  const navigate = useNavigate();
  
  // Adamson University Mock Data
  const [courses, setCourses] = useState([
    { id: 1, code: 'IT115', name: 'Introduction to Computing LEC', subject: 'Introduction to Computing', type: 'LEC', block: '301', students: 25, problems: 5, avgScore: 82, status: 'Active' },
    { id: 2, code: 'IT115L', name: 'Introduction to Computing LAB', subject: 'Introduction to Computing', type: 'LAB', block: '301', students: 25, problems: 5, avgScore: 80, status: 'Active' },
    { id: 3, code: 'IT116', name: 'Fundamentals of Programming LEC', subject: 'Fundamentals of Programming', type: 'LEC', block: '302', students: 28, problems: 8, avgScore: 75, status: 'Active' },
    { id: 4, code: 'IT116L', name: 'Fundamentals of Programming LAB', subject: 'Fundamentals of Programming', type: 'LAB', block: '302', students: 28, problems: 8, avgScore: 78, status: 'Active' },
    { id: 5, code: 'IT125', name: 'Computer Programming 1 LEC', subject: 'Computer Programming 1', type: 'LEC', block: '303', students: 22, problems: 10, avgScore: 85, status: 'Active' },
    { id: 6, code: 'IT125L', name: 'Computer Programming 1 LAB', subject: 'Computer Programming 1', type: 'LAB', block: '303', students: 22, problems: 10, avgScore: 83, status: 'Active' },
    { id: 7, code: 'IT216', name: 'Computer Programming 2 LEC', subject: 'Computer Programming 2', type: 'LEC', block: '304', students: 20, problems: 12, avgScore: 88, status: 'Active' },
    { id: 8, code: 'IT216L', name: 'Computer Programming 2 LAB', subject: 'Computer Programming 2', type: 'LAB', block: '304', students: 20, problems: 12, avgScore: 86, status: 'Active' },
  ]);

  const [filterBlock, setFilterBlock] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');

  const filteredCourses = courses.filter(course => {
    const matchBlock = filterBlock === 'all' || course.block === filterBlock;
    const matchSubject = filterSubject === 'all' || course.subject === filterSubject;
    return matchBlock && matchSubject;
  });

  const blocks = ['all', '301', '302', '303', '304', '305', '306', '307'];
  const subjects = ['all', 'Introduction to Computing', 'Fundamentals of Programming', 'Computer Programming 1', 'Computer Programming 2'];

  return (
    <div className="space-y-6">
      
      {/* Enhanced Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#eab308]/10 rounded-xl">
            <BookOpen size={24} className="text-[#eab308]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Course Management</h2>
            <p className="text-gray-400 text-sm">Manage your courses and view student progress</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#eab308] hover:bg-yellow-500 text-black rounded-lg text-sm font-bold transition shadow-lg shadow-yellow-500/20">
          <Plus size={16} /> Create New Course
        </button>
      </div>

      {/* Enhanced Filters with Icons */}
      <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-4 rounded-xl border border-gray-700 flex flex-wrap gap-4 items-center">
        {/* Subject Filter */}
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <BookOpen size={16} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Subject:</span>
          <select 
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#eab308] w-full"
          >
            {subjects.map(s => <option key={s} value={s}>{s === 'all' ? 'All Subjects' : s}</option>)}
          </select>
        </div>

        {/* Block Filter */}
        <div className="flex items-center gap-2 flex-1 min-w-[150px]">
          <Users size={16} className="text-gray-400" />
          <span className="text-gray-400 text-sm">Block:</span>
          <select 
            value={filterBlock}
            onChange={(e) => setFilterBlock(e.target.value)}
            className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#eab308] w-full"
          >
            {blocks.map(b => <option key={b} value={b}>{b === 'all' ? 'All Blocks' : `Block ${b}`}</option>)}
          </select>
        </div>
      </div>

      {/* Enhanced Courses Table */}
      <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f172a]/50 border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Code</th>
                <th className="p-4 font-semibold">Subject & Type</th>
                <th className="p-4 font-semibold">Block</th>
                <th className="p-4 font-semibold hidden md:table-cell">Students</th>
                <th className="p-4 font-semibold hidden lg:table-cell">Problems</th>
                <th className="p-4 font-semibold hidden lg:table-cell">Avg Score</th>
                <th className="p-4 font-semibold hidden md:table-cell">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course) => (
                  <tr key={course.id} className="hover:bg-[#2a3850]/50 transition group">
                    <td className="p-4">
                      <span className="font-bold text-[#eab308] group-hover:text-yellow-400 transition-colors">
                        {course.code}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-white group-hover:text-[#eab308] transition-colors">{course.name}</div>
                      <div className="text-xs text-gray-500">{course.type}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-[#0f172a] border border-gray-700 rounded text-xs text-white">
                        Block {course.block}
                      </span>
                    </td>
                    <td className="p-4 text-gray-300 text-sm hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-blue-500" />
                        {course.students}
                      </div>
                    </td>
                    <td className="p-4 text-gray-300 text-sm hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-purple-500" />
                        {course.problems}
                      </div>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <TrendingUp size={14} className="text-green-500" />
                        <span className={`font-bold ${
                          course.avgScore >= 75 ? 'text-green-400' :
                          course.avgScore >= 60 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {course.avgScore}%
                        </span>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        course.status === 'Active' 
                          ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                          : 'bg-gray-500/10 text-gray-500 border border-gray-500/20'
                      }`}>
                        {course.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => navigate(`/instructor/courses/${course.id}`)}
                        className="flex items-center justify-end gap-2 px-3 py-1.5 bg-[#eab308]/10 hover:bg-[#eab308]/20 text-[#eab308] rounded-lg text-sm font-medium transition w-fit ml-auto group-hover:bg-[#eab308]/20"
                      >
                        <Eye size={16} /> View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-gray-500">
                    No courses found matching your filters.
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

export default InstructorCourses;