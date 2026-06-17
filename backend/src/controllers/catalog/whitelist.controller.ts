import { createListController, withPrisma } from "./catalog-factory"

export const listWhitelist = createListController((db) =>
  db.userCategoryWhitelist.findMany({ include: { category: true, user: true } }),
)

export const createWhitelist = withPrisma(async (c, db) => {
  const { userId, categoryId } = await c.req.json()
  if (!userId || !categoryId) {
    return c.json({ message: "userId and categoryId are required" }, 400)
  }

  const data = await db.userCategoryWhitelist.create({ data: { userId, categoryId } })
  return c.json(
    {
      success: true,
      source: "catalog",
      path: c.req.path,
      data,
    },
    201,
  )
})

export const updateWhitelist = withPrisma(async (c, db) => {
  const { id } = c.req.param()
  const { userId, categoryId } = await c.req.json()

  if (!userId && !categoryId) {
    return c.json({ message: "Nothing to update" }, 400)
  }

  const data = await db.userCategoryWhitelist.update({
    where: { id },
    data: {
      ...(userId ? { userId } : {}),
      ...(categoryId ? { categoryId } : {}),
    },
  })

  return c.json({
    success: true,
    source: "catalog",
    path: c.req.path,
    data,
  })
})

export const deleteWhitelist = withPrisma(async (c, db) => {
  const { id } = c.req.param()
  await db.userCategoryWhitelist.delete({ where: { id } })

  return c.json({
    success: true,
    source: "catalog",
    path: c.req.path,
    deletedId: id,
  })
})
