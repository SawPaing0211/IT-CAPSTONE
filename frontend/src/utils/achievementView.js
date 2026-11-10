// Pure helpers for how achievements are counted and displayed.
// No React, no DOM: unit-tested with `node --test`.

// Unearned + backend says it cannot be earned yet -> "Not available yet".
// Older responses without the field are treated as attainable.
export const isUnavailable = (a) => !!a && !a.is_earned && a.attainable === false

// Denominator = unique union of attainable and already-earned definitions.
export function countable(list) {
  const seen = new Set()
  const out = []
  for (const a of list || []) {
    if (!a || seen.has(a.id)) continue
    if (a.attainable !== false || a.is_earned) { seen.add(a.id); out.push(a) }
  }
  return out
}

export const splitAchievements = (list) => {
  const all = list || []
  const earned = all.filter(a => a.is_earned)
  const unavailable = all.filter(isUnavailable)
  const locked = all.filter(a => !a.is_earned && !isUnavailable(a))
  return { all, earned, locked, unavailable, denominator: countable(all).length }
}

// Stable semantic identity for a future medal asset (category|type|value).
// Missing category falls back to the viewer's role, never to a hard-coded one.
export function medalKey(a, fallbackCategory = 'student') {
  const category = (a && a.category) || fallbackCategory
  const type = a && a.requirement_type != null ? a.requirement_type : 'unknown'
  const value = a && a.requirement_value != null ? a.requirement_value : (a && a.max_progress != null ? a.max_progress : 'unknown')
  return `${category}|${type}|${value}`
}
