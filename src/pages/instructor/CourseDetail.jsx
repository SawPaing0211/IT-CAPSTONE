import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  BookOpen, Users, ArrowLeft, TrendingUp, Clock, AlertCircle,
  CheckCircle, BarChart3
} from 'lucide-react';

function InstructorCourseDetail() {
  const { blockNumber } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [problems, setProblems] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourseDetail();
  }, [blockNumber]);

  const fetchCourseDetail = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/instructor/courses/${blockNumber}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCourse(data.course);
        setStudents(data.students || []);
        setProblems(data.problems || []);
        setRecentActivity(data.recent_activity || []);
      }
    } catch (err) {
      console.error('Error fetching course detail:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-8">
        <div className="text-center py-20">
          <BookOpen size={64} className="mx-auto text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Course Not Found</h3>
          <p className="text-slate-400 mb-4">The requested course does not exist.</p>
          <button
            onClick={() => navigate('/instructor/courses')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/instructor/courses')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition"
        >
          <ArrowLeft size={20} />
          Back to Courses
        </button>
        
        <div className="flex items-center gap-4 mb-4">
          <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
            <BookOpen size={32} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Block {course.block_number}</h1>
            {course.course_name && (
              <p className="text-purple-300 text-lg">{course.course_name}</p>
            )}
          </div>
        </div>
        
        {course.description && (
          <p className="text-slate-400">{course.description}</p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Users size={24} className="text-blue-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{course.student_count || 0}</p>
          <p className="text-slate-400 text-sm">Total Students</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <BookOpen size={24} className="text-green-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">{problems.length}</p>
          <p className="text-slate-400 text-sm">Active Problems</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <TrendingUp size={24} className="text-purple-400" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mb-1">
            {problems.length > 0 ? Math.round(problems.reduce((sum, p) => sum + (p.avg_score || 0), 0) / problems.length) : 0}%
          </p>
          <p className="text-slate-400 text-sm">Average Score</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Students List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Users size={20} className="text-blue-400" />
            Students ({students.length})
          </h3>
          
          {students.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p>No students enrolled yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">{student.name}</p>
                      <p className="text-sm text-slate-400">{student.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-300">Level {student.level || 1}</p>
                    <p className="text-xs text-slate-500">{student.xp || 0} XP</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Problems List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <BookOpen size={20} className="text-green-400" />
            Problems ({problems.length})
          </h3>
          
          {problems.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <BookOpen size={48} className="mx-auto mb-4 opacity-50" />
              <p>No problems assigned yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {problems.map((problem) => (
                <div key={problem.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-white">{problem.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        problem.difficulty === 'easy' ? 'bg-green-500/10 text-green-400' :
                        problem.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-red-500/10 text-red-400'
                      }`}>
                        {problem.difficulty}
                      </span>
                      <span className="text-xs text-slate-400">{problem.xp_reward || 100} XP</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-300">{problem.submission_count || 0} subs</p>
                    {problem.avg_score && (
                      <p className="text-xs text-slate-500">{Math.round(problem.avg_score)}% avg</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <Clock size={20} className="text-yellow-400" />
          Recent Activity
        </h3>
        
        {recentActivity.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Clock size={48} className="mx-auto mb-4 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${
                    activity.status === 'passed' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                  }`}>
                    {activity.status === 'passed' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  </div>
                  <div>
                    <p className="font-medium text-white">{activity.student_name}</p>
                    <p className="text-sm text-slate-400">
                      Submitted: {activity.problem_title} - Score: {activity.score}%
                    </p>
                  </div>
                </div>
                <span className="text-xs text-slate-500">
                  {activity.submitted_at ? new Date(activity.submitted_at).toLocaleTimeString() : 'Recently'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default InstructorCourseDetail;