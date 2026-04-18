import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  ShieldCheck, 
  Trophy, 
  Users, 
  Code2, 
  TrendingUp, 
  LogIn, 
  UserPlus,
  Star,
  CheckCircle2
} from 'lucide-react';

function GuestDashboard() {
  const navigate = useNavigate();

  // Mock Public Data
  const topStudents = [
    { rank: 1, name: 'Niño, Sasan', xp: 3250, level: 15 },
    { rank: 2, name: 'Guzman, Iverson', xp: 3100, level: 14 },
    { rank: 3, name: 'Kakazu, King', xp: 2890, level: 13 },
    { rank: 4, name: 'Rejano, Caleb', xp: 2650, level: 12 },
    { rank: 5, name: 'Flores, Maria', xp: 2420, level: 11 },
  ];

  const features = [
    { 
      icon: <Zap size={24} className="text-[#eab308]" />, 
      title: 'Gamified Learning', 
      desc: 'Earn XP, level up, and climb the leaderboard with every challenge.' 
    },
    { 
      icon: <ShieldCheck size={24} className="text-red-500" />, 
      title: 'Plagiarism Detection', 
      desc: 'Advanced algorithms ensure academic integrity for every submission.' 
    },
    { 
      icon: <TrendingUp size={24} className="text-blue-500" />, 
      title: 'Real-time Analytics', 
      desc: 'Instructors get detailed insights into student performance and trends.' 
    },
    { 
      icon: <Code2 size={24} className="text-green-500" />, 
      title: 'Multi-Language Support', 
      desc: 'Code in Python, Java, C#, and more with instant feedback.' 
    }
  ];

  return (
    <div className="min-h-screen bg-[#0b1120] text-white flex flex-col">
      
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-[#0b1120]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#eab308]/10 rounded-lg">
              <Zap size={24} className="text-[#eab308]" />
            </div>
            <span className="text-xl font-bold tracking-tight">Forge.Dev</span>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-4 py-2 text-gray-300 hover:text-white transition"
            >
              <LogIn size={18} /> Log In
            </button>
            <button 
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-4 py-2 bg-[#eab308] hover:bg-yellow-500 text-black rounded-lg font-bold transition shadow-lg shadow-yellow-500/20"
            >
              <UserPlus size={18} /> Sign Up
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="py-20 px-6 text-center bg-gradient-to-b from-[#0b1120] via-[#1e293b]/20 to-[#0b1120]">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#eab308]/10 border border-[#eab308]/20 rounded-full text-[#eab308] text-sm font-medium mb-6">
            <Star size={14} fill="currentColor" />
            The #1 Coding Platform for Students
          </div>
          
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
            Master Coding with <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#eab308] to-yellow-200">Forge.Dev</span>
          </h1>
          
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            A gamified educational platform that makes learning algorithms and data structures competitive, engaging, and secure.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-[#eab308] hover:bg-yellow-500 text-black rounded-xl font-bold text-lg transition shadow-lg shadow-yellow-500/25 hover:scale-105"
            >
              Get Started for Free
            </button>
            <button 
              onClick={() => document.getElementById('leaderboard').scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-4 bg-[#1e293b] hover:bg-[#2a3850] border border-gray-700 text-white rounded-xl font-bold text-lg transition hover:scale-105"
            >
              View Leaderboard
            </button>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="py-16 px-6 max-w-7xl mx-auto w-full">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Forge.Dev?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-[#1e293b] p-6 rounded-xl border border-gray-700 hover:border-gray-600 transition hover:-translate-y-1">
              <div className="p-3 bg-[#0f172a] rounded-lg w-fit mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Public Leaderboard */}
      <section id="leaderboard" className="py-16 px-6 bg-[#0f172a] border-y border-gray-800">
        <div className="max-w-4xl mx-auto w-full">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-4 flex items-center justify-center gap-3">
              <Trophy size={32} className="text-[#eab308]" />
              Top Students
            </h2>
            <p className="text-gray-400">Compete with the best and climb the ranks.</p>
          </div>

          <div className="bg-[#1e293b] rounded-xl border border-gray-700 overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-[#0f172a] text-gray-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 font-semibold">Rank</th>
                  <th className="p-4 font-semibold">Student</th>
                  <th className="p-4 font-semibold text-right">Level</th>
                  <th className="p-4 font-semibold text-right">Total XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {topStudents.map((student) => (
                  <tr key={student.rank} className="hover:bg-[#2a3850]/30 transition">
                    <td className="p-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        student.rank === 1 ? 'bg-yellow-500/20 text-yellow-500' :
                        student.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                        student.rank === 3 ? 'bg-orange-500/20 text-orange-500' :
                        'text-gray-500'
                      }`}>
                        #{student.rank}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white">{student.name}</div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs font-bold">
                        Lvl {student.level}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-bold text-[#eab308]">{student.xp.toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="text-center mt-8">
            <p className="text-sm text-gray-500 mb-4">Want to see your name here?</p>
            <button 
              onClick={() => navigate('/login')}
              className="text-[#eab308] hover:text-yellow-400 font-bold text-sm flex items-center gap-2 mx-auto"
            >
              Join Forge.Dev Today <CheckCircle2 size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center border-t border-gray-800 text-gray-500 text-sm">
        <p>© 2026 Forge.Dev. All rights reserved.</p>
        <p className="mt-1">Built with React & Tailwind CSS.</p>
      </footer>

    </div>
  );
}

export default GuestDashboard;