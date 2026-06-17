import type { Context } from "hono";
import { prisma } from "../lib/prisma";
import { serializeError } from "../lib/errorHelper";
import type { AuthUser } from "../types/hono";

// Valid categories for feedback
const VALID_CATEGORIES = ["general", "bug", "feature", "improvement"];
const VALID_STATUSES = ["pending", "in_progress", "resolved", "rejected"];

// Create new feedback
export const createFeedback = async (c: Context) => {
  const user = c.get("user") as AuthUser;
  const { title, content, category = "general", rating } = await c.req.json();

  // Validation
  if (!title || !content) {
    return c.json({ message: "Title and content are required" }, 400);
  }

  if (title.length < 3 || title.length > 200) {
    return c.json({ message: "Title must be between 3 and 200 characters" }, 400);
  }

  if (content.length < 10 || content.length > 5000) {
    return c.json({ message: "Content must be between 10 and 5000 characters" }, 400);
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return c.json({ 
      message: "Invalid category. Valid options: general, bug, feature, improvement" 
    }, 400);
  }

  if (rating !== undefined && (rating < 1 || rating > 5)) {
    return c.json({ message: "Rating must be between 1 and 5" }, 400);
  }

  try {
    const feedback = await prisma(c).userFeedback.create({
      data: {
        userId: user.id,
        title,
        content,
        category,
        rating,
        status: "pending",
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          }
        }
      }
    });

    return c.json({
      message: "Feedback submitted successfully",
      data: feedback
    }, 201);

  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500);
  }
};

// Get all feedbacks (with pagination and filters)
export const getAllFeedbacks = async (c: Context) => {
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const status = c.req.query("status");
  const category = c.req.query("category");
  const userId = c.req.query("userId");

  const skip = (page - 1) * limit;

  try {
    const where: any = {};
    
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }
    
    if (category && VALID_CATEGORIES.includes(category)) {
      where.category = category;
    }
    
    if (userId) {
      where.userId = userId;
    }

    const [feedbacks, total] = await Promise.all([
      prisma(c).userFeedback.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            }
          }
        }
      }),
      prisma(c).userFeedback.count({ where })
    ]);

    return c.json({
      message: "Success",
      data: feedbacks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    }, 200);

  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500);
  }
};

// Get feedback by ID
export const getFeedbackById = async (c: Context) => {
  const id = c.req.param("id");

  try {
    const feedback = await prisma(c).userFeedback.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          }
        }
      }
    });

    if (!feedback) {
      return c.json({ message: "Feedback not found" }, 404);
    }

    return c.json({
      message: "Success",
      data: feedback
    }, 200);

  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500);
  }
};

// Get current user's feedbacks
export const getMyFeedbacks = async (c: Context) => {
  const user = c.get("user") as AuthUser;
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");
  const status = c.req.query("status");

  const skip = (page - 1) * limit;

  try {
    const where: any = { userId: user.id };
    
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }

    const [feedbacks, total] = await Promise.all([
      prisma(c).userFeedback.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma(c).userFeedback.count({ where })
    ]);

    return c.json({
      message: "Success",
      data: feedbacks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    }, 200);

  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500);
  }
};

// Update feedback (user can update their own, admin can update any)
export const updateFeedback = async (c: Context) => {
  const user = c.get("user") as AuthUser;
  const id = c.req.param("id");
  const { title, content, category, rating } = await c.req.json();

  try {
    const existingFeedback = await prisma(c).userFeedback.findUnique({
      where: { id }
    });

    if (!existingFeedback) {
      return c.json({ message: "Feedback not found" }, 404);
    }

    // Check ownership - only allow if user owns the feedback
    if (existingFeedback.userId !== user.id) {
      return c.json({ message: "Unauthorized" }, 403);
    }

    // Only allow updates if status is still pending
    if (existingFeedback.status !== "pending") {
      return c.json({ 
        message: "Cannot update feedback that is already being processed or resolved" 
      }, 400);
    }

    const data: any = {};
    
    if (title !== undefined) {
      if (title.length < 3 || title.length > 200) {
        return c.json({ message: "Title must be between 3 and 200 characters" }, 400);
      }
      data.title = title;
    }
    
    if (content !== undefined) {
      if (content.length < 10 || content.length > 5000) {
        return c.json({ message: "Content must be between 10 and 5000 characters" }, 400);
      }
      data.content = content;
    }
    
    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category)) {
        return c.json({ 
          message: "Invalid category. Valid options: general, bug, feature, improvement" 
        }, 400);
      }
      data.category = category;
    }
    
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return c.json({ message: "Rating must be between 1 and 5" }, 400);
      }
      data.rating = rating;
    }

    if (Object.keys(data).length === 0) {
      return c.json({ message: "No fields to update" }, 400);
    }

    const updatedFeedback = await prisma(c).userFeedback.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          }
        }
      }
    });

    return c.json({
      message: "Feedback updated successfully",
      data: updatedFeedback
    }, 200);

  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500);
  }
};

// Delete feedback
export const deleteFeedback = async (c: Context) => {
  const user = c.get("user") as AuthUser;
  const id = c.req.param("id");

  try {
    const existingFeedback = await prisma(c).userFeedback.findUnique({
      where: { id }
    });

    if (!existingFeedback) {
      return c.json({ message: "Feedback not found" }, 404);
    }

    // Check ownership - only allow if user owns the feedback
    if (existingFeedback.userId !== user.id) {
      return c.json({ message: "Unauthorized" }, 403);
    }

    await prisma(c).userFeedback.delete({
      where: { id }
    });

    return c.json({
      message: "Feedback deleted successfully"
    }, 200);

  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500);
  }
};

// Admin: Update feedback status and reply
export const adminUpdateFeedback = async (c: Context) => {
  const id = c.req.param("id");
  const { status, adminReply } = await c.req.json();

  try {
    const existingFeedback = await prisma(c).userFeedback.findUnique({
      where: { id }
    });

    if (!existingFeedback) {
      return c.json({ message: "Feedback not found" }, 404);
    }

    const data: any = {};
    
    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return c.json({ 
          message: "Invalid status. Valid options: pending, in_progress, resolved, rejected" 
        }, 400);
      }
      data.status = status;
      
      // Set resolvedAt if status is resolved
      if (status === "resolved" && existingFeedback.status !== "resolved") {
        data.resolvedAt = new Date();
      }
    }
    
    if (adminReply !== undefined) {
      data.adminReply = adminReply;
    }

    if (Object.keys(data).length === 0) {
      return c.json({ message: "No fields to update" }, 400);
    }

    const updatedFeedback = await prisma(c).userFeedback.update({
      where: { id },
      data,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          }
        }
      }
    });

    return c.json({
      message: "Feedback updated successfully",
      data: updatedFeedback
    }, 200);

  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500);
  }
};

// Get feedback statistics (for admin dashboard)
export const getFeedbackStats = async (c: Context) => {
  try {
    const [
      total,
      pending,
      inProgress,
      resolved,
      rejected,
      byCategory
    ] = await Promise.all([
      prisma(c).userFeedback.count(),
      prisma(c).userFeedback.count({ where: { status: "pending" } }),
      prisma(c).userFeedback.count({ where: { status: "in_progress" } }),
      prisma(c).userFeedback.count({ where: { status: "resolved" } }),
      prisma(c).userFeedback.count({ where: { status: "rejected" } }),
      prisma(c).userFeedback.groupBy({
        by: ["category"],
        _count: { category: true }
      })
    ]);

    return c.json({
      message: "Success",
      data: {
        total,
        byStatus: {
          pending,
          inProgress,
          resolved,
          rejected
        },
        byCategory: byCategory.map(item => ({
          category: item.category,
          count: item._count.category
        })),
        resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0
      }
    }, 200);

  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500);
  }
};
