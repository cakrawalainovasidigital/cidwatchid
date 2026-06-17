import { Context } from "hono"
import { Komikku, KomikkuChapter } from "../../lib/utils/komikkuHelper"
import { serializeError } from "../../lib/errorHelper"


interface HomepageCache {
  data: any
  fetchedAt: number
}

const CACHE_TTL_MS = 300_000 // 300 detik
let homepageCache: HomepageCache | null = null

function isValidBody(body: unknown): body is Body {
  return Boolean(
    body &&
    typeof body === "object" &&
    "success" in body &&
    typeof (body as any).success === "boolean"
  )
}

async function fetchHomepage(): Promise<any> {
  const resp = await Komikku.fetchContent({ kind: "homepage" })
  if (!isValidBody(resp.body)) {
    throw new Error("Invalid homepage payload")
  }
  return resp as any
}

function isCacheFresh(cache: HomepageCache | null): cache is HomepageCache {
  if (!cache) return false
  const age = Date.now() - cache.fetchedAt
  return age < CACHE_TTL_MS && cache.data.body?.success
}

async function ensureHomepage(): Promise<any> {
  if (isCacheFresh(homepageCache)) {
    return homepageCache.data
  }

  const data = await fetchHomepage()
  homepageCache = { data, fetchedAt: Date.now() }
  return data
}

export const getKomikkuRecommendations = async (c: Context) => {
  try {
    const homepage = await ensureHomepage()
    if (!homepage.body.success) {
      return c.json({ message: "Data not found!", }, 404)
    }

    const recommendation = homepage?.body?.recommendation?.data

    const data = {
      success: true,
      source: 'komikku',
      path: c.req.path,
      count: recommendation?.length,
      data: recommendation.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.summary?.join(" "),
        coverImage: item.thumbnail
      }))
    }

    return c.json(data, 200)
  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: error instanceof Error ? error.message : String(error),
    }, 500)
  }
}

export const getKomikkuRank = async (c: Context) => {
  try {
    const homepage = await ensureHomepage()
    if (!homepage.body.success) {
      return c.json({ message: "Data not found!", }, 404)
    }

    const rank = homepage?.body?.hot?.data

    const data = {
      success: true,
      source: 'komikku',
      path: c.req.path,
      count: rank?.length,
      data: rank.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.summary?.join(" ") || null,
        coverImage: item.thumbnail
      }))
    }

    return c.json(data, 200)
  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: error instanceof Error ? error.message : String(error),
    }, 500)
  }
}

export const getKomikkuNewRelease = async (c: Context) => {
  try {
    const homepage = await ensureHomepage()
    if (!homepage.body.success) {
      return c.json({ message: "Data not found!", }, 404)
    }

    const newRelease = homepage?.body?.terbaru?.data

    const data = {
      success: true,
      source: 'komikku',
      path: c.req.path,
      count: newRelease?.length,
      data: newRelease.map((item: any) => ({
        id: item.id,
        title: item.title,
        description: item.summary?.join(" ") || null,
        coverImage: item.thumbnail
      }))
    }

    return c.json(data, 200)
  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: error instanceof Error ? error.message : String(error),
    }, 500)
  }
}

export const getKomikkuDetail = async (c: Context) => {
  const { id } = c.req.param()
  try {
    const resp: any = await Komikku.fetchContent({ kind: 'manga', id })
    if (resp) {
      const detail = resp?.body?.series
      const decryptedChapters = typeof resp?.body?.chapter === "string"
        ? Komikku.decrypt.chapterJson<KomikkuChapter[]>(resp.body.chapter)
        : []
      const chapters = Array.isArray(decryptedChapters) ? decryptedChapters : []
      const data = {
        success: true,
        source: "komikku",
        path: c.req.path,
        chapterCount: Number(detail?.latest_chapter[0]?.number) || null,
        data: {
          id: detail.id,
          title: detail.title,
          description: detail?.summary.join(" ") || null,
          coverImage: detail.cover,
          thumbnail: detail.thumbnail,
          chapterCount: Number(detail.latest_chapter[0]?.number) || null,
          chapters: chapters.map((item) => ({
            chapterId: item.id,
            chapterIndex: Number(item.number)
          }))
        }
      }
      return c.json(data, 200)
    } else {
      return c.json({
        message: "Data not found!"
      }, 500)
    }
  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: error instanceof Error ? error.message : String(error),
    }, 500)
  }
}

export const getKomikkuSearch = async (c: Context) => {
  const { query, page } = c.req.query()
  try {
    const resp: any = await Komikku.fetchContent({ kind: 'search', query, page: Number(page) | 0 })
    if (resp) {
      const manga = resp?.body?.manga
      const data = {
        success: true,
        source: 'komikku',
        path: c.req.path,
        count: manga?.length,
        data: manga?.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.summary?.join(" ") || null,
          coverImage: item.thumbnail
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
      error: error instanceof Error ? error.message : String(error),
    }, 500)
  }
}

export const getKomikkuChapters = async (c: Context) => {
  const { id } = c.req.query()
  try {
    const resp: any = await Komikku.fetchContent({ kind: 'chapter', id })
    if (resp) {
      const chapters = resp?.body.chapter
      const data = {
        success: true,
        source: 'komikku',
        path: c.req.path,
        desc: chapters.name,
        data: await Komikku.decrypt.chapterJson(chapters.image)?.map((item: any, index: number) => ({
          page: index + 1,
          img: item
        }))
      }
      return c.json(data, 200)
    } else {
      return c.json({ message: "Data not found!" }, 404)
    }
  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500)
  }
}

export const getKomikkuGenres = (c: Context) => {
  const genres = [
    { genreId: 'academy', genre: 'Academy', lang: null },
    { genreId: 'action', genre: 'Action', lang: null },
    { genreId: 'adaptation', genre: 'Adaptation', lang: null },
    { genreId: 'adult', genre: 'Adult', lang: null },
    { genreId: 'adventure', genre: 'Adventure', lang: null },
    { genreId: 'apocalypse', genre: 'apocalypse', lang: null },
    { genreId: 'beasts', genre: 'Beasts', lang: null },
    { genreId: 'blacksmith', genre: 'Blacksmith', lang: null },
    { genreId: 'comedy', genre: 'Comedy', lang: null },
    { genreId: 'comedy-magic', genre: 'Comedy Magic', lang: null },
    { genreId: 'comic', genre: 'Comic', lang: null },
    { genreId: 'cooking', genre: 'Cooking', lang: null },
    { genreId: 'crime', genre: 'Crime', lang: null },
    { genreId: 'dark-fantasy', genre: 'Dark Fantasy', lang: null },
    { genreId: 'demons', genre: 'Demons', lang: null },
    { genreId: 'doujinshi', genre: 'Doujinshi', lang: null },
    { genreId: 'drama', genre: 'Drama', lang: null },
    { genreId: 'ecchi', genre: 'Ecchi', lang: null },
    { genreId: 'entertainment', genre: 'Entertainment', lang: null },
    { genreId: 'fantasy', genre: 'Fantasy', lang: null },
    { genreId: 'game', genre: 'Game', lang: null },
    { genreId: 'gender-bender', genre: 'Gender Bender', lang: null },
    { genreId: 'genderswap', genre: 'Genderswap', lang: null },
    { genreId: 'genius', genre: 'Genius', lang: null },
    { genreId: 'ghosts', genre: 'Ghosts', lang: null },
    { genreId: 'gore', genre: 'Gore', lang: null },
    { genreId: 'gyaru', genre: 'Gyaru', lang: null },
    { genreId: 'harem', genre: 'Harem', lang: null },
    { genreId: 'hentai', genre: 'Hentai', lang: null },
    { genreId: 'historical', genre: 'Historical', lang: null },
    { genreId: 'horror', genre: 'Horror', lang: null },
    { genreId: 'isekai', genre: 'Isekai', lang: null },
    { genreId: 'josei', genre: 'Josei', lang: null },
    { genreId: 'joseiw', genre: 'Josei(W)', lang: null },
    { genreId: 'magic', genre: 'Magic', lang: null },
    { genreId: 'magical-girls', genre: 'Magical Girls', lang: null },
    { genreId: 'manga', genre: 'Manga', lang: null },
    { genreId: 'mangatoon', genre: 'Mangatoon', lang: null },
    { genreId: 'manhwa', genre: 'Manhwa', lang: null },
    { genreId: 'martial-art', genre: 'Martial Art', lang: null },
    { genreId: 'martial-arts', genre: 'Martial Arts', lang: null },
    { genreId: 'mature', genre: 'Mature', lang: null },
    { genreId: 'mc-rebirth', genre: 'MC Rebirth', lang: null },
    { genreId: 'mecha', genre: 'Mecha', lang: null },
    { genreId: 'medical', genre: 'Medical', lang: null },
    { genreId: 'military', genre: 'Military', lang: null },
    { genreId: 'monster-girls', genre: 'Monster girls', lang: null },
    { genreId: 'monsters', genre: 'Monsters', lang: null },
    { genreId: 'murim', genre: 'Murim', lang: null },
    { genreId: 'music', genre: 'Music', lang: null },
    { genreId: 'mystery', genre: 'Mystery', lang: null },
    { genreId: 'office-workers', genre: 'Office Workers', lang: null },
    { genreId: 'one-shot', genre: 'One Shot', lang: null },
    { genreId: 'oneshot', genre: 'Oneshot', lang: null },
    { genreId: 'police', genre: 'Police', lang: null },
    { genreId: 'psychological', genre: 'Psychological', lang: null },
    { genreId: 'regression', genre: 'Regression', lang: null },
    { genreId: 'reincarnation', genre: 'Reincarnation', lang: null },
    { genreId: 'revenge', genre: 'Revenge', lang: null },
    { genreId: 'romance', genre: 'Romance', lang: null },
    { genreId: 'school', genre: 'School', lang: null },
    { genreId: 'school-life', genre: 'School life', lang: null },
    { genreId: 'sci-fi', genre: 'Sci-fi', lang: null },
    { genreId: 'seinen', genre: 'Seinen', lang: null },
    { genreId: 'sexual-violence', genre: 'Sexual Violence', lang: null },
    { genreId: 'shotacon', genre: 'Shotacon', lang: null },
    { genreId: 'shoujo', genre: 'Shoujo', lang: null },
    { genreId: 'shoujo-ai', genre: 'Shoujo Ai', lang: null },
    { genreId: 'shoujog', genre: 'Shoujo(G)', lang: null },
    { genreId: 'shounen', genre: 'Shounen', lang: null },
    { genreId: 'shounen-ai', genre: 'Shounen Ai', lang: null },
    { genreId: 'shounenb', genre: 'Shounen(B)', lang: null },
    { genreId: 'slice-of-life', genre: 'Slice of Life', lang: null },
    { genreId: 'slow-life', genre: 'Slow Life', lang: null },
    { genreId: 'smut', genre: 'Smut', lang: null },
    { genreId: 'sport', genre: 'Sport', lang: null },
    { genreId: 'sports', genre: 'Sports', lang: null },
    { genreId: 'super-power', genre: 'Super Power', lang: null },
    { genreId: 'supernatural', genre: 'Supernatural', lang: null },
    { genreId: 'survival', genre: 'Survival', lang: null },
    { genreId: 'swormanship', genre: 'Swormanship', lang: null },
    { genreId: 'system', genre: 'System', lang: null },
    { genreId: 'thriller', genre: 'Thriller', lang: null },
    { genreId: 'tragedy', genre: 'Tragedy', lang: null },
    { genreId: 'trauma', genre: 'Trauma', lang: null },
    { genreId: 'vampire', genre: 'Vampire', lang: null },
    { genreId: 'villainess', genre: 'Villainess', lang: null },
    { genreId: 'web-comic', genre: 'Web Comic', lang: null },
    { genreId: 'webtoon', genre: 'Webtoon', lang: null },
    { genreId: 'webtoons', genre: 'Webtoons', lang: null },
    { genreId: 'xianxia', genre: 'Xianxia', lang: null },
    { genreId: 'xuanhuan', genre: 'Xuanhuan', lang: null },
    { genreId: 'yuri', genre: 'Yuri', lang: null },
  ]

  const data = {
    success: true,
    source: 'komikku',
    path: c.req.path,
    count: genres.length,
    data: genres
  }

  return c.json(data, 200)
}

export const getKomikkuGenreDetail = async (c: Context) => {
  const { id } = c.req.param()
  const { page } = c.req.query()
  try {
    const resp: any = await Komikku.fetchContent({ kind: 'genres', genre: id, page: Number(page) | 1 })
    if (resp) {
      const series = resp?.body?.series
      const data = {
        success: true,
        source: 'komikku',
        path: c.req.path,
        page,
        count: series.length,
        data: series?.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item?.summary?.join(" ") || null,
          coverImage: item.thumbnail
        }))
      }
      return c.json(data)
    } else {
      return c.json({ message: 'Data not found!' }, 404)
    }
  } catch (error) {
    return c.json({
      message: "Error from server!",
      error: serializeError(error)
    }, 500)
  }
}

// export const getKomikkuFilter = async (c:Context) =>{
//   try {
//     const resp = await Komikku.fetchContent({kind: 'search'})
//   } catch (error) {
    
//   }
// }