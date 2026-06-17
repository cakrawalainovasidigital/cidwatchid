import { Context } from "hono";
import { Rebahin } from "../../lib/utils/rebahinHelper";
import { serializeError } from "../../lib/errorHelper";


export const getRebahinRecommendations = async (c: Context) => {
  const page = Number(c.req.query("page")) || 1
  const limit = Number(c.req.query('limit')) || 30
  try {
    const resp = await Rebahin.listContentSorted('movie', 'recommendations', { perPage: limit, page }, { forwardHeaders: c.req.raw.headers })
    if (resp.length === 0) {
      return c.json({ message: "Data not found!" }, 404)
    }
    const data = {
      success: true,
      source: 'rebahin',
      path: c.req.path,
      count: resp.length,
      data: resp.map(item => ({
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

export const getRebahinNewRelease = async (c: Context) => {
  const page = Number(c.req.query("page")) || 1
  const limit = Number(c.req.query('limit')) || 30
  try {
    const resp = await Rebahin.listNewReleases({ perPage: limit, page }, { forwardHeaders: c.req.raw.headers })
    if (resp.length === 0) {
      return c.json({ message: "Data not found!" }, 404)
    }
    const data = {
      success: true,
      source: 'rebahin',
      path: c.req.path,
      count: resp.length,
      data: resp.map(item => ({
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

export const getRebahinGenre = async (c: Context) => {
  try {
    const resp = await Rebahin.getCategories({ orderBy: 'name', perPage: 500 }, { forwardHeaders: c.req.raw.headers })

    if (resp.length === 0) {
      return c.json({ message: "Data not found!" }, 404)
    }

    const data = {
      success: true,
      source: 'rebahin',
      path: c.req.path,
      data: resp.map(item => ({
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
    const resp = await Rebahin.getCountries({ orderBy: 'name', perPage: 500 }, { forwardHeaders: c.req.raw.headers })
    if (resp.length === 0) {
      return c.json({ message: "Data not found!" }, 404)
    }
    const data = {
      success: true,
      source: 'rebahin',
      path: c.req.path,
      data: resp.map(item => ({
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
    const resp = await Rebahin.listMoviesWithImages({ categories: Number(id), page, perPage: limit, order: 'desc' }, { forwardHeaders: c.req.raw.headers })
    if (resp.length === 0) {
      return c.json({ message: "Data not found!" }, 404)
    }

    const data = {
      success: true,
      source: 'rebahin',
      path: c.req.path,
      count: resp.length,
      data: resp.map(item => ({
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

export const getRebahinCountryDetails = async (c: Context) => {
  const { id } = c.req.param()
  const page = Number(c.req.query('page')) || 1
  const limit = Number(c.req.query('limit')) || 30

  try {
    const resp = await Rebahin.listMoviesWithImages({ muvicountry: Number(id), page, perPage: limit, orderBy: 'parent' }, { forwardHeaders: c.req.raw.headers })
    if (resp.length === 0) {
      return c.json({
        message: 'Data not found!'
      }, 404)
    }

    const data = {
      success: true,
      source: 'rebahin',
      path: c.req.path,
      count: resp.length,
      data: resp.map(item => ({
        id: item.id,
        title: item.title.rendered,
        coverImage: item.image_thumb,
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
    const resp = await Rebahin.getMovieDetail(Number(id), { forwardHeaders: c.req.raw.headers })
    if (!resp) {
      return c.json({ message: 'Data not found!' })
    }

    const data = {
      success: true,
      source: '/rebahin',
      path: c.req.path,
      data: {
        id: resp.id,
        title: resp.title,
        description: resp.content.replace(/<\/?p>/g, "").replace("\n", ""),
        image: resp.image_thumb,
        coverImage: resp.image_medium,
        type: 'movie',
        country: resp?.country?.[0]?.name ?? null,
        casts: resp.cast?.map((item) => ({
          name: item.name
        })),
        episodes: resp.embeds.map((item, index) => ({
          chapterId: resp.id,
          chapterIndex: index + 1
        })),
        genre: resp?.genre?.[0]?.name ?? null,
        duration: resp.duration?.[0]?.name ?? null
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
    const resp = await Rebahin.getStreamingEmbeds('movie', Number(id), { forwardHeaders: c.req.raw.headers })
    if (!resp) {
      return c.json({ message: 'Data not found!' }, 404)
    }

    const data = {
      success: true,
      source: 'rebahin',
      path: c.req.path,
      data: resp.embeds
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
    const resp = await Rebahin.searchMovies(keyword, { perPage: limit, page }, { forwardHeaders: c.req.raw.headers })
    if (resp.length === 0) {
      return c.json({ message: "Data not found!" }, 404)
    }
    
    const data = {
      success: true,
      source: 'rebahin',
      path: c.req.path,
      count: resp.length,
      data: resp.map(item => ({
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
