import test from 'node:test'
import assert from 'node:assert/strict'
import { parseApiTimestamp, formatApiTimestamp } from '../src/utils/apiTimestamp.js'

test('naive API datetimes are interpreted as UTC, not the browser timezone', () => {
  assert.equal(parseApiTimestamp('2026-11-06T20:29:00').toISOString(), '2026-11-06T20:29:00.000Z')
  assert.match(formatApiTimestamp('2026-11-06T20:29:00', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit', hour12: false }), /04:29/)
})
test('explicit UTC and timezone offsets are preserved', () => {
  for (const value of ['2026-11-06T20:29:00Z', '2026-11-07T04:29:00+08:00']) {
    assert.equal(parseApiTimestamp(value).toISOString(), '2026-11-06T20:29:00.000Z')
  }
})
test('missing and malformed timestamps are unavailable rather than current time', () => {
  for (const value of [null, undefined, '', ' ', 'not a date', 0]) {
    assert.equal(parseApiTimestamp(value), null)
    assert.equal(formatApiTimestamp(value), 'Time unavailable')
  }
})
