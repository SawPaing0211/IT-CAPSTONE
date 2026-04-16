import { useNavigate } from 'react-router-dom';
import { 
  Zap, 
  Trophy, 
  Shield, 
  Code, 
  CheckCircle, 
  Bug, 
  BarChart3, 
  Users, 
  FileSearch 
} from 'lucide-react';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0b1120] text-white overflow-x-hidden">
      
      {/* HERO SECTION */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 text-center">
        {/* Background Pattern (Optional subtle effect) */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNmZmYiLz48L3N2Zz4=')]"></div>
        </div>

        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#eab308]/30 bg-[#eab308]/10 text-[#eab308] text-sm font-medium">
          <Zap size={16} />
          <span>Adamson University Capstone Project</span>
        </div>

        {/* Main Title */}
        <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
          <span className="block text-white">Master Code,</span>
          <span className="block text-[#eab308]">Conquer Bugs.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          An automated code assessment and gamified debugging system for introductory programming courses. 
          Write code, get instant feedback, and level up your skills.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <button 
            onClick={() => navigate('/login')} // UPDATED: Navigates to Role Selection
            className="px-8 py-4 bg-[#eab308] hover:bg-yellow-500 text-black font-bold rounded-lg text-lg transition transform hover:scale-105 flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20"
          >
            Start Your Quest
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </button>
          <button 
            onClick={() => navigate('/guest')}
            className="px-8 py-4 bg-transparent border border-[#eab308] hover:bg-[#eab308]/10 text-white font-bold rounded-lg text-lg transition flex items-center justify-center"
          >
            Try a Challenge
          </button>
        </div>

        {/* Top 3 Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
          <FeatureCard 
            icon={<Zap className="text-[#eab308]" size={32} />}
            title="Instant Feedback"
            description="Automated test case evaluation"
          />
          <FeatureCard 
            icon={<Trophy className="text-[#eab308]" size={32} />}
            title="Gamified Debugging"
            description="Earn XP fixing real bugs"
          />
          <FeatureCard 
            icon={<Shield className="text-[#eab308]" size={32} />}
            title="Plagiarism Detection"
            description="Code similarity checking"
          />
        </div>
      </section>

      {/* ADDITIONAL FEATURES SECTION */}
      <section className="py-20 px-4 bg-[#0f172a]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to <span className="text-[#eab308]">Level Up</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              A complete platform for programming education — from code submission to gamified practice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCardSmall 
              icon={<Code className="text-[#eab308]" size={24} />}
              title="Web-Based Code Editor"
              description="Write and submit code directly in the browser with syntax highlighting."
            />
            <FeatureCardSmall 
              icon={<CheckCircle className="text-[#eab308]" size={24} />}
              title="Automated Assessment"
              description="Predefined test cases automatically evaluate submissions and provide instant results."
            />
            <FeatureCardSmall 
              icon={<Bug className="text-[#eab308]" size={24} />}
              title="Debugging Challenges"
              description="Gamified bug-fixing exercises where students earn XP and climb leaderboards."
            />
            <FeatureCardSmall 
              icon={<BarChart3 className="text-[#eab308]" size={24} />}
              title="Performance Analytics"
              description="Instructors monitor student progress with detailed dashboards and reports."
            />
            <FeatureCardSmall 
              icon={<Users className="text-[#eab308]" size={24} />}
              title="Multi-Role System"
              description="Dedicated interfaces for students, instructors, and administrators."
            />
            <FeatureCardSmall 
              icon={<FileSearch className="text-[#eab308]" size={24} />}
              title="Similarity Checking"
              description="Basic code plagiarism detection to maintain academic integrity."
            />
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-4 border-t border-gray-800 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="bg-[#eab308] p-2 rounded-lg">
            <Code size={24} className="text-black" />
          </div>
          <span className="text-2xl font-bold text-[#eab308]">FORGE.DEV</span>
        </div>
        <p className="text-gray-500 mb-2">Adamson University — College of Computing and Information Technology</p>
        <p className="text-gray-600 text-sm">SDG 4 — Quality Education • Capstone Project 2026</p>
      </footer>
    </div>
  );
}

// Helper Component: Large Feature Card
function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-[#1e293b] p-8 rounded-xl border border-gray-700 hover:border-[#eab308]/50 transition duration-300 group">
      <div className="mb-4 p-3 bg-[#eab308]/10 rounded-lg inline-block group-hover:bg-[#eab308]/20 transition">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

// Helper Component: Small Feature Card
function FeatureCardSmall({ icon, title, description }) {
  return (
    <div className="bg-[#1e293b] p-6 rounded-xl border border-gray-700 hover:border-[#eab308]/50 transition duration-300">
      <div className="mb-4 p-2 bg-[#eab308]/10 rounded-lg inline-block">
        {icon}
      </div>
      <h3 className="text-lg font-bold mb-2 text-white">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}

export default LandingPage;