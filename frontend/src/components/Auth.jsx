import { useState, useEffect } from 'react'

export default function Auth({ onLogin, initialMode = 'login' }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login')
  const [formData, setFormData] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedClass, setSelectedClass] = useState('student')

  useEffect(() => {
    setIsLogin(initialMode === 'login')
  }, [initialMode])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
    const payload = isLogin 
      ? { username: formData.username, password: formData.password }
      : { ...formData, role: selectedClass }
    
    try {
      const res = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Request failed')
      
      if (isLogin) {
        localStorage.setItem('token', data.access_token)
        onLogin(data.user)
      } else {
        alert('⚔️ Account created! Your quest begins!')
        setIsLogin(true)
        setFormData({ username: '', email: '', password: '' })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const classOptions = [
    { id: 'student', icon: '🗡️', name: 'Student', desc: 'Learn & conquer', color: 'from-purple-600 to-pink-600' },
    { id: 'instructor', icon: '📚', name: 'Instructor', desc: 'Teach & guide', color: 'from-blue-600 to-cyan-600' },
    { id: 'admin', icon: '👑', name: 'Admin', desc: 'Rule & manage', color: 'from-yellow-600 to-orange-600' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-purple-500/20 rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${5 + Math.random() * 10}s`
            }}
          ></div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Form Container */}
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl border-2 border-purple-600/30 shadow-2xl shadow-purple-600/20 overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-6 border-b border-purple-600/30">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-2xl shadow-lg">
                ⚡
              </div>
            </div>
            <h2 className="text-3xl font-black text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {isLogin ? 'WELCOME BACK' : 'BEGIN YOUR QUEST'}
            </h2>
            <p className="text-center text-slate-400 text-sm mt-2">
              {isLogin ? 'Enter your credentials to continue' : 'Create your character and start coding'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border-2 border-red-500/50 rounded-lg p-3 flex items-center gap-2">
                <span className="text-red-400">⚠️</span>
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            {/* Email Field (Register only) */}
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                  <span>📧</span> Email Address
                </label>
                <input
                  type="email"
                  placeholder="hero@example.com"
                  className="w-full p-4 rounded-lg bg-slate-800/80 text-white border-2 border-slate-700 focus:border-purple-500 outline-none transition placeholder:text-slate-600 font-mono"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                <span>👤</span> Username
              </label>
              <input
                type="text"
                placeholder="Enter your hero name"
                className="w-full p-4 rounded-lg bg-slate-800/80 text-white border-2 border-slate-700 focus:border-purple-500 outline-none transition placeholder:text-slate-600 font-mono"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
                autoComplete="username"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                <span>🔐</span> Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full p-4 rounded-lg bg-slate-800/80 text-white border-2 border-slate-700 focus:border-purple-500 outline-none transition placeholder:text-slate-600 font-mono"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
            </div>

            {/* Class Selection (Register only) */}
            {!isLogin && (
              <div className="space-y-3">
                <label className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                  <span>⚔️</span> Choose Your Class
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {classOptions.map((cls) => (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => setSelectedClass(cls.id)}
                      className={`p-4 rounded-lg border-2 transition transform hover:scale-105 ${
                        selectedClass === cls.id
                          ? `bg-gradient-to-br ${cls.color} border-white/50 shadow-lg`
                          : 'bg-slate-800/50 border-slate-700 hover:border-purple-500/50'
                      }`}
                    >
                      <div className="text-3xl mb-1">{cls.icon}</div>
                      <div className={`font-bold text-sm ${selectedClass === cls.id ? 'text-white' : 'text-slate-400'}`}>
                        {cls.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">{cls.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-black text-lg transition transform hover:scale-[1.02] shadow-xl shadow-purple-600/30 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-purple-400/30 uppercase tracking-wider"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Loading...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {isLogin ? '⚔️ Login' : ' Start Quest'}
                </span>
              )}
            </button>

            {/* Toggle Mode */}
            <div className="text-center pt-4 border-t border-slate-800">
              <p className="text-slate-400 text-sm">
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <button 
                  type="button" 
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-purple-400 hover:text-purple-300 font-bold hover:underline transition"
                >
                  {isLogin ? 'Register Now' : 'Login Here'}
                </button>
              </p>
            </div>
          </form>

          {/* Footer */}
          <div className="bg-slate-950/50 p-4 border-t border-purple-600/20">
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                Server Online
              </span>
              <span>•</span>
              <span>Secure Connection</span>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-purple-600/50 rounded-tl-lg"></div>
        <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-purple-600/50 rounded-tr-lg"></div>
        <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-purple-600/50 rounded-bl-lg"></div>
        <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-purple-600/50 rounded-br-lg"></div>
      </div>

      {/* Custom CSS */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}