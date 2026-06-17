import { createListController, withPrisma } from "./catalog-factory"

export const listComments = createListController((db) =>
  db.comment.findMany({ include: { children: true, contentItem: true, parent: true, user: true } }),
)

export const createComment = withPrisma(async (c, db) => {
  const { userId, contentItemId, parentCommentId, body } = await c.req.json()
  if (!userId || !contentItemId || !body) {
    return c.json({ message: "userId, contentItemId, and body are required" }, 400)
  }

  const data = await db.comment.create({
    data: {
      userId,
      contentItemId,
      parentCommentId: parentCommentId ?? null,
      body,
    },
  })

  return c.json({ success: true, source: 'comment', path: c.req.path, data }, 201)
})

export const updateComment = withPrisma(async (c, db) => {
  const { id } = c.req.param()
  const { body, isDeleted } = await c.req.json()

  if (body === undefined && isDeleted === undefined) {
    return c.json({ message: "Nothing to update" }, 400)
  }

  const data = await db.comment.update({
    where: { id },
    data: {
      ...(body !== undefined ? { body } : {}),
      ...(isDeleted !== undefined ? { isDeleted } : {}),
    },
  })

  return c.json({ success: true, source: 'comment', path: c.req.path, data })
})

export const deleteComment = withPrisma(async (c, db) => {
  const { id } = c.req.param()

  // Soft delete to preserve thread integrity
  const data = await db.comment.update({
    where: { id },
    data: { isDeleted: 1 },
  })

  return c.json({
    success: true,
    source: 'comment',
    path: c.req.path,
    deletedId: id,
    data,
  })
})

// Get all replies for a specific comment
export const getReplies = withPrisma(async (c, db) => {
  const { commentId } = c.req.param()

  const replies = await db.comment.findMany({
    where: {
      parentCommentId: commentId,
    },
    include: {
      user: true,
      children: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  })

  return c.json({
    success: true,
    source: 'comment',
    path: c.req.path,
    parentCommentId: commentId,
    count: replies.length,
    data: replies,
  })
})

// Create a reply to a specific comment
export const createReply = withPrisma(async (c, db) => {
  const { commentId } = c.req.param()
  const { userId, contentItemId, body } = await c.req.json()

  if (!userId || !contentItemId || !body) {
    return c.json({ message: "userId, contentItemId, and body are required" }, 400)
  }

  // Verify parent comment exists
  const parentComment = await db.comment.findUnique({
    where: { id: commentId },
  })

  if (!parentComment) {
    return c.json({ message: "Parent comment not found" }, 404)
  }

  const data = await db.comment.create({
    data: {
      userId,
      contentItemId,
      parentCommentId: commentId,
      body,
    },
  })

  return c.json({
    success: true,
    source: 'comment',
    path: c.req.path,
    parentCommentId: commentId,
    data,
  }, 201)
})


export const purgeComments = withPrisma(async (c, db) => {
  const deleteAll = await db.comment.deleteMany({ where: { isDeleted: 1 } })
  return c.json({
    success: true,
    source: 'comment',
    count: deleteAll.count,
    // deletedData: deleteAll
  })
})