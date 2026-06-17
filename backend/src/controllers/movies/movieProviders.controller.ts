import type { Context } from "hono";
import { serializeError } from "../../lib/errorHelper";

// const provider = ['rebahin']

export const getMovieProviders = async (c: Context) => {
  try {

    const data = {
      success: true,
      source: 'movies',
      path: c.req.path,
      data: [{
        name: 'rebahin'
      }]
    }
    
    return c.json(data, 200)
  } catch (error) {
    return c.json({ message: 'Error from server!', error: serializeError(error) }, 500)
  }
}