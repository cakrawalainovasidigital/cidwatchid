import genreData from '../../lib/data/genre.json';
import { Context } from "hono";
import createDramaboxClient, { createMemoryCache } from "../../lib/utils/dramaboxHelper";
import { serializeError } from '../../lib/errorHelper';

const dramaboxCache = createMemoryCache()

export const getDramaboxCacheStats = (c: Context) => {
  const stats = dramaboxCache.stats ? dramaboxCache.stats() : {}
  // dramaboxCache.clear()
  return c.json({
    success: true,
    source: "dramabox",
    path: c.req.path,
    data: stats
  }, 200)
}

export const getDramaboxRecomendations = async (c: Context) => {
  const lang = c.req.query("lang") || "in"
  const client = createDramaboxClient({ lang, cache: dramaboxCache })
  try {
    const response: any = await client.getRecommendedBooks()

    if (response) {
      const data = {
        success: true,
        source: "dramabox",
        path: c.req.path,
        count: response.length,
        data: response.map((items: any) => {
          return {
            id: items.bookId,
            title: items.bookName,
            description: items.introduction,
            coverImage: items.coverWap,
            playCount: items.playCount,
            chapterCount: items.chapterCount,
          }
        })
      }
      return c.json(data, 200)
    } else {
      return c.json({ message: "Data not found!", }, 404)
    }

    // return c.json(response, 200)
  } catch (error) {
    console.log(error)
    return c.json({ message: "Error from server!", error: serializeError(error) }, 500)
  }
}

export const getDramaboxNewRelease = async (c: Context) => {
  const lang = c.req.query("lang") || "in"
  const pageSize = Number(c.req.query("pageSize")) || 20
  const page = Number(c.req.query("page")) || 1
  const client = createDramaboxClient({ lang, cache: dramaboxCache })
  try {
    const response: any = await client.getDramaList(page, pageSize)
    if (response) {
      const data = {
        success: true,
        source: "dramabox",
        path: c.req.path,
        count: response.book.length,
        data: response.book.map((items: any) => {
          return {
            id: items.id,
            title: items.name,
            description: items.introduction,
            coverImage: items.cover,
            playCount: items.playCount,
            chapterCount: items.chapterCount,
          }
        })
      }
      return c.json(data, 200)
    } else {
      return c.json({ message: "Data not found!" }, 404)
    }
    // return c.json(response, 200)
  } catch (error) {
    console.log(error)
    return c.json({ message: "Error from server!", error }, 500)
  }
}

export const getDramaboxRank = async (c: Context) => {
  const lang = c.req.query("lang") || "in"
  const page = Number(c.req.query("page")) || 1
  const pageSize = Number(c.req.query("pageSize")) || 15
  const client = createDramaboxClient({ lang, cache: dramaboxCache })
  try {
    const response: any = await client.getDramaList(page, pageSize)
    if (response) {
      const data = {
        success: true,
        source: "dramabox",
        path: c.req.path,
        count: response.book.length,
        data: response.book.map((items: any) => {
          return {
            id: items.id,
            title: items.name,
            description: items.introduction,
            coverImage: items.cover,
            playCount: items.playCount,
            chapterCount: items.chapterCount,
          }
        })
      }
      return c.json(data, 200)
    } else {
      return c.json({ message: "Data not found!" }, 404)
    }
    // return c.json(response, 200)
  } catch (error) {
    console.log(error)
    return c.json({ message: "Error from server!", error: serializeError(error) }, 500)
  }
}

export const getDramaboxSearch = async (c: Context) => {
  const lang = c.req.query("lang") || "in"
  const query = String(c.req.query("query"))
  const client = createDramaboxClient({ lang, cache: dramaboxCache })
  const page = Number(c.req.query('page')) || 1
  const pageSize = Number(c.req.query('pageSize')) || 10

  try {
    const response: any = await client.searchDrama(query, page, pageSize)
    if (response) {
      const data = {
        success: true,
        source: "dramabox",
        path: c.req.path,
        count: response.book.length,
        data: response.book.map((items: any) => {
          return {
            id: items.id,
            title: items.name,
            description: items.introduction,
            coverImage: items.cover,
            playCount: items.playCount,
            chapterCount: items.chapterCount,
          }
        })
      }
      return c.json(data, 200)
    } else {
      return c.json({ message: "Data not found!" }, 404)
    }
    // return c.json(response, 200)
  } catch (error) {
    console.log(error)
    return c.json({ message: "Error from server!", error }, 500)
  }
}

export const getDramaboxSearchSuggest = async (c: Context) => {
  const query = String(c.req.query("query"))
  const lang = c.req.query("lang") || "in"
  const client = createDramaboxClient({ lang, cache: dramaboxCache })
  try {
    const response: any = await client.rsearchDrama(query)
    if (response) {
      const data = {
        success: true,
        source: "dramabox",
        path: c.req.path,
        count: response.length,
        data: response.map((items: any) => {
          return {
            id: items.bookId,
            title: items.bookName,
            description: items.introduction || null,
            coverImage: items.cover,
            playCount: items.playCount || null,
            chapterCount: items.chapterCount || null,
          }
        })
      }
      return c.json(data, 200)
    } else {
      return c.json({ message: "Data not found!" }, 404)
    }
    // return c.json(response, 200)
  } catch (error) {
    console.log(error)
    return c.json({ message: "Error from server!", error: serializeError(error) }, 500)
  }
}

export const getDramaboxDetails = async (c: Context) => {
  const lang = c.req.query("lang") || "in"
  const { id } = c.req.param()
  const client = createDramaboxClient({ lang, cache: dramaboxCache })

  try {
    const [responseChapters, responseDetail]: any = await Promise.all([
      await client.getDramaDetail(id), await client.getStreamUrl(String(id), "0")
    ])
    if (responseChapters) {
      const data = {
        success: true,
        source: "dramabox",
        path: c.req.path,
        chapterCount: responseChapters.data.list.length,
        data: {
          id: id,
          title: responseDetail.data.bookName,
          descriptions: responseDetail.data.introduction,
          coverImage: responseDetail.data.bookCover,
          playCount: responseDetail.data.playCount,
          chapterCount: responseChapters.chapterCount,
          chapters: responseChapters.data.list.map((items: any) => {
            return {
              chapterId: items.chapterId,
              chapterIndex: items.chapterIndex,
            }
          }),
        }
      }
      return c.json(data, 200)
    } else {
      return c.json({ message: "Data not found!" }, 404)
    }
    // return c.json(responseChapters, 200)
  } catch (error) {
    console.log(error)
    return c.json({ message: "Error from server!", error: serializeError(error) }, 500)
  }
}

export const getDramaboxStreamVideo = async (c: Context) => {
  const lang = c.req.query("lang") || "in"
  const { id } = c.req.param()
  // const episodeIndex = normalizeEpisodeIndex(c.req.query("episode")) - 1
  const client = createDramaboxClient({ lang, cache: dramaboxCache })
  try {
    const response: any = await client.getStreamUrl(id, "0")
    if (response) {
      const chapterListFirstIndex = response.data.chapterList[0]
      const data = {
        success: true,
        source: "dramabox",
        path: c.req.path,
        data: {
          id,
          coverImage: chapterListFirstIndex.chapterImg,
          chapterIndex: chapterListFirstIndex.chapterIndex,
          streamUrl: chapterListFirstIndex.cdnList[0].videoPathList[0].videoPath,
          qualities: chapterListFirstIndex.cdnList[0].videoPathList.map((items: any) => {
            return {
              quality: items.quality,
              streamUrl: items.videoPath,
            }
          }),
        }
      }
      return c.json(data, 200)
    } else {
      return c.json({ message: "Data not found!" }, 404)
    }

    // return c.json(response, 200)
  } catch (error) {
    console.log(error)
    return c.json({ message: "Error from server!", error: serializeError(error) }, 500)
  }
}

export const getDramaboxStreamVideoChapter = async (c: Context) => {
  const lang = c.req.query("lang") || "in"
  const { id, chapterIndex } = c.req.param()
  const client = createDramaboxClient({ lang, cache: dramaboxCache })
  try {
    const response: any = await client.getStreamUrl(id, chapterIndex)
    if (response && response.data?.chapterList?.length) {
      const chapter =
        response.data.chapterList.find(
          (item: any) => String(item.chapterIndex ?? item.index) === String(chapterIndex)
        ) || response.data.chapterList[0]
      if (!chapter) {
        return c.json({ message: "Data not found!" }, 404)
      }
      const data = {
        success: true,
        source: "dramabox",
        path: c.req.path,
        data: {
          id,
          coverImage: chapter.chapterImg,
          chapterIndex: chapter.chapterIndex,
          streamUrl: chapter.cdnList[0].videoPathList[0].videoPath,
          qualities: chapter.cdnList[0].videoPathList.map((items: any) => {
            return {
              quality: items.quality,
              streamUrl: items.videoPath,
            }
          }),
        }
      }
      return c.json(data, 200)
    } else {
      return c.json({ message: "Data not found!" }, 404)
    }
  } catch (error) {
    console.log(error)
    return c.json({ message: "Error from server!", error: serializeError(error) }, 500)
  }
}

export const getDramaboxGenre = async (c: Context) => {
  const lang = c.req.query("lang") || "in"
  const client = createDramaboxClient({ lang, cache: dramaboxCache })
  try {
    const response = await client.getCategories()
    if (response) {
      const data = {
        success: true,
        source: "dramabox",
        path: "/genre",
        count: response.length,
        data: response.map((genre) => {
          return {
            genreId: genre.id,
            genreName: genre.name,
            lang
          }
        })
      }
      return c.json(data, 200)
    }
    return c.json({ message: "Data not found!" }, 404)
  } catch (error) {
    console.log(error)
    return c.json({ message: "Error from server!", error }, 500)
  }
}

const langNames: Record<string, string> = {
  in: "indonesian", en: "english", es: "spanish", pt: "portuguese",
  fr: "french", de: "german", it: "italian", ru: "russian",
  ja: "japanese", ko: "korean", zh: "chinese", th: "thai",
  vi: "vietnamese", ar: "arabic", hi: "hindi"
}

export const getLanguages = async (c: Context) => {
  try {
    const langs = [...new Set(genreData.map((g) => g.lang))]
    const data = Object.fromEntries(langs.map((l) => [langNames[l] || l, l]))
    return c.json({
      success: true,
      source: "dramabox",
      path: c.req.path,
      count: langs.length,
      data
    }, 200)
  } catch (error) {
    console.log(error)
    return c.json({ message: "Error from server!", error: serializeError(error) }, 500)
  }
}

export const getDramaboxGenreDetails = async (c: Context) => {
  const lang = c.req.query("lang") || "in"
  const { id } = c.req.param()
  const client = createDramaboxClient({ lang, cache: dramaboxCache })
  const { page, pageSize } = c.req.query()
  try {
    const response: any = await client.getBookFromCategories(Number(id))
    if (response) {
      const data = {
        success: response.success,
        source: "dramabox",
        path: c.req.path,
        count: response.bookList.length,
        data: response.bookList.map((items: any) => {
          return {
            id: items.bookId,
            title: items.bookName,
            description: items.introduction,
            coverImage: items.cover,
            playCount: items.viewCountDisplay,
            chapterCount: items.chapterCount,
          }
        })
      }
      return c.json(data, 200)
    }
    // return c.json(response, 200)
    return c.json({ message: "Data not found!" }, 404)
  } catch (error) {
    return c.json({ message: "Error from server!", error: serializeError(error) }, 500)
  }
}

export const getDramaboxVip = async (c: Context) => {
  const lang = c.req.query("lang") || "in"
  const client = createDramaboxClient({ lang, cache: dramaboxCache })
  try {
    const response: any = await client.getVip()
    if (response) {
      const books = response?.data?.columnVoList || []
      const data = {
        success: true,
        source: "dramabox",
        path: c.req.path,
        data: books.map((item: any) => ({
          tabTitle: item.title,
          items: item.bookList.map((items: any) => ({
            id: items.bookId,
            title: items.bookName,
            descriptions: items.introduction,
            coverImage: items.coverWap,
            playClount: items.playCount,
            chaptherCount: items.chapterCount,
          }))
        }))
      }
      return c.json(data, 200)
    } else {
      return c.json({
        message: "Data not found!"
      }, 404)
    }
  } catch (error) {
    return c.json({ message: "Error from server!", error: serializeError(error) }, 500)
  }
}


export const getAllChapthers = async (c: Context) => {
  const { lang } = c.req.query() || 'in'
  const { id } = c.req.param()
  const client = createDramaboxClient({
    lang,
    batchDelayMs: 150,
    batchRetryDelayMs: 500,
    batchTokenResetDelayMs: 400,
  })
  try {
    const batch = await client.batchDownload(id)

    if (batch.length !== 0) {
      const data = {
        success: true,
        source: 'dramabox',
        path: c.req.path,
        count: batch.length,
        data: batch.map((item) => ({
          chapterId: item.chapterId,
          chapterIndex: item.chapterIndex,
          chapterName: item.chapterName,
          streamUrl: item.videoPath
        }))
      }
      return c.json(data, 200)
    }

    return c.json({ message: 'Data not found!' }, 404)

  } catch (error) {
    return c.json({
      message: 'Error from server!',
      error: serializeError(error)
    })
  }
}
