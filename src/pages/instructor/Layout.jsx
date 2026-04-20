import { useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  LogOut, LayoutDashboard, BookOpen, PlusCircle, 
  Users, BarChart3, ShieldCheck, Gamepad2, 
  Megaphone, AlertTriangle, School, FileText // ✅ Added FileText here
} from 'lucide-react';

function InstructorLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const userName = JSON.parse(localStorage.getItem('user') || '{}').name || 'Instructor';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const navItems = [
    { path: '/instructor/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/instructor/courses', label: 'My Classes', icon: School },
    { path: '/instructor/problems', label: 'Problem Management', icon: BookOpen },
    { path: '/instructor/problems/create', label: 'Create Problem', icon: PlusCircle },
    { path: '/instructor/announcements', label: 'Announcements', icon: Megaphone },
    { path: '/instructor/plagiarism', label: 'Plagiarism Check', icon: AlertTriangle },
    { path: '/instructor/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/instructor/lessons', label: 'Course Materials', icon: FileText }, // ✅ Now this works
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <ShieldCheck size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Forge.Instructor</h1>
              <p className="text-xs text-slate-500">Command Center</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4 px-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-xs font-bold">
              {userName.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{userName}</p>
              <p className="text-xs text-slate-500">Instructor</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition text-sm font-medium"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 overflow-y-auto bg-slate-950 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

export default InstructorLayout;