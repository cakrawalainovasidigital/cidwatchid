import { createListController, withPrisma } from "./catalog-factory"

export const listContentUnits = createListController((db) =>
  db.contentUnit.findMany({ include: { contentItem: true } }),
)

export const createContentUnit = withPrisma(async (c, db) => {
  const {
    contentItemId,
    unitType,
    seasonNumber,
    unitNumber,
    title,
    durationSeconds,
    streamUrl,
    publishedAt,
  } = await c.req.json()

  if (!contentItemId || !unitType || unitNumber === undefined) {
    return c.json({ message: "contentItemId, unitType, and unitNumber are required" }, 400)
  }

  const data = await db.contentUnit.create({
    data: {
      contentItemId,
      unitType,
      unitNumber,
      seasonNumber,
      title,
      durationSeconds,
      streamUrl,
      publishedAt: publishedAt ? new Date(publishedAt) : null,
    },
  })

  return c.json({ success: true, source: "catalog", path: c.req.path, data }, 201)
})

export const updateContentUnit = withPrisma(async (c, db) => {
  const { id } = c.req.param()
  const body = await c.req.json()
  const allowedKeys = [
    "contentItemId",
    "unitType",
    "seasonNumber",
    "unitNumber",
    "title",
    "durationSeconds",
    "streamUrl",
    "publishedAt",
  ] as const

  const dataToUpdate: Record<string, unknown> = {}
  allowedKeys.forEach((key) => {
    if (body[key] !== undefined) {
      const value = body[key]
      if (key === "publishedAt") {
        dataToUpdate[key] = value === null ? null : new Date(value)
      } else {
        dataToUpdate[key] = value
      }
    }
  })

  if (!Object.keys(dataToUpdate).length) {
    return c.json({ message: "Nothing to update" }, 400)
  }

  const data = await db.contentUnit.update({ where: { id }, data: dataToUpdate })
  return c.json({ success: true, source: "catalog", path: c.req.path, data })
})

export const deleteContentUnit = withPrisma(async (c, db) => {
  const { id } = c.req.param()
  await db.contentUnit.delete({ where: { id } })

  return c.json({ success: true, source: "catalog", path: c.req.path, deletedId: id })
})
