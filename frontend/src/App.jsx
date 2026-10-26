import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/accounts/Login.jsx'
import Settings from './pages/accounts/Settings.jsx'
import Signup from './pages/accounts/Signup.jsx'
import ComingSoon from './pages/ComingSoon.jsx'
import Home from './pages/Home.jsx'

function App() {
  return (
    <Routes>
      {/* 로그인하지 않아도 보이는 화면: 위쪽 메뉴 없음 */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* 로그인해야 보이는 화면: 위쪽 메뉴 있음 */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/studies" element={<ComingSoon title="공부 기록" />} />
          <Route path="/todos" element={<ComingSoon title="할 일" />} />
          <Route path="/errors" element={<ComingSoon title="오류 기록" />} />
          <Route path="/public" element={<ComingSoon title="공개 기록" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
