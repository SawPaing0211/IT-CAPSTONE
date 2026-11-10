import test from 'node:test'
import assert from 'node:assert/strict'
import { createAchievementStore } from '../src/utils/achievementNotifications.js'
import { countable, splitAchievements, isUnavailable, medalKey } from '../src/utils/achievementView.js'

const ach = (id, o = {}) => ({ id, name: `A${id}`, is_earned: false, just_earned: false, attainable: true, ...o })
const deferred = () => { let res, rej; const p = new Promise((a, b) => { res = a; rej = b }); return { p, res, rej } }
const mk = (fn) => createAchievementStore(fn)
const q = (s) => s.getSnapshot().queue.map(x => x.badge.id)

test('first award queues with no prior count', async () => {
  const s = mk(async () => [ach(1, { is_earned: true, just_earned: true })])
  s.setOwner({ id: 7, role: 'student' })
  await s.load()
  assert.deepEqual(q(s), [1])
})

test('multiple awards are queued separately, in response order', async () => {
  const s = mk(async () => [ach(1, { is_earned: true, just_earned: true }), ach(2), ach(3, { is_earned: true, just_earned: true })])
  s.setOwner({ id: 7, role: 'student' }); await s.load()
  assert.deepEqual(q(s), [1, 3])
})

test('repeat fetch / remount does not replay, even if server repeats the flag', async () => {
  const s = mk(async () => [ach(1, { is_earned: true, just_earned: true })])
  s.setOwner({ id: 7, role: 'student' }); await s.load()
  s.dismiss(s.getSnapshot().queue[0].key)
  await s.load(); await s.load({ fresh: true })
  assert.deepEqual(q(s), [])
})

test('non-flagged earned items never queue (no count/order guessing)', async () => {
  const s = mk(async () => [ach(1, { is_earned: true }), ach(2, { is_earned: true })])
  s.setOwner({ id: 7, role: 'student' }); await s.load()
  assert.deepEqual(q(s), [])
})

test('concurrent loads share one request', async () => {
  let n = 0; const d = deferred()
  const s = mk(() => { n++; return d.p })
  s.setOwner({ id: 7, role: 'student' })
  const a = s.load(), b = s.load(), c = s.load()
  d.res([ach(1, { is_earned: true, just_earned: true })])
  await Promise.all([a, b, c])
  assert.equal(n, 1); assert.deepEqual(q(s), [1])
})

test('fresh load during in-flight request issues exactly one follow-up', async () => {
  const ds = [deferred(), deferred()]; let n = 0
  const s = mk(() => ds[n++].p)
  s.setOwner({ id: 7, role: 'student' })
  const first = s.load()
  const f1 = s.load({ fresh: true }), f2 = s.load({ fresh: true })
  assert.equal(f1, f2)
  ds[0].res([ach(1)])
  await first
  await new Promise(r => setImmediate(r))
  assert.equal(n, 2)
  ds[1].res([ach(1, { is_earned: true, just_earned: true })])
  await f1
  assert.deepEqual(q(s), [1])
})

test('account switch and sign-out clear the queue; late response is discarded', async () => {
  const d = deferred()
  const s = mk(() => d.p)
  s.setOwner({ id: 1, role: 'student' })
  const p = s.load()
  s.setOwner({ id: 2, role: 'student' })          // switch while in flight
  d.res([ach(1, { is_earned: true, just_earned: true })])
  assert.equal(await p, null)
  assert.deepEqual(q(s), [])
  assert.equal(s.getSnapshot().list, null)

  const s2 = mk(async () => [ach(1, { is_earned: true, just_earned: true })])
  s2.setOwner({ id: 1, role: 'student' }); await s2.load()
  s2.clear()
  assert.deepEqual(q(s2), [])
  s2.setOwner({ id: 1, role: 'student' }); await s2.load()   // same user signs in again
  assert.deepEqual(q(s2), [1])                                // fresh session: server flag is the authority
})

test('same achievement for a different user is a different identity', async () => {
  const s = mk(async () => [ach(1, { is_earned: true, just_earned: true })])
  s.setOwner({ id: 1, role: 'student' }); await s.load()
  s.setOwner({ id: 2, role: 'student' }); await s.load()
  assert.deepEqual(q(s), [1])
  assert.match(s.getSnapshot().queue[0].key, /^2:/)
})

test('refreshAfterSubmit never rejects when the fetch fails', async () => {
  const s = mk(async () => { throw new Error('boom') })
  s.setOwner({ id: 1, role: 'student' })
  assert.equal(await s.refreshAfterSubmit(), null)
  assert.ok(s.getSnapshot().status.error)
  assert.deepEqual(q(s), [])
})

test('failed fetch can be retried and then celebrates once', async () => {
  let fail = true
  const s = mk(async () => { if (fail) throw new Error('x'); return [ach(1, { is_earned: true, just_earned: true })] })
  s.setOwner({ id: 1, role: 'student' })
  await s.refreshAfterSubmit(); fail = false
  await s.load(); await s.load()
  assert.deepEqual(q(s), [1])
})

test('role without an achievements endpoint does nothing', async () => {
  let n = 0
  const s = mk(async () => { n++; return [] })
  s.setOwner({ id: 1, role: 'administrator' }); await s.load()
  assert.equal(n, 0)
})

test('view helpers: denominator = unique union of attainable and earned', () => {
  const list = [
    ach(1, { is_earned: true }),
    ach(2),
    ach(3, { attainable: false }),
    ach(4, { attainable: false, is_earned: true }),
    ach(2),                                    // duplicate definition id
  ]
  assert.equal(countable(list).length, 3)
  const s = splitAchievements(list)
  assert.equal(s.denominator, 3)
  assert.deepEqual(s.unavailable.map(a => a.id), [3])
  assert.equal(isUnavailable(list[3]), false)  // earned stays visible/earned
  assert.equal(isUnavailable({ id: 9, is_earned: false }), false) // legacy payload
})

test('medalKey is semantic and falls back without hard-coding student', () => {
  assert.equal(medalKey({ category: 'instructor', requirement_type: 'file_count', requirement_value: 5 }), 'instructor|file_count|5')
  assert.equal(medalKey({ requirement_type: 'streak', requirement_value: 7 }, 'instructor'), 'instructor|streak|7')
  assert.equal(medalKey({ requirement_type: 'streak', max_progress: 7 }), 'student|streak|7')
})
