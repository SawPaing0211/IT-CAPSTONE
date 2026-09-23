import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE } from '../api/client'

// minimalist line-art eye icons for the password show/hide toggle
function EyeIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function EyeOffIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

export default function Auth({ onLogin }) {
  // Small drifting particles -- position/timing rolled once on mount, not
  // on every render, so typing in the form doesn't reshuffle them.
  const particles = useMemo(() => Array.from({ length: 28 }, () => ({
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: 2 + Math.random() * 3,
    delay: Math.random() * 8,
    duration: 10 + Math.random() * 14,
  })), [])

  // Large soft glow orbs for depth in the background -- fewer, bigger,
  // slower, so they read as ambient lighting rather than more particles.
  const orbs = useMemo(() => [
    { left: 12, top: 18, size: 380, color: 'rgba(168, 85, 247, 0.18)', duration: 22, delay: 0 },
    { left: 78, top: 65, size: 460, color: 'rgba(236, 72, 153, 0.14)', duration: 26, delay: 3 },
    { left: 55, top: 10, size: 300, color: 'rgba(99, 102, 241, 0.16)', duration: 30, delay: 6 },
  ], [])

  const [formData, setFormData] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [lockedInfo, setLockedInfo] = useState(null)
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
  e.preventDefault()
  setError('')
  setLoading(true)

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: formData.username, password: formData.password })
    })
    const data = await res.json()

    if (res.status === 423) {
      setLockedInfo(data)
      setCountdown(data.remaining_seconds || 900)
      // Start countdown timer
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(timer); setLockedInfo(null); return 0 }
          return prev - 1
        })
      }, 1000)
      setLoading(false)
      return
    }
    if (!res.ok) {
      if (data.attempts_left !== undefined) {
        setError(`${data.error} — ${data.warning}`)
      } else {
        throw new Error(data.error || 'Request failed')
      }
      setLoading(false)
      return
    }

    // Save tokens
    localStorage.setItem('token', data.access_token)
    localStorage.setItem('user', JSON.stringify(data.user))
    if (data.refresh_token) {
      localStorage.setItem('refresh_token', data.refresh_token)
    }

    const role = data.user.role
    console.log('Login successful, role:', role)

    setTimeout(() => {
      if (role === 'administrator') {
        window.location.href = '/admin'
      } else if (role === 'instructor') {
        window.location.href = '/instructor'
      } else if (role === 'student') {
        window.location.href = '/student'
      } else {
        onLogin(data.user)
      }
    }, 100)
  } catch (err) {
    setError(err.message)
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {orbs.map((orb, i) => (
          <div
            key={`orb-${i}`}
            className="absolute rounded-full blur-3xl animate-drift"
            style={{
              left: `${orb.left}%`,
              top: `${orb.top}%`,
              width: `${orb.size}px`,
              height: `${orb.size}px`,
              background: orb.color,
              animationDuration: `${orb.duration}s`,
              animationDelay: `${orb.delay}s`,
            }}
          ></div>
        ))}
        {particles.map((p, i) => (
          <div
            key={`particle-${i}`}
            className="absolute bg-purple-400/30 rounded-full animate-float"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          ></div>
        ))}
      </div>

      {/* Back to landing */}
      <Link
        to="/"
        className="group absolute top-4 left-4 sm:top-6 sm:left-6 z-20 flex items-center gap-2 pl-3 pr-4 py-2 rounded-full bg-slate-900/60 backdrop-blur-md border border-purple-500/30 text-slate-300 text-sm font-medium hover:text-white hover:border-purple-400/60 hover:bg-slate-900/80 transition-all duration-300 shadow-lg shadow-black/20"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-transform duration-300 group-hover:-translate-x-1"
        >
          <path d="M19 12H5" />
          <path d="M11 18l-6-6 6-6" />
        </svg>
        Back
      </Link>

      <div className="relative z-10 w-full max-w-md">
        {/* Form Container */}
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl border-2 border-purple-600/30 shadow-2xl shadow-purple-600/20 overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 p-4 sm:p-6 border-b border-purple-600/30">
            <div className="flex items-center justify-center gap-3 mb-1.5 sm:mb-2">
              <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center text-lg sm:text-2xl shadow-lg">
                ⚡
              </div>
            </div>
            <h2 className="text-xl sm:text-3xl font-black text-center bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              WELCOME BACK
            </h2>
            <p className="text-center text-slate-400 text-xs sm:text-sm mt-1 sm:mt-2">
              Enter your credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-5">
            {/* Locked Account Message */}
            {lockedInfo && (
              <div className="bg-red-900/30 border-2 border-red-500/60 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔒</span>
                  <p className="text-red-300 font-black text-sm">Account Locked</p>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Your account has been locked after <strong>3 failed attempts</strong>.
                  Please contact your administrator to unlock your account.
                </p>
                <div className="flex items-center gap-2 p-2 bg-slate-800/60 rounded-lg">
                  <span className="text-blue-400">📧</span>
                  <span className="text-blue-300 text-xs font-mono">admin@adamson.edu.ph</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-slate-800/60 rounded-lg">
                  <span className="text-yellow-400">⏱️</span>
                  <span className="text-yellow-300 text-xs">
                    Auto-unlocks in: <strong className="font-mono">
                      {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                    </strong>
                  </span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && !lockedInfo && (
              <div className="bg-red-500/10 border-2 border-red-500/50 rounded-lg p-3 flex items-center gap-2">
                <span className="text-red-400">⚠️</span>
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                <span>👤</span> Username
              </label>
              <input
                type="text"
                placeholder="Enter your hero name"
                className="w-full p-3 sm:p-4 text-sm sm:text-base rounded-lg bg-slate-800/80 text-white border-2 border-slate-700 focus:border-purple-500 outline-none transition placeholder:text-slate-600 font-mono"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
                autoComplete="username"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                <span>🔐</span> Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full p-3 sm:p-4 pr-12 text-sm sm:text-base rounded-lg bg-slate-800/80 text-white border-2 border-slate-700 focus:border-purple-500 outline-none transition placeholder:text-slate-600 font-mono"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg font-black text-sm sm:text-lg transition transform hover:scale-[1.02] shadow-xl shadow-purple-600/30 disabled:opacity-50 disabled:cursor-not-allowed border-2 border-purple-400/30 uppercase tracking-wider"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Loading...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  ⚔️ Login
                </span>
              )}
            </button>

          </form>

          {/* Footer */}
          <div className="bg-slate-950/50 p-3 sm:p-4 border-t border-purple-600/20">
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
          0%   { transform: translate(0px, 0px); }
          25%  { transform: translate(12px, -18px); }
          50%  { transform: translate(-6px, -32px); }
          75%  { transform: translate(-14px, -12px); }
          100% { transform: translate(0px, 0px); }
        }
        .animate-float {
          animation: float 12s ease-in-out infinite;
        }
        @keyframes drift {
          0%   { transform: translate(0px, 0px) scale(1); }
          33%  { transform: translate(40px, -30px) scale(1.1); }
          66%  { transform: translate(-30px, 25px) scale(0.95); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-drift {
          animation: drift 24s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}