import { Context } from "hono";

// const providers = ['mangadex', 'mangahere', 'mangapill', 'mangareader', 'mangakakalot', 'comick', 'asurascans', 'weebcentral']
const providers = [ 'mangahere', 'komikku' ]


export const getMangaProviders = async (c:Context) =>{
  const data = {
    success: true,
    source: 'manga',
    path: c.req.path,
    data: providers.map(item => ({
      name: item
    }))
  }

  return c.json(data, 200)
}