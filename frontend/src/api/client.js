const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function getHealth() {
  const response = await fetch(`${API_URL}/api/health`)
  if (!response.ok) {
    throw new Error(`서버 응답 오류: ${response.status}`)
  }
  return response.json()
}
