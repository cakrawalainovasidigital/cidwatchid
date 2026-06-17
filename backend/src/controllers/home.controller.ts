import { Context } from "hono";
import createDramaboxClient, { createMemoryCache } from "../lib/utils/dramaboxHelper";
import { Komikku } from "../lib/utils/komikkuHelper";
import { serializeError } from "../lib/errorHelper";
import { Animein } from "../lib/utils/animeinhelper";
import { Rebahin } from "../lib/utils/rebahinHelper";
import { fetcher } from "../lib/fetcher";
import { ApiSuccessResponse, RebahinMovie } from "../types/rebahin/RebahinResponseTypes";

const dramaboxCache = createMemoryCache()
const lang = 'in'

const dramaboxClient = createDramaboxClient({ lang, cache: dramaboxCache })

const getDramaData = async () => {
  try {
    const resp = (await dramaboxClient.getRecommendedBooks())
    if (resp) {
      const data = resp.map((item: any) => ({
        id: item.bookId,
        title: item.bookName,
        coverImage: item.coverWap
      })).slice(0, 10)
      return data
    } else {
      return {
        message: 'Data not drama found!'
      }
    }
  } catch (error) {
    return {
      message: "Error from drama server!"
    }
  }
}

const getAnimeData = async (c: Context) => {
  try {
    const resp: any = await Animein.callJson('homeData', { params: { limit: 10 } })
    if (resp) {
      const data = resp.data?.hot?.map((item: any) => ({
        id: item.id,
        title: item.title,
        coverImage: item.image_poster
      }))

      return data
    } else {
      return {
        message: 'Data not anime found!'
      }
    }
  } catch (error) {
    return {
      message: "Error from anime server!"
    }
  }
}

const getMangaData = async () => {
  try {
    const resp: any = await Komikku.fetchContent({ kind: 'homepage' })
    if (resp) {
      const data = resp.body?.trending?.data?.map((item: any) => ({
        id: item.id,
        title: item.title,
        coverImage: item.thumbnail
      })).slice(0, 10)

      return data
    } else {
      return {
        message: 'Data not manga found!'
      }
    }
  } catch (error) {
    return {
      message: "Error from manga server!"
    }
  }
}

const getMovieData = async (c: Context) => {
  try {
    const resp: ApiSuccessResponse<RebahinMovie[]> = await fetcher.get(c, 'v3', `/movies/trending/recommendations?page=${1}&per_page=${10}`)
    if (resp.data?.length !== 0) {
      const data = resp.data.map((item) => ({
        id: item.id,
        title: item.title.rendered,
        coverImage: item.yoast_head_json?.og_image?.[0]?.url
      }))

      return data
    } else {
      return {
        message: 'Data not movie found!'
      }
    }
  } catch (error) {
    console.log(serializeError(error))
    return {
      message: "Error from movie server!"
    }
  }
}



export const getHomepageData = async (c: Context) => {

  try {
    const data = {
      success: true,
      source: 'Homepage',
      path: c.req.path,
      data: {
        drama: {
          source: 'dramabox',
          path: c.req.path,
          data: await getDramaData()
        },
        anime: {
          source: 'animein',
          path: c.req.path,
          data: await getAnimeData(c)
        },
        movies: {
          source: 'rebahin',
          path: c.req.path,
          data: await getMovieData(c)
        },
        manga: {
          source: 'komikku',
          path: c.req.path,
          data: await getMangaData()
        }
      }
    }
    return c.json(data, 200)
  } catch (error) {
    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    }, 500)
  }
}
