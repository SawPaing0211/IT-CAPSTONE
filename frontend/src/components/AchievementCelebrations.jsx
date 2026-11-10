import { useEffect, useRef, useSyncExternalStore } from 'react'
import AchievementToast from './AchievementToast'
import { achievementStore } from '../utils/achievementStore'
import { triggerConfetti } from '../utils/confetti'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Shows one queued award at a time. A persistent polite live region carries
// the screen-reader announcement; the visual toast is aria-hidden so it is
// not announced twice. No sound. Confetti only when motion is allowed.
export default function AchievementCelebrations() {
  const snap = useSyncExternalStore(achievementStore.subscribe, achievementStore.getSnapshot)
  const head = snap.queue[0] || null
  const reduced = prefersReducedMotion()
  const celebrated = useRef(new Set())

  useEffect(() => {
    if (!head || celebrated.current.has(head.key)) return
    celebrated.current.add(head.key)
    if (!reduced) triggerConfetti()
  }, [head, reduced])

  const announce = head
    ? `Achievement unlocked: ${head.badge.name}${head.badge.xp_reward > 0 ? `, plus ${head.badge.xp_reward} XP` : ''}`
    : ''

  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" data-testid="achievement-announcer"
           className="sr-only">{announce}</div>
      {head && (
        <AchievementToast
          key={head.key}
          badge={head.badge}
          reducedMotion={reduced}
          remaining={snap.queue.length - 1}
          onClose={() => achievementStore.dismiss(head.key)}
        />
      )}
    </>
  )
}
