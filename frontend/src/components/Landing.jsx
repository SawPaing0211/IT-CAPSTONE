import { useState } from 'react'
import Auth from "./Auth";

export default function Landing({ onLogin }) {
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState('login')

  if (showAuth) {
    return (
      <div className="relative">
        <button 
          onClick={() => setShowAuth(false)}
          className="absolute top-6 left-6 text-purple-300 hover:text-white transition z-10 font-bold text-lg"
        >
          ← Back
        </button>
        <Auth onLogin={onLogin} initialMode={authMode} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/30 to-slate-950 text-white relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-purple-500/30 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10">
        {/* Navigation - Game Header Style */}
        <nav className="container mx-auto px-4 sm:px-6 py-3 sm:py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-lg sm:text-2xl shadow-lg shadow-purple-600/50">
              ⚡
            </div>
            <div>
              <span className="text-base sm:text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Forge.dev
              </span>
              <div className="text-[9px] sm:text-xs text-purple-300 font-mono">v1.0.0</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setAuthMode('login'); setShowAuth(true) }}
              className="px-3 py-1.5 sm:px-6 sm:py-3 text-xs sm:text-base bg-slate-800/80 hover:bg-slate-700 border-2 border-slate-600 hover:border-purple-500 rounded-lg transition font-bold shadow-lg"
            >
              🎮 Login
            </button>
          </div>
        </nav>

        {/* Hero Section - RPG Style */}
        <main className="container mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center">
          <div className="max-w-6xl mx-auto">
            {/* Server Status Badge */}
            <div className="inline-flex flex-wrap justify-center items-center gap-2 sm:gap-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500/50 rounded-lg px-4 py-2 sm:px-6 sm:py-3 mb-8 sm:mb-12 shadow-lg shadow-green-500/20">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-xs sm:text-sm font-bold text-green-300 font-mono">SERVER ONLINE</span>
              <span className="text-slate-500 hidden sm:inline">|</span>
              <span className="text-xs sm:text-sm text-purple-300 font-mono">Python • Java • C#</span>
            </div>
            
            {/* Main Title - Epic Game Style */}
            <div className="mb-4 sm:mb-8">
              <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-2 sm:mb-4 drop-shadow-2xl break-words px-2">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
                  FORGE
                </span>
                <span className="text-white">.DEV</span>
              </h1>
              <div className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-300 mb-3 sm:mb-6 px-2">
                Code Your Legend 🗡️
              </div>
            </div>
            
            <p className="text-sm sm:text-lg md:text-xl text-slate-300 mb-6 sm:mb-10 max-w-2xl mx-auto leading-snug sm:leading-relaxed px-2">
              Embark on epic coding quests, defeat bugs, and level up your skills in the ultimate 
              <span className="text-purple-400 font-bold"> gamified programming arena</span>.
            </p>
            
            {/* CTA Buttons - Game Menu Style */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-center mb-8 sm:mb-20">
              <button
                onClick={() => { setAuthMode('login'); setShowAuth(true) }}
                className="group relative px-6 py-3.5 sm:px-8 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-black text-sm sm:text-base transition transform hover:scale-105 shadow-2xl shadow-purple-600/50 border-2 sm:border-4 border-purple-400/30"
              >
                <span className="flex items-center justify-center gap-2 sm:gap-3">
                  <span className="text-base sm:text-lg">⚔️</span>
                  START YOUR QUEST
                  <span className="text-base sm:text-lg">⚔️</span>
                </span>
                <div className="absolute inset-0 bg-white/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition"></div>
              </button>
              <button className="px-6 py-3.5 sm:px-8 sm:py-4 bg-slate-800/90 hover:bg-slate-700/90 rounded-xl font-bold text-sm sm:text-base transition border-2 sm:border-4 border-slate-600 hover:border-purple-500 shadow-xl backdrop-blur">
                📜 View Leaderboard
              </button>
            </div>

            {/* stats for the whole server, not just me */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-8 sm:mb-14 max-w-3xl mx-auto">
              <div className="bg-gradient-to-b from-purple-900/40 to-slate-900/80 p-2.5 sm:p-5 rounded-xl border-2 border-purple-600/30 shadow-lg">
                <div className="text-xl sm:text-3xl mb-1 sm:mb-2">🗡️</div>
                <div className="text-purple-300 font-mono text-[8px] sm:text-xs mb-0.5 sm:mb-1 leading-tight truncate">QUESTS SOLVED</div>
                <div className="text-sm sm:text-2xl font-bold text-white leading-none">12,847</div>
                <div className="text-[8px] sm:text-xs text-green-400 mt-1 sm:mt-1.5 font-mono truncate">+124 today</div>
              </div>
              <div className="bg-gradient-to-b from-pink-900/40 to-slate-900/80 p-2.5 sm:p-5 rounded-xl border-2 border-pink-600/30 shadow-lg">
                <div className="text-xl sm:text-3xl mb-1 sm:mb-2">⚡</div>
                <div className="text-pink-300 font-mono text-[8px] sm:text-xs mb-0.5 sm:mb-1 leading-tight truncate">TOTAL XP</div>
                <div className="text-sm sm:text-2xl font-bold text-white leading-none">2.4M</div>
                <div className="text-[8px] sm:text-xs text-green-400 mt-1 sm:mt-1.5 font-mono truncate">+8.5k today</div>
              </div>
              <div className="bg-gradient-to-b from-blue-900/40 to-slate-900/80 p-2.5 sm:p-5 rounded-xl border-2 border-blue-600/30 shadow-lg">
                <div className="text-xl sm:text-3xl mb-1 sm:mb-2">👥</div>
                <div className="text-blue-300 font-mono text-[8px] sm:text-xs mb-0.5 sm:mb-1 leading-tight truncate">PLAYERS</div>
                <div className="text-sm sm:text-2xl font-bold text-white leading-none">847</div>
                <div className="text-[8px] sm:text-xs text-green-400 mt-1 sm:mt-1.5 font-mono truncate">142 online</div>
              </div>
            </div>

            {/* Feature Cards - RPG Inventory Style */}
            <div className="grid sm:grid-cols-3 gap-3 sm:gap-5 mb-8 sm:mb-16 max-w-5xl mx-auto">
              {[
                {
                  icon: '🎮',
                  rarity: 'legendary',
                  title: 'GAMIFIED LEARNING',
                  desc: 'Earn XP, unlock achievements, and dominate leaderboards',
                  color: 'from-yellow-600/20 to-orange-600/20',
                  border: 'border-yellow-500/50',
                  glow: 'shadow-yellow-500/30'
                },
                {
                  icon: '⚡',
                  rarity: 'epic',
                  title: 'INSTANT FEEDBACK',
                  desc: 'Real-time code execution with secure sandbox testing',
                  color: 'from-purple-600/20 to-pink-600/20',
                  border: 'border-purple-500/50',
                  glow: 'shadow-purple-500/30'
                },
                {
                  icon: '👥',
                  rarity: 'rare',
                  title: 'THREE CLASSES',
                  desc: 'Student • Instructor • Admin - Choose your role',
                  color: 'from-blue-600/20 to-cyan-600/20',
                  border: 'border-blue-500/50',
                  glow: 'shadow-blue-500/30'
                }
              ].map((feature, i) => (
                <div 
                  key={i} 
                  className={`bg-gradient-to-b ${feature.color} backdrop-blur p-4 sm:p-6 rounded-2xl border-2 ${feature.border} shadow-lg ${feature.glow} hover:transform hover:scale-105 transition group cursor-pointer text-left`}
                >
                  <div className="flex justify-between items-start mb-2 sm:mb-3">
                    <div className="text-2xl sm:text-3xl group-hover:scale-110 transition-transform">{feature.icon}</div>
                    <span className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border ${feature.border} uppercase tracking-wider`}>
                      {feature.rarity}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black mb-1 sm:mb-2 text-white tracking-wide">{feature.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-snug sm:leading-relaxed">{feature.desc}</p>
                  <div className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-white/10">
                    <div className="text-[9px] sm:text-xs text-slate-400 font-mono">+100 XP | +1 LEVEL</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Supported Languages - Like Game Platforms */}
            <div className="bg-slate-900/60 backdrop-blur p-3 sm:p-5 rounded-2xl border-2 border-slate-700 w-full sm:inline-block sm:w-auto">
              <div className="text-[10px] sm:text-xs text-slate-400 mb-2 sm:mb-3 font-mono uppercase tracking-widest">Supported Languages</div>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-4">
                {['🐍 Python', '☕ Java', '💻 C#'].map((lang) => (
                  <div key={lang} className="flex items-center gap-1.5 sm:gap-2 bg-slate-800/80 px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg border-2 border-slate-600 hover:border-purple-500 transition">
                    <span className="text-sm sm:text-lg">{lang.split(' ')[0]}</span>
                    <span className="font-bold text-xs sm:text-sm text-slate-300">{lang.split(' ')[1]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 text-center text-slate-500 text-[10px] sm:text-sm border-t border-slate-800">
          <p className="font-mono">⚔️ Forge.dev • Capstone Project • Adamson University ⚔️</p>
        </footer>
      </div>

      {/* Custom CSS for floating animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  )
}