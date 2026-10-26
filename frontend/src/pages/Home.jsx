import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext.jsx'

const SECTIONS = [
  { to: '/studies', title: '공부 기록', text: '오늘 공부한 내용을 남기고 다시 찾아봅니다.' },
  { to: '/todos', title: '할 일', text: '앞으로 할 일을 적고 끝낸 일을 체크합니다.' },
  { to: '/errors', title: '오류 기록', text: '오류와 해결 방법을 모아둡니다.' },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <section>
      <h1>내 기록 홈</h1>
      <p className="subtitle">{user.nickname}님, 안녕하세요.</p>
      <div className="card-grid">
        {SECTIONS.map((section) => (
          <Link key={section.to} to={section.to} className="card card-link">
            <h2>{section.title}</h2>
            <p>{section.text}</p>
          </Link>
        ))}
      </div>
    </section>
  )
}
