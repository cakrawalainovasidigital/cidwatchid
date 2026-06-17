import type { Context } from "hono";

const providers = ['animein', 'samehadaku', 'aniwatch']

export const getAnimeProviders = async (c: Context) => {
  const data = {
    success: true,
    source: 'anime',
    path: c.req.path,
    data: providers.map(item => ({
      name: item
    }))
  }

  return c.json(data, 200)

}