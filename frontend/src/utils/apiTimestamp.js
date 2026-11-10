// The backend serializes UTC datetimes without a timezone suffix.
export function parseApiTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  const text = value.trim()
  const date = new Date(/(?:Z|[+-]\d{2}:?\d{2})$/i.test(text) ? text : `${text}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatApiTimestamp(value, options) {
  return parseApiTimestamp(value)?.toLocaleString(undefined, options) || 'Time unavailable'
}
