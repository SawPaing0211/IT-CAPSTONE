import { useNavigate } from 'react-router-dom';
import { 
  Sword, Shield, Zap, Trophy, Code, Bug, 
  Lock, Users, BarChart3, Terminal, 
  Sparkles, ChevronRight, Gamepad2, Crown 
} from 'lucide-react';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-10 right-10 w-96 h-96 bg-yellow-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-6000"></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-white/10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-400 rounded-lg blur-lg opacity-50"></div>
              <Gamepad2 size={32} className="relative text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Forge.Dev</h1>
              <p className="text-xs text-slate-400">Adamson University Capstone</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="text-slate-300 hover:text-white font-medium transition"
            >
              Login
            </button>
            <button 
              onClick={() => navigate('/register')}
              className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-purple-600 hover:from-yellow-400 hover:to-purple-500 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-purple-500/30"
            >
              Start Quest
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full mb-8">
          <Crown size={16} className="text-yellow-400" />
          <span className="text-yellow-400 text-sm font-semibold">Adamson University Capstone Project</span>
        </div>

        <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Master Code,<br />
          <span className="bg-gradient-to-r from-yellow-400 to-purple-600 bg-clip-text text-transparent">
            Conquer Bugs.
          </span>
        </h1>

        <p className="text-xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
          An automated code assessment and gamified debugging system for introductory programming courses. 
          Write code, get instant feedback, and level up your skills.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            onClick={() => navigate('/register')}
            className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-purple-600 hover:from-yellow-400 hover:to-purple-500 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-2xl shadow-purple-500/30 flex items-center gap-3 text-lg"
          >
            <Sword size={24} />
            Start Your Quest
            <ChevronRight size={24} />
          </button>
          <button 
            onClick={() => navigate('/login')}
            className="px-8 py-4 bg-slate-800/50 hover:bg-slate-700/50 border-2 border-purple-500/50 hover:border-purple-400 text-white font-bold rounded-xl transition-all backdrop-blur-sm flex items-center gap-3 text-lg"
          >
            <Shield size={24} />
            Try a Challenge
          </button>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-slate-800/30 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-yellow-500/50 transition-all group">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-yellow-500/10 rounded-xl group-hover:scale-110 transition-transform">
                <Zap size={32} className="text-yellow-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Instant Feedback</h3>
            <p className="text-slate-400">Automated test case evaluation</p>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition-all group">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform">
                <Trophy size={32} className="text-purple-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Gamified Debugging</h3>
            <p className="text-slate-400">Earn XP fixing real bugs</p>
          </div>

          <div className="bg-slate-800/30 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-pink-500/50 transition-all group">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-pink-500/10 rounded-xl group-hover:scale-110 transition-transform">
                <Lock size={32} className="text-pink-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Plagiarism Detection</h3>
            <p className="text-slate-400">Code similarity checking</p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative z-10 bg-slate-900/50 backdrop-blur-sm border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything You Need to{' '}
              <span className="bg-gradient-to-r from-yellow-400 to-purple-600 bg-clip-text text-transparent">
                Level Up
              </span>
            </h2>
            <p className="text-xl text-slate-400">
              A complete platform for programming education — from code submission to gamified practice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Code size={28} />}
              title="Web-Based Code Editor"
              description="Write and submit code directly in the browser with syntax highlighting."
              color="blue"
            />
            <FeatureCard 
              icon={<Terminal size={28} />}
              title="Automated Assessment"
              description="Predefined test cases automatically evaluate submissions and provide instant results."
              color="purple"
            />
            <FeatureCard 
              icon={<Bug size={28} />}
              title="Debugging Challenges"
              description="Gamified bug-fixing exercises where students earn XP and climb leaderboards."
              color="pink"
            />
            <FeatureCard 
              icon={<BarChart3 size={28} />}
              title="Performance Analytics"
              description="Instructors monitor student progress with detailed dashboards and reports."
              color="yellow"
            />
            <FeatureCard 
              icon={<Users size={28} />}
              title="Multi-Role System"
              description="Dedicated interfaces for students, instructors, and administrators."
              color="green"
            />
            <FeatureCard 
              icon={<Shield size={28} />}
              title="Similarity Checking"
              description="Basic code plagiarism detection to maintain academic integrity."
              color="red"
            />
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
        <div className="bg-gradient-to-r from-purple-600/20 to-yellow-600/20 border border-white/20 rounded-3xl p-12 backdrop-blur-sm">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-400 rounded-full blur-2xl opacity-30 animate-pulse"></div>
              <Sparkles size={64} className="relative text-yellow-400" />
            </div>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Begin Your Journey?
          </h2>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Join thousands of students mastering code through gamified learning. 
            Create your adventurer and start coding today!
          </p>
          <button 
            onClick={() => navigate('/register')}
            className="px-10 py-4 bg-gradient-to-r from-yellow-500 to-purple-600 hover:from-yellow-400 hover:to-purple-500 text-white font-bold rounded-xl transition-all transform hover:scale-105 shadow-2xl shadow-purple-500/30 flex items-center gap-3 text-lg mx-auto"
          >
            <Gamepad2 size={24} />
            Create Your Adventurer
            <ChevronRight size={24} />
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Code size={24} className="text-yellow-400" />
            </div>
            <span className="text-xl font-bold text-white">FORGE.DEV</span>
          </div>
          <p className="text-slate-400 text-sm">
            Adamson University — College of Computing and Information Technology
          </p>
          <p className="text-slate-500 text-xs mt-2">
            SDG 4 — Quality Education • Capstone Project 2026
          </p>
        </div>
      </footer>

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
        .animation-delay-6000 {
          animation-delay: 6s;
        }
      `}</style>
    </div>
  );
}

// Feature Card Component
function FeatureCard({ icon, title, description, color }) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400 hover:border-blue-500/50',
    purple: 'bg-purple-500/10 text-purple-400 hover:border-purple-500/50',
    pink: 'bg-pink-500/10 text-pink-400 hover:border-pink-500/50',
    yellow: 'bg-yellow-500/10 text-yellow-400 hover:border-yellow-500/50',
    green: 'bg-green-500/10 text-green-400 hover:border-green-500/50',
    red: 'bg-red-500/10 text-red-400 hover:border-red-500/50'
  };

  return (
    <div className="bg-slate-800/30 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:scale-105 transition-all group hover:border-white/20">
      <div className={`inline-flex p-3 rounded-xl mb-4 ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-slate-400 leading-relaxed">{description}</p>
    </div>
  );
}

export default LandingPage;