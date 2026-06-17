import type { Context } from "hono"
import { Prisma } from "@prisma/client"
import { prisma } from "../../lib/prisma"
import { serializeError } from "../../lib/errorHelper"

type PrismaClientInstance = ReturnType<typeof prisma>
type Fetcher<T> = (db: PrismaClientInstance, c: Context) => Promise<T>

type ListControllerOptions = {
  source?: string
}

type Handler = (c: Context, db: PrismaClientInstance) => Promise<any>

export const withPrisma = (handler: Handler) => {
  return async (c: Context) => {
    try {
      const db = prisma(c as any)
      return await handler(c, db)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2025") {
          return c.json({ message: "Data not found!" }, 404)
        }
        if (error.code === "P2002") {
          return c.json({ message: "Duplicate record" }, 409)
        }
      }
      return c.json({ message: "Error from server!", error: serializeError(error) }, 500)
    }
  }
}

export const createListController = <T>(
  fetcher: Fetcher<T>,
  options: ListControllerOptions = {},
) => {
  const { source = "catalog" } = options

  return withPrisma(async (c, db) => {
    const data = await fetcher(db, c)
    return c.json({
      success: true,
      source,
      path: c.req.path,
      data,
    })
  })
}
