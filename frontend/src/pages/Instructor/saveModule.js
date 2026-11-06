// Sequence the existing lesson and attachment endpoints. New modules stay
// Draft until every upload succeeds; retries reuse their acknowledged ID.
export async function saveModule({ savedId, details, subjectId, classId, files, published, request, onCreated, onUploaded }) {
  const json = body => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  let id = savedId
  if (!id) {
    const created = await request('/api/lessons', { method: 'POST', ...json({ ...details, subject_id: Number(subjectId), section_id: Number(classId), is_published: false }) })
    if (!Number.isInteger(created.lesson_id)) {
      const fault = new Error('Creation returned no module ID. Check the module list before saving again.')
      fault.uncertain = true
      throw fault
    }
    id = created.lesson_id
    onCreated(id)
  } else await request(`/api/lessons/${id}`, { method: 'PUT', ...json(details) })
  for (const [index, entry] of files.entries()) {
    if (entry.uploaded) continue
    const body = new FormData()
    body.append('file', entry.file)
    await request(`/api/lessons/${id}/files`, { method: 'POST', body })
    onUploaded(index)
  }
  await request(`/api/lessons/${id}`, { method: 'PUT', ...json({ is_published: published }) })
  return id
}
