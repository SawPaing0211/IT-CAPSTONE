import test from 'node:test'
import assert from 'node:assert/strict'
import { savedQuestResult } from '../src/utils/savedQuestResult.js'

test('restores recorded final verdict, score and cases without assigning a new XP award', () => {
  const source = {status:'accepted',score:50,passed_cases:6,total_cases:6,results_recorded:true,test_results:[{passed:true,hidden:true}]}
  const saved = savedQuestResult(source, 'python')
  assert.equal(saved.is_saved_final, true)
  assert.equal(saved.is_run_mode, false)
  assert.equal(saved.score, 50)
  assert.equal(saved.xp_earned, undefined)
  assert.deepEqual(saved.test_results, source.test_results)
  assert.equal(source.is_saved_final, undefined)
})
test('legacy final keeps actual verdict and counts without inventing details', () => {
  const saved = savedQuestResult({status:'partial',score:20,passed_cases:2,total_cases:6,results_recorded:false}, 'java')
  assert.equal(saved.status,'partial')
  assert.equal(saved.passed_cases,2)
  assert.deepEqual(saved.test_results,[])
  assert.equal(saved.language,'java')
})
test('unsubmitted language has no saved final and a Run result cannot mutate it', () => {
  assert.equal(savedQuestResult(null,'csharp'),null)
  const original = {status:'accepted',score:50,results_recorded:true,test_results:[]}
  const saved = savedQuestResult(original,'python')
  const preview = {status:'wrong_answer',is_run_mode:true,xp_earned:0}
  assert.equal(saved.status,'accepted')
  assert.equal(preview.status,'wrong_answer')
  assert.equal(original.score,50)
})
