import { Context } from "hono";
import { fetcher } from "../../lib/fetcher";
import { serializeError } from "../../lib/errorHelper";
import { randomList } from "../../lib/utils/randomList";


export const getMangahereRecommendations = async (c: Context) => {
  try {
    const resp: any = await fetcher.get(c, 'v1', `/manga/mangahere/hot`)
    if (resp) {
      const results = resp?.results
      const data = {
        success: true,
        source: 'mangahere',
        path: c.req.path,
        count: results.length,
        data: randomList(results.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          coverImage: item.image,
          headerForImage: item.headerForImage,
        })))
      }

      return c.json(data, 200)
    }
  } catch (error) {
    console.log(serializeError(error))
    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    }, 500)
  }
}


export const getMangahereRank = async (c: Context) => {
  try {
    const resp: any = await fetcher.get(c, 'v1', '/manga/mangahere/rankings')
    if (resp) {
      const results = resp?.results
      const data = {
        success: true,
        source: 'mangahere',
        path: c.req.path,
        count: results.length,
        data: results.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          coverImage: item.image,
          headerForImage: item.headerForImage,
        }))
      }

      return c.json(data, 200)
    }
  } catch (error) {
    console.log(serializeError(error))
    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    }, 500)
  }
}

export const getMangahereNewRelease = async (c: Context) => {
  const { page } = c.req.query() || 1
  try {
    const resp: any = await fetcher.get(c, 'v1', `/manga/mangahere/recent?page=${page}`)
    if (resp) {
      const results = resp?.results
      const data = {
        success: true,
        source: 'mangahere',
        path: c.req.path,
        count: results.length,
        data: randomList(results.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          coverImage: item.image,
          headerForImage: item.headerForImage,
        })))
      }

      return c.json(data, 200)
    }
  } catch (error) {
    console.log(serializeError(error))
    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    }, 500)
  }
}

export const getMangahereDetail = async (c: Context) => {
  const { id } = c.req.param()
  try {
    const resp: any = await fetcher.get(c, 'v1', `/manga/mangahere/info?id=${id}`)
    if (resp) {
      const data = {
        success: true,
        source: "mangahere",
        path: c.req.path,
        chapterCount: resp.chapters.length,
        data: {
          id: resp.id,
          title: resp.title,
          description: resp.description,
          coverImage: resp.image,
          // playCount: null,
          headers: resp.headers,
          chapterCount: resp.chapters.length,
          chapters: resp.chapters?.map((item: any) => ({
            chapterId: item.id,
            chapterIndex: item.id,
          }))
        }
      }
      return c.json(data, 200)
    } else {
      return c.json({
        message: "Data not found!"
      }, 404)
    }
  } catch (error) {
    console.log(serializeError(error))
    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    }, 500)
  }
}

export const getMangahereSearch = async (c: Context) => {
  const { query } = c.req.query()
  try {
    const resp: any = await fetcher.get(c, 'v1', `/manga/mangahere/${query}`)
    if (resp) {
      const results = resp?.results
      const data = {
        success: true,
        source: 'mangahere',
        path: c.req.path,
        count: results.length,
        data: randomList(results.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          coverImage: item.image,
          headerForImage: item.headerForImage,
        })))
      }

      return c.json(data, 200)
    }
  } catch (error) {
    console.log(serializeError(error))
    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    }, 500)
  }
}


export const getMangahereChapters = async (c: Context) => {
  const { id } = c.req.query()
  try {
    const resp: any = await fetcher.get(c, 'v1', `/manga/mangahere/read?chapterId=${id}`)
    if (resp) {
      const data = {
        success: true,
        source: 'mangahere',
        path: c.req.path,
        data: resp
      }

      return c.json(data, 200)
    } else {
      return c.json({ message: "Data not found!" }, 404)
    }
  } catch (error) {
    return c.json({ message: 'Error from server!', error: serializeError(error) }, 500)
  }
}



