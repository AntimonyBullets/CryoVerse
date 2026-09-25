import { api } from './apiClient.js'

export async function register({ name, email, password }) {
  const data = await api.post('/auth/register', { name, email, password })
  return data?.user || null
}

export async function login({ email, password }) {
  const data = await api.post('/auth/login', { email, password })
  return data?.user || null
}

export function logout() {
  return api.post('/auth/logout')
}

export async function getCurrentUser() {
  const data = await api.get('/auth/me')
  return data?.user || null
}
