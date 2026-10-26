import { request } from './client.js'

export function signup({ email, password, nickname }) {
  return request('/api/accounts/signup', {
    method: 'POST',
    body: { email, password, nickname },
    auth: false,
  })
}

export function login({ email, password }) {
  return request('/api/accounts/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  })
}

export function fetchMe() {
  return request('/api/accounts/me')
}

export function updateNickname(nickname) {
  return request('/api/accounts/me/nickname', { method: 'PATCH', body: { nickname } })
}
