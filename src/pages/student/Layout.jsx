import { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link } from 'react-router-dom';
import { 
  Zap, Trophy, Shield, Code, Bug, BarChart3, 
  Users, Settings, LogOut, Gamepad2, Star,
  Flame, Target, Clock, Crown, Award
} from 'lucide-react';
import BadgesModal from '../../components/BadgesModal';

function StudentLayout() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState({});
  const [showBadges, setShowBadges] = useState(false);

  // Fetch real user data from API
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://localhost:5000/api/student/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
          if (data.badges) setBadges(data.badges);
          
          // Update localStorage with fresh data
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({
            ...user,
            level: data.user.level,
            xp: data.user.xp,
            streak: data.user.streak
          }));
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const user = userData?.user || { level: 1, xp: 0, xp_to_next: 250, streak: 0 };
  const xpProgress = Math.min((user.xp % user.xp_to_next) / user.xp_to_next * 100, 100);
  const userName = JSON.parse(localStorage.getItem('user') || '{}').name || 'Adventurer';

  // Count earned badges
  const badgeCount = Object.keys(badges).filter(key => badges[key]).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute top-10 right-10 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 backdrop-blur-xl bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <Link to="/student/dashboard" className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-yellow-400 rounded-lg blur-lg opacity-50"></div>
                  <Gamepad2 size={28} className="relative text-yellow-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Forge.Dev</h1>
                  <p className="text-xs text-slate-400">Welcome back, {userName}!</p>
                </div>
              </Link>
            </div>

            {/* Stats Bar */}
            <div className="flex items-center gap-6">
              {/* Level Badge */}
              <div className="flex items-center gap-3 bg-slate-800/50 px-4 py-2 rounded-xl border border-white/10">
                <div className="relative">
                  <div className="absolute inset-0 bg-purple-500 rounded-full blur-md opacity-50"></div>
                  <div className="relative w-8 h-8 bg-gradient-to-br from-purple-600 to-purple-800 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {loading ? '?' : user.level}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Level {loading ? '?' : user.level}</p>
                  <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-400 to-purple-600 rounded-full transition-all"
                      style={{ width: `${xpProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Streak */}
              <div className="flex items-center gap-2 bg-orange-500/10 px-4 py-2 rounded-xl border border-orange-500/30">
                <Flame size={18} className="text-orange-400" />
                <span className="text-orange-400 font-semibold text-sm">
                  {loading ? '?' : user.streak} Day Streak
                </span>
              </div>

              {/* ✅ NEW: Achievements / Badges */}
              <button 
                onClick={() => setShowBadges(true)}
                className="flex items-center gap-2 bg-yellow-500/10 px-3 py-2 rounded-xl border border-yellow-500/30 hover:bg-yellow-500/20 transition group"
              >
                <Award size={18} className="text-yellow-400 group-hover:scale-110 transition" />
                <span className="text-yellow-400 font-semibold text-sm">+{badgeCount}</span>
              </button>
            </div>

            {/* Navigation Icons */}
            <div className="flex items-center gap-2">
              <NavItem icon={<Target size={20} />} label="Quests" active onClick={() => navigate('/student/dashboard')} />
              <NavItem icon={<Code size={20} />} label="Code Editor" onClick={() => navigate('/student/code-editor')} />
              <NavItem icon={<Bug size={20} />} label="Debug Mode" onClick={() => navigate('/student/debug')} />
              <NavItem icon={<Trophy size={20} />} label="Leaderboard" onClick={() => navigate('/student/leaderboard')} />
              <NavItem icon={<Clock size={20} />} label="History" onClick={() => navigate('/student/history')} />
              
              <div className="w-px h-8 bg-white/10 mx-2"></div>
              
              <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 transition" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        <Outlet />
      </main>

      {/* Badge Modal */}
      <BadgesModal isOpen={showBadges} onClose={() => setShowBadges(false)} userBadges={badges} />

      {/* CSS for blob animation */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`p-2 rounded-lg transition cursor-pointer ${
        active ? 'bg-yellow-500/20 text-yellow-400' : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
      title={label}
    >
      {icon}
    </button>
  );
}

export default StudentLayout;