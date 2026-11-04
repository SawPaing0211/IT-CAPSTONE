import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_BASE } from '../api/client'
import bgPlate from '../assets/landing/landing-background-plate.webp'
import clouds from '../assets/landing/landing-clouds.webp'
import mist from '../assets/landing/landing-mist.webp'
import crystalIcon from '../assets/landing/forge-crystal-icon.webp'

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
  const navigate = useNavigate()

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
      data.user = { ...data.user, must_change_password: !!data.must_change_password }
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

  // Same quiet sparkle set as the landing hero, just two of each -- this
  // card is a calm, focused screen, not the full scene.
  const glints = [
    { left: '83%', top: '30%', delay: '-1s' },
    { left: '90%', top: '55%', delay: '-4s' },
  ]
  const flies = [
    { left: '18%', top: '68%', delay: '-2s' },
    { left: '72%', top: '76%', delay: '-5s' },
  ]

  return (
    <div className="au-page">
      {/* Fixed to the viewport, independent of page height -- so a window
          that's shorter or narrower than the card+header content never
          clips anything, it just scrolls the foreground over a backdrop
          that always fills the screen. */}
      <div className="au-scene">
        <img className="au-layer" src={bgPlate} alt="" />
        <img className="au-layer au-clouds" src={clouds} alt="" />
        <img className="au-layer au-mist" src={mist} alt="" />
        <div className="au-scrim" />

        {glints.map((g, i) => (
          <i key={`glint-${i}`} className="au-glint" style={{ left: g.left, top: g.top, animationDelay: g.delay }} aria-hidden="true" />
        ))}
        {flies.map((f, i) => (
          <i key={`fly-${i}`} className="au-fly" style={{ left: f.left, top: f.top, animationDelay: f.delay }} aria-hidden="true" />
        ))}
      </div>

      <div className="au-foreground">
        <header className="au-header">
          <button type="button" className="au-back" onClick={() => navigate('/')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 4L7 12L15 20" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Forge.dev
          </button>
        </header>

        <main className="au-main">
          <div className="au-cardwrap">
            <svg className="au-bracket au-bracket-tl" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M2 14V4a2 2 0 0 1 2-2h10" stroke="#9f7fe8" strokeWidth="2" strokeLinecap="round" /></svg>
            <svg className="au-bracket au-bracket-tr" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M26 14V4a2 2 0 0 0-2-2H14" stroke="#9f7fe8" strokeWidth="2" strokeLinecap="round" /></svg>
            <svg className="au-bracket au-bracket-bl" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M2 14v10a2 2 0 0 0 2 2h10" stroke="#9f7fe8" strokeWidth="2" strokeLinecap="round" /></svg>
            <svg className="au-bracket au-bracket-br" width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true"><path d="M26 14v10a2 2 0 0 1-2 2H14" stroke="#9f7fe8" strokeWidth="2" strokeLinecap="round" /></svg>

            <div className="au-card">
              <div className="au-cardhead">
                <img className="au-crystal" src={crystalIcon} alt="" />
                <div className="au-eyebrow">Sign in</div>
                <h1 className="au-title">Continue your <em>legend.</em></h1>
                <p className="au-subtitle">Sign in with the account the Admin gave you</p>
              </div>

              <form onSubmit={handleSubmit} className="au-form">
                {lockedInfo && (
                  <div className="au-locked">
                    <div className="au-locked-row">
                      <span>🔒</span>
                      <strong>Account locked</strong>
                    </div>
                    <p>Your account was locked after 3 failed attempts. Contact your administrator to unlock it.</p>
                    <div className="au-locked-timer">
                      Auto-unlocks in <span>{Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}</span>
                    </div>
                  </div>
                )}

                {error && !lockedInfo && (
                  <div className="au-error">{error}</div>
                )}

                <label className="au-field">
                  <span>Username</span>
                  <input
                    type="text"
                    placeholder="your.username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    autoComplete="username"
                  />
                </label>

                <label className="au-field">
                  <span>Password</span>
                  <div className="au-password-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="au-eye-btn"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </label>

                <button type="submit" className="au-submit" disabled={loading}>
                  {loading ? (
                    <span className="au-spinner" aria-hidden="true" />
                  ) : (
                    <>
                      Sign in
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </>
                  )}
                </button>

                <p className="au-help">Trouble signing in? Ask your instructor</p>
              </form>
            </div>

            <p className="au-stack">Python · Java · C#</p>
          </div>
        </main>
      </div>

      <style>{`
        .au-page { position: relative; min-height: 100vh; background: #060611; color: #f4f5fa; }
        .au-scene { position: fixed; inset: 0; width: 100%; height: 100%; overflow: hidden; z-index: 0; }
        .au-foreground { position: relative; z-index: 1; min-height: 100vh; }
        .au-layer { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; pointer-events: none; }
        .au-clouds, .au-mist {
          left: -15%; right: auto; width: 130%;
        }
        .au-clouds { opacity: .4; animation: au-cloud 13s ease-in-out infinite alternate; }
        .au-mist { opacity: .34; filter: blur(3px); animation: au-mist 10s ease-in-out infinite alternate; }
        .au-scrim {
          position: absolute; inset: 0;
          background: radial-gradient(ellipse 70% 65% at 50% 40%, rgba(6,7,17,0.5) 0%, rgba(6,7,17,0.75) 60%, rgba(5,5,12,0.94) 100%);
        }
        @keyframes au-cloud { to { transform: translateX(10%); } }
        @keyframes au-mist { to { transform: translateX(-8%); } }

        .au-glint, .au-fly { position: absolute; pointer-events: none; z-index: 2; border-radius: 50%; }
        .au-glint {
          width: 6px; height: 6px;
          background: radial-gradient(circle, #ffffff 0%, #e3caff 35%, rgba(175,122,255,0) 72%);
          box-shadow: 0 0 8px 2px rgba(175,122,255,0.8), 0 0 16px 6px rgba(175,122,255,0.3);
          animation: au-glint 7s ease-in-out infinite;
        }
        .au-fly {
          width: 4px; height: 4px;
          background: radial-gradient(circle, #fff8e8 0%, #f5d9a3 40%, rgba(245,217,163,0) 72%);
          box-shadow: 0 0 6px 2px rgba(245,217,163,0.85), 0 0 14px 5px rgba(245,217,163,0.35);
          animation: au-fly 8s ease-in-out infinite alternate;
        }
        @keyframes au-glint { 0%, 60%, 100% { opacity: .1; } 75% { opacity: .9; } }
        @keyframes au-fly {
          0% { opacity: .1; transform: translate(0,0); }
          50% { opacity: .8; }
          100% { opacity: .15; transform: translate(12px,-10px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .au-clouds, .au-mist, .au-glint, .au-fly { animation: none !important; }
          .au-glint, .au-fly { display: none; }
        }

        .au-header { position: absolute; top: 0; left: 0; right: 0; z-index: 2; display: flex; align-items: center; padding: 28px 40px; }
        .au-back {
          display: inline-flex; align-items: center; gap: 8px;
          font: inherit; font-weight: 700; font-size: 15px; color: #d7c8ff;
          background: none; border: none; padding: 0; cursor: pointer;
        }
        .au-back:hover { color: #e3d6ff; }

        .au-main { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 20px; box-sizing: border-box; }
        .au-cardwrap { width: 100%; max-width: 420px; position: relative; }
        .au-bracket { position: absolute; z-index: 1; }
        .au-bracket-tl { top: -10px; left: -10px; }
        .au-bracket-tr { top: -10px; right: -10px; }
        .au-bracket-bl { bottom: -10px; left: -10px; }
        .au-bracket-br { bottom: -10px; right: -10px; }

        .au-card {
          background: rgba(16,15,30,0.62);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          border: 1px solid rgba(173,136,255,0.28);
          border-radius: 18px;
          box-shadow: 0 24px 70px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.02) inset;
          overflow: hidden;
        }
        .au-cardhead { padding: 40px 36px 28px; text-align: center; border-bottom: 1px solid rgba(173,136,255,0.14); }
        .au-crystal { height: 48px; width: auto; margin: 0 auto 18px; display: block; filter: drop-shadow(0 0 10px rgba(173,136,255,0.55)); }
        .au-eyebrow { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: #a393d6; font-weight: 600; margin-bottom: 10px; }
        .au-title { margin: 0 0 8px; font-size: 26px; font-weight: 800; line-height: 1.2; }
        .au-title em { font-style: normal; color: #b78bff; }
        .au-subtitle { margin: 0; font-size: 13px; color: #9aa3bd; line-height: 1.5; }

        .au-form { padding: 28px 36px 36px; display: flex; flex-direction: column; gap: 18px; }
        .au-field { display: flex; flex-direction: column; gap: 7px; }
        .au-field span { font-size: 12px; font-weight: 600; letter-spacing: 0.04em; color: #c9cfe6; }
        .au-field input {
          height: 46px; border-radius: 10px; background: rgba(9,10,20,0.65);
          border: 1px solid rgba(173,136,255,0.22); color: #f4f5fa; font: inherit;
          font-size: 14px; padding: 0 14px; outline: none; box-sizing: border-box;
          transition: border-color 0.2s;
        }
        .au-field input:focus { border-color: #ad88ff; }
        .au-password-wrap { position: relative; }
        .au-password-wrap input { width: 100%; padding-right: 44px; }
        .au-eye-btn {
          position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
          background: none; border: none; padding: 6px; cursor: pointer; color: #8a92b2; display: flex;
        }
        .au-eye-btn:hover { color: #c9cfe6; }

        .au-submit {
          margin-top: 6px; height: 48px; border-radius: 10px; border: 1px solid #ad88ff;
          background: linear-gradient(135deg, #7553e8, #ab88ff); color: #fff; font: inherit;
          font-weight: 700; font-size: 14px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: filter 0.2s, transform 0.2s;
        }
        .au-submit:hover:not(:disabled) { filter: brightness(1.08); }
        .au-submit:disabled { opacity: 0.65; cursor: not-allowed; }
        .au-spinner {
          width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.35); border-top-color: #fff;
          animation: au-spin 0.8s linear infinite;
        }
        @keyframes au-spin { to { transform: rotate(360deg); } }

        .au-help { margin: 4px 0 0; text-align: center; font-size: 12px; color: #767e9c; }

        .au-locked {
          background: rgba(120,20,30,0.25); border: 1px solid rgba(255,100,110,0.4);
          border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 8px;
        }
        .au-locked-row { display: flex; align-items: center; gap: 8px; color: #ffb4bb; font-size: 14px; }
        .au-locked p { margin: 0; font-size: 12px; color: #d8c9cf; line-height: 1.5; }
        .au-locked-timer { font-size: 12px; color: #ffd27a; }
        .au-locked-timer span { font-family: 'JetBrains Mono', monospace; font-weight: 600; }

        .au-error {
          background: rgba(120,20,30,0.2); border: 1px solid rgba(255,100,110,0.35);
          border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #ffb4bb;
        }

        .au-stack {
          margin: 18px 0 0; text-align: center; font-size: 11px; color: #5d6485;
          font-family: 'JetBrains Mono', monospace; letter-spacing: 0.04em;
        }

        @media (max-width: 560px) {
          .au-header { padding: 16px 16px; }
          .au-back { font-size: 13px; }
          .au-main { padding: 16px 14px; }
          .au-cardwrap { max-width: 100%; }
          .au-bracket { width: 20px; height: 20px; }
          .au-bracket-tl, .au-bracket-tr { top: -8px; }
          .au-bracket-bl, .au-bracket-br { bottom: -8px; }
          .au-bracket-tl, .au-bracket-bl { left: -6px; }
          .au-bracket-tr, .au-bracket-br { right: -6px; }
          .au-cardhead { padding: 28px 20px 20px; }
          .au-crystal { height: 38px; margin-bottom: 14px; }
          .au-title { font-size: 21px; }
          .au-subtitle { font-size: 12px; }
          .au-form { padding: 20px 20px 24px; gap: 14px; }
          .au-field input { height: 44px; font-size: 16px; }
          .au-submit { height: 46px; }
        }

        /* Very short viewports (a laptop window that isn't maximized, a
           landscape phone) -- trim the vertical rhythm so the card never
           needs more room than it actually has. */
        @media (max-height: 680px) {
          .au-main { padding-top: 16px; padding-bottom: 24px; }
          .au-cardhead { padding-top: 28px; padding-bottom: 18px; }
          .au-crystal { height: 36px; margin-bottom: 12px; }
          .au-form { padding-top: 20px; gap: 14px; }
        }
      `}</style>
    </div>
  )
}
