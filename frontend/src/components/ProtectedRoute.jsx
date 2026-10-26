import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

// 로그인하지 않은 사람은 기록 화면을 볼 수 없고 로그인 화면으로 보낸다.
export default function ProtectedRoute() {
  const { user, status, retry } = useAuth()

  if (status === 'loading') {
    return <p className="page-message">불러오는 중입니다...</p>
  }
  if (status === 'error') {
    return (
      <div className="page-message">
        <p role="alert">서버에 연결하지 못했습니다.</p>
        <button type="button" className="button" onClick={retry}>
          다시 시도
        </button>
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
