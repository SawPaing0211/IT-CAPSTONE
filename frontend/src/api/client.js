// src/api/client.js
const BASE = 'http://localhost:5000'

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
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  return res.json()
}

export const api = {
  get:    (path)         => request(path),
  post:   (path, body)   => request(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (path, body)   => request(path, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (path)         => request(path, { method: 'DELETE' }),
}