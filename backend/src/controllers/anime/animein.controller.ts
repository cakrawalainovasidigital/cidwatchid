import { Context } from "hono";
import { Animein, callJson } from "../../lib/utils/animeinhelper";
import { serializeError } from "../../lib/errorHelper";



export const getAnimeinRecommendations = async (c: Context) => {
  const limit = Number(c.req.query("limit")) || 50

  try {
    const resp: any = await Animein.callJson('homeData', { params: { limit } })

    if (resp.error !== true) {
      const recommendation = resp?.data?.popular

      const data = {
        success: true,
        source: 'animein',
        path: c.req.path,
        count: recommendation?.length,
        data: recommendation.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.synopsis,
          coverImage: item.image_poster
        }))
      }

      return c.json(data, 200)
    } else {
      return c.json({
        message: 'Data not found!'
      }, 404)
    }

    // return c.json(resp)
  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500)
  }
}

export const getAnimeinNewRelease = async (c: Context) => {
  const limit = Number(c.req.query("limit")) || 50
  try {
    const resp: any = await Animein.callJson('homeData', { params: { limit } })
    if (resp.error !== true) {
      const newRelease = resp?.data?.new
      const data = {
        success: true,
        source: 'animein',
        path: c.req.path,
        count: newRelease?.length,
        data: newRelease.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.synopsis,
          coverImage: item.image_poster
        }))
      }
      return c.json(data, 200)
    } else {
      return c.json({
        message: "Data not found!"
      }, 404)
    }

  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500)
  }
}

export const getAnimeinRank = async (c: Context) => {
  const limit = c.req.query('limit') || 50
  try {
    const resp: any = await Animein.callJson('homeData', { params: { limit } })
    if (resp.error !== true) {
      const rank = resp?.data?.hot
      const data = {
        success: true,
        source: 'animein',
        path: c.req.path,
        count: rank?.length,
        data: rank.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.synopsis,
          coverImage: item.image_poster
        }))
      }
      return c.json(data, 200)
    } else {
      return c.json({
        message: "Data not found!"
      }, 404)
    }

  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500)
  }
}

export const getAnimeinSearch = async (c: Context) => {
  const page = Number(c.req.query('page')) || 1
  const query = (c.req.query("query") || "").toString().trim()

  try {
    if (!query) {
      return c.json({ message: "query is required" }, 400)
    }

    const resp: any = await Animein.callJson('exploreMovie', {
      params: {
        keyword: query,
        page: Number(page) === 0 ? 0 : page - 1,
        // sort: 'views'
      }
    })
    if (resp.error !== true) {
      const search = resp?.data?.movie
      const data = {
        success: true,
        source: 'animein',
        path: c.req.path,
        count: search?.length,
        data: search.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.synopsis,
          coverImage: item.image_poster
        }))
      }
      return c.json(data, 200)
    } else {
      return c.json({
        message: "Data not found!"
      }, 404)
    }
  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500)
  }
}

export const getAnimeinDetail = async (c: Context) => {
  const { id } = c.req.param()
  try {
    const resp: any = await Animein.callJson('movieDetail', { pathParams: { idMovie: id } })
    if (resp.error !== true) {
      const detail = resp?.data?.movie
      const episode: any = await Animein.callJson('movieEpisode', { pathParams: { idMovie: id } })
      const episodeList = episode?.data?.episode ?? []
      const data = {
        success: true,
        source: "animein",
        path: c.req.path,
        chapterCount: episodeList.length,
        data: {
          id: detail.id,
          title: detail.title,
          description: detail.synopsis,
          coverImage: detail.image_poster,
          playCount: detail.views,
          chapterCount: episodeList.length,
          chapters: episodeList.map((item: any) => ({
            chapterId: item.id,
            chapterIndex: item.index
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
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500)
  }

}

export const getAnimeinStream = async (c: Context) => {
  const { episodeId } = c.req.param()
  try {
    const resp: any = await Animein.callJson('episodeStreamNew', { pathParams: { idEpisode: episodeId } })
    if (resp.error !== true) {
      const data = {
        success: true,
        source: 'animein',
        path: c.req.path,
        data: {
          id: resp.data.episode.id,
          coverImage: null,
          streamUrl: resp.data.server[0].link,
          servers: resp.data.server.map((item: any) => ({
            name: item.name,
            quality: item.quality,
            streamUrl: item.link
          }))
        }
      }
      return c.json(data, 200)
    } else {
      return c.json({ message: 'Data not found!' }, 404)
    }
  } catch (error) {
    return c.json({ message: 'Error from server!', error: serializeError(error) }, 500)
  }
}

export const getAnimeinGenre = async (c: Context) => {
  try {
    const resp: any = await callJson('exploreGenre')
    if (resp.error !== true) {
      const genre = resp?.data?.genre
      const data = {
        success: true,
        source: 'animein',
        path: c.req.path,
        data: genre.map((item: any) => ({
          genreId: item.id,
          genre: item.name,
          lang: null
        }))
      }

      return c.json(data, 200)
    } else {
      return c.json({
        message: 'Data not found!'
      }, 404)
    }

  } catch (error) {
    return c.json({ message: 'Error from server!', error: serializeError(error) }, 500)
  }
}


export const getAnimeinGenreDetail = async (c: Context) => {
  const { id } = c.req.param()
  const page = c.req.query('page') || 1

  try {
    const resp: any = await callJson('exploreMovie', {
      params: {
        genre_in: id,
        page: Number(page) === 0 ? 0 : Number(page) - 1
      }
    })
    if (resp.error !== true) {
      const genres = resp?.data.movie
      const data = {
        success: true,
        source: 'animein',
        path: c.req.path,
        count: resp.data?.movie?.length,
        data: genres?.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.synopsis,
          coverImage: item.image_poster
        }))
      }
      return c.json(data, 200)
    } else {
      return c.json({
        message: "Data not found!",
      }, 404)
    }
  } catch (error) {
    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    }, 500)
  }
}
