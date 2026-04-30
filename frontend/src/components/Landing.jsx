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
          ⬅ Back
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
        <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-2xl shadow-lg shadow-purple-600/50">
              ⚡
            </div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Forge.dev
              </span>
              <div className="text-xs text-purple-300 font-mono">v1.0.0</div>
            </div>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => { setAuthMode('login'); setShowAuth(true) }}
              className="px-6 py-3 bg-slate-800/80 hover:bg-slate-700 border-2 border-slate-600 hover:border-purple-500 rounded-lg transition font-bold shadow-lg"
            >
              🎮 Login
            </button>
            <button 
              onClick={() => { setAuthMode('register'); setShowAuth(true) }}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg transition font-bold shadow-xl shadow-purple-600/50 transform hover:scale-105"
            >
              Start Quest ➜
            </button>
          </div>
        </nav>

        {/* Hero Section - RPG Style */}
        <main className="container mx-auto px-6 py-16 text-center">
          <div className="max-w-6xl mx-auto">
            {/* Server Status Badge */}
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-2 border-green-500/50 rounded-lg px-6 py-3 mb-12 shadow-lg shadow-green-500/20">
              <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-sm font-bold text-green-300 font-mono">SERVER ONLINE</span>
              <span className="text-slate-500">|</span>
              <span className="text-sm text-purple-300 font-mono">Python • Java • C#</span>
            </div>
            
            {/* Main Title - Epic Game Style */}
            <div className="mb-8">
              <h1 className="text-7xl md:text-8xl lg:text-9xl font-black mb-4 drop-shadow-2xl">
                <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent animate-pulse">
                  FORGE
                </span>
                <span className="text-white">.DEV</span>
              </h1>
              <div className="text-3xl md:text-4xl font-bold text-slate-300 mb-6">
                Code Your Legend 🗡️
              </div>
            </div>
            
            <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Embark on epic coding quests, defeat bugs, and level up your skills in the ultimate 
              <span className="text-purple-400 font-bold"> gamified programming arena</span>.
            </p>
            
            {/* CTA Buttons - Game Menu Style */}
            <div className="flex flex-col sm:flex-row gap-5 justify-center mb-20">
              <button 
                onClick={() => { setAuthMode('register'); setShowAuth(true) }}
                className="group relative px-12 py-6 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-black text-xl transition transform hover:scale-105 shadow-2xl shadow-purple-600/50 border-4 border-purple-400/30"
              >
                <span className="flex items-center justify-center gap-3">
                  <span className="text-2xl">⚔️</span>
                  START YOUR QUEST
                  <span className="text-2xl">⚔️</span>
                </span>
                <div className="absolute inset-0 bg-white/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition"></div>
              </button>
              <button className="px-12 py-6 bg-slate-800/90 hover:bg-slate-700/90 rounded-xl font-bold text-xl transition border-4 border-slate-600 hover:border-purple-500 shadow-xl backdrop-blur">
                📜 View Leaderboard
              </button>
            </div>

            {/* ✅ COMMUNITY STATS - Server Wide (Not Personal) */}
            <div className="grid md:grid-cols-3 gap-6 mb-16 max-w-4xl mx-auto">
              <div className="bg-gradient-to-b from-purple-900/40 to-slate-900/80 p-6 rounded-xl border-2 border-purple-600/30 shadow-lg">
                <div className="text-4xl mb-3">🗡️</div>
                <div className="text-purple-300 font-mono text-sm mb-1">QUESTS SOLVED</div>
                <div className="text-3xl font-bold text-white">12,847</div>
                <div className="text-xs text-green-400 mt-2 font-mono">+124 today</div>
              </div>
              <div className="bg-gradient-to-b from-pink-900/40 to-slate-900/80 p-6 rounded-xl border-2 border-pink-600/30 shadow-lg">
                <div className="text-4xl mb-3">⚡</div>
                <div className="text-pink-300 font-mono text-sm mb-1">TOTAL XP EARNED</div>
                <div className="text-3xl font-bold text-white">2.4M</div>
                <div className="text-xs text-green-400 mt-2 font-mono">+8.5k today</div>
              </div>
              <div className="bg-gradient-to-b from-blue-900/40 to-slate-900/80 p-6 rounded-xl border-2 border-blue-600/30 shadow-lg">
                <div className="text-4xl mb-3">👥</div>
                <div className="text-blue-300 font-mono text-sm mb-1">ACTIVE PLAYERS</div>
                <div className="text-3xl font-bold text-white">847</div>
                <div className="text-xs text-green-400 mt-2 font-mono">142 online now</div>
              </div>
            </div>

            {/* Feature Cards - RPG Inventory Style */}
            <div className="grid md:grid-cols-3 gap-6 mb-20">
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
                  className={`bg-gradient-to-b ${feature.color} backdrop-blur p-8 rounded-2xl border-2 ${feature.border} shadow-lg ${feature.glow} hover:transform hover:scale-105 transition group cursor-pointer`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="text-6xl group-hover:scale-110 transition-transform">{feature.icon}</div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${feature.border} uppercase tracking-wider`}>
                      {feature.rarity}
                    </span>
                  </div>
                  <h3 className="text-2xl font-black mb-3 text-white tracking-wide">{feature.title}</h3>
                  <p className="text-slate-300 leading-relaxed">{feature.desc}</p>
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="text-xs text-slate-400 font-mono">+100 XP | +1 LEVEL</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Supported Languages - Like Game Platforms */}
            <div className="bg-slate-900/60 backdrop-blur p-8 rounded-2xl border-2 border-slate-700 inline-block">
              <div className="text-sm text-slate-400 mb-4 font-mono uppercase tracking-widest">Supported Languages</div>
              <div className="flex gap-8">
                {['🐍 Python', '☕ Java', '💻 C#'].map((lang) => (
                  <div key={lang} className="flex items-center gap-3 bg-slate-800/80 px-6 py-3 rounded-lg border-2 border-slate-600 hover:border-purple-500 transition">
                    <span className="text-2xl">{lang.split(' ')[0]}</span>
                    <span className="font-bold text-slate-300">{lang.split(' ')[1]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="container mx-auto px-6 py-8 text-center text-slate-500 text-sm border-t border-slate-800">
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