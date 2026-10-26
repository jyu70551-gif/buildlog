import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as accountsApi from '../api/accounts.js'
import { ApiError, clearToken, getToken, setToken } from '../api/client.js'

const AuthContext = createContext(null)

// status: 'loading'(로그인 확인 중) | 'ready'(확인 끝) | 'error'(서버에 연결하지 못함)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(() => (getToken() ? 'loading' : 'ready'))

  const loadUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setStatus('ready')
      return
    }
    setStatus('loading')
    try {
      setUser(await accountsApi.fetchMe())
      setStatus('ready')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // 보관해 둔 로그인 확인 값이 더는 쓸 수 없으면 지운다.
        clearToken()
        setUser(null)
        setStatus('ready')
      } else {
        setStatus('error')
      }
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = useCallback(async (email, password) => {
    const data = await accountsApi.login({ email, password })
    setToken(data.access_token)
    setUser(data.user)
    setStatus('ready')
  }, [])

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, status, login, logout, setUser, retry: loadUser }),
    [user, status, login, logout, loadUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider 안에서만 사용할 수 있습니다.')
  return value
}
