import { useState } from 'react'
import * as accountsApi from '../../api/accounts.js'
import { ApiError } from '../../api/client.js'
import { useAuth } from '../../auth/AuthContext.jsx'
import Field from '../../components/Field.jsx'

export default function Settings() {
  const { user, setUser, logout } = useAuth()
  const [nickname, setNickname] = useState(user.nickname)
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setErrors({})
    setMessage('')
    setDone(false)
    try {
      const updated = await accountsApi.updateNickname(nickname)
      setUser(updated)
      setNickname(updated.nickname)
      setDone(true)
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        logout() // 로그인이 풀렸으면 로그인 화면으로 보낸다.
        return
      }
      // 실패하면 입력한 새 닉네임은 그대로 둔다.
      if (error instanceof ApiError) {
        setErrors(error.errors)
        setMessage(error.detail)
      } else {
        setMessage('닉네임을 바꾸지 못했습니다. 잠시 후 다시 시도해 주세요.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <h1>계정 설정</h1>
      <form className="card form" onSubmit={handleSubmit} noValidate>
        <p>
          현재 닉네임: <strong>{user.nickname}</strong>
        </p>
        {done && (
          <p className="alert alert-ok" role="status">
            닉네임을 바꿨습니다.
          </p>
        )}
        {message && (
          <p className="alert alert-error" role="alert">
            {message}
          </p>
        )}
        <Field
          label="새 닉네임"
          type="text"
          name="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          error={errors.nickname}
          hint="2~20자, 한글·영문·숫자·밑줄만 사용할 수 있습니다."
        />
        <button type="submit" className="button button-primary" disabled={submitting}>
          변경
        </button>
      </form>
    </section>
  )
}
