import test from 'node:test'
import assert from 'node:assert/strict'
import { scanSummary, validateAnalytics, displayNumber } from '../src/pages/Instructor/instructorReviewData.js'

test('zero and one submission are insufficient, never all-clear',()=>{
  for(const count of [0,1]) assert.equal(scanSummary({pairs:[],total_compared:count,flagged:0,threshold:85}).title,'Not enough submissions to compare')
})
test('successful comparison with no flags explicitly limits its conclusion',()=>{
  const summary=scanSummary({pairs:[],total_compared:2,flagged:0,threshold:90})
  assert.equal(summary.title,'No pairs exceeded the threshold')
  assert.match(summary.detail,/90%/)
  assert.match(summary.detail,/not proof of originality/)
})
test('flagged pair requires review instead of a misconduct conclusion',()=>{
  const summary=scanSummary({pairs:[{}],total_compared:2,flagged:1,threshold:75})
  assert.equal(summary.title,'1 pair needs review')
  assert.match(summary.detail,/not a plagiarism determination/)
})
test('missing scan counts cannot appear as a valid empty result',()=>{
  assert.throws(()=>scanSummary({pairs:[],flagged:0,threshold:85}))
})
test('valid zero analytics differs from unavailable counts and arrays',()=>{
  const data={total_students:0,total_submissions:0,success_rate:0,avg_xp:0,top_performers:[],challenging_problems:[],activity_heatmap:[],at_risk_students:[]}
  assert.equal(validateAnalytics(data),data)
  assert.throws(()=>validateAnalytics({...data,total_students:null}))
  assert.throws(()=>validateAnalytics({...data,top_performers:null}))
  assert.equal(displayNumber(0),'0')
  assert.equal(displayNumber(null),'—')
})
