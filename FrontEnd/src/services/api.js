import { supabase } from './supabase'

const BASE_URL = `${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api/v1`

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// Pega o token da sessão atual (o SDK renova se estiver perto de expirar).
async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function readError(res) {
  try {
    const data = await res.json()
    return data.message ?? data.error ?? `Erro ${res.status}`
  } catch {
    return `Erro ${res.status}`
  }
}

async function handleUnauthorized() {
  await supabase.auth.signOut() // o PrivateRoute redireciona para /login
  throw new ApiError('Sessão expirada. Entre novamente.', 401)
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  let res
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        ...(await authHeader()),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('Não foi possível conectar à API. Ela está rodando?', 0)
  }

  if (res.status === 401) return handleUnauthorized()
  if (!res.ok) throw new ApiError(await readError(res), res.status)
  return res.status === 204 ? null : res.json()
}

// Upload multipart com progresso (fetch não informa progresso de envio).
export async function apiUpload(path, file, onProgress) {
  const headers = await authHeader()

  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file) // campo esperado pela API: "file"

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${BASE_URL}${path}`)
    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v))

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onerror = () => reject(new ApiError('Não foi possível conectar à API. Ela está rodando?', 0))
    xhr.onload = () => {
      let data = null
      try { data = JSON.parse(xhr.responseText) } catch { /* corpo vazio */ }

      if (xhr.status === 401) return handleUnauthorized().catch(reject)
      if (xhr.status >= 200 && xhr.status < 300) return resolve(data)
      reject(new ApiError(data?.message ?? data?.error ?? `Erro ${xhr.status}`, xhr.status))
    }
    xhr.send(form)
  })
}