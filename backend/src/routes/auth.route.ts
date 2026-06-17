import { Hono } from 'hono'
import { register, login, getToken, registerUserAPIToken, logout } from '../controllers/auth.controller'
import { authSession } from '../middleware/authSessions'
import { createCache } from '../middleware/cacheHelper';
import { 
  googleLogin, 
  googleCallback, 
  googleLoginFrontend, 
  googleExchangeCode,
  exchangeSessionToken,
  getGoogleUser, 
  googleLogout 
} from '../controllers/google.controller'

const longCache = createCache('tokenLong', 3600, {
  cacheControl: 'public, max-age=3600', // 1 jam fresh, setelah itu wajib fetch ulang
})



const route = new Hono()


route.post('/login', login)
route.post('/register', register)
route.get('/get-token', longCache, getToken)
// route.post('/get-token', getToken) // backward compatibility for clients using POST
route.post('/register-token', registerUserAPIToken)
route.post('/logout', authSession, logout)

// ============================================
// Google OAuth - Backend Callback Mode
// ============================================
// Flow: Frontend → /auth/google → Google → /auth/google/callback (backend) → Frontend
// Frontend kemudian panggil /session-exchange untuk mendapatkan cookie
route.get('/google', googleLogin)
route.get('/google/callback', googleCallback)
route.post('/google/session-exchange', exchangeSessionToken)

// ============================================
// Google OAuth - Frontend Callback Mode  
// ============================================
// Flow: Frontend → Google → Frontend callback → POST /auth/google/exchange → Response
route.get('/google/frontend', googleLoginFrontend)
route.post('/google/exchange', googleExchangeCode)

// ============================================
// Google OAuth - User Management
// ============================================
route.get('/google/me', getGoogleUser)
route.post('/google/logout', googleLogout)

export default route
