import type { Context } from "hono";
import { prisma } from "../lib/prisma";
import { serializeError } from "../lib/errorHelper";
import { deriveUserPassword, verifyUserPassword } from "./auth.controller";
import type { AuthUser } from "../types/hono";



export const getUser = async (c: Context) => {
  try {
    const users = await prisma(c).user.findMany()
    return c.json({
      success: true,
      source: "user",
      path: c.req.path,
      count: users.length,
      data: users.map((user) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isActive: user.isActive,
        isFree: user.isFree,
        subscriptionType: user.subscriptionType,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    }, 200)
  } catch (error) {
    return c.json({ message: "Error from server!", error: serializeError(error) }, 500);
  }
};

export const deleteUser = async (c: Context) => {
  const id = c.req.param("id")

  try {

    const user = await prisma(c).user.findFirst({ where: { id } })
    if (!user) {
      return c.json({
        message: 'Data not found!'
      }, 404)
    }

    const data = await prisma(c).user.delete({ where: { id } })

    return c.json({
      success: true,
      source: "user",
      path: c.req.path,
      count: 1,
      data
    }, 200)


  } catch (error) {
    return c.json({ message: "Error from server!", error: serializeError(error) }, 500);
  }
}

export const updateUser = async (c: Context) => {
  const id = c.req.param("id")
  const { username, email, displayName, avatarUrl, isActive, isFree, subscriptionType, subscriptionStart, subscriptionEnd } = await c.req.json()

  const hasPayload = [username, email, displayName, avatarUrl, isActive, isFree, subscriptionType, subscriptionStart, subscriptionEnd]
    .some((value) => value !== undefined)

  if (!hasPayload) {
    return c.json({ message: "No fields to update" }, 400)
  }

  try {
    const user = await prisma(c).user.findUnique({ where: { id } })

    if (!user) {
      return c.json({ message: "User not found!" }, 404)
    }

    const data: any = {
      username: username ?? user.username,
      email: email ?? user.email,
      displayName: displayName ?? user.displayName,
      avatarUrl: avatarUrl ?? user.avatarUrl,
      isActive: typeof isActive === "number" ? isActive : user.isActive,
    }

    // Add subscription fields if provided
    if (isFree !== undefined) {
      data.isFree = isFree
    }
    if (subscriptionType !== undefined) {
      data.subscriptionType = subscriptionType
    }
    if (subscriptionStart !== undefined) {
      data.subscriptionStart = subscriptionStart ? new Date(subscriptionStart) : null
    }
    if (subscriptionEnd !== undefined) {
      data.subscriptionEnd = subscriptionEnd ? new Date(subscriptionEnd) : null
    }

    const updatedData = await prisma(c).user.update({
      where: { id },
      data
    })

    return c.json({
      message: "User updated!",
      data: {
        id: updatedData.id,
        username: updatedData.username,
        email: updatedData.email,
        displayName: updatedData.displayName,
        avatarUrl: updatedData.avatarUrl,
        isActive: updatedData.isActive,
        isFree: updatedData.isFree,
        subscriptionType: updatedData.subscriptionType,
        subscriptionStart: updatedData.subscriptionStart,
        subscriptionEnd: updatedData.subscriptionEnd,
        createdAt: updatedData.createdAt,
        updatedAt: updatedData.updatedAt,
      }
    }, 200)

  } catch (error: any) {
    if (error?.message === "INVALID_DATE") {
      return c.json({ message: "Invalid date format" }, 400)
    }

    if (error?.code === "P2002") {
      return c.json({ message: "Username or Email already exists" }, 409)
    }

    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500)
  }
}

export const updatePassword = async (c: Context) => {
  const authUser = c.get("user") as AuthUser
  const id = authUser.id
  const { currentPassword, newPassword } = await c.req.json()

  try {
    if (!currentPassword || !newPassword) {
      return c.json({
        message: "Missing required fields"
      }, 400)
    }

    const user = await prisma(c).user.findUnique({
      where: { id },
      include: { credential: true },
    })

    if (!user || !user.credential) {
      return c.json({ message: 'User not found!' }, 404)
    }

    const isPasswordVerify = await verifyUserPassword(
      currentPassword,
      user.credential.passwordHash,
      user.credential.passwordSalt,
      user.credential.passwordAlgo,
      c,
    )

    if (!isPasswordVerify) {
      return c.json({ message: `Password doesn't match on database!` }, 400)
    }

    const derived = await deriveUserPassword(newPassword, c)

    await prisma(c).userCredential.update({
      where: { userId: user.id },
      data: {
        passwordHash: derived.hash,
        passwordSalt: derived.salt,
        passwordAlgo: derived.algo,
        lastPasswordChange: new Date(),
      },
    })

    return c.json({ message: 'Password changed!' }, 200)
  } catch (error) {
    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    })
  }
}

export const getMe = (c: Context) => {
  const user = c.get("user") as AuthUser

  return c.json({
    message: "Success",
    data: {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      isFree: user.isFree,
      subscriptionType: user.subscriptionType,
      subscriptionStart: user.subscriptionStart,
      subscriptionEnd: user.subscriptionEnd,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  }, 200)
}

// Update user subscription (for admin or payment webhooks)
export const updateSubscription = async (c: Context) => {
  const id = c.req.param("id")
  const { isFree, subscriptionType, subscriptionStart, subscriptionEnd } = await c.req.json()

  try {
    const user = await prisma(c).user.findUnique({ where: { id } })

    if (!user) {
      return c.json({ message: "User not found!" }, 404)
    }

    const data: any = {}

    if (isFree !== undefined) data.isFree = isFree
    if (subscriptionType !== undefined) data.subscriptionType = subscriptionType
    if (subscriptionStart !== undefined) data.subscriptionStart = subscriptionStart ? new Date(subscriptionStart) : null
    if (subscriptionEnd !== undefined) data.subscriptionEnd = subscriptionEnd ? new Date(subscriptionEnd) : null

    if (Object.keys(data).length === 0) {
      return c.json({ message: "No subscription fields to update" }, 400)
    }

    const updatedData = await prisma(c).user.update({
      where: { id },
      data
    })

    return c.json({
      message: "Subscription updated!",
      data: {
        id: updatedData.id,
        isFree: updatedData.isFree,
        subscriptionType: updatedData.subscriptionType,
        subscriptionStart: updatedData.subscriptionStart,
        subscriptionEnd: updatedData.subscriptionEnd,
      }
    }, 200)

  } catch (error: any) {
    if (error?.message === "INVALID_DATE") {
      return c.json({ message: "Invalid date format" }, 400)
    }

    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500)
  }
}

// Check if user subscription is active
export const checkSubscriptionStatus = async (c: Context) => {
  const user = c.get("user") as AuthUser

  try {
    const dbUser = await prisma(c).user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        isFree: true,
        subscriptionType: true,
        subscriptionStart: true,
        subscriptionEnd: true,
      }
    })

    if (!dbUser) {
      return c.json({ message: "User not found!" }, 404)
    }

    const now = new Date()
    const isSubscribed = !dbUser.isFree &&
      dbUser.subscriptionEnd &&
      new Date(dbUser.subscriptionEnd) > now

    return c.json({
      message: "Success",
      data: {
        isFree: dbUser.isFree,
        isSubscribed,
        subscriptionType: dbUser.subscriptionType,
        subscriptionStart: dbUser.subscriptionStart,
        subscriptionEnd: dbUser.subscriptionEnd,
        daysRemaining: dbUser.subscriptionEnd
          ? Math.max(0, Math.ceil((new Date(dbUser.subscriptionEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
          : null
      }
    }, 200)

  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500)
  }
}
