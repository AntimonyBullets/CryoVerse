import { ApiError } from './apiClient.js'

/**
 * Auth service seam. The Login/Register pages call ONLY these functions.
 *
 * TODO(Iteration 2, with Shashank): replace the bodies with real calls, e.g.
 *   login:    return api.post('/auth/login', { email, password })
 *   register: return api.post('/auth/register', { name, email, password })
 * and agree the response shape (user + JWT). Endpoint paths above are
 * suggestions, not an agreed contract. Nothing here touches the network yet.
 */
const NOT_CONNECTED = 'Authentication is not connected to the backend yet. Your details were not sent anywhere.'

function notConnected() {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new ApiError(NOT_CONNECTED, 501)), 700)
  })
}

/** @param {{ email: string, password: string }} _credentials */
export async function login(_credentials) {
  return notConnected()
}

/** @param {{ name: string, email: string, password: string }} _details */
export async function register(_details) {
  return notConnected()
}
