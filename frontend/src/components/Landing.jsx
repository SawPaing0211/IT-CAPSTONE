import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import crystalIcon from '../assets/landing/forge-crystal-icon.webp'
import staticScene from '../assets/landing/motion/static-fallback.webp'
import landscape from '../assets/landing/motion/landscape.webp'
import bodies from '../assets/landing/motion/party-bodies.webp'
import cloakOne from '../assets/landing/motion/cloak-01.webp'
import cloakTwo from '../assets/landing/motion/cloak-02.webp'
import cloakThree from '../assets/landing/motion/cloak-03.webp'
import cloakFour from '../assets/landing/motion/cloak-04.webp'
import clouds from '../assets/landing/motion/clouds.webp'
import mistFar from '../assets/landing/motion/mist-far.webp'
import mistNear from '../assets/landing/motion/mist-near.webp'
import './Landing.css'

// All party layers share the original 1672 × 941 canvas. These are the
// reviewed shoulder pivots; do not independently crop/scale a cloak.
const CLOAKS = [
  { src: cloakOne, origin: '64.593301% 54.303932%', delay: '0s' },
  { src: cloakTwo, origin: '70.095694% 51.859724%', delay: '-1.1s' },
  { src: cloakThree, origin: '77.811005% 55.047821%', delay: '-2.3s' },
  { src: cloakFour, origin: '85.167464% 51.434644%', delay: '-3.6s' },
]
const GLINTS = [
  { x: 79.2, y: 28.6, delay: '-1s' }, { x: 82.7, y: 22.7, delay: '-4s' },
  { x: 85.1, y: 35.5, delay: '-6s' }, { x: 91.9, y: 73.5, delay: '-2s' },
]
const FIREFLIES = [
  { x: 57.2, y: 65.2, delay: '-2s' }, { x: 62.3, y: 72.5, delay: '-5s' },
  { x: 89.4, y: 65.1, delay: '-7s' }, { x: 94.1, y: 77.4, delay: '-1s' },
  { x: 74.2, y: 43.8, delay: '-4s' },
]

function AboutForge({ onClose, onSignIn }) {
  const ref = useRef(null)
  const title = useRef(null)
  useLayoutEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement
    const overflow = document.body.style.overflow
    dialog.showModal()
    title.current.focus()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])
  return <dialog ref={ref} className="fl-about-dialog" aria-labelledby="fl-about-title"
    onCancel={e => { e.preventDefault(); onClose() }}
    onClick={e => {
      if (e.target !== e.currentTarget) return
      const r = ref.current.getBoundingClientRect()
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose()
    }}
    onKeyDown={e => {
      if (e.key !== 'Tab') return
      const buttons = ref.current.querySelectorAll('button')
      const first = buttons[0], last = buttons[buttons.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === title.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }}>
    <button className="fl-about-close" aria-label="Close about Forge.Dev" onClick={onClose}>✕</button>
    <p className="fl-eyebrow">Your coding journey</p>
    <h2 id="fl-about-title" ref={title} tabIndex={-1}>About Forge.Dev</h2>
    <p>Forge.Dev is a gamified coding-learning platform. Practice introductory programming through quests, lessons and achievements.</p>
    <p>Learn in Python, Java or C#. Your instructor prepares the learning content, and your progress grows as you complete quests.</p>
    <p className="fl-about-note">Use your assigned account to sign in. Need access or a password reset? Contact your instructor or administrator.</p>
    <button className="fl-cta" onClick={onSignIn}>Go to sign in <span aria-hidden="true">→</span></button>
  </dialog>
}

export default function Landing() {
  const navigate = useNavigate()
  const [paused, setPaused] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  const [reducedMotion, setReducedMotion] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const [motionForced, setMotionForced] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [sceneFailed, setSceneFailed] = useState(false)
  const effectiveReduced = reducedMotion && !motionForced
  const layered = sceneReady && !sceneFailed && !effectiveReduced

  useEffect(() => {
    if (!window.matchMedia) return
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = e => { setReducedMotion(e.matches); setMotionForced(false) }
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
  }, [])

  useEffect(() => {
    const change = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', change)
    return () => document.removeEventListener('visibilitychange', change)
  }, [])

  // Keep the original complete still until every layer is decoded. A missing
  // layer must never expose a clean-plate hole or a doubled/partial character.
  useEffect(() => {
    let active = true
    const sources = [landscape, bodies, ...CLOAKS.map(c => c.src), clouds, mistFar, mistNear]
    const images = sources.map(src => {
      const image = new Image()
      image.src = src
      return image
    })
    Promise.all(images.map(image => image.decode()))
      .then(() => { if (active) setSceneReady(true) })
      .catch(() => { if (active) setSceneFailed(true) })
    return () => { active = false }
  }, [])

  const toggleMotion = () => {
    if (effectiveReduced) { setMotionForced(true); setPaused(false) }
    else setPaused(value => !value)
  }
  const label = sceneFailed ? 'Static artwork' : effectiveReduced ? 'Enable animation' : paused ? 'Resume animation' : 'Pause animation'
  const sceneClass = ['fl-scene', layered ? 'has-motion' : '', paused || hidden || aboutOpen ? 'is-paused' : ''].filter(Boolean).join(' ')
  const signIn = () => navigate('/auth')

  return <div className="fl-page">
    <div id="forge-landing-scene" className={sceneClass} data-artwork="layered-party-v2.5" data-scene-state={layered ? 'layered' : 'static'} aria-hidden="true">
      <div className="fl-art-plane">
        <img className="fl-layer fl-static" src={staticScene} alt="" width="1672" height="941" fetchPriority="high" />
        <div className="fl-layered-art">
          <img className="fl-layer fl-landscape" src={landscape} alt="" width="1672" height="941" />
          <div className="fl-sky"><img className="fl-clouds fl-moving" src={clouds} alt="" /></div>
          <div className="fl-cave-light fl-moving" />
          <img className="fl-mist fl-mist-far fl-moving" src={mistFar} alt="" />
          <img className="fl-mist fl-mist-near fl-moving" src={mistNear} alt="" />
          {CLOAKS.map((cloak,i) => <img key={cloak.src} className={`fl-layer fl-cloak fl-cloak-${i + 1} fl-moving`} src={cloak.src} alt="" width="1672" height="941" style={{ transformOrigin: cloak.origin, animationDelay: cloak.delay }} />)}
          <img className="fl-layer fl-bodies" src={bodies} alt="" width="1672" height="941" />
          {GLINTS.map((g,i) => <i key={i} className="fl-glint fl-moving" style={{left:`${g.x}%`,top:`${g.y}%`,animationDelay:g.delay}} />)}
          {FIREFLIES.map((g,i) => <i key={i} className="fl-firefly fl-moving" style={{left:`${g.x}%`,top:`${g.y}%`,animationDelay:g.delay}} />)}
        </div>
      </div>
      <div className="fl-shade" />
    </div>
    <header className="fl-nav">
      <div className="fl-logo"><img src={crystalIcon} alt="" width="28" height="36" /><span>Forge.Dev</span></div>
      <button className="fl-login-btn" onClick={signIn}>Log in</button>
    </header>
    <main className="fl-main">
      <div className="fl-copy">
        <p className="fl-eyebrow">Your coding adventure starts here</p>
        <h1>Code your<br /><em>legend.</em></h1>
        <p className="fl-intro">Learn programming through quests,<br className="fl-desktop-break" /> practice, and discovery.</p>
        <button className="fl-cta" onClick={signIn}>Start your journey <span aria-hidden="true">→</span></button>
        <p className="fl-signin-caption">Sign in with your assigned account.</p>
      </div>
    </main>
    <footer className="fl-bottombar">
      <ul className="fl-langs" aria-label="Supported programming languages"><li>Python</li><li>Java</li><li>C#</li></ul>
      <button className="fl-about" onClick={() => setAboutOpen(true)}>About Forge.Dev</button>
      <button className="fl-pause" onClick={toggleMotion} aria-label="Decorative animation" aria-pressed={!effectiveReduced && !paused && !sceneFailed} aria-describedby="fl-motion-status" disabled={sceneFailed}>{label}</button>
      <span id="fl-motion-status" className="sr-only" role="status">{sceneFailed ? 'Animation unavailable; the complete static artwork is shown.' : effectiveReduced ? 'Reduced motion: static artwork is shown.' : !sceneReady ? 'Static artwork is shown while motion layers load.' : paused ? 'Decorative animation is paused.' : 'Decorative animation is enabled.'}</span>
    </footer>
    {aboutOpen && <AboutForge onClose={() => setAboutOpen(false)} onSignIn={signIn} />}
  </div>
}
