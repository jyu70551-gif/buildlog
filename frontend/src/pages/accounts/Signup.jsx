import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import * as accountsApi from '../../api/accounts.js'
import { ApiError } from '../../api/client.js'
import Field from '../../components/Field.jsx'

export default function Signup() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nickname, setNickname] = useState('')
  const [errors, setErrors] = useState({})
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setErrors({})
    setMessage('')
    try {
      await accountsApi.signup({ email, password, nickname })
      navigate('/login', { state: { signedUp: true } })
    } catch (error) {
      // 실패하면 이메일과 닉네임은 남기고 비밀번호만 지운다.
      setPassword('')
      if (error instanceof ApiError) {
        setErrors(error.errors)
        setMessage(error.detail)
      } else {
        setMessage('회원가입에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <h1>회원가입</h1>
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
          error={errors.email}
        />
        <Field
          label="비밀번호"
          type="password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          hint="8자 이상 64자 이하"
        />
        <Field
          label="닉네임"
          type="text"
          name="nickname"
          autoComplete="nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          error={errors.nickname}
          hint="2~20자, 한글·영문·숫자·밑줄만 사용할 수 있습니다."
        />
        <button type="submit" className="button button-primary" disabled={submitting}>
          회원가입
        </button>
      </form>
      <p className="auth-switch">
        이미 계정이 있나요? <Link to="/login">로그인</Link>
      </p>
    </div>
  )
}
