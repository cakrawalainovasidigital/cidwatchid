import { createListController, withPrisma } from "./catalog-factory"

export const listFavorites = createListController((db) =>
  db.favorite.findMany({ include: { contentItem: true, user: true } }),
)

export const createFavorite = withPrisma(async (c, db) => {
  const { userId, contentItemId } = await c.req.json()
  if (!userId || !contentItemId) {
    return c.json({ message: "userId and contentItemId are required" }, 400)
  }

  const data = await db.favorite.create({ data: { userId, contentItemId } })
  return c.json({ success: true, source: "catalog", path: c.req.path, data }, 201)
})

export const updateFavorite = withPrisma(async (c, db) => {
  const { id } = c.req.param()
  const { userId, contentItemId } = await c.req.json()

  if (!userId && !contentItemId) {
    return c.json({ message: "Nothing to update" }, 400)
  }

  const data = await db.favorite.update({
    where: { id },
    data: {
      ...(userId ? { userId } : {}),
      ...(contentItemId ? { contentItemId } : {}),
    },
  })

  return c.json({ success: true, source: "catalog", path: c.req.path, data })
})

export const deleteFavorite = withPrisma(async (c, db) => {
  const { id } = c.req.param()
  await db.favorite.delete({ where: { id } })

  return c.json({ success: true, source: "catalog", path: c.req.path, deletedId: id })
})
