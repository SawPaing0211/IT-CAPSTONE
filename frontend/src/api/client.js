// src/api/client.js
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const BASE = API_BASE

async function request(path, options = {}) {
  const token = localStorage.getItem('token')
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  let res = await fetch(`${BASE}${path}`, { ...options, headers })

  // Attempt one silent refresh on 401
  if (res.status === 401) {
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      localStorage.clear()
      window.location.href = '/'
      return
    }

    const refreshRes = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (refreshRes.ok) {
      const { access_token } = await refreshRes.json()
      localStorage.setItem('token', access_token)
      // Retry original request with new token
      res = await fetch(`${BASE}${path}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${access_token}` },
      })
    } else {
      localStorage.clear()
      window.location.href = '/'
      return
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }))
    const error = new Error(err.error || `HTTP ${res.status}`)
    error.status = res.status
    error.data = err
    throw error
  }

  return res.json()
}

// fetch() for the pages that still build their own requests: adds the access
// token and, like api.* above, silently refreshes it once when it has expired,
// so a long-open tab keeps working instead of showing a load error.
export async function authFetch(url, options = {}) {
  const send = (t) => fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), ...(t ? { Authorization: `Bearer ${t}` } : {}) },
  })
  const res = await send(localStorage.getItem('token'))
  if (res.status !== 401) return res

  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) { localStorage.clear(); window.location.href = '/'; return res }
  const refreshRes = await fetch(`${BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!refreshRes.ok) { localStorage.clear(); window.location.href = '/'; return res }
  const { access_token } = await refreshRes.json()
  localStorage.setItem('token', access_token)
  return send(access_token)
}

export const api = {
  get:    (path)         => request(path),
  post:   (path, body)   => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)   => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)         => request(path, { method: 'DELETE' }),
}