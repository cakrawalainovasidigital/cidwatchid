import { createListController, withPrisma } from "./catalog-factory"

export const listContentItems = createListController((db, c) => {
  const providerKey = c.req.query("providerKey")
  const sourceId = c.req.query("sourceId")

  return db.contentItem.findMany({
    where: {
      ...(providerKey ? { providerKey } : {}),
      ...(sourceId ? { sourceId } : {}),
    },
    include: { category: true, units: true },
  })
})

export const createContentItem = withPrisma(async (c, db) => {
  const { categoryId, providerKey, sourceId, isActive = 1 } = await c.req.json()

  if (!categoryId || !providerKey || !sourceId) {
    return c.json({ message: "categoryId, providerKey, and sourceId are required" }, 400)
  }

  const data = await db.contentItem.create({
    data: {
      categoryId,
      providerKey,
      sourceId,
      isActive,
    },
  })

  return c.json({ success: true, source: "catalog", path: c.req.path, data }, 201)
})

export const updateContentItem = withPrisma(async (c, db) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const allowedKeys = ["categoryId", "providerKey", "sourceId", "isActive"] as const

  const dataToUpdate: Record<string, unknown> = {}
  allowedKeys.forEach((key) => {
    if (body[key] !== undefined) dataToUpdate[key] = body[key]
  })

  if (!Object.keys(dataToUpdate).length) {
    return c.json({ message: "Nothing to update" }, 400)
  }

  const data = await db.contentItem.update({ where: { id }, data: dataToUpdate })
  return c.json({ success: true, source: "catalog", path: c.req.path, data })
})

export const deleteContentItem = withPrisma(async (c, db) => {
  const { id } = c.req.param()
  await db.contentItem.delete({ where: { id } })

  return c.json({ success: true, source: "catalog", path: c.req.path, deletedId: id })
})

export const getContentItemByProvider = withPrisma(async (c, db) => {
  const { providerKey, sourceId } = c.req.param()

  if (!providerKey || !sourceId) {
    return c.json({ message: "providerKey and sourceId are required" }, 400)
  }

  try {
    const data = await db.contentItem.findUniqueOrThrow({
      where: { providerKey_sourceId: { providerKey, sourceId } },
      include: { category: true, units: true },
    })
    return c.json({ success: true, source: "catalog", path: c.req.path, data })
  } catch {
    return c.json({ message: "Data not found!" }, 404)
  }
})
