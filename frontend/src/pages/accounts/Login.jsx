import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client.js'
import { useAuth } from '../../auth/AuthContext.jsx'
import Field from '../../components/Field.jsx'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (error) {
      // 실패하면 이메일은 남기고 비밀번호만 지운다.
      setPassword('')
      setMessage(
        error instanceof ApiError ? error.detail : '로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <h1>로그인</h1>
      {location.state?.signedUp && !message && (
        <p className="alert alert-ok" role="status">
          회원가입이 끝났습니다. 로그인해 주세요.
        </p>
      )}
      <form className="card form" onSubmit={handleSubmit} noValidate>
        {message && (
          <p className="alert alert-error" role="alert">
            {message}
          </p>
        )}
        <Field
          label="이메일"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Field
          label="비밀번호"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="button button-primary" disabled={submitting}>
          로그인
        </button>
      </form>
      <p className="auth-switch">
        아직 계정이 없나요? <Link to="/signup">회원가입</Link>
      </p>
    </div>
  )
}
