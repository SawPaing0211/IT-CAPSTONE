import { useState, useEffect } from 'react';
import { BookOpen, Users, Search, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function InstructorCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/instructor/courses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses || []);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    return course.block_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
           (course.course_name && course.course_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
           (course.description && course.description.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <BookOpen className="text-blue-400" size={32} />
          My Classes
        </h1>
        <p className="text-slate-400">View and manage your assigned class blocks</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by block number or course name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 outline-none transition-colors"
          />
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/50 rounded-2xl border border-dashed border-slate-800">
          <BookOpen size={64} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Classes Found</h3>
          <p className="text-slate-400">
            {searchTerm ? 'Try adjusting your search' : 'You are not assigned to any classes yet'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCourses.map((course) => (
            <div 
              key={course.id}
              onClick={() => navigate(`/instructor/courses/${course.block_number}`)}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 transition-all duration-200 hover:shadow-lg hover:border-blue-500/30 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
                    <BookOpen size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">Block {course.block_number}</h3>
                      {course.student_count > 0 && (
                        <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs font-semibold rounded-full border border-green-500/20">
                          Active
                        </span>
                      )}
                    </div>
                    
                    {course.course_name && (
                      <p className="text-purple-300 font-medium mb-2">{course.course_name}</p>
                    )}
                    
                    {course.description && (
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2">{course.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="flex items-center gap-2 text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full">
                        <Users size={14} /> 
                        <span className="font-semibold text-white">{course.student_count || 0}</span> Students
                      </span>
                      <span className="flex items-center gap-2 text-slate-400 bg-slate-800 px-3 py-1.5 rounded-full">
                        <BookOpen size={14} /> 
                        <span className="font-semibold text-white">{course.problem_count || 0}</span> Problems
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="ml-4">
                  <ArrowRight className="text-slate-400" size={24} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default InstructorCourses;