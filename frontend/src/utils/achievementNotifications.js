// User-scoped achievement store + celebration queue.
//
// Rules (see docs/ACHIEVEMENT_INTEGRITY_IMPLEMENTATION_BRIEF):
//  * only items the server flags `just_earned: true` are ever queued; there is
//    no earned-count or list-order guessing;
//  * each (user, achievement) is queued at most once for the lifetime of the
//    signed-in session; repeats, remounts and re-fetches never replay;
//  * concurrent loads share one in-flight request; a `fresh` load that arrives
//    while one is running schedules exactly one follow-up so a request started
//    before a commit cannot satisfy a post-commit refresh;
//  * the queue and cache are dropped on sign-out / account switch, and a
//    response that lands after that is discarded;
//  * a failed fetch never throws into the caller of `refreshAfterSubmit`.
//
// The module has no React or DOM dependency; `createAchievementStore` is
// injectable for tests and the default singleton is used by the app.

const ENDPOINTS = {
  student: '/api/student/achievements',
  instructor: '/api/instructor/achievements',
  administrator: null,
}

export function createAchievementStore(defaultFetcher) {
  let owner = null            // { id, role }
  let generation = 0
  let queue = []              // [{ key, badge }]
  let queuedKeys = new Set()  // keys ever queued for this owner
  let lists = new Map()       // ownerId -> latest list
  let status = { loading: false, error: null }
  let inflight = null         // { promise, followUp }
  let snapshot = { owner: null, queue, list: null, status }
  const listeners = new Set()

  const publish = () => {
    snapshot = {
      owner,
      queue,
      list: owner ? lists.get(String(owner.id)) ?? null : null,
      status,
    }
    listeners.forEach(l => l())
  }

  const keyOf = (id, achId) => `${id}:${achId}`

  function clear() {
    generation += 1
    owner = null
    queue = []
    queuedKeys = new Set()
    lists = new Map()
    status = { loading: false, error: null }
    inflight = null
    publish()
  }

  function setOwner(next) {
    if (!next || next.id == null) { clear(); return }
    if (owner && String(owner.id) === String(next.id)) {
      if (owner.role !== next.role) { owner = { id: next.id, role: next.role }; publish() }
      return
    }
    clear()
    owner = { id: next.id, role: next.role }
    publish()
  }

  function ingest(list, forOwner) {
    if (!Array.isArray(list)) return
    lists.set(String(forOwner.id), list)
    const fresh = []
    for (const a of list) {
      if (a && a.just_earned === true) {
        const k = keyOf(forOwner.id, a.id)
        if (!queuedKeys.has(k)) { queuedKeys.add(k); fresh.push({ key: k, badge: a }) }
      }
    }
    if (fresh.length) queue = [...queue, ...fresh]
  }

  function startFetch() {
    const o = owner
    const gen = generation
    const path = o && ENDPOINTS[o.role]
    if (!path) return Promise.resolve(null)
    status = { loading: true, error: null }
    publish()
    const p = Promise.resolve()
      .then(() => defaultFetcher(path))
      .then((list) => {
        if (gen !== generation) return null            // signed out / switched: drop it
        ingest(list, o)
        status = { loading: false, error: null }
        publish()
        return list
      })
      .catch((err) => {
        if (gen !== generation) return null
        status = { loading: false, error: err }
        publish()
        throw err
      })
    return p
  }

  // Shared load. fresh=true guarantees the response was produced by a request
  // that started after this call.
  function load({ fresh = false } = {}) {
    if (!owner) return Promise.resolve(null)
    if (!inflight) {
      const entry = { followUp: null }
      entry.promise = startFetch().finally(() => { if (inflight === entry) inflight = null })
      inflight = entry
      return entry.promise
    }
    if (!fresh) return inflight.promise
    const cur = inflight
    if (!cur.followUp) {
      const gen = generation
      cur.followUp = cur.promise.catch(() => {}).then(() => {
        if (gen !== generation) return null
        const entry = { followUp: null }
        entry.promise = startFetch().finally(() => { if (inflight === entry) inflight = null })
        inflight = entry
        return entry.promise
      })
    }
    return cur.followUp
  }

  // Called after a submit has already committed (HTTP 2xx). Never rejects.
  async function refreshAfterSubmit() {
    try { return await load({ fresh: true }) } catch { return null }
  }

  function dismiss(key) {
    const next = queue.filter(q => q.key !== key)
    if (next.length !== queue.length) { queue = next; publish() }
  }

  return {
    setOwner, clear, load, refreshAfterSubmit, dismiss,
    subscribe(l) { listeners.add(l); return () => listeners.delete(l) },
    getSnapshot() { return snapshot },
    _debug() { return { generation, queued: queuedKeys.size } },
  }
}
