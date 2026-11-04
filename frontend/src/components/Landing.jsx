import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import crystalIcon from '../assets/landing/forge-crystal-icon.webp'
import desktopHero from '../assets/landing/landing-desktop-hero.webp'
import mobileHero from '../assets/landing/landing-mobile-hero.webp'

export default function Landing() {
  const navigate = useNavigate()
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )
  // The OS/browser may ask for reduced motion by default (we respect that on first
  // render, per the accessibility spec) -- but the control below lets someone
  // explicitly turn decorative motion back on rather than never seeing it at all.
  const [motionForced, setMotionForced] = useState(false)
  const effectiveReduced = reducedMotion && !motionForced
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  // Respect OS-level prefers-reduced-motion from first render, and live changes.
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e) => setReducedMotion(e.matches)
    mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange)
    return () => {
      mq.removeEventListener ? mq.removeEventListener('change', onChange) : mq.removeListener(onChange)
    }
  }, [])

  // Auto-pause decorative motion when the tab isn't visible; restore manual pause state on return.
  useEffect(() => {
    const onVisibility = () => {
      setSceneClasses(document.hidden || pausedRef.current)
    }
    const setSceneClasses = (shouldPause) => {
      const el = document.getElementById('forge-landing-scene')
      if (el) el.classList.toggle('is-paused', shouldPause)
    }
    setSceneClasses(document.hidden || pausedRef.current)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [paused])

  // The new art (both breakpoints) is a single flattened render rather than
  // separable background/cloud/mist/party layers, so there's nothing to pan
  // against itself. Motion instead comes from: a slow ambient zoom/pan on the
  // whole image (standing in for the old cloud/mist drift), twinkling glints
  // along the crystal cave, and warm fireflies drifting in the valley -- all
  // plain CSS/positioned elements, independent of the art itself. Positions
  // below are hand-placed against each image's actual composition.
  const glintsDesktop = [
    { left: '68%', top: '18%', delay: '-0s' },
    { left: '75%', top: '8%', delay: '-3s' },
    { left: '82%', top: '20%', delay: '-6s' },
    { left: '90%', top: '12%', delay: '-1.5s' },
    { left: '95%', top: '28%', delay: '-4.5s' },
    { left: '72%', top: '32%', delay: '-2.5s' },
    { left: '86%', top: '35%', delay: '-5s' },
    { left: '94%', top: '75%', delay: '-1s' },
    { left: '97%', top: '80%', delay: '-3.5s' },
    { left: '35%', top: '93%', delay: '-6.5s' },
    { left: '38%', top: '96%', delay: '-2s' },
  ]
  const fliesDesktop = [
    { left: '10%', top: '45%', delay: '-0s' },
    { left: '20%', top: '55%', delay: '-2s' },
    { left: '8%', top: '62%', delay: '-4s' },
    { left: '28%', top: '50%', delay: '-6s' },
    { left: '15%', top: '70%', delay: '-8s' },
    { left: '35%', top: '60%', delay: '-10s' },
    { left: '5%', top: '38%', delay: '-3s' },
    { left: '25%', top: '42%', delay: '-5.5s' },
  ]
  const glintsMobile = [
    { left: '12%', top: '30%', delay: '-0s' },
    { left: '85%', top: '28%', delay: '-3s' },
    { left: '20%', top: '42%', delay: '-6s' },
    { left: '78%', top: '40%', delay: '-1.5s' },
    { left: '45%', top: '20%', delay: '-4.5s' },
    { left: '55%', top: '35%', delay: '-2.5s' },
    { left: '15%', top: '55%', delay: '-5s' },
    { left: '82%', top: '52%', delay: '-1s' },
    { left: '48%', top: '48%', delay: '-3.5s' },
  ]
  // Low ground fog sitting in the valley the art already paints below the
  // crystal cave -- wide, short, overlapping ellipses rather than circles,
  // so they merge into a fog bank instead of reading as individual clouds.
  const mistWisps = [
    { left: '9%', top: '41%', w: 320, h: 70, delay: '0s', dur: '11s' },
    { left: '24%', top: '47%', w: 400, h: 90, delay: '-4s', dur: '13s' },
    { left: '38%', top: '39%', w: 280, h: 60, delay: '-2s', dur: '9s' },
    { left: '16%', top: '53%', w: 360, h: 85, delay: '-6.5s', dur: '12s' },
    { left: '47%', top: '45%', w: 240, h: 55, delay: '-3s', dur: '8.5s' },
    { left: '4%', top: '48%', w: 260, h: 65, delay: '-7.5s', dur: '10s' },
  ]

  const sceneClass = [
    'fl-scene',
    paused ? 'is-paused' : '',
    effectiveReduced ? 'is-reduced' : '',
  ].filter(Boolean).join(' ')

  const handlePauseClick = () => {
    if (effectiveReduced) {
      // Your OS/browser is asking for reduced motion, which is why nothing was
      // moving -- this explicitly opts back in to the full animation.
      setMotionForced(true)
      setPaused(false)
    } else {
      setPaused((p) => !p)
    }
  }
  const pauseLabel = effectiveReduced ? 'Enable animation' : (paused ? 'Resume animation' : 'Pause animation')

  return (
    <div className="fl-page">
      {/* Hero scene — full-bleed, nav and copy float directly on top of it */}
      <div id="forge-landing-scene" className={sceneClass}>
        <div className="fl-scene-bg fl-scene-bg-desktop fl-moving" aria-hidden="true" />
        <div className="fl-scene-bg fl-scene-bg-mobile fl-moving" aria-hidden="true" />
        {/* A separate soft fog band drifting on its own, faster timer --
            there's no standalone mist texture for this art (it's one flat
            render), so this is a CSS-only haze rather than a panned image,
            but it keeps mist and the slower background pan independently
            adjustable in speed, same as the old two-layer setup. */}
        {/* Several small soft wisps instead of one blurred band -- a single
            rectangular gradient, however blurred, keeps a hard enough edge
            against the detailed art to read as a smudge on the screen
            rather than fog. Scattered irregular wisps (the same trick the
            old cloud-wisp effect used) look like drifting mist instead. */}
        {mistWisps.map((m, i) => (
          <i
            key={`mist-${i}`}
            className="fl-mist-wisp fl-moving"
            style={{
              left: m.left,
              top: m.top,
              width: m.w,
              height: m.h,
              animationDelay: m.delay,
              animationDuration: m.dur,
            }}
            aria-hidden="true"
          />
        ))}

        {/* Twinkling crystal-cave lights -- shown/hidden per breakpoint via CSS
            since the two art pieces place the cave in different spots. */}
        {glintsDesktop.map((g, i) => (
          <i
            key={`glint-d-${i}`}
            className="fl-glint fl-glint-desktop fl-moving"
            style={{ left: g.left, top: g.top, animationDelay: g.delay }}
            aria-hidden="true"
          />
        ))}
        {glintsMobile.map((g, i) => (
          <i
            key={`glint-m-${i}`}
            className="fl-glint fl-glint-mobile fl-moving"
            style={{ left: g.left, top: g.top, animationDelay: g.delay }}
            aria-hidden="true"
          />
        ))}
        {/* Warm drifting fireflies over the misty valley -- desktop only, the
            mobile crop doesn't show enough open valley for them to read. */}
        {fliesDesktop.map((f, i) => (
          <i
            key={`fly-${i}`}
            className="fl-fly fl-fly-desktop fl-moving"
            style={{ left: f.left, top: f.top, animationDelay: f.delay }}
            aria-hidden="true"
          />
        ))}

        <nav className="fl-nav">
          <div className="fl-logo">
            <img className="fl-logo-mark" src={crystalIcon} alt="" />
            <span className="fl-logo-text">Forge.dev</span>
          </div>
          <button className="fl-login-btn" onClick={() => navigate('/auth')}>
            Login
          </button>
        </nav>
      </div>

      {/* Copy + bottom bar live outside #forge-landing-scene (as siblings of
          it, not children) so they're part of the page's own normal
          document flow -- on desktop this positions identically (fl-page is
          the same size as fl-scene, so absolute-positioning math is
          unchanged), but on mobile it lets them scroll normally over a
          fixed, pinned-to-viewport background instead of being trapped
          inside a clipped/fixed box with the art. */}
      <div className="fl-copy">
        <small>Your coding adventure starts here</small>
        <h1>
          Code your<br /><em>legend.</em>
        </h1>
        <p>Learn programming through quests,<br />practice, and discovery.</p>
        <button className="fl-cta" onClick={() => navigate('/auth')}>
          Start your journey →
        </button>
        <div className="fl-signin-caption">Sign in with the account the Admin gave you</div>
      </div>

      <div className="fl-bottombar">
        <div className="fl-langs">
          <span>Python</span>
          <span>Java</span>
          <span>C#</span>
        </div>
        <div className="fl-about">About Forge.Dev</div>
        <button
          className="fl-pause"
          aria-pressed={paused}
          onClick={handlePauseClick}
        >
          {pauseLabel}
        </button>
      </div>

      <style>{`
        .fl-page {
          position: relative;
          min-height: 100vh;
          height: 100vh;
          background: #080e1c;
          color: #f4f5fa;
          overflow: hidden;
        }
        .fl-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 28px;
          position: absolute;
          top: 0; left: 0; right: 0;
          z-index: 10;
          background: linear-gradient(to bottom, rgba(5,8,18,0.45), transparent);
        }
        .fl-logo { display: flex; align-items: center; gap: 10px; }
        .fl-logo-mark {
          height: 26px;
          width: auto;
          display: block;
          filter: drop-shadow(0 0 7px rgba(173, 136, 255, 0.65));
        }
        .fl-logo-text { font-weight: 700; font-size: 18px; letter-spacing: 0.02em; }
        .fl-login-btn {
          padding: 9px 22px;
          background: rgba(20, 16, 36, 0.55);
          border: 1px solid rgba(173, 136, 255, 0.45);
          border-radius: 8px;
          color: #f4f5fa;
          font: inherit;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s;
        }
        .fl-login-btn:hover { background: rgba(117, 83, 232, 0.35); border-color: #ab94ff; }

        .fl-scene {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: #080e1c;
          isolation: isolate;
        }
        /* Oversized (inset -6%) and slowly scaled/panned so the motion never
           exposes an edge of the image -- a cheap stand-in for the old
           cloud/mist drift that doesn't require separate art layers. */
        .fl-scene-bg {
          position: absolute;
          inset: -6%;
          background-size: cover;
          background-position: center;
          z-index: 1;
          animation: fl-ambient-pan 18s ease-in-out infinite alternate;
        }
        .fl-scene-bg-desktop { background-image: url(${desktopHero}); }
        .fl-scene-bg-mobile { background-image: url(${mobileHero}); display: none; }

        /* A single blurred rectangle (even a wide, short one) still has an
           edge the eye can find against detailed art, which read as a smudge
           rather than fog. Soft overlapping ellipses with no hard boundary
           at all -- same idea as the old cloud-wisps -- drift instead. */
        .fl-mist-wisp {
          position: absolute;
          z-index: 2;
          pointer-events: none;
          border-radius: 50%;
          background: radial-gradient(ellipse at center,
            rgba(222, 228, 244, 0.3) 0%,
            rgba(222, 228, 244, 0.14) 45%,
            rgba(222, 228, 244, 0) 75%);
          filter: blur(6px);
          animation: fl-mist-wisp-drift 11s ease-in-out infinite alternate;
        }

        .fl-glint-mobile, .fl-fly-mobile { display: none; }

        .fl-glint, .fl-fly {
          position: absolute;
          pointer-events: none;
          z-index: 4;
          border-radius: 50%;
        }
        .fl-glint {
          width: 7px; height: 7px;
          background: radial-gradient(circle, #ffffff 0%, #e3caff 35%, rgba(175,122,255,0) 72%);
          box-shadow: 0 0 8px 2px rgba(175,122,255,0.85), 0 0 18px 7px rgba(175,122,255,0.35);
          animation: fl-glint 6s ease-in-out infinite;
        }
        .fl-fly {
          width: 5px; height: 5px;
          background: radial-gradient(circle, #fff8e8 0%, #f5d9a3 40%, rgba(245,217,163,0) 72%);
          box-shadow: 0 0 6px 2px rgba(245,217,163,0.9), 0 0 16px 6px rgba(245,217,163,0.4);
          filter: blur(0.3px);
          animation: fl-fly 7s ease-in-out infinite alternate;
        }

        .fl-scene.is-paused .fl-moving { animation-play-state: paused !important; }
        .fl-scene.is-reduced .fl-moving { animation: none !important; }
        .fl-scene.is-reduced .fl-glint,
        .fl-scene.is-reduced .fl-fly,
        .fl-scene.is-reduced .fl-mist-wisp { display: none; }

        .fl-copy {
          position: absolute;
          left: 5%;
          top: 18%;
          max-width: 40%;
          z-index: 5;
        }
        .fl-copy small {
          font-size: clamp(9px, 1vw, 14px);
          letter-spacing: .18em;
          text-transform: uppercase;
          color: #c8b7ff;
        }
        .fl-copy h1 {
          font-size: clamp(28px, 5.2vw, 72px);
          line-height: 1.03;
          margin: 14px 0;
          font-weight: 800;
        }
        .fl-copy h1 em { font-style: normal; color: #b78bff; }
        .fl-copy p {
          font-size: clamp(11px, 1.3vw, 19px);
          margin: 14px 0 20px;
          color: #d4dbee;
        }
        .fl-cta {
          display: inline-block;
          background: #8754ec;
          border: 1px solid #ad88ff;
          border-radius: 10px;
          padding: 11px 24px;
          font-size: clamp(11px, 1.2vw, 17px);
          font-weight: 700;
          color: #fff;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .fl-cta:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(135, 84, 236, 0.45); }
        .fl-signin-caption {
          margin-top: 12px;
          font-size: clamp(9px, 0.9vw, 12px);
          color: #9aa3bd;
        }

        .fl-bottombar {
          position: absolute;
          left: 0; right: 0; bottom: 0;
          z-index: 6;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 10px 20px;
          background: linear-gradient(to top, rgba(8,14,28,0.65), transparent);
        }
        .fl-langs { display: flex; gap: 10px; flex-wrap: wrap; }
        .fl-langs span {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(25, 29, 43, 0.75);
          border: 1px solid rgba(173, 136, 255, 0.3);
          color: #c9cfe6;
        }
        .fl-about {
          font-size: 11px;
          color: #9aa3bd;
          flex-shrink: 0;
        }
        .fl-pause {
          /* font-family only, not the "font" shorthand -- that resets
             font-size too, which was silently overriding the 11px below
             back to the browser default and making this button's label
             noticeably bigger than every other control in the bar. */
          font-family: inherit;
          font-size: 11px;
          padding: 6px 14px;
          background: rgba(25, 29, 43, 0.75);
          border: 1px solid rgba(173, 136, 255, 0.35);
          border-radius: 8px;
          color: #f4f5fa;
          cursor: pointer;
          flex-shrink: 0;
        }
        .fl-pause:hover { background: rgba(117, 83, 232, 0.35); }

        @keyframes fl-ambient-pan {
          0% { transform: scale(1) translate(0, 0); }
          100% { transform: scale(1.07) translate(-2.2%, -1.6%); }
        }
        @keyframes fl-mist-wisp-drift {
          0% { transform: translateX(0) scale(1); opacity: .65; }
          50% { opacity: 1; }
          100% { transform: translateX(46px) scale(1.15); opacity: .4; }
        }
        @keyframes fl-glint { 0%, 60%, 100% { opacity: .08; } 75% { opacity: .95; } }
        @keyframes fl-fly {
          0% { opacity: .1; transform: translate(0,0); }
          50% { opacity: .85; }
          100% { opacity: .15; transform: translate(16px,-13px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .fl-moving { animation: none !important; }
          .fl-glint, .fl-fly, .fl-mist-wisp { display: none; }
        }

        /* Narrow screens: same fixed-background / flowing-foreground split used on
           the login page. The hero scene pins to the real viewport (not the
           page) and stays put as a backdrop; the copy and bottom bar flow
           normally beneath it and the page scrolls if it needs more room
           than the screen -- instead of cramming everything into a shrunk,
           clipped box with nothing below it. Buttons/text get mobile-specific
           treatment (full-width CTA, scrim panel, stacked bottom bar) rather
           than just a scaled-down copy of the desktop layout. */
        @media (max-width: 760px) {
          .fl-page {
            height: auto;
            min-height: 100vh;
            overflow: visible;
            /* .fl-copy and .fl-bottombar are normal-flow siblings now (see the
               comment where they're rendered), and without help they just stack
               directly under one another -- leaving the bottom bar stranded
               partway down the page with a huge unused stretch of background
               art below it instead of at the screen's actual bottom edge.
               A flex column with the bottom bar's margin pushed to auto
               reproduces the Figma mock's "flex spacer": the bar sits pinned
               to the bottom when content is shorter than the viewport, but
               still flows (and the page still scrolls) if content ever needs
               more room than the screen has. */
            display: flex;
            flex-direction: column;
          }
          .fl-scene {
            position: fixed;
            inset: 0;
            width: 100%;
            height: 100%;
          }
          .fl-scene-bg-desktop { display: none; }
          .fl-scene-bg-mobile { display: block; }
          .fl-glint-desktop, .fl-fly-desktop { display: none; }
          .fl-glint-mobile { display: block; }

          .fl-nav { padding: 12px 16px; }

          .fl-copy {
            /* No longer a child of fl-scene, so it's not competing with the
               art layers' stacking -- it's a normal in-flow sibling now.
               Clear the desktop absolute-positioning coordinates (which
               would otherwise apply as relative-positioning OFFSETS) and
               give it its own scrim panel, since it now floats over
               whatever part of the fixed art happens to be behind it
               rather than a hand-picked dark patch of the scene. */
            position: relative;
            top: auto;
            left: auto;
            z-index: 1;
            max-width: 100%;
            margin-top: 68px; /* clears the fixed nav bar above it */
            padding: 28px 20px 56px;
            /* Fades back down before the panel's own box ends, so it dissolves
               into the art beneath instead of cutting off in a hard-edged seam. */
            background: linear-gradient(180deg,
              rgba(8,14,28,0) 0%,
              rgba(8,14,28,0.62) 24%,
              rgba(8,14,28,0.66) 55%,
              rgba(8,14,28,0.4) 82%,
              rgba(8,14,28,0) 100%);
          }
          .fl-copy small { font-size: 11px; }
          .fl-copy h1 { font-size: clamp(32px, 9vw, 44px); margin: 12px 0; }
          .fl-copy p { font-size: 14px; margin: 12px 0 20px; }
          .fl-cta {
            /* Full-width, larger tap target -- a thumb hits this easily,
               unlike the inline auto-width desktop button. */
            display: block;
            width: 100%;
            box-sizing: border-box;
            text-align: center;
            padding: 15px 24px;
            font-size: 16px;
          }
          .fl-signin-caption { margin-top: 14px; font-size: 12px; }

          .fl-bottombar {
            position: relative;
            top: auto;
            left: auto;
            right: auto;
            bottom: auto;
            z-index: 1;
            margin-top: auto;
            background: rgba(8,14,28,0.97);
            flex-wrap: wrap;
            gap: 10px;
            padding: 16px 20px 26px;
          }
          .fl-about { order: 3; width: 100%; text-align: center; }
        }
      `}</style>
    </div>
  )
}
