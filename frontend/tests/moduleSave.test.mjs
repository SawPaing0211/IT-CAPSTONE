import test from 'node:test'
import assert from 'node:assert/strict'
import { saveModule } from '../src/pages/Instructor/saveModule.js'

const defaults = { savedId: null, details: { title: 'Module', description: 'Description', week_number: 2 }, subjectId: 5, classId: 63, files: [], published: false, onCreated() {}, onUploaded() {} }

test('Publish creates a class-scoped draft, uploads exact file, then publishes', async () => {
  const calls = [], uploaded = [], ids = []
  const file = new File(['fixture'], 'notes.pdf', { type: 'application/pdf' })
  await saveModule({ ...defaults, published: true, files: [{ file }], onCreated: id => ids.push(id), onUploaded: index => uploaded.push(index), request: async (path, options) => { calls.push([path, options]); return { lesson_id: 42 } } })
  assert.equal(calls.length, 3)
  assert.deepEqual(JSON.parse(calls[0][1].body), { ...defaults.details, subject_id: 5, section_id: 63, is_published: false })
  assert.equal(calls[1][0], '/api/lessons/42/files')
  assert.equal(await calls[1][1].body.get('file').text(), 'fixture')
  assert.deepEqual(JSON.parse(calls[2][1].body), { is_published: true })
  assert.deepEqual(ids, [42]); assert.deepEqual(uploaded, [0])
})
test('upload rejection stops before Publish, retaining acknowledged draft identity', async () => {
  const calls = [], ids = []
  await assert.rejects(saveModule({ ...defaults, published: true, files: [{ file: new File(['x'], 'notes.pdf') }], onCreated: id => ids.push(id), request: async (path, options) => { calls.push([path, options]); if (path.endsWith('/files')) throw new Error('Upload rejected'); return { lesson_id: 42 } } }), /Upload rejected/)
  assert.deepEqual(ids, [42]); assert.equal(calls.length, 2)
  assert.equal(JSON.parse(calls[0][1].body).is_published, false)
})
test('retry reuses the same module and skips uploads already confirmed', async () => {
  const calls = []
  await saveModule({ ...defaults, savedId: 42, files: [{ file: new File(['x'], 'notes.pdf'), uploaded: true }], request: async (path, options) => { calls.push([path, options]); return {} } })
  assert.equal(calls.length, 2)
  assert.ok(calls.every(([path, options]) => path === '/api/lessons/42' && options.method === 'PUT'))
  assert.equal(JSON.parse(calls[1][1].body).is_published, false)
})
test('malformed creation response is uncertain and prevents upload or publication', async () => {
  let calls = 0
  await assert.rejects(saveModule({ ...defaults, published: true, request: async () => { calls++; return {} } }), failure => failure.uncertain === true)
  assert.equal(calls, 1)
})
test('failed creation does not upload or publish, and propagates uncertainty', async () => {
  let calls = 0
  const failure = Object.assign(new Error('Connection lost'), { uncertain: true })
  await assert.rejects(saveModule({ ...defaults, request: async () => { calls++; throw failure } }), error => error === failure)
  assert.equal(calls, 1)
})
