import { NavLink, Link, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

const MENU = [
  { to: '/studies', label: '공부 기록' },
  { to: '/todos', label: '할 일' },
  { to: '/errors', label: '오류 기록' },
  { to: '/public', label: '공개 기록' },
]

// 로그인한 뒤의 화면에만 쓰는 공통 틀(위쪽 메뉴). 로그인·가입 화면에는 쓰지 않는다.
export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            BuildLog
          </Link>
          <nav aria-label="주 메뉴" className="menu">
            {MENU.map((item) => (
              <NavLink key={item.to} to={item.to} className="menu-link">
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="account">
            <span className="nickname">{user.nickname}</span>
            <Link to="/settings" className="menu-link">
              계정 설정
            </Link>
            <button type="button" className="button button-quiet" onClick={logout}>
              로그아웃
            </button>
          </div>
        </div>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
