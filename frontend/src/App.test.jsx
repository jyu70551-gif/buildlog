import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'
import { getToken, setToken } from './api/client.js'
import { AuthProvider } from './auth/AuthContext.jsx'

const USER = { id: 1, email: 'a@example.com', nickname: 'alpha', is_admin: false }

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

// 서버를 흉내 낸다. routes에 "메서드 경로"별로 응답을 정해 둔다.
function fakeServer(routes) {
  const calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, init = {}) => {
      const key = `${init.method ?? 'GET'} ${new URL(url).pathname}`
      const body = init.body ? JSON.parse(init.body) : undefined
      calls.push({ key, body, headers: init.headers ?? {} })
      const handler = routes[key]
      return handler ? handler(body) : jsonResponse(404, { detail: '없음', errors: {} })
    }),
  )
  return calls
}

function renderApp(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  )
}

const heading = (name) => screen.findByRole('heading', { name })
const menu = () => screen.queryByRole('navigation', { name: '주 메뉴' })

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('접근 제한과 화면 틀', () => {
  it('로그인하지 않고 기록 화면에 가면 로그인 화면으로 보내고 메뉴를 보여주지 않는다', async () => {
    fakeServer({})
    renderApp('/studies')

    expect(await heading('로그인')).toBeInTheDocument()
    expect(menu()).toBeNull()
  })

  it('가입 화면에도 위쪽 메뉴를 보여주지 않는다', async () => {
    fakeServer({})
    renderApp('/signup')

    expect(await heading('회원가입')).toBeInTheDocument()
    expect(menu()).toBeNull()
  })

  it('로그인한 상태에서는 위쪽 메뉴와 닉네임이 보인다', async () => {
    setToken('tok')
    const calls = fakeServer({ 'GET /api/accounts/me': () => jsonResponse(200, USER) })
    renderApp('/studies')

    expect(await heading('공부 기록')).toBeInTheDocument()
    expect(menu()).toBeInTheDocument()
    for (const name of ['공부 기록', '할 일', '오류 기록', '공개 기록']) {
      expect(screen.getAllByRole('link', { name }).length).toBeGreaterThan(0)
    }
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(calls[0].headers.Authorization).toBe('Bearer tok')
  })

  it('보관해 둔 로그인 값이 맞지 않으면 지우고 로그인 화면으로 보낸다', async () => {
    setToken('old-token')
    fakeServer({ 'GET /api/accounts/me': () => jsonResponse(401, { detail: '로그인이 필요합니다.', errors: {} }) })
    renderApp('/')

    expect(await heading('로그인')).toBeInTheDocument()
    expect(getToken()).toBeNull()
  })

  it('서버에 연결하지 못하면 안내와 다시 시도 버튼을 보여주고, 다시 시도하면 화면이 열린다', async () => {
    setToken('tok')
    let online = false
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        if (!online) throw new Error('network')
        return jsonResponse(200, USER)
      }),
    )
    renderApp('/')

    expect(await screen.findByText('서버에 연결하지 못했습니다.')).toBeInTheDocument()
    expect(getToken()).toBe('tok') // 연결 문제로는 로그인 값을 지우지 않는다

    online = true
    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(await heading('내 기록 홈')).toBeInTheDocument()
  })
})

describe('회원가입', () => {
  it('성공하면 로그인 화면으로 이동한다', async () => {
    const calls = fakeServer({ 'POST /api/accounts/signup': () => jsonResponse(201, USER) })
    renderApp('/signup')

    await userEvent.type(screen.getByLabelText('이메일'), 'a@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'password123')
    await userEvent.type(screen.getByLabelText('닉네임'), 'alpha')
    await userEvent.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await heading('로그인')).toBeInTheDocument()
    expect(screen.getByText('회원가입이 끝났습니다. 로그인해 주세요.')).toBeInTheDocument()
    expect(calls[0].body).toEqual({ email: 'a@example.com', password: 'password123', nickname: 'alpha' })
    expect(getToken()).toBeNull() // 가입만으로는 로그인되지 않는다
  })

  it('실패하면 이유를 알려주고 이메일과 닉네임은 남기고 비밀번호만 지운다', async () => {
    fakeServer({
      'POST /api/accounts/signup': () =>
        jsonResponse(409, {
          detail: '회원가입에 실패했습니다.',
          errors: {
            email: '이미 사용 중인 이메일입니다. 다른 이메일을 입력해 주세요.',
            nickname: '이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.',
          },
        }),
    })
    renderApp('/signup')

    await userEvent.type(screen.getByLabelText('이메일'), 'a@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'password123')
    await userEvent.type(screen.getByLabelText('닉네임'), 'alpha')
    await userEvent.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await screen.findByText(/이미 사용 중인 이메일/)).toBeInTheDocument()
    expect(screen.getByText(/이미 사용 중인 닉네임/)).toBeInTheDocument()
    expect(screen.getByLabelText('이메일')).toHaveValue('a@example.com')
    expect(screen.getByLabelText('닉네임')).toHaveValue('alpha')
    expect(screen.getByLabelText('비밀번호')).toHaveValue('')
  })

  it('서버에 연결하지 못해도 실패 이유를 보여주고 비밀번호만 지운다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    renderApp('/signup')

    await userEvent.type(screen.getByLabelText('이메일'), 'a@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), 'password123')
    await userEvent.type(screen.getByLabelText('닉네임'), 'alpha')
    await userEvent.click(screen.getByRole('button', { name: '회원가입' }))

    expect(await screen.findByText(/서버에 연결하지 못했습니다/)).toBeInTheDocument()
    expect(screen.getByLabelText('이메일')).toHaveValue('a@example.com')
    expect(screen.getByLabelText('비밀번호')).toHaveValue('')
  })
})

describe('로그인과 로그아웃', () => {
  async function fillAndSubmitLogin(password = 'password123') {
    await userEvent.type(screen.getByLabelText('이메일'), 'a@example.com')
    await userEvent.type(screen.getByLabelText('비밀번호'), password)
    await userEvent.click(screen.getByRole('button', { name: '로그인' }))
  }

  it('성공하면 내 기록 홈으로 이동하고 로그인 값을 보관한다', async () => {
    fakeServer({
      'POST /api/accounts/login': () =>
        jsonResponse(200, { access_token: 'tok', token_type: 'bearer', user: USER }),
    })
    renderApp('/login')

    await fillAndSubmitLogin()

    expect(await heading('내 기록 홈')).toBeInTheDocument()
    expect(getToken()).toBe('tok')
    expect(menu()).toBeInTheDocument()
  })

  it('실패하면 이유를 알려주고 이메일은 남기고 비밀번호만 지운다', async () => {
    fakeServer({
      'POST /api/accounts/login': () =>
        jsonResponse(401, {
          detail: '로그인 정보가 맞지 않습니다. 이메일과 비밀번호를 확인해 주세요.',
          errors: {},
        }),
    })
    renderApp('/login')

    await fillAndSubmitLogin('wrong-password')

    expect(await screen.findByText(/로그인 정보가 맞지 않습니다/)).toBeInTheDocument()
    expect(screen.getByLabelText('이메일')).toHaveValue('a@example.com')
    expect(screen.getByLabelText('비밀번호')).toHaveValue('')
    expect(getToken()).toBeNull()
    expect(menu()).toBeNull()
  })

  it('로그아웃하면 로그인 값을 지우고 로그인 화면으로 돌아간다', async () => {
    setToken('tok')
    fakeServer({ 'GET /api/accounts/me': () => jsonResponse(200, USER) })
    renderApp('/')

    await heading('내 기록 홈')
    await userEvent.click(screen.getByRole('button', { name: '로그아웃' }))

    expect(await heading('로그인')).toBeInTheDocument()
    expect(getToken()).toBeNull()
    expect(menu()).toBeNull()
  })
})

describe('계정 설정(닉네임 변경)', () => {
  beforeEach(() => setToken('tok'))

  it('새 닉네임으로 바꾸면 화면의 닉네임도 바뀐다', async () => {
    const calls = fakeServer({
      'GET /api/accounts/me': () => jsonResponse(200, USER),
      'PATCH /api/accounts/me/nickname': () => jsonResponse(200, { ...USER, nickname: 'newname' }),
    })
    renderApp('/settings')

    await heading('계정 설정')
    const input = screen.getByLabelText('새 닉네임')
    await userEvent.clear(input)
    await userEvent.type(input, 'newname')
    await userEvent.click(screen.getByRole('button', { name: '변경' }))

    expect(await screen.findByText('닉네임을 바꿨습니다.')).toBeInTheDocument()
    expect(screen.getByText('newname', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText('newname', { selector: '.nickname' })).toBeInTheDocument()
    expect(calls.find((c) => c.key.startsWith('PATCH')).body).toEqual({ nickname: 'newname' })
  })

  it('실패하면 이유를 알려주고 입력한 닉네임은 그대로 둔다', async () => {
    fakeServer({
      'GET /api/accounts/me': () => jsonResponse(200, USER),
      'PATCH /api/accounts/me/nickname': () =>
        jsonResponse(409, {
          detail: '닉네임을 바꾸지 못했습니다.',
          errors: { nickname: '이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해 주세요.' },
        }),
    })
    renderApp('/settings')

    await heading('계정 설정')
    const input = screen.getByLabelText('새 닉네임')
    await userEvent.clear(input)
    await userEvent.type(input, 'taken')
    await userEvent.click(screen.getByRole('button', { name: '변경' }))

    expect(await screen.findByText(/이미 사용 중인 닉네임/)).toBeInTheDocument()
    expect(screen.getByLabelText('새 닉네임')).toHaveValue('taken')
    expect(screen.getByText('alpha', { selector: 'strong' })).toBeInTheDocument()
  })

  it('변경 중에 로그인이 풀렸으면 로그인 화면으로 보낸다', async () => {
    fakeServer({
      'GET /api/accounts/me': () => jsonResponse(200, USER),
      'PATCH /api/accounts/me/nickname': () =>
        jsonResponse(401, { detail: '로그인이 필요합니다.', errors: {} }),
    })
    renderApp('/settings')

    await heading('계정 설정')
    await userEvent.click(screen.getByRole('button', { name: '변경' }))

    expect(await heading('로그인')).toBeInTheDocument()
    expect(getToken()).toBeNull()
  })
})
