import { useNavigate } from 'react-router-dom';
import { BookOpen, GraduationCap, Shield, User, ArrowRight } from 'lucide-react';

function RoleSelection() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center px-4 py-12">
      
      {/* Logo & Title */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="bg-[#eab308] p-3 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"></polyline>
              <polyline points="8 6 2 12 8 18"></polyline>
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-[#eab308]">FORGE.DEV</h1>
        </div>
        
        <h2 className="text-3xl font-bold text-white mb-2">Choose Your Role</h2>
        <p className="text-gray-400 text-lg">How will you use Forge.Dev?</p>
      </div>

      {/* Role Cards */}
      <div className="w-full max-w-2xl space-y-4">
        
        {/* Student Card */}
        <button 
          onClick={() => navigate('/student')}
          className="w-full bg-[#1e293b] hover:bg-[#2a3850] border border-[#eab308]/30 hover:border-[#eab308] rounded-xl p-6 transition-all duration-300 group text-left flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="bg-[#eab308]/10 p-3 rounded-lg group-hover:bg-[#eab308]/20 transition">
              <BookOpen size={24} className="text-[#eab308]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">STUDENT</h3>
              <p className="text-gray-400 text-sm">Learn to code, solve challenges, earn XP, and climb the leaderboard.</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-gray-500 group-hover:text-[#eab308] transition" />
        </button>

        {/* Instructor Card */}
        <button 
          onClick={() => navigate('/instructor')}
          className="w-full bg-[#1e293b] hover:bg-[#2a3850] border border-blue-500/30 hover:border-blue-500 rounded-xl p-6 transition-all duration-300 group text-left flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/10 p-3 rounded-lg group-hover:bg-blue-500/20 transition">
              <GraduationCap size={24} className="text-blue-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">INSTRUCTOR</h3>
              <p className="text-gray-400 text-sm">Create problems, manage courses, and monitor student progress.</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-gray-500 group-hover:text-blue-500 transition" />
        </button>

        {/* Admin Card */}
        <button 
          onClick={() => navigate('/admin')}
          className="w-full bg-[#1e293b] hover:bg-[#2a3850] border border-red-500/30 hover:border-red-500 rounded-xl p-6 transition-all duration-300 group text-left flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="bg-red-500/10 p-3 rounded-lg group-hover:bg-red-500/20 transition">
              <Shield size={24} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">ADMIN</h3>
              <p className="text-gray-400 text-sm">Manage the entire platform, users, courses, and system settings.</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-gray-500 group-hover:text-red-500 transition" />
        </button>

        {/* Guest Card */}
        <button 
          onClick={() => navigate('/guest')}
          className="w-full bg-[#1e293b] hover:bg-[#2a3850] border border-gray-600/30 hover:border-gray-500 rounded-xl p-6 transition-all duration-300 group text-left flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <div className="bg-gray-500/10 p-3 rounded-lg group-hover:bg-gray-500/20 transition">
              <User size={24} className="text-gray-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">CONTINUE AS GUEST</h3>
              <p className="text-gray-400 text-sm">Browse challenges and the leaderboard without an account.</p>
            </div>
          </div>
          <ArrowRight size={20} className="text-gray-500 group-hover:text-gray-400 transition" />
        </button>

      </div>

      {/* Sign In Link */}
      <div className="mt-8 text-center">
        <p className="text-gray-500">
          Already have an account?{' '}
          <button className="text-[#eab308] hover:text-yellow-400 font-semibold transition">
            Sign in
          </button>
        </p>
      </div>

    </div>
  );
}

export default RoleSelection;