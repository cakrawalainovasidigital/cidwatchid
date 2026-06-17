import type { PrismaClient } from '@prisma/client'

export type Bindings = {
  drama: D1Database
}

export type Variables = {
  prisma: PrismaClient
}

// User data dari session (set oleh authSession middleware)
export type AuthUser = {
  id: string
  username: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  isActive: number
  isFree: boolean
  subscriptionType: string | null
  subscriptionStart: Date | null
  subscriptionEnd: Date | null
  createdAt: Date
  updatedAt: Date
}
