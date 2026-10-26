import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.jsx'

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('서버가 응답하면 "서버와 연결됨"을 보여준다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: 'ok' }) }),
    )
    render(<App />)
    expect(await screen.findByText('서버와 연결됨')).toBeInTheDocument()
  })

  it('서버에 연결하지 못하면 실패 안내를 보여준다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')))
    render(<App />)
    expect(await screen.findByText('서버에 연결하지 못했습니다.')).toBeInTheDocument()
  })
})
