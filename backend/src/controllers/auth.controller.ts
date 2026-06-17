import type { Context } from "hono"
import { prisma } from "../lib/prisma"
import { getCookie, setCookie } from "hono/cookie"
import { scrypt, pbkdf2, randomBytes, timingSafeEqual, createHash } from "node:crypto"
import { promisify } from "node:util"
import { serializeError } from "../lib/errorHelper"

const scryptAsync = promisify(scrypt)
const pbkdf2Async = promisify(pbkdf2)

const getHashEnv = (c: Context) => {
  const env = (c.env || {}) as Record<string, string | undefined>
  const processEnv: any = typeof process !== "undefined" ? process.env : {}

  return {
    hashSalt: env.HASH_SALT ?? processEnv?.HASH_SALT ?? "",
    hashSecret: env.HASH_SCRET_KEY ?? processEnv?.HASH_SCRET_KEY ?? "",
  }
}

export const hashPassword = async (password: string, c: Context): Promise<string> => {
  const { hashSalt, hashSecret } = getHashEnv(c)
  const salt = `${hashSalt}${randomBytes(16).toString("hex")}`
  const passwordWithSecret = `${password}${hashSecret}`
  const buf = (await scryptAsync(passwordWithSecret, salt, 64)) as Buffer
  return `${buf.toString("hex")}.${salt}`
}

export const verifyPassword = async (password: string, stored: string, c: Context): Promise<boolean> => {
  const { hashSecret } = getHashEnv(c)
  const [hashed, salt] = stored.split(".")
  if (!hashed || !salt) return false

  const hashedBuffer = Buffer.from(hashed, "hex")
  if (hashedBuffer.length === 0) return false

  const passwordWithSecret = `${password}${hashSecret}`
  const buf = (await scryptAsync(passwordWithSecret, salt, 64)) as Buffer
  if (hashedBuffer.length !== buf.length) return false
  if (timingSafeEqual(hashedBuffer, buf)) return true

  // Legacy verification for hashes created before HASH_SCRET_KEY was applied
  const legacyBuf = (await scryptAsync(password, salt, 64)) as Buffer
  return timingSafeEqual(hashedBuffer, legacyBuf)
}

type DerivedPassword = { hash: string; salt: string; algo: string }

export const deriveUserPassword = async (password: string, c: Context): Promise<DerivedPassword> => {
  const { hashSecret } = getHashEnv(c)
  const salt = randomBytes(16).toString("hex")
  const passwordWithSecret = `${password}${hashSecret ?? ""}`
  const buf = (await pbkdf2Async(passwordWithSecret, salt, 100000, 64, "sha256")) as Buffer
  return { hash: buf.toString("hex"), salt, algo: "pbkdf2-sha256" }
}

export const verifyUserPassword = async (
  password: string,
  storedHash: string,
  salt: string,
  algo: string,
  c: Context,
): Promise<boolean> => {
  if (algo !== "pbkdf2-sha256") return false
  const { hashSecret } = getHashEnv(c)
  const passwordWithSecret = `${password}${hashSecret ?? ""}`
  const buf = (await pbkdf2Async(passwordWithSecret, salt, 100000, 64, "sha256")) as Buffer
  return timingSafeEqual(Buffer.from(storedHash, "hex"), buf)
}

const SESSION_EXPIRY_MS = 1000 * 60 * 60 * 24 * 7
const API_TOKEN_EXPIRY_MS = 1000 * 60 * 60

export const login = async (c: Context) => {
  try {
    let body: { username?: string; password?: string }
    try {
      body = await c.req.json()
    } catch {
      return c.json({ message: "Invalid JSON body" }, 400)
    }

    const { username, password } = body

    if (!username || !password) {
      return c.json({ message: "Username and Password are required" }, 400)
    }

    const user = await prisma(c).user.findUnique({
      where: { username },
      include: { credential: true },
    })

    if (!user || !user.credential || user.isActive !== 1) {
      return c.json({ message: "Invalid credentials" }, 401)
    }

    const isValid = await verifyUserPassword(
      password,
      user.credential.passwordHash,
      user.credential.passwordSalt,
      user.credential.passwordAlgo,
      c,
    )
    if (!isValid) {
      return c.json({ message: "Invalid credentials" }, 401)
    }

    const token = randomBytes(32).toString("hex")
    const tokenHash = createHash("sha256").update(token).digest("hex")
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS)

    await prisma(c).session.create({
      data: {
        refreshTokenHash: tokenHash,
        userId: user.id,
        expiresAt,
        userAgent: c.req.header("user-agent") ?? null,
        ipAddress: c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null,
      },
    })

    setCookie(c, "sid", token, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: SESSION_EXPIRY_MS / 1000,
      path: "/",
    })

    return c.json({
      message: "Login successful",
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      }
    }, 200)

  } catch (error) {
    console.error("Login error:", error)
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500)
  }
}

export const register = async (c: Context) => {
  try {
    let body: { username?: string; email?: string; password?: string }
    try {
      body = await c.req.json()
    } catch {
      return c.json({ message: "Invalid JSON body" }, 400)
    }

    const { username, email, password } = body

    if (!username || !email || !password) {
      return c.json({
        message: "Missing required fields"
      }, 400)
    }

    const derived = await deriveUserPassword(password, c)

    const user = await prisma(c).user.create({
      data: {
        username,
        email,
        displayName: username,
        avatarUrl: "https://themindfulaimanifesto.org/wp-content/uploads/2020/09/male-placeholder-image.jpeg",
        credential: {
          create: {
            passwordHash: derived.hash,
            passwordSalt: derived.salt,
            passwordAlgo: derived.algo,
            lastPasswordChange: new Date(),
          },
        },
      },
    })

    const token = randomBytes(32).toString("hex")
    const tokenHash = createHash("sha256").update(token).digest("hex")
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_MS)

    await prisma(c).session.create({
      data: {
        refreshTokenHash: tokenHash,
        userId: user.id,
        expiresAt,
        userAgent: c.req.header("user-agent") ?? null,
        ipAddress: c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null,
      },
    })

    setCookie(c, "sid", token, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      maxAge: SESSION_EXPIRY_MS / 1000,
      path: "/",
    })

    return c.json({
      message: "Registration successful",
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      }
    }, 201)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return c.json({ message: "Username or Email already exists" }, 409)
    }
    console.error("Register error:", error)
    return c.json({ message: "Error from server!", error: serializeError(error) }, 500)
  }
}


export const getToken = async (c: Context) => {
  try {
    // Prefer query params to avoid body parsing for GET requests
    let username = c.req.query("username")
    let password = c.req.query("password")

    // Fallback to JSON body when query params are absent
    if (!username || !password) {
      try {
        const body = await c.req.json<{ username?: string; password?: string }>()
        username = username ?? body.username
        password = password ?? body.password
      } catch {
        // ignore JSON parse errors; will be handled by required field check
      }
    }

    const { hashSalt, hashSecret } = getHashEnv(c)

    if (!hashSecret || !hashSalt) {
      return c.json({ message: "Missing HASH_SCRET_KEY or HASH_SALT" }, 400)
    }

    if (!username || !password) {
      return c.json({
        message: 'Username or Password required!'
      }, 400)
    }

    const user = await prisma(c).userApiToken.findFirst({ where: { username } })
    if (user) {
      const verify = await verifyPassword(password, user.password, c)
      if (verify) {
        const now = Date.now()
        const isExpired = !user.expiresAt || user.expiresAt.getTime() <= now
        if (isExpired) {
          const newToken = randomBytes(32).toString("hex")
          const expiresAt = new Date(now + API_TOKEN_EXPIRY_MS)
          await prisma(c).userApiToken.update({
            where: { id: user.id },
            data: { hashToken: newToken, expiresAt },
          })

          return c.json({ token: newToken, expiresAt }, 200)
        }

        return c.json({
          token: user.hashToken,
          expiresAt: user.expiresAt
        }, 200)
      }
    }

    return c.json({ message: "Data not found!" }, 404)
  } catch (error) {
    console.log(error)
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500)
  }
}

export const registerUserAPIToken = async (c: Context) => {
  try {
    let body: { username?: string; password?: string }
    try {
      body = await c.req.json()
    } catch {
      return c.json({ message: "Invalid JSON body" }, 400)
    }

    const { username, password } = body
    const user = await prisma(c).userApiToken.findFirst({ where: { username } })
    if (user) {
      return c.json({
        message: 'username has been registered!',
      }, 404)
    }
    // const { hashSalt, hashSecret } = getHashEnv(c)
    const passwordHash = await hashPassword(String(password), c)
    const generateHashToken = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + API_TOKEN_EXPIRY_MS)

    await prisma(c).userApiToken.create({
      data: {
        username: String(username),
        password: passwordHash,
        hashToken: generateHashToken,
        expiresAt,
      }
    })

    return c.json({ message: "user token registered!", expiresAt }, 200)

  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500)
  }
}


export const logout = async (c:Context) => {
  try {
    const sid = getCookie(c, "sid")
    if (sid) {
      const tokenHash = createHash("sha256").update(sid).digest("hex")
      await prisma(c).session.deleteMany({ where: { refreshTokenHash: tokenHash } }).catch(() => {})
    }

    setCookie(c, "sid", "", {
      httpOnly: true,
      secure: c.req.url.startsWith("https://"),
      sameSite: "Lax",
      path: c.req.path,
      maxAge: 0,
    })

    return c.json({ message: "Logged out" })
  } catch (error) {
    return c.json({ message: "Error from server!", error: serializeError(error) }, 500)
  }
}
