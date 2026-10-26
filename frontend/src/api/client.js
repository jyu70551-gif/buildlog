const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'
const TOKEN_KEY = 'buildlog_token'

// 로그인 확인 값은 로그아웃할 때까지 브라우저에 보관한다.
// 브라우저 저장 공간을 못 쓰는 환경에서도 화면이 멈추지 않도록 오류는 무시한다.
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // 저장하지 못해도 이번 화면에서는 로그인 상태를 유지한다.
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // 무시
  }
}

export class ApiError extends Error {
  constructor(status, detail, errors = {}) {
    super(detail)
    this.status = status
    this.detail = detail
    this.errors = errors
  }
}

export async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = auth ? getToken() : null
  if (token) headers.Authorization = `Bearer ${token}`

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = typeof data?.detail === 'string' ? data.detail : '요청을 처리하지 못했습니다.'
    throw new ApiError(response.status, detail, data?.errors ?? {})
  }
  return data
}
