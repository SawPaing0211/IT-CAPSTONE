import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Users, 
  FileText, 
  Info,
  Search,
  Filter
} from 'lucide-react';

function CourseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview'); // overview, students, problems
  const [sectionFilter, setSectionFilter] = useState('all');

  // Mock Data for Course ID
  const course = {
    id: parseInt(id),
    code: 'CS101',
    name: 'Introduction to Programming',
    instructor: 'Prof. Sasan',
    description: 'Fundamentals of programming using Python. Covers variables, loops, functions, and basic data structures.',
    students: 48,
    problems: 12,
    avgScore: 78,
    semester: 'Fall 2025',
    status: 'Active'
  };

  // Mock Students Data
  const allStudents = [
    { id: 1, name: 'Niño, Sasan', section: 'BSIT-2A', submissions: 12, avgScore: 95, lastActive: '2 min ago' },
    { id: 2, name: 'Kakazu, King', section: 'BSIT-2A', submissions: 10, avgScore: 88, lastActive: '5 min ago' },
    { id: 3, name: 'Flores, Maria', section: 'BSIT-2B', submissions: 8, avgScore: 72, lastActive: '1 hr ago' },
    { id: 4, name: 'Guzman, Iverson', section: 'BSIT-2B', submissions: 11, avgScore: 85, lastActive: '30 min ago' },
    { id: 5, name: 'Rejano, Caleb', section: 'BSIT-2C', submissions: 9, avgScore: 79, lastActive: '2 hrs ago' },
  ];

  const filteredStudents = sectionFilter === 'all' 
    ? allStudents 
    : allStudents.filter(s => s.section === sectionFilter);

  const sections = ['all', ...new Set(allStudents.map(s => s.section))];

  return (
    <div className="space-y-6">
      
      {/* Back Button & Header */}
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/instructor/courses')}
          className="p-2 text-gray-400 hover:text-white hover:bg-[#1e293b] rounded-lg transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">{course.code}: {course.name}</h2>
          <p className="text-gray-400 text-sm">{course.semester} • {course.status}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800">
        {[
          { id: 'overview', label: 'Overview', icon: Info },
          { id: 'students', label: 'Students', icon: Users },
          { id: 'problems', label: 'Problems', icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-medium transition ${
              activeTab === tab.id
                ? 'bg-[#1e293b] text-[#eab308] border-b-2 border-[#eab308]'
                : 'text-gray-400 hover:text-white hover:bg-[#1e293b]/50'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-[#1e293b] rounded-b-xl rounded-tr-xl border border-gray-700 p-6 min-h-[400px]">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#0f172a] p-6 rounded-xl border border-gray-800">
                <h3 className="text-gray-400 text-sm mb-2">Total Students</h3>
                <p className="text-3xl font-bold text-white">{course.students}</p>
              </div>
              <div className="bg-[#0f172a] p-6 rounded-xl border border-gray-800">
                <h3 className="text-gray-400 text-sm mb-2">Assigned Problems</h3>
                <p className="text-3xl font-bold text-white">{course.problems}</p>
              </div>
              <div className="bg-[#0f172a] p-6 rounded-xl border border-gray-800">
                <h3 className="text-gray-400 text-sm mb-2">Class Average</h3>
                <p className="text-3xl font-bold text-green-400">{course.avgScore}%</p>
              </div>
            </div>
            <div className="bg-[#0f172a] p-6 rounded-xl border border-gray-800">
              <h3 className="text-lg font-bold text-white mb-4">Course Description</h3>
              <p className="text-gray-300 leading-relaxed">{course.description}</p>
            </div>
          </div>
        )}

        {/* STUDENTS TAB (With Section Filter - Panel Note #11) */}
        {activeTab === 'students' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Student Roster</h3>
              
              {/* SECTION FILTER */}
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400" />
                <select 
                  value={sectionFilter}
                  onChange={(e) => setSectionFilter(e.target.value)}
                  className="bg-[#0f172a] border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#eab308] focus:outline-none"
                >
                  {sections.map(sec => (
                    <option key={sec} value={sec}>
                      {sec === 'all' ? 'All Sections' : sec}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
                    <th className="p-3">Name</th>
                    <th className="p-3">Section</th>
                    <th className="p-3 hidden md:table-cell">Submissions</th>
                    <th className="p-3 hidden md:table-cell">Avg Score</th>
                    <th className="p-3 hidden lg:table-cell">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredStudents.map(student => (
                    <tr key={student.id} className="hover:bg-[#2a3850]/50">
                      <td className="p-3 font-medium text-white">{student.name}</td>
                      <td className="p-3 text-gray-300 text-sm">
                        <span className="px-2 py-1 bg-[#0f172a] border border-gray-700 rounded text-xs">{student.section}</span>
                      </td>
                      <td className="p-3 text-gray-300 text-sm hidden md:table-cell">{student.submissions}</td>
                      <td className="p-3 text-gray-300 text-sm hidden md:table-cell">
                        <span className={`font-bold ${student.avgScore >= 75 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {student.avgScore}%
                        </span>
                      </td>
                      <td className="p-3 text-gray-500 text-xs hidden lg:table-cell">{student.lastActive}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PROBLEMS TAB */}
        {activeTab === 'problems' && (
          <div className="text-center py-12 text-gray-500">
            <FileText size={48} className="mx-auto mb-4 opacity-50" />
            <p>List of problems assigned to this course would appear here.</p>
          </div>
        )}

      </div>
    </div>
  );
}

export default CourseDetail;