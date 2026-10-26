import { useEffect, useState } from 'react'
import { getHealth } from './api/client.js'

function App() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    getHealth()
      .then(() => setStatus('connected'))
      .catch(() => setStatus('failed'))
  }, [])

  return (
    <main className="page">
      <h1>BuildLog</h1>
      <p className="subtitle">학습한 내용과 해결한 오류를 기록하는 서비스입니다.</p>
      <p className={`status status-${status}`} role="status">
        {status === 'checking' && '서버 연결을 확인하는 중입니다...'}
        {status === 'connected' && '서버와 연결됨'}
        {status === 'failed' && '서버에 연결하지 못했습니다.'}
      </p>
    </main>
  )
}

export default App
