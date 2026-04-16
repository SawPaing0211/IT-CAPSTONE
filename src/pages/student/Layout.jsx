import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Flame, 
  Star, 
  User, 
  LogOut, 
  LayoutDashboard, 
  Medal,
  Zap,
  Code2,
  Bug,
  Box,
  History,
  Grid3X3
} from 'lucide-react';
import { useState } from 'react';

function StudentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Mock Student Stats
  const [stats] = useState({
    name: 'Niño, Sasan',
    level: 12,
    xp: 2450,
    maxXp: 3000, // XP needed for next level
    streak: 15,
    badges: ['first-blood', 'bug-hunter', 'speed-demon'] // Mock badge IDs
  });

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  const tabs = [
    { name: 'Student', path: '/student/dashboard', icon: Grid3X3 },
    { name: 'Code Editor', path: '/student/code-editor', icon: Code2 },
    { name: 'Debug', path: '/student/debug', icon: Bug },
    { name: 'Sandbox', path: '/student/sandbox', icon: Box },
    { name: 'History', path: '/student/history', icon: History },
    { name: 'Leaderboard', path: '/student/leaderboard', icon: Trophy },
  ];

  // Calculate XP percentage
  const xpPercentage = Math.round((stats.xp / stats.maxXp) * 100);

  return (
    <div className="min-h-screen bg-[#0b1120] text-white flex flex-col">
      
      {/* Gamified Header */}
      <header className="sticky top-0 z-50 bg-[#0f172a]/95 backdrop-blur-md border-b border-gray-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-6">
            
            {/* Left: Logo & Greeting */}
            <div className="flex items-center gap-4">
              <div className="p-2 bg-[#eab308]/10 rounded-lg">
                <Zap size={24} className="text-[#eab308]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Forge.Dev</h1>
                <p className="text-xs text-gray-400">Welcome back, {stats.name.split(',')[0]}!</p>
              </div>
            </div>

            {/* Center: XP & Level Stats */}
            <div className="flex-1 w-full lg:w-auto flex flex-col gap-2 max-w-md">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 font-bold text-white shadow-lg shadow-purple-500/20">
                    {stats.level}
                  </span>
                  <span className="font-medium text-gray-300">Level {stats.level}</span>
                </div>
                <div className="flex items-center gap-1 text-orange-500 font-bold">
                  <Flame size={16} className="animate-pulse" />
                  <span>{stats.streak} Day Streak</span>
                </div>
              </div>
              
              {/* XP Progress Bar */}
              <div className="relative w-full h-3 bg-gray-800 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#eab308] to-yellow-300 transition-all duration-500 ease-out"
                  style={{ width: `${xpPercentage}%` }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-md">
                  {stats.xp} / {stats.maxXp} XP
                </div>
              </div>
            </div>

            {/* Right: Navigation & Badges */}
            <div className="flex items-center gap-4">
              {/* Mini Badges */}
              <div className="hidden md:flex items-center gap-1 bg-[#1e293b] px-3 py-1.5 rounded-full border border-gray-700">
                {stats.badges.map((badge, idx) => (
                  <div key={idx} className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-[10px] text-white shadow-sm" title={`Badge: ${badge}`}>
                    <Star size={12} fill="white" />
                  </div>
                ))}
                <span className="text-xs text-gray-400 ml-1">+{stats.badges.length}</span>
              </div>

              {/* Nav Tabs */}
              <div className="flex bg-[#1e293b] p-1 rounded-lg border border-gray-700">
                {tabs.map((tab) => {
                  const isActive = location.pathname === tab.path || (tab.name === 'Student' && location.pathname === '/student');
                  return (
                    <button
                      key={tab.name}
                      onClick={() => navigate(tab.path)}
                      className={`p-2 rounded-md transition ${
                        isActive 
                          ? 'bg-[#eab308] text-black shadow-md' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                      title={tab.name}
                    >
                      <tab.icon size={18} />
                    </button>
                  );
                })}
              </div>

              {/* Logout */}
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>

    </div>
  );
}

export default StudentLayout;