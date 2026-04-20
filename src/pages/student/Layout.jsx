import { useState, useEffect } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  Zap, Trophy, Shield, Code, Bug, BarChart3, 
  Users, Settings, LogOut, Gamepad2, Star,
  Flame, Target, Clock, Crown, Award, Loader2, AlertCircle, Megaphone, Terminal // ✅ Added Terminal
} from 'lucide-react';
import BadgesModal from '../../components/BadgesModal'; 

function StudentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState({});
  const [showBadges, setShowBadges] = useState(false);
  const [authError, setAuthError] = useState(false);

  // Fetch real user data from API on mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch('http://localhost:5000/api/student/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 401) {
          handleLogout();
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setUserData(data);
          if (data.badges) setBadges(data.badges);
          
          const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({
            ...currentUser,
            level: data.user.level,
            xp: data.user.xp,
            streak: data.user.streak,
            name: data.user.name || currentUser.name
          }));
        } else {
          console.error('Failed to fetch dashboard data');
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const user = userData?.user || { level: 1, xp: 0, xp_to_next: 250, streak: 0 };
  const xpProgress = Math.min((user.xp % user.xp_to_next) / user.xp_to_next * 100, 100);
  const userName = JSON.parse(localStorage.getItem('user') || '{}').name || 'Adventurer';
  const badgeCount = Object.keys(badges).filter(key => badges[key]).length;

  if (authError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-white text-lg">Session expired. Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-slate-100 font-sans selection:bg-purple-500/30">
      
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-yellow-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-pink-600/20 rounded-full mix-blend-screen filter blur-[100px] animate-blob animation-delay-4000"></div>
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-20 border-b border-white/10 backdrop-blur-xl bg-slate-900/60 sticky top-0 shadow-lg shadow-purple-900/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Left: Logo & Welcome */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <Link to="/student/dashboard" className="group flex items-center gap-3 transition-transform hover:scale-105">
                <div className="relative p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow-lg shadow-yellow-500/20 group-hover:shadow-yellow-500/40 transition-all">
                  <Gamepad2 size={24} className="text-white" />
                </div>
                <div className="hidden md:block">
                  <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 group-hover:to-white transition-all">
                    Forge.Dev
                  </h1>
                  <p className="text-xs text-slate-400 font-medium truncate max-w-[120px]">
                    Welcome, {userName}
                  </p>
                </div>
              </Link>
            </div>

            {/* Center: Stats Cluster */}
            <div className="hidden lg:flex items-center gap-4">
              {/* Level Card */}
              <div className="flex items-center gap-3 bg-slate-800/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/5 hover:border-purple-500/30 transition-colors">
                <div className="relative">
                  <div className="w-9 h-9 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-inner border border-white/10">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : user.level}
                  </div>
                  {user.level >= 10 && (
                    <Crown size={12} className="absolute -top-1 -right-1 text-yellow-400 fill-yellow-400" />
                  )}
                </div>
                <div className="w-32">
                  <div className="flex justify-between text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">
                    <span>Lvl {user.level}</span>
                    <span>{Math.floor(user.xp % user.xp_to_next)} / {user.xp_to_next} XP</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-600 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${xpProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Streak Card */}
              <div className="flex items-center gap-2 bg-orange-500/10 px-4 py-2 rounded-xl border border-orange-500/20 hover:border-orange-500/40 transition-colors group">
                <Flame size={18} className="text-orange-400 group-hover:animate-pulse" />
                <div className="flex flex-col">
                  <span className="text-[10px] text-orange-300/70 uppercase font-bold">Streak</span>
                  <span className="text-orange-400 font-bold text-sm leading-none">
                    {loading ? '-' : user.streak} Days
                  </span>
                </div>
              </div>

              {/* Badges Button */}
              <button 
                onClick={() => setShowBadges(true)}
                className="flex items-center gap-2 bg-yellow-500/10 px-4 py-2 rounded-xl border border-yellow-500/20 hover:bg-yellow-500/20 hover:border-yellow-500/40 transition-all group"
              >
                <Award size={18} className="text-yellow-400 group-hover:rotate-12 transition-transform" />
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-yellow-300/70 uppercase font-bold">Badges</span>
                  <span className="text-yellow-400 font-bold text-sm leading-none">+{badgeCount}</span>
                </div>
              </button>
            </div>

            {/* Right: Navigation Actions - WITH SANDBOX ADDED */}
            <div className="flex items-center gap-1 sm:gap-2">
              <NavIcon 
                icon={<Target size={20} />} 
                label="Quests" 
                active={location.pathname.includes('/student/dashboard')} 
                onClick={() => navigate('/student/dashboard')} 
              />
              <NavIcon 
                icon={<Code size={20} />} 
                label="Editor" 
                active={location.pathname.includes('/student/code-editor')} 
                onClick={() => navigate('/student/code-editor')} 
              />
              <NavIcon 
                icon={<Bug size={20} />} 
                label="Debug" 
                active={location.pathname.includes('/student/debug')} 
                onClick={() => navigate('/student/debug')} 
              />
              <NavIcon 
                icon={<Terminal size={20} />} 
                label="Sandbox" 
                active={location.pathname.includes('/student/sandbox')} 
                onClick={() => navigate('/student/sandbox')} 
              />
              <NavIcon 
                icon={<Megaphone size={20} />} 
                label="News" 
                active={location.pathname.includes('/student/announcements')} 
                onClick={() => navigate('/student/announcements')} 
              />
              <NavIcon 
                icon={<Trophy size={20} />} 
                label="Rank" 
                active={location.pathname.includes('/student/leaderboard')} 
                onClick={() => navigate('/student/leaderboard')} 
              />
              <NavIcon 
                icon={<Clock size={20} />} 
                label="History" 
                active={location.pathname.includes('/student/history')} 
                onClick={() => navigate('/student/history')} 
              />
              
              <div className="w-px h-6 bg-white/10 mx-2 hidden sm:block"></div>
              
              <button 
                onClick={handleLogout} 
                className="p-2.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all tooltip-trigger"
                title="Sign Out"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh]">
            <Loader2 size={48} className="text-purple-500 animate-spin mb-4" />
            <p className="text-slate-400 animate-pulse">Syncing realm data...</p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>

      {/* Modals */}
      <BadgesModal isOpen={showBadges} onClose={() => setShowBadges(false)} userBadges={badges} />

      {/* Global Styles for Animations */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob { animation: blob 10s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: rgba(30, 41, 59, 0.5); }
        ::-webkit-scrollbar-thumb { background: rgba(139, 92, 246, 0.5); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(139, 92, 246, 0.8); }
      `}</style>
    </div>
  );
}

// Helper Component for Nav Icons
function NavIcon({ icon, label, active, onClick }) {
  return (
    <button 
      onClick={onClick}
      className={`relative p-2.5 rounded-xl transition-all duration-300 group ${
        active 
          ? 'bg-yellow-500/20 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]' 
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
      title={label}
    >
      {icon}
      {active && (
        <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-yellow-400 rounded-full"></span>
      )}
      <span className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 z-50">
        {label}
      </span>
    </button>
  );
}

export default StudentLayout;