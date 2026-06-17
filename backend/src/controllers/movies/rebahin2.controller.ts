import { Context } from "hono";
// import { Rebahin } from "../../lib/utils/rebahinHelper";
import { serializeError } from "../../lib/errorHelper";
import { fetcher } from "../../lib/fetcher";
import { ApiSuccessResponse, RebahinCategory, RebahinCountry, RebahinEmbed, RebahinMovie, RebahinMovieDetail, RebahinMovieWithImage, SearchAllResponse } from "../../types/rebahin/RebahinResponseTypes";


export const getRebahinRecommendations = async (c: Context) => {
  const page = Number(c.req.query("page")) || 1
  const limit = Number(c.req.query('limit')) || 30
  try {
    const resp: ApiSuccessResponse<RebahinMovie[]> = await fetcher.get(c, 'v3', `/movies/trending/recommendations?page=${page}&per_page=${limit}`)
    if (resp.data.length === 0) {
      return c.json({ message: "Data not found!" }, 404)
    }
    const data = {
      success: true,
      source: 'rebahin',
      path: c.req.path,
      count: resp.meta?.count,
      data: resp.data.map(item => ({
        id: item.id,
        title: item.title.rendered,
        coverImage: item.yoast_head_json?.og_image?.[0]?.url,
        duration: null,
        type: 'movie'
      }))
    }

    return c.json(data, 200)

  } catch (error) {
    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    }, 500)
  }
}

export const getRebahinNewRelease = async (c: Context) => {
  const page = Number(c.req.query("page")) || 1
  const limit = Number(c.req.query('limit')) || 30
  try {
    const resp: ApiSuccessResponse<RebahinMovie[]> = await fetcher.get(c, 'v3', `/movies/new-releases?page=${page}&per_page=${limit}`)
    if (resp.meta?.count === 0) {
      return c.json({ message: "Data not found!" }, 404)
    }
    const data = {
      success: true,
      source: 'rebahin',
      path: c.req.path,
      count: resp.meta?.count,
      data: resp.data.map(item => ({
        id: item.id,
        title: item.title.rendered,
        coverImage: item.yoast_head_json?.og_image?.[0]?.url,
        duration: null,
        type: 'movie'
      }))
    }

    return c.json(data, 200)

  } catch (error) {
    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    }, 500)
  }
}

export const getRebahinGenre = async (c: Context) => {
  try {
    const resp: ApiSuccessResponse<RebahinCategory[]> = await fetcher.get(c, 'v3', `/categories?per_page=100`)

    if (resp.meta?.count === 0) {
      return c.json({ message: "Data not found!" }, 404)
    }

    const data = {
      success: true,
      source: 'rebahin',
      path: c.req.path,
      data: resp.data.map(item => ({
        genreId: item.id,
        genre: item.name,
        lang: null
      }))
    }
    return c.json(data, 200)
  } catch (error) {
    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    }, 500)
  }
}

export const getRebahinCountry = async (c: Context) => {
  try {
    const resp: ApiSuccessResponse<RebahinCountry[]> = await fetcher.get(c, 'v3', '/countries?per_page=100')
    if (resp.meta?.count === 0) {
      return c.json({ message: "Data not found!" }, 404)
    }
    const data = {
      success: true,
      source: 'rebahin',
      path: c.req.path,
      data: resp.data?.map(item => ({
        countryId: item.id,
        country: item.name,
        lang: null
      }))
    }
    return c.json(data, 200)
  } catch (error) {
    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    }, 500)
  }
}

export const getRebahinGenreDetails = async (c: Context) => {
  const { id } = c.req.param()
  const page = Number(c.req.query("page")) || 1
  const limit = Number(c.req.query('limit')) || 30
  try {
    const resp: ApiSuccessResponse<RebahinMovie[]> = await fetcher.get(c, 'v3', `/movies/category/${id}?page=${page}&per_page=${limit}`)
    if (resp.meta?.count === 0) {
      return c.json({ message: "Data not found!" }, 404)
    }

    const data = {
      success: true,
      source: 'rebahin',
      path: c.req.path,
      count: resp.meta?.count,
      data: resp.data.map(item => ({
        id: item.id,
        title: item.title.rendered,
        coverImage: item.yoast_head_json?.og_image?.[0]?.url,
        duration: null,
        type: 'movie'
      }))
    }

    return c.json(data, 200)

  } catch (error) {
    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    }, 500)
  }
}

export const getRebahinCountryDetails = async (c: Context) => {
  const { id } = c.req.param()
  const page = Number(c.req.query('page')) || 1
  const limit = Number(c.req.query('limit')) || 30

  try {
    const resp: ApiSuccessResponse<RebahinMovie[]> = await fetcher.get(c, 'v3', `/movies/country/${id}?page=${page}&per_page=${limit}`)
    if (resp.meta?.count === 0) {
      return c.json({
        message: 'Data not found!'
      }, 404)
    }

    const data = {
      success: true,
      source: 'rebahin',
      path: c.req.path,
      count: resp.meta?.count,
      data: resp.data?.map(item => ({
        id: item.id,
        title: item.title.rendered,
        coverImage: item.yoast_head_json?.og_image?.[0].url,
        duration: null,
        type: 'movie'
      }))
    }

    return c.json(data, 200)
  } catch (error) {
    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    })
  }
}

export const getRebahinDetail = async (c: Context) => {
  const { id } = c.req.param()
  try {
    const resp: ApiSuccessResponse<RebahinMovieDetail> = await fetcher.get(c, 'v3', `/movies/detail/${id}`)
    if (!resp.success) {
      return c.json({ message: 'Data not found!' })
    }

    const data = {
      success: true,
      source: '/rebahin',
      path: c.req.path,
      data: {
        id: resp.data.id,
        title: resp.data.title,
        description: resp.data.content.replace(/<\/?p>/g, "").replace("\n", ""),
        image: resp.data.image_thumb,
        coverImage: resp.data.image_medium,
        type: 'movie',
        country: resp?.data.country?.[0]?.name ?? null,
        casts: resp.data.cast?.map((item: any) => ({
          name: item.name
        })),
        episodes: resp.data.embeds.map((item: any, index: number) => ({
          chapterId: resp.data.id,
          chapterIndex: index + 1
        })),
        genre: resp?.data.genre?.[0]?.name ?? null,
        duration: resp.data.duration?.[0]?.name ?? null
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

export const getRebahinStream = async (c: Context) => {
  const { id } = c.req.param()
  try {
    const resp: ApiSuccessResponse<RebahinEmbed> = await fetcher.get(c, 'v3', `/movies/stream/${id}`)
    if (!resp.success) {
      return c.json({ message: 'Data not found!' }, 404)
    }

    const data = {
      success: true,
      source: 'rebahin',
      path: c.req.path,
      data: resp.data.embeds
    }

    return c.json(data)
  } catch (error) {
    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    }, 500)
  }
}


export const getRebahinSearch = async (c: Context) => {
  const keyword = c.req.query("query") || ""
  const page = Number(c.req.query("page")) || 1
  const limit = Number(c.req.query('limit')) || 30

  if (!keyword.trim()) {
    return c.json({ message: "Search keyword is required!" }, 400)
  }

  try {
    
    const resp: SearchAllResponse = await fetcher.get(c, 'v3', `/search?q=${keyword}&page=${page}&per_page=${limit}`)

    if (resp.meta?.count === 0) {
      return c.json({ message: "Data not found!" }, 404)
    }

    const data = {
      success: true,
      source: 'rebahin',
      path: c.req.path,
      count: resp.meta?.count,
      data: resp.data.movies.map(item => ({
        id: item.id,
        title: item.title.rendered,
        coverImage: item.image_url,
        duration: null,
        type: 'movie'
      }))
    }

    return c.json(data, 200)
  } catch (error) {
    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    }, 500)
  }
}
