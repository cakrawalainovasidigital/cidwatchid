import type { Context } from "hono"
import { getCookie, setCookie, deleteCookie } from "hono/cookie"
import { randomBytes, createHash, createHmac } from "node:crypto"
import { prisma } from "../lib/prisma"
import { getEnv } from "../lib/envAdapter"
import { serializeError } from "../lib/errorHelper"

const SESSION_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7 // 7 days
const STATE_MAX_AGE_MS = 1000 * 60 * 10 // 10 minutes

/**
 * Detect if request is from HTTPS origin
 */
const isSecureRequest = (c: Context): boolean => {
  const url = c.req.url
  return url.startsWith("https://")
}

/**
 * Get cookie options based on request security and cross-origin needs
 * For cross-origin OAuth, we need SameSite=None with Secure
 */
const getCookieOptions = (c: Context, crossOrigin: boolean = false) => {
  const secure = isSecureRequest(c)
  
  // For cross-origin OAuth flow, use SameSite=None (requires HTTPS)
  // For same-origin, use SameSite=Lax
  const sameSite = crossOrigin && secure ? "None" as const : "Lax" as const
  
  return {
    httpOnly: true,
    secure: secure, // Must be true for SameSite=None
    sameSite,
    maxAge: SESSION_EXPIRY_MS / 1000,
    path: "/",
  }
}

// Google OAuth URLs
const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

/**
 * Generate a signed state parameter for CSRF protection
 * Stateless - tidak perlu cookie/session
 */
const generateSignedState = (redirectUrl: string, secret: string): string => {
  const timestamp = Date.now()
  const nonce = randomBytes(16).toString("hex")
  const data = `${timestamp}:${nonce}:${redirectUrl}`
  const signature = createHmac("sha256", secret).update(data).digest("hex")
  
  return Buffer.from(`${timestamp}:${nonce}:${redirectUrl}:${signature}`).toString("base64url")
}

/**
 * Verify and parse signed state
 */
const verifySignedState = (state: string, secret: string): { valid: boolean; redirect?: string; error?: string } => {
  try {
    const decoded = Buffer.from(state, "base64url").toString()
    const parts = decoded.split(":")
    
    if (parts.length < 4) {
      return { valid: false, error: "Invalid state format" }
    }
    
    const signature = parts.pop()!
    const data = parts.join(":")
    const [timestampStr, nonce, ...redirectParts] = parts
    const redirect = redirectParts.join(":") // Handle URL yang ada colon-nya
    const timestamp = parseInt(timestampStr, 10)
    
    // Verify signature
    const expectedSignature = createHmac("sha256", secret).update(data).digest("hex")
    if (signature !== expectedSignature) {
      return { valid: false, error: "Invalid state signature" }
    }
    
    // Check timestamp (max 10 minutes)
    if (Date.now() - timestamp > STATE_MAX_AGE_MS) {
      return { valid: false, error: "State expired" }
    }
    
    return { valid: true, redirect }
  } catch {
    return { valid: false, error: "Failed to parse state" }
  }
}

/**
 * Get Google OAuth configuration from environment
 */
const getGoogleConfig = (c: Context) => {
  const clientId = getEnv(c, "GOOGLE_CLIENT_ID")
  const clientSecret = getEnv(c, "GOOGLE_CLIENT_SECRET")
  const backendRedirectUri = getEnv(c, "GOOGLE_REDIRECT_URI") || `${new URL(c.req.url).origin}/api/auth/google/callback`
  const frontendUrl = getEnv(c, "FRONTEND_URL") || "http://localhost:3000"
  // Gunakan hash secret sebagai state secret
  const stateSecret = getEnv(c, "HASH_SCRET_KEY") || getEnv(c, "HASH_SECRET_KEY") || "default-secret-change-in-production"

  return { 
    clientId, 
    clientSecret, 
    backendRedirectUri,
    frontendUrl,
    stateSecret
  }
}

/**
 * ============================================================
 * MODE 1: BACKEND CALLBACK (Google redirect ke backend)
 * ============================================================
 * Flow: Frontend → /auth/google → Google → /auth/google/callback (backend) → Response
 */

/**
 * Initiate Google OAuth flow - Backend Callback Mode
 * GET /auth/google
 * 
 * Query params:
 * - redirect?: URL untuk redirect setelah login (default: FRONTEND_URL)
 * - format?: 'json' | 'redirect' - format response (default: 'json')
 */
export const googleLogin = async (c: Context) => {
  try {
    const { clientId, backendRedirectUri, frontendUrl, stateSecret } = getGoogleConfig(c)

    if (!clientId) {
      return c.json({ message: "Google OAuth not configured. Missing GOOGLE_CLIENT_ID" }, 500)
    }

    // Get options from query params
    const redirectAfterLogin = c.req.query("redirect") || frontendUrl
    const responseFormat = c.req.query("format") || "json" // 'json' | 'redirect'

    // Generate signed state (stateless, tidak perlu cookie)
    const state = generateSignedState(redirectAfterLogin, stateSecret)

    // Build authorization URL (redirect ke backend callback)
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: backendRedirectUri,
      response_type: "code",
      scope: "openid email profile",
      state: state,
      access_type: "offline",
      prompt: "consent",
    })

    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`

    // Return sesuai format yang diminta
    if (responseFormat === "redirect") {
      return c.redirect(authUrl)
    }

    return c.json({
      message: "Google OAuth initiated (Backend Callback Mode)",
      data: {
        authUrl,
        mode: "backend",
        redirectAfterLogin,
      },
    }, 200)
  } catch (error) {
    console.error("Google login error:", error)
    return c.json({
      message: "Error initiating Google OAuth",
      error: serializeError(error),
    }, 500)
  }
}

/**
 * Handle Google OAuth callback (Backend Mode)
 * GET /auth/google/callback
 * 
 * Ini dipanggil oleh Google setelah user login
 */
export const googleCallback = async (c: Context) => {
  try {
    const { clientId, clientSecret, backendRedirectUri, frontendUrl, stateSecret } = getGoogleConfig(c)

    if (!clientId || !clientSecret) {
      return c.json({ message: "Google OAuth not configured" }, 500)
    }

    // Get query parameters dari Google
    const code = c.req.query("code")
    const state = c.req.query("state")
    const error = c.req.query("error")

    // Handle OAuth errors from Google
    if (error) {
      return c.json({ message: `Google OAuth error: ${error}` }, 400)
    }

    if (!code || !state) {
      return c.json({ message: "Missing authorization code or state" }, 400)
    }

    // Verify signed state (stateless)
    const stateResult = verifySignedState(state, stateSecret)
    if (!stateResult.valid) {
      return c.json({ message: `Invalid state: ${stateResult.error}` }, 403)
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: backendRedirectUri,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error("Token exchange error:", errorData)
      return c.json({ message: "Failed to exchange authorization code" }, 400)
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string
      id_token?: string
      refresh_token?: string
      expires_in: number
    }

    // Fetch user info dari Google dan process
    const userResult = await processGoogleUser(c, tokenData.access_token)
    if (!userResult.success) {
      return c.json({ message: userResult.error }, 400)
    }

    // Create session dan set cookie (untuk non-browser requests)
    await createSession(c, userResult.user!.id)

    // Return atau redirect berdasarkan format
    const redirectTo = stateResult.redirect || frontendUrl

    // Jika request dari browser (accept text/html), redirect ke frontend
    const acceptHeader = c.req.header("accept") || ""
    if (acceptHeader.includes("text/html")) {
      // Generate temporary token untuk exchange di frontend
      // Cookie tidak bisa di-set via cross-origin redirect
      const tempToken = generateTempToken(userResult.user!.id)
      return c.redirect(`${redirectTo}?oauth_token=${tempToken}`)
    }

    // Return JSON
    return c.json({
      message: "Google login successful",
      data: {
        user: userResult.user,
        redirectTo,
      },
    }, 200)
  } catch (error) {
    console.error("Google callback error:", error)
    return c.json({
      message: "Error processing Google OAuth callback",
      error: serializeError(error),
    }, 500)
  }
}

/**
 * ============================================================
 * MODE 2: FRONTEND CALLBACK (Google redirect ke frontend)
 * ============================================================
 * Flow: Frontend → Google → Frontend callback → POST /auth/google/exchange → Response
 */

/**
 * Get Google Auth URL untuk Frontend Callback Mode
 * GET /auth/google/frontend
 * 
 * Frontend pakai ini untuk dapat auth URL dengan redirect ke frontend
 */
export const googleLoginFrontend = async (c: Context) => {
  try {
    const { clientId, frontendUrl } = getGoogleConfig(c)

    if (!clientId) {
      return c.json({ message: "Google OAuth not configured" }, 500)
    }

    // Frontend callback URL (harus didaftarkan di Google Console)
    const frontendCallbackUrl = c.req.query("callback_url") || `${frontendUrl}/auth/callback`

    // Build authorization URL (redirect ke frontend callback)
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: frontendCallbackUrl,
      response_type: "code",
      scope: "openid email profile",
      state: generateSignedState(frontendCallbackUrl, getGoogleConfig(c).stateSecret),
      access_type: "offline",
      prompt: "consent",
    })

    const authUrl = `${GOOGLE_AUTH_URL}?${params.toString()}`

    return c.json({
      message: "Google OAuth initiated (Frontend Callback Mode)",
      data: {
        authUrl,
        mode: "frontend",
        callbackUrl: frontendCallbackUrl,
      },
    }, 200)
  } catch (error) {
    console.error("Google login frontend error:", error)
    return c.json({
      message: "Error initiating Google OAuth",
      error: serializeError(error),
    }, 500)
  }
}

/**
 * Exchange code dari frontend (Frontend Callback Mode)
 * POST /auth/google/exchange
 * 
 * Body: { code: string, redirect_uri: string }
 * Dipanggil oleh frontend setelah dapat code dari Google
 */
export const googleExchangeCode = async (c: Context) => {
  try {
    const { clientId, clientSecret, frontendUrl } = getGoogleConfig(c)

    if (!clientId || !clientSecret) {
      return c.json({ message: "Google OAuth not configured" }, 500)
    }

    // Get data dari body
    const body = await c.req.json<{ code?: string; redirect_uri?: string }>()
    const { code, redirect_uri } = body

    if (!code) {
      return c.json({ message: "Authorization code is required" }, 400)
    }

    // Exchange code for token
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirect_uri || frontendUrl,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json().catch(() => ({}))
      console.error("Token exchange error:", errorData)
      return c.json({ message: "Failed to exchange authorization code" }, 400)
    }

    const tokenData = await tokenResponse.json() as {
      access_token: string
      id_token?: string
      refresh_token?: string
      expires_in: number
    }

    // Fetch user info dari Google
    const userResult = await processGoogleUser(c, tokenData.access_token)
    if (!userResult.success) {
      return c.json({ message: userResult.error }, 400)
    }

    // Create session dan set cookie
    await createSession(c, userResult.user!.id)

    return c.json({
      message: "Google login successful",
      data: {
        user: userResult.user,
      },
    }, 200)
  } catch (error) {
    console.error("Google exchange error:", error)
    return c.json({
      message: "Error exchanging authorization code",
      error: serializeError(error),
    }, 500)
  }
}

/**
 * ============================================================
 * SESSION TOKEN EXCHANGE (for Backend Callback Mode)
 * ============================================================
 * Karena cookie tidak bisa di-set via cross-origin redirect,
 * kita gunakan temporary token yang di-exchange oleh frontend
 */

// Simple in-memory store untuk temporary tokens (bisa diganti dengan Redis untuk production)
const temporaryTokens = new Map<string, { userId: string; expiresAt: number }>()

const TEMP_TOKEN_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Generate temporary token untuk exchange setelah OAuth
 */
const generateTempToken = (userId: string): string => {
  const token = randomBytes(32).toString("hex")
  const expiresAt = Date.now() + TEMP_TOKEN_EXPIRY_MS
  temporaryTokens.set(token, { userId, expiresAt })
  return token
}

/**
 * Verify dan consume temporary token
 */
const verifyTempToken = (token: string): { valid: boolean; userId?: string } => {
  const data = temporaryTokens.get(token)
  if (!data) return { valid: false }
  if (Date.now() > data.expiresAt) {
    temporaryTokens.delete(token)
    return { valid: false }
  }
  // Token hanya bisa digunakan sekali
  temporaryTokens.delete(token)
  return { valid: true, userId: data.userId }
}

/**
 * Exchange temporary token untuk session
 * POST /auth/google/session-exchange
 * 
 * Body: { token: string }
 * Frontend panggil ini setelah redirect dari backend callback
 */
export const exchangeSessionToken = async (c: Context) => {
  try {
    const body = await c.req.json<{ token?: string }>()
    const { token } = body

    if (!token) {
      return c.json({ message: "Token is required" }, 400)
    }

    const result = verifyTempToken(token)
    if (!result.valid) {
      return c.json({ message: "Invalid or expired token" }, 400)
    }

    // Create session dan set cookie
    await createSession(c, result.userId!)

    // Get user info
    const user = await prisma(c).user.findUnique({
      where: { id: result.userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatarUrl: true,
      },
    })

    return c.json({
      message: "Session created successfully",
      data: { user },
    }, 200)
  } catch (error) {
    console.error("Exchange token error:", error)
    return c.json({
      message: "Error exchanging session token",
      error: serializeError(error),
    }, 500)
  }
}

/**
 * ============================================================
 * COMMON FUNCTIONS
 * ============================================================
 */

/**
 * Process Google user - find or create user di database
 */
async function processGoogleUser(
  c: Context,
  accessToken: string
): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    // Fetch user info dari Google
    const userResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!userResponse.ok) {
      return { success: false, error: "Failed to fetch user info from Google" }
    }

    const googleUser = await userResponse.json() as {
      id: string
      email: string
      name?: string
      picture?: string
      verified_email?: boolean
    }

    if (!googleUser.email) {
      return { success: false, error: "Email not provided by Google" }
    }

    // Find atau create user
    let user = await prisma(c).user.findUnique({
      where: { email: googleUser.email },
    })

    if (!user) {
      // Create new user dari Google data
      const baseUsername = googleUser.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "_")
      let username = baseUsername
      let counter = 1

      // Pastikan username unik
      while (await prisma(c).user.findUnique({ where: { username } })) {
        username = `${baseUsername}_${counter}`
        counter++
      }

      user = await prisma(c).user.create({
        data: {
          username,
          email: googleUser.email,
          displayName: googleUser.name || username,
          avatarUrl: googleUser.picture || "https://themindfulaimanifesto.org/wp-content/uploads/2020/09/male-placeholder-image.jpeg",
          isActive: 1,
        },
      })
    } else if (!user.isActive) {
      return { success: false, error: "Account is deactivated" }
    }

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
    }
  } catch (error) {
    console.error("Process Google user error:", error)
    return { success: false, error: "Error processing user data" }
  }
}

/**
 * Create session dan set cookie
 */
async function createSession(c: Context, userId: string) {
  const token = randomBytes(32).toString("hex")
  const tokenHash = createHash("sha256").update(token).digest("hex")
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS)

  await prisma(c).session.create({
    data: {
      refreshTokenHash: tokenHash,
      userId: userId,
      expiresAt,
      userAgent: c.req.header("user-agent") ?? null,
      ipAddress: c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null,
    },
  })

  // Set session cookie
  // crossOrigin=true karena OAuth callback melibatkan redirect antar domain
  setCookie(c, "sid", token, getCookieOptions(c, true))

  return token
}

/**
 * ============================================================
 * USER MANAGEMENT ENDPOINTS
 * ============================================================
 */

/**
 * Get current authenticated user info
 * GET /auth/google/me
 */
export const getGoogleUser = async (c: Context) => {
  try {
    const sid = getCookie(c, "sid")
    if (!sid) {
      return c.json({ message: "Unauthorized" }, 401)
    }

    const tokenHash = createHash("sha256").update(sid).digest("hex")

    const session = await prisma(c).session.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            displayName: true,
            avatarUrl: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    })

    if (!session || session.expiresAt.getTime() <= Date.now()) {
      return c.json({ message: "Session expired or invalid" }, 401)
    }

    return c.json({
      message: "User info retrieved",
      data: {
        user: session.user,
      },
    }, 200)
  } catch (error) {
    console.error("Get user error:", error)
    return c.json({
      message: "Error retrieving user info",
      error: serializeError(error),
    }, 500)
  }
}

/**
 * Logout dari Google session
 * POST /auth/google/logout
 */
export const googleLogout = async (c: Context) => {
  try {
    const sid = getCookie(c, "sid")
    if (sid) {
      const tokenHash = createHash("sha256").update(sid).digest("hex")
      await prisma(c).session.deleteMany({ where: { refreshTokenHash: tokenHash } }).catch(() => {})
    }

    deleteCookie(c, "sid", {
      httpOnly: true,
      secure: c.req.url.startsWith("https://"),
      sameSite: "Lax",
      path: "/",
    })

    return c.json({ message: "Logged out successfully" }, 200)
  } catch (error) {
    console.error("Google logout error:", error)
    return c.json({
      message: "Error during logout",
      error: serializeError(error),
    }, 500)
  }
}
