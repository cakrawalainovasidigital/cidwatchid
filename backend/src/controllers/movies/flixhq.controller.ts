import { Context } from "hono";
import { fetcher } from "../../lib/fetcher";
import { serializeError } from "../../lib/errorHelper";


export const getFlixhqRecommendations = async (c: Context) => {
  try {
    const resp: any = await fetcher.get(c, 'v1', '/movies/flixhq/trending')

    if (resp) {
      const results = resp?.results
      const data = {
        success: true,
        source: 'flixhq',
        path: c.req.path,
        count: results.length,
        data: results.map((item: any) => ({
          id: item.id,
          title: item.title,
          duration: item.duration,
          coverImage: item.image,
          releaseDate: item.releaseDate,
          type: item.type
        }))
      }
      return c.json(data, 200)
    } else {
      return c.json({ message: "Data not found!" }, 404)
    }
  } catch (error) {
    return c.json({ message: 'Error from server!', error: serializeError(error) }, 500)
  }
}

export const getFlixhqNewRelease = async (c: Context) => {
  try {
    const resp: any = await fetcher.get(c, 'v1', '/movies/flixhq/recent-movies')

    if (resp) {
      const results = resp
      const data = {
        success: true,
        source: 'flixhq',
        path: c.req.path,
        count: results?.length,
        data: results?.map((item: any) => ({
          id: item.id,
          title: item.title,
          duration: item.duration,
          coverImage: item.image,
          releaseDate: item.releaseDate,
          type: item.type
        }))
      }
      return c.json(data, 200)
    } else {
      return c.json({ message: "Data not found!" }, 404)
    }
  } catch (error) {
    return c.json({ message: 'Error from server!', error: serializeError(error) }, 500)
  }
}

export const getFlixhqGenre = (c: Context) => {
  const genre = [
    {
      genreId: 'action',
      genre: 'Action',
      lang: null
    },
    {
      genreId: 'action-adventure',
      genre: 'Action & Adventure',
      lang: null
    },
    {
      genreId: 'adventure',
      genre: 'Adventure',
      lang: null
    },
    {
      genreId: 'animation',
      genre: 'Animation',
      lang: null
    },
    {
      genreId: 'biography',
      genre: 'Biography',
      lang: null
    },
    {
      genreId: 'comedy',
      genre: 'Comedy',
      lang: null
    },
    {
      genreId: 'crime',
      genre: 'Crime',
      lang: null
    },
    {
      genreId: 'documentary',
      genre: 'Documentary',
      lang: null
    },
    {
      genreId: 'drama',
      genre: 'Drama',
      lang: null
    },
    {
      genreId: 'family',
      genre: 'Family',
      lang: null
    },
    {
      genreId: 'fantasy',
      genre: 'Fantasy',
      lang: null
    },
    {
      genreId: 'history',
      genre: 'History',
      lang: null
    },
    {
      genreId: 'horror',
      genre: 'Horror',
      lang: null
    },
    {
      genreId: 'kids',
      genre: 'Kids',
      lang: null
    },
    {
      genreId: 'music',
      genre: 'Music',
      lang: null
    },
    {
      genreId: 'mystery',
      genre: 'Mystery',
      lang: null
    },
    {
      genreId: 'news',
      genre: 'News',
      lang: null
    },
    {
      genreId: 'reality',
      genre: 'Reality',
      lang: null
    },
    {
      genreId: 'romance',
      genre: 'Romance',
      lang: null
    },
    {
      genreId: 'sci-fi-fantasy',
      genre: 'Sci-Fi & Fantasy',
      lang: null
    },
    {
      genreId: 'science-fiction',
      genre: 'Science Fiction',
      lang: null
    },
    {
      genreId: 'soap',
      genre: 'Soap',
      lang: null
    },
    {
      genreId: 'talk',
      genre: 'Talk',
      lang: null
    },
    {
      genreId: 'thriller',
      genre: 'Thriller',
      lang: null
    },
    {
      genreId: 'tv-movie',
      genre: 'TV Movie',
      lang: null
    },
    {
      genreId: 'war',
      genre: 'War',
      lang: null
    },
    {
      genreId: 'war-politics',
      genre: 'War & Politics',
      lang: null
    },
    {
      genreId: 'western',
      genre: 'Western',
      lang: null
    },
  ]

  const data = {
    success: true,
    source: 'flixhq',
    path: c.req.path,
    count: genre.length,
    data: genre
  }

  return c.json(data, 200)
}

export const getFlixhqCountry = (c: Context) => {
  const country = [
    {
      countryId: 'AR',
      country: 'Argentina',
    },
    {
      countryId: 'AU',
      country: 'Australia',
    },
    {
      countryId: 'AT',
      country: 'Austria',
    },
    {
      countryId: 'BE',
      country: 'Belgium',
    },
    {
      countryId: 'CA',
      country: 'Canada',
    },
    {
      countryId: 'CN',
      country: 'China',
    },
    {
      countryId: 'CZ',
      country: 'Czech Republic',
    },
    {
      countryId: 'DK',
      country: 'Denmark',
    },
    {
      countryId: 'FI',
      country: 'Finland',
    },
    {
      countryId: 'DE',
      country: 'Germany',
    },
    {
      countryId: 'HK',
      country: 'Hongkong',
    },
    {
      countryId: 'HU',
      country: 'Hungary',
    },
    {
      countryId: 'IN',
      country: 'India',
    },
    {
      countryId: 'IE',
      country: 'Ireland',
    },
    {
      countryId: 'IT',
      country: 'Italy',
    },
    {
      countryId: 'JP',
      country: 'Japan',
    },
    {
      countryId: 'LU',
      country: 'Luxembourg',
    },
    {
      countryId: 'MX',
      country: 'Mexico',
    },
    {
      countryId: 'NL',
      country: 'Netherlands',
    },
    {
      countryId: 'NZ',
      country: 'New Zealand',
    },
    {
      countryId: 'NO',
      country: 'Norway',
    },
    {
      countryId: 'PL',
      country: 'Poland',
    },
    {
      countryId: 'RO',
      country: 'Romania',
    },
    {
      countryId: 'RU',
      country: 'Russia',
    },
    {
      countryId: 'ZA',
      country: 'South Africa',
    },
    {
      countryId: 'KR',
      country: 'South Korea',
    },
    {
      countryId: 'ES',
      country: 'Spain',
    },
    {
      countryId: 'SE',
      country: 'Sweden',
    },
    {
      countryId: 'CH',
      country: 'Switzerland',
    },
    {
      countryId: 'TW',
      country: 'Taiwan',
    },
    {
      countryId: 'TH',
      country: 'Thailand',
    },
    {
      countryId: 'GB',
      country: 'United Kingdom',
    },
    {
      countryId: 'US',
      country: 'United States of America',
    },
  ]

  const data = {
    success: true,
    source: 'flixhq',
    path: c.req.path,
    count: country.length,
    data: country
  }

  return c.json(data, 200)
}

export const getFlixhqGenreDetail = async (c: Context) => {
  const { id } = c.req.param()
  const page = c.req.query() || 1
  try {
    const resp: any = await fetcher.get(c, 'v1', `/movies/flixhq/genre/${id}?page=${page}`)
    if (resp) {
      const results = resp?.results
      const data = {
        success: true,
        source: 'flixhq',
        path: c.req.path,
        count: results.length,
        page: Number(resp.currentPage) || 1,
        data: results.map((item: any) => ({
          id: item.id,
          title: item.title,
          duration: item.duration,
          coverImage: item.image,
          releaseDate: item.releaseDate,
          type: item.type
        }))
      }
      return c.json(data, 200)
    } else {
      return c.json({ message: "Data not found!" }, 404)
    }

  } catch (error) {
    return c.json({ message: 'Error from server!', error: serializeError(error) }, 500)
  }
}

export const getFlixhqDetail = async (c: Context) => {
  const { id } = c.req.query()
  try {
    const resp: any = await fetcher.get(c, 'v1', `/movies/flixhq/info?id=${id}`)
    if (resp) {
      const data = {
        success: true,
        source: 'flixhq',
        path: c.req.path,
        data: {
          id: resp.id,
          title: resp.title,
          description: resp.description,
          image: resp.image,
          coverImage: resp.cover,
          type: resp.type,
          genres: resp.genres,
          casts: resp.casts,
          country: resp.country,
          duration: resp.duration,
          rating: resp.rating,
          episodes: resp.episodes?.map((item: any) => ({
            chapterId: item.id,
            chapterIndex: item.id
          }))
        }
      }
      return c.json(data, 200)
    } else {
      return c.json({ message: "Data not found!" }, 404)
    }
  } catch (error) {
    return c.json({ message: 'Error from server!', error: serializeError(error) }, 500)
  }
}

export const getFlixhqCountryDetail = async (c: Context) => {
  const { id } = c.req.param()
  const page = c.req.query() || 1
  try {
    const resp: any = await fetcher.get(c, 'v1', `/movies/flixhq/country/${id}?page=${page}`)
    if (resp) {
      const results = resp?.results
      const data = {
        success: true,
        source: 'flixhq',
        path: c.req.path,
        count: results.length,
        page: Number(resp?.currentPage) || 1,
        data: results.map((item: any) => ({
          id: item.id,
          title: item.title,
          duration: item.duration,
          coverImage: item.image,
          releaseDate: item.releaseDate,
          type: item.type
        }))
      }
      return c.json(data, 200)
    } else {
      return c.json({ message: "Data not found!" }, 404)
    }

  } catch (error) {
    return c.json({ message: 'Error from server!', error: serializeError(error) }, 500)
  }
}

export const getFlixhqStream = async (c: Context) => {
  const { id, chapterId } = c.req.query()

  const streamRetryAttems = 3
  const streamRetryDelayMs = 150
  const StreamRateLimitMs = 200

  const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

  const fetchServerSourcesWithRetry = async (
    c: Context,
    mediaId: string | undefined,
    episodeId: string | undefined,
    serverName: string
  ) => {
    let attempt = 0

    while (attempt < streamRetryAttems) {
      try {
        return await fetcher.get(c, 'v1', `/movies/flixhq/watch?episodeId=${episodeId}&mediaId=${mediaId}&server=${serverName}`)
      } catch (error) {
        attempt += 1
        if (attempt >= streamRetryAttems) {
          return null
        }
        await delay(streamRetryDelayMs * attempt)
      }
    }

    return null
  }
  try {
    const servers: any = await fetcher.get(c, 'v1', `/movies/flixhq/servers?episodeId=${chapterId}&mediaId=${id}`)
    if (servers) {
      const streamData: any[] = []

      for (const item of servers) {
        const sources: any = await fetchServerSourcesWithRetry(c, id, chapterId, item.name)

        if (sources?.sources) {
          streamData.push({
            headers: sources.headers,
            name: item.name,
            sources: sources.sources.map((items: any) => ({
              url: items.url,
              quality: items.quality,
              subtitles: sources.subtitles
            })),
          })
        } else {
          streamData.push({
            message: "Unavailable to get server stream url!",
            server: item.name
          })
        }

        await delay(StreamRateLimitMs)
      }

      const data = {
        success: true,
        source: 'flixhq',
        path: c.req.path,
        data: streamData
      }

      return c.json(data, 200)
    } else {
      return c.json({ message: "Data not found!" }, 404)
    }
  } catch (error) {
    return c.json({ message: "Error from server!", error: serializeError(error) }, 500)
  }
}
