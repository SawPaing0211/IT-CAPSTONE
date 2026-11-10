import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeAssignedClasses, groupAssignedClasses, enrollmentTotal } from '../src/components/classPickerData.js'

test('assigned course groups retain exact class identity for quest/announcement destinations', () => {
  const data = normalizeAssignedClasses([
    {id: 63, subject_id: 2, section_no: '00001', subjects:['Computing Lab'], semester:'1st', student_count:6, problem_count:2},
    {id: 64, subject_id: 2, section_no: '00002', subjects:['Computing Lab'], semester:'2nd', student_count:4, problem_count:1},
    {id: 65, subject_id: 3, section_no: '00003', subjects:['Programming Lab'], student_count:8},
  ])
  const groups = groupAssignedClasses(data)
  assert.equal(groups.length, 2)
  assert.deepEqual(groups[0].classes.map(c => [c.id,c.subjectId,c.name]), [[63,2,'00001'],[64,2,'00002']])
  assert.equal(groups[0].classes[1].semester, '2nd')
  assert.equal(enrollmentTotal(groups[0].classes), 10)
  assert.equal(groups[1].classes[0].id,65)
})
test('unknown enrollment is not a valid zero; zero remains zero', () => {
  assert.equal(enrollmentTotal([{students:0}]),0)
  assert.equal(enrollmentTotal([{students:6},{}]),null)
})
test('missing subject IDs remain separate classes, not a shared false group', () => {
  const groups=groupAssignedClasses(normalizeAssignedClasses([{id:1,section_no:'A'}, {id:2,section_no:'B'}]))
  assert.equal(groups.length,2)
  assert.notEqual(groups[0].key,groups[1].key)
})
test('malformed responses fail rather than appearing as no assignments', () => {
  assert.throws(()=>normalizeAssignedClasses({error:'Denied'}))
  assert.throws(()=>normalizeAssignedClasses([null]))
  assert.throws(()=>normalizeAssignedClasses([{id:1}]))
  assert.deepEqual(normalizeAssignedClasses([]),[])
})
