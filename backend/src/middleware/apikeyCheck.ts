import { createMiddleware } from "hono/factory";
import { prisma } from "../lib/prisma";
import { scrypt, timingSafeEqual, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const getHashEnv = (c: Parameters<Parameters<typeof createMiddleware>[0]>[0]) => {
  const env = (c.env || {}) as Record<string, string | undefined>
  const processEnv: any = typeof process !== "undefined" ? process.env : {}

  return {
    hashSalt: env.HASH_SALT ?? processEnv?.HASH_SALT ?? "",
    hashSecret: env.HASH_SCRET_KEY ?? processEnv?.HASH_SCRET_KEY ?? "",
  }
}

const scryptAsync = promisify(scrypt)

const verifyPassword = async (
  password: string,
  stored: string,
  c: Parameters<Parameters<typeof createMiddleware>[0]>[0]
): Promise<boolean> => {
  const { hashSecret } = getHashEnv(c)
  const [hashed, salt] = stored.split(".")
  if (!hashed || !salt) return false

  const hashedBuffer = Buffer.from(hashed, "hex")
  if (hashedBuffer.length === 0) return false

  const passwordWithSecret = `${password}${hashSecret}`
  const buf = (await scryptAsync(passwordWithSecret, salt, 64)) as Buffer
  if (hashedBuffer.length !== buf.length) return false
  if (timingSafeEqual(hashedBuffer, buf)) return true

  const legacyBuf = (await scryptAsync(password, salt, 64)) as Buffer
  return timingSafeEqual(hashedBuffer, legacyBuf)
}

export const apikeyCheck = createMiddleware(async (c, next) => {
  const token = c.req.header("x-api-token")
  const username = c.req.header("x-api-username")
  const password = c.req.header("x-api-password")

  if (!token || !username || !password) {
    return c.json({ message: "Missing api credentials" }, 401)
  }

  const { hashSalt, hashSecret } = getHashEnv(c)
  if (!hashSalt || !hashSecret) {
    return c.json({ message: "Missing HASH_SCRET_KEY or HASH_SALT" }, 400)
  }

  try {
    const storedToken = await prisma(c).userApiToken.findFirst({
      where: { username },
    })

    if (!storedToken) {
      return c.json({ message: "Invalid api credentials" }, 403)
    }

    const passwordOk = await verifyPassword(password, storedToken.password, c)
    if (!passwordOk) {
      return c.json({ message: "Invalid api credentials" }, 403)
    }

    if (token !== storedToken.hashToken) {
      return c.json({ message: "Invalid api credentials" }, 403)
    }

    if (!storedToken.expiresAt || storedToken.expiresAt.getTime() <= Date.now()) {
      const newToken = randomBytes(32).toString("hex")
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60)
      await prisma(c).userApiToken.update({
        where: { id: storedToken.id },
        data: { hashToken: newToken, expiresAt },
      })

      return c.json({ message: "Token expired", token: newToken, expiresAt }, 401)
    }

    await next()
  } catch (error) {
    return c.json({ message: "Error from server!" }, 500)
  }
})
