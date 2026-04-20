import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Megaphone, Bell, AlertTriangle, Info, ChevronRight,
  Loader2, AlertCircle, Calendar, User
} from 'lucide-react';

function StudentAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/student/announcements', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (err) {
      console.error('Error fetching announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority) => {
    switch(priority) {
      case 'high': return <AlertTriangle size={20} className="text-red-400" />;
      case 'medium': return <Bell size={20} className="text-yellow-400" />;
      default: return <Info size={20} className="text-blue-400" />;
    }
  };

  const getPriorityStyles = (priority) => {
    switch(priority) {
      case 'high': return 'bg-red-500/10 border-red-500/30';
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/30';
      default: return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="text-yellow-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading announcements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Megaphone className="text-blue-400" size={32} />
            Announcements
          </h1>
          <p className="text-slate-400 mt-1">Stay updated with important messages from your instructors</p>
        </div>
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <div className="text-center py-20 bg-slate-800/30 rounded-3xl border border-dashed border-slate-700">
          <Megaphone size={64} className="mx-auto text-slate-600 mb-4 opacity-50" />
          <h3 className="text-2xl font-bold text-white mb-2">No Announcements Yet</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            Your instructors haven't posted any announcements yet. Check back later for important updates!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div 
              key={announcement.id} 
              className={`p-6 rounded-2xl border backdrop-blur-sm transition-all hover:scale-[1.01] ${
                getPriorityStyles(announcement.priority)
              }`}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getPriorityIcon(announcement.priority)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-bold text-white pr-4">{announcement.title}</h3>
                    {announcement.priority === 'high' && (
                      <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-500/30">
                        URGENT
                      </span>
                    )}
                  </div>
                  
                  <p className="text-slate-300 leading-relaxed mb-4 whitespace-pre-wrap">
                    {announcement.content}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm text-slate-400 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-2">
                        <User size={16} />
                        By {announcement.author_name}
                      </span>
                      <span className="flex items-center gap-2">
                        <Calendar size={16} />
                        {new Date(announcement.created_at).toLocaleDateString()} at {new Date(announcement.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    
                    {announcement.priority === 'high' && (
                      <span className="text-red-400 font-semibold flex items-center gap-2">
                        <AlertTriangle size={16} />
                        High Priority
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default StudentAnnouncements;