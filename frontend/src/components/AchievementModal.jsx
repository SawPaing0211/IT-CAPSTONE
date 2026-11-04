import { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import MedalArt from './MedalArt'
import { isUnavailable, splitAchievements } from '../utils/achievementView'
import emptyMedalDisplay from '../assets/medals/no-achievements-yet.webp'
import raysViolet from '../assets/achievements/rays-violet.svg'
import raysGold from '../assets/achievements/rays-gold.svg'
import glowViolet from '../assets/achievements/glow-violet.svg'
import glowGold from '../assets/achievements/glow-gold.svg'
import corner from '../assets/achievements/corner.svg'
import divider from '../assets/achievements/divider.svg'
import rewardCrystal from '../assets/achievements/reward-crystal.svg'
import sparkleLarge from '../assets/achievements/sparkle-large.svg'
import sparkleSmall from '../assets/achievements/sparkle-small.svg'
import './AchievementModal.css'

const numeric = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0
const targetOf = badge => numeric(badge.requirement_value ?? badge.max_progress)
const progressOf = badge => numeric(badge.progress)
const percentOf = badge => targetOf(badge) > 0 ? Math.min(100, progressOf(badge) / targetOf(badge) * 100) : 0
const statusOf = badge => badge.is_earned ? 'Earned' : isUnavailable(badge) ? 'Coming soon' : 'In progress'

function earnedDate(badge) {
  if (!badge.is_earned) return 'Not yet'
  if (!badge.earned_at) return 'Date not recorded'
  const date = new Date(badge.earned_at)
  return Number.isNaN(date.getTime()) ? 'Date not recorded' : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AchievementModal({ achievements = [], initialSelectedId = null, onClose, onOpenQuests }) {
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(initialSelectedId)
  const dialogRef = useRef(null)
  const headingRef = useRef(null)
  const scrollRef = useRef(null)
  const cardsRef = useRef(new Map())
  const collectionScrollRef = useRef(null)
  const returnMedalRef = useRef(initialSelectedId)
  const outsidePointerRef = useRef(false)
  const titleId = useId()
  const descriptionId = useId()
  const { earned, locked, unavailable, denominator } = splitAchievements(achievements)
  const visible = filter === 'earned' ? earned : filter === 'locked' ? locked : filter === 'unavailable' ? unavailable : achievements
  const badge = selectedId == null ? null : achievements.find(a => a.id === selectedId)
  const index = badge ? visible.findIndex(a => a.id === badge.id) : -1
  const viewKey = badge?.id ?? 'collection'

  // Native modal makes the surrounding document inert. Restore the exact
  // previous scroll style and opener rather than clearing global styles.
  useLayoutEffect(() => {
    const dialog = dialogRef.current
    const opener = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  // Browsing is read-only; it does not replay an award or change progress.
  useLayoutEffect(() => {
    if (viewKey !== 'collection') {
      if (scrollRef.current) scrollRef.current.scrollTop = 0
      headingRef.current?.focus({ preventScroll: true })
    } else {
      const card = cardsRef.current.get(returnMedalRef.current)
      if (scrollRef.current && collectionScrollRef.current !== null) scrollRef.current.scrollTop = collectionScrollRef.current
      if (card) {
        card.focus({ preventScroll: true })
        const area = scrollRef.current.getBoundingClientRect()
        const rect = card.getBoundingClientRect()
        if (rect.top < area.top || rect.bottom > area.bottom) card.scrollIntoView({ block: 'nearest' })
      } else headingRef.current?.focus({ preventScroll: true })
    }
  }, [viewKey])

  const openBadge = id => {
    if (!badge) collectionScrollRef.current = scrollRef.current.scrollTop
    returnMedalRef.current = id
    setSelectedId(id)
  }
  const backToCollection = () => setSelectedId(null)
  const focusWithin = event => {
    if (event.key !== 'Tab') return
    const buttons = [...dialogRef.current.querySelectorAll('button:not(:disabled)')].filter(n => n.getClientRects().length)
    const first = buttons[0], last = buttons.at(-1)
    if (!first) { event.preventDefault(); headingRef.current?.focus(); return }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === headingRef.current)) {
      event.preventDefault(); last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus()
    }
  }
  const outside = event => {
    const rect = dialogRef.current.getBoundingClientRect()
    return event.target === dialogRef.current && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
  }

  return createPortal(
    <dialog ref={dialogRef} aria-labelledby={titleId} aria-describedby={descriptionId} className={`achievement-dialog ${badge ? 'achievement-dialog-detail' : 'achievement-dialog-collection'}`}
      onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose() }}
      onKeyDown={focusWithin}
      onPointerDown={event => { outsidePointerRef.current = outside(event) }}
      onPointerUp={event => { if (outsidePointerRef.current && outside(event)) onClose(); outsidePointerRef.current = false }}>
      <div className="achievement-shell">
        {['tl', 'tr', 'bl', 'br'].map(position => <img key={position} src={corner} alt="" aria-hidden="true" className={`achievement-corner achievement-corner-${position}`} />)}
        <header className="achievement-modal-header">
          <span aria-hidden="true" className="achievement-header-rule" />
          <p className="achievement-eyebrow">{badge ? badge.is_earned ? 'Achievement unlocked' : 'Achievement' : 'Your collection'}</p>
          <span aria-hidden="true" className="achievement-header-rule" />
          <button type="button" className="achievement-close achievement-control" aria-label="Close achievements" onClick={onClose}>✕</button>
          {badge && <button type="button" className="achievement-back achievement-control" aria-label="Back to achievements" onClick={backToCollection}>←</button>}
        </header>

        {badge ? <>
          <div ref={scrollRef} className="achievement-scroll achievement-detail-scroll">
            <div className={`achievement-hero ${badge.is_earned ? 'achievement-hero-earned' : ''}`}>
              <div className="achievement-rays" aria-hidden="true"><img src={badge.is_earned ? raysGold : raysViolet} alt="" /></div>
              <img src={badge.is_earned ? glowGold : glowViolet} className="achievement-aura" alt="" aria-hidden="true" />
              {badge.is_earned && <div className="achievement-sparkles" aria-hidden="true">{[sparkleLarge,sparkleSmall,sparkleSmall,sparkleLarge].map((src,i)=><img key={i} src={src} alt="" />)}</div>}
              <MedalArt badge={badge} earned={!!badge.is_earned} unavailable={isUnavailable(badge)} className="achievement-detail-medal" />
              <h2 ref={headingRef} tabIndex={-1} id={titleId} className={`achievement-detail-title ${isUnavailable(badge) ? 'achievement-title-unavailable' : ''}`}>{badge.name}</h2>
              <span className={`achievement-state ${badge.is_earned ? 'achievement-state-earned' : isUnavailable(badge) ? 'achievement-state-unavailable' : 'achievement-state-progress'}`}>{statusOf(badge)}</span>
              <p id={descriptionId} className="achievement-description">{badge.description}</p>
            </div>
            <div className="achievement-divider" aria-hidden="true"><span /><img src={divider} alt="" /><span /></div>
            <div className="achievement-facts">
              <section className="achievement-fact"><h3>How to earn</h3><p className="achievement-criterion">{badge.description}</p>{isUnavailable(badge) && <p className="achievement-note">This achievement cannot currently be earned.</p>}</section>
              <section className="achievement-fact"><h3>Progress</h3>
                {isUnavailable(badge) ? <p className="achievement-note">Not available yet. No active progress is tracked.</p> : targetOf(badge) > 0 ? <>
                  <p className="achievement-progress-number">{progressOf(badge)} <span>/ {targetOf(badge)}</span></p>
                  <div role="progressbar" aria-label={`${badge.name} progress`} aria-valuemin={0} aria-valuemax={targetOf(badge)} aria-valuenow={Math.min(targetOf(badge),progressOf(badge))} aria-valuetext={`${progressOf(badge)} of ${targetOf(badge)}`} className={`achievement-progress-track ${badge.is_earned ? 'achievement-progress-earned' : ''}`}><span style={{width:`${percentOf(badge)}%`}} /></div>
                  <p className="achievement-note">{badge.is_earned ? 'Earned' : `${Math.max(0,targetOf(badge)-progressOf(badge))} to go`}</p>
                </> : <p className="achievement-note">{badge.is_earned ? 'Earned' : 'Progress not recorded'}</p>}
              </section>
              <section className="achievement-fact"><h3>Reward</h3><div className="achievement-reward"><img src={rewardCrystal} alt="" aria-hidden="true" /><p>+{numeric(badge.xp_reward)} XP</p></div><p className="achievement-note">{isUnavailable(badge) ? 'Defined reward; not currently earnable.' : 'Achievement reward. Viewing this medal does not award XP.'}</p></section>
            </div>
            <dl className="achievement-metadata"><div><dt>Category</dt><dd>{badge.category || 'Student'}</dd></div><div><dt>Unlocked on</dt><dd>{earnedDate(badge)}</dd></div><div><dt>In this view</dt><dd>{index + 1} of {visible.length}</dd></div></dl>
          </div>
          <footer className="achievement-detail-footer">
            <div className="achievement-detail-actions">
              <button type="button" className="achievement-control achievement-secondary" disabled={index <= 0} onClick={() => openBadge(visible[index - 1].id)}>‹ Previous</button>
              {!badge.is_earned && !isUnavailable(badge) && onOpenQuests
                ? <button type="button" className="achievement-control achievement-primary" onClick={() => { onClose(); onOpenQuests() }}>Go to Bounty Board <span aria-hidden="true">→</span></button>
                : <button type="button" className="achievement-control achievement-primary" onClick={badge.is_earned ? onClose : backToCollection}>{badge.is_earned ? 'Continue' : 'View collection'}</button>}
              <button type="button" className="achievement-control achievement-secondary" disabled={index < 0 || index >= visible.length - 1} onClick={() => openBadge(visible[index + 1].id)}>Next ›</button>
            </div>
            <div className="achievement-pagination" aria-hidden="true">{visible.map(a=><span key={a.id} className={a.id===badge.id?'achievement-page-current':''} />)}</div>
          </footer>
        </> : <>
          <div className="achievement-collection-heading"><h2 ref={headingRef} tabIndex={-1} id={titleId}>My Achievements</h2><p id={descriptionId}>{earned.length} of {denominator} medals earned</p></div>
          <div className="achievement-filters" role="group" aria-label="Filter achievements">
            {[{key:'all',label:`All (${achievements.length})`},{key:'earned',label:`Earned (${earned.length})`},{key:'locked',label:`Locked (${locked.length})`},...(unavailable.length?[{key:'unavailable',label:`Not available yet (${unavailable.length})`}]:[])].map(tab=><button key={tab.key} type="button" aria-pressed={filter===tab.key} className={`achievement-control achievement-filter ${filter===tab.key?'achievement-filter-active':''}`} onClick={()=>{setFilter(tab.key);if(scrollRef.current)scrollRef.current.scrollTop=0;collectionScrollRef.current=0}}>{tab.label}</button>)}
          </div>
          <div ref={scrollRef} className="achievement-scroll achievement-collection-scroll">
            {visible.length===0 ? <div className="achievement-empty"><img src={emptyMedalDisplay} alt="" width="112" height="112" /><h3>{filter==='earned'?'Your first medal awaits':'No achievements in this view'}</h3><p>{filter==='earned'?'Complete quests and meet achievement requirements to earn your first medal.':'Choose another filter to explore your achievements.'}</p></div>
              : <div className="achievement-collection-grid">{visible.map(a=><button key={a.id} type="button" ref={node=>{if(node)cardsRef.current.set(a.id,node);else cardsRef.current.delete(a.id)}} className="achievement-collection-card achievement-control" aria-label={`View ${a.name}, ${statusOf(a).toLowerCase()}`} onClick={()=>openBadge(a.id)}>
                <MedalArt badge={a} earned={!!a.is_earned} unavailable={isUnavailable(a)} className="achievement-card-medal" /><span className="achievement-card-name">{a.name}</span><span className={`achievement-state ${a.is_earned?'achievement-state-earned':isUnavailable(a)?'achievement-state-unavailable':'achievement-state-progress'}`}>{statusOf(a)}</span>
                {!a.is_earned && !isUnavailable(a) && targetOf(a)>0 && <span className="achievement-card-progress">{progressOf(a)} / {targetOf(a)}</span>}
              </button>)}</div>}
          </div>
          <footer className="achievement-collection-footer">Select a medal to see its requirements, progress and reward.</footer>
        </>}
      </div>
    </dialog>,document.body
  )
}
