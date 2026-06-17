import { Context } from "hono"
import { prisma } from "../../lib/prisma"
import { serializeError } from "../../lib/errorHelper"
import { createListController } from "./catalog-factory"

export const listCategories = createListController((db) => db.category.findMany(), { source: "category" })

export const createCategory = async (c: Context) => {
  const { name } = await c.req.json()

  try {
    if (!name) {
      return c.json({
        message: 'body is required!'
      }, 400)
    }
    const data = await prisma(c).category.create({
      data: {
        name,
        key: String(name).toLocaleLowerCase(),
        isActive: 1
      }
    })

    if (data) {
      return c.json({
        success: true,
        source: 'category',
        path: c.req.path,
        data
      })
    }

  } catch (error) {
    return c.json({ message: "Error from server!", error: serializeError(error) }, 500)
  }
}

export const updateCategory = async (c: Context) => {
  const { id } = c.req.param()
  const { name, isActive } = await c.req.json()
  try {

    if (!name || isActive === null) {
      return c.json({
        message: 'body is required!'
      }, 400)
    }

    const data = await prisma(c).category.update({
      where: { id }, data: {
        name,
        isActive,
        key: String(name).toLocaleLowerCase()
      }
    })

    if (!data) {
      return c.json({
        message: 'update failed!, data not found!'
      }, 404)
    }

    return c.json({
      message: 'update success!',
      updatedData: data
    }, 200)

  } catch (error) {

    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    })

  }
}


export const deleteCategory = async (c: Context) => {
  const { id } = c.req.param()
  try {

    const data = await prisma(c).category.delete({ where: { id } })

    if (!data) {
      return c.json({
        message: 'delete failed!, data not found!'
      }, 404)
    }

    return c.json({
      message: 'delete success!',
      deletedData: data
    }, 200)

  } catch (error) {

    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    })

  }
}
