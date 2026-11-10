import { API_BASE, authFetch } from '../../api/client'

export const FILE_ACCEPT = '.pdf,.ppt,.pptx,.doc,.docx,.jpg,.jpeg,.png,.zip'
export const MAX_FILE_BYTES = 16 * 1024 * 1024
export function fileError(file) {
  const extension = file.name.split('.').pop().toLowerCase()
  if (!FILE_ACCEPT.split(',').includes(`.${extension}`)) return `${file.name}: unsupported file type.`
  if (file.size > MAX_FILE_BYTES) return `${file.name}: exceeds the 16 MiB file limit.`
  return null
}
export function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return 'Size unavailable'
  if (bytes < 1024) return `${bytes} B`
  return bytes < 1024 ** 2 ? `${(bytes / 1024).toFixed(1)} KiB` : `${(bytes / 1024 ** 2).toFixed(2)} MiB`
}
export async function moduleRequest(path, options) {
  let response
  try { response = await authFetch(`${API_BASE}${path}`, options) }
  catch (cause) { const error = new Error('Connection lost. Check the module list before repeating a save or upload.'); error.uncertain = options?.method && options.method !== 'GET'; error.cause = cause; throw error }
  if (!response.ok) {
    const body = await response.json().catch(() => null)
    throw new Error(body?.error || (response.status === 413 ? 'Upload rejected: request is too large.' : `Request failed (${response.status}). Try again.`))
  }
  return response
}
export async function moduleJson(path, options) {
  const response = await moduleRequest(path, options)
  try { return await response.json() }
  catch { const error = new Error('The server response could not be read. Check the module list before saving again.'); error.uncertain = Boolean(options?.method && options.method !== 'GET'); throw error }
}
export const jsonOptions = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
export async function downloadModuleFile(lessonId, file) {
  const response = await moduleRequest(`/api/lessons/${lessonId}/files/${file.id}/download`)
  const url = URL.createObjectURL(await response.blob())
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = file.filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
