import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, Download, FileText, Loader2, AlertCircle, 
  CheckCircle, Lock, Unlock, Trophy, Zap, PlayCircle,
  ChevronRight, Calendar, Clock
} from 'lucide-react';

function StudentLessons() {
  const [lessons, setLessons] = useState([]);
  const [completedIds, setCompletedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState(null);
  const [xpPopup, setXpPopup] = useState(null); // For XP animation
  const navigate = useNavigate();

  useEffect(() => {
    fetchLessons();
    fetchProgress();
  }, []);

  const fetchLessons = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/student/lessons', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setLessons(data.lessons || []);
      }
    } catch (err) {
      console.error('Error fetching lessons:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/student/progress', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCompletedIds(data.completed_lessons || []);
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
    }
  };

  const handleCompleteLesson = async (lessonId, index) => {
    if (completedIds.includes(lessonId)) return;

    setCompletingId(lessonId);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/student/lessons/${lessonId}/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ lesson_id: lessonId })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Update local state
        setCompletedIds(prev => [...prev, lessonId]);
        
        // Trigger XP Popup Animation
        setXpPopup({ xp: data.xp_earned, id: Date.now() });
        setTimeout(() => setXpPopup(null), 3000);
      }
    } catch (err) {
      console.error('Error completing lesson:', err);
      alert('Failed to mark lesson as complete.');
    } finally {
      setCompletingId(null);
    }
  };

  const getFileIcon = (type) => {
    switch(type) {
      case 'pdf': return <FileText size={16} className="text-red-400" />;
      case 'doc': case 'docx': return <FileText size={16} className="text-blue-400" />;
      case 'ppt': case 'pptx': return <FileText size={16} className="text-orange-400" />;
      default: return <FileText size={16} className="text-slate-400" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400 animate-pulse">Loading your learning path...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6 relative overflow-hidden">
      
      {/* XP Popup Animation */}
      {xpPopup && (
        <div key={xpPopup.id} className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-bounce">
          <div className="bg-yellow-500/90 backdrop-blur-md text-black px-8 py-4 rounded-2xl shadow-2xl border-2 border-yellow-300 flex items-center gap-3">
            <Trophy size={32} className="animate-pulse" />
            <div>
              <p className="font-bold text-xl">+{xpPopup.xp} XP</p>
              <p className="text-sm font-semibold">Lesson Completed!</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
          <BookOpen className="text-purple-400" size={40} />
          Learning Path
        </h1>
        <p className="text-slate-400 text-lg">
          Complete lessons to unlock XP and advance your skills!
        </p>
        
        {/* Progress Bar */}
        <div className="mt-6 bg-slate-800/50 rounded-full h-4 w-full overflow-hidden border border-white/10">
          <div 
            className="bg-gradient-to-r from-purple-500 to-yellow-500 h-full transition-all duration-1000 ease-out"
            style={{ width: `${lessons.length > 0 ? (completedIds.length / lessons.length) * 100 : 0}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-2 text-sm text-slate-400">
          <span>{completedIds.length} Completed</span>
          <span>{lessons.length} Total Lessons</span>
        </div>
      </div>

      {/* Lessons Grid */}
      <div className="max-w-5xl mx-auto space-y-6">
        {lessons.length === 0 ? (
          <div className="text-center py-20 bg-slate-800/30 rounded-3xl border border-dashed border-slate-700">
            <BookOpen size={64} className="mx-auto text-slate-600 mb-4 opacity-50" />
            <h3 className="text-2xl font-bold text-white mb-2">No Lessons Available Yet</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Your instructor hasn't posted any lessons for your block yet. Check back later or start solving coding challenges!
            </p>
            <button 
              onClick={() => navigate('/student/dashboard')}
              className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold transition shadow-lg shadow-purple-500/20"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          lessons.map((lesson, index) => {
            const isCompleted = completedIds.includes(lesson.id);
            const isLocked = index > 0 && !completedIds.includes(lessons[index - 1].id) && !isCompleted;
            
            return (
              <div 
                key={lesson.id}
                className={`relative group transition-all duration-300 rounded-2xl border overflow-hidden ${
                  isLocked 
                    ? 'bg-slate-900/50 border-slate-800 opacity-75 grayscale' 
                    : isCompleted
                    ? 'bg-green-900/10 border-green-500/30 hover:border-green-500/50'
                    : 'bg-slate-800/50 border-white/10 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-500/10'
                }`}
              >
                {/* Order Badge */}
                <div className="absolute -left-3 top-6 z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ${
                    isCompleted ? 'bg-green-500 text-white' : 
                    isLocked ? 'bg-slate-700 text-slate-400' : 'bg-purple-600 text-white'
                  }`}>
                    {isCompleted ? <CheckCircle size={20} /> : index + 1}
                  </div>
                </div>

                <div className="p-6 pl-16">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className={`text-2xl font-bold mb-1 ${isLocked ? 'text-slate-500' : 'text-white'}`}>
                        {lesson.title}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock size={14} /> Lesson {index + 1}
                        </span>
                        {lesson.linked_problem_title && (
                          <span className="flex items-center gap-1 text-purple-400">
                            <PlayCircle size={14} /> Practice: {lesson.linked_problem_title}
                          </span>
                        )}
                      </div>
                    </div>

                    {isLocked ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-slate-400 border border-slate-700">
                        <Lock size={18} />
                        <span>Locked</span>
                      </div>
                    ) : isCompleted ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 rounded-lg text-green-400 border border-green-500/30">
                        <CheckCircle size={18} />
                        <span>Completed</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleCompleteLesson(lesson.id, index)}
                        disabled={completingId === lesson.id}
                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {completingId === lesson.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <>
                            <Zap size={18} />
                            Mark Complete (+50 XP)
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Content Preview */}
                  <div className={`prose prose-invert max-w-none mb-6 p-4 rounded-xl ${isLocked ? 'bg-slate-900/50' : 'bg-slate-900/30'}`}>
                    <p className="text-slate-300 line-clamp-3 leading-relaxed">
                      {lesson.content}
                    </p>
                  </div>

                  {/* Resources & Video */}
                  <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                    {lesson.video_url && (
                      <a 
                        href={lesson.video_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                          isLocked ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20'
                        }`}
                      >
                        <PlayCircle size={18} />
                        Watch Video Lecture
                      </a>
                    )}
                    
                    {/* Note: You'd need a separate endpoint to fetch files for students if not included in main lesson fetch */}
                    {/* For now, assuming resources might be empty or handled separately */}
                    {lesson.resources && lesson.resources.length > 0 && (
                       <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
                         <Download size={18} />
                         <span>{lesson.resources.length} Resource(s)</span>
                       </div>
                    )}
                  </div>
                </div>
                
                {/* Connector Line for Skill Tree Visual */}
                {index < lessons.length - 1 && (
                  <div className="absolute left-4 bottom-[-24px] w-0.5 h-6 bg-slate-700 hidden lg:block"></div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default StudentLessons;