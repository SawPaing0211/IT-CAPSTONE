import { useEffect, useSyncExternalStore } from 'react'
import { achievementStore } from '../utils/achievementStore'

// Reads the shared, user-scoped achievements list and triggers a shared
// (in-flight de-duplicated) load on mount. Celebrations are NOT decided here.
export default function useAchievements() {
  const snap = useSyncExternalStore(achievementStore.subscribe, achievementStore.getSnapshot)
  const ownerId = snap.owner ? snap.owner.id : null
  useEffect(() => {
    if (ownerId == null) return
    achievementStore.load().catch(() => {})
  }, [ownerId])
  return {
    achievements: snap.list || [],
    loading: snap.list == null && (snap.status.loading || ownerId != null) && !snap.status.error,
    error: snap.status.error,
    reload: () => achievementStore.load({ fresh: true }),
  }
}
