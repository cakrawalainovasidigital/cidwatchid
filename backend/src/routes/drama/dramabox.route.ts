import { Hono } from "hono"
import { createCache } from "../../middleware/cacheHelper"
import {
  getDramaboxCacheStats,
  getDramaboxNewRelease,
  getDramaboxRecomendations,
  getDramaboxRank,
  getDramaboxSearch,
  getDramaboxDetails,
  getDramaboxStreamVideo,
  getDramaboxSearchSuggest,
  getDramaboxStreamVideoChapter,
  getDramaboxGenre,
  getLanguages,
  getDramaboxGenreDetails,
  getDramaboxVip,
  getAllChapthers,
} from "../../controllers/drama/dramabox.controller"


const routes = new Hono()

const shortCache = createCache('dramaboxShort', 300, {
  cacheControl: 'public, max-age=300',
});

const longCache = createCache('dramaboxLong', 3600, {
  cacheControl: 'public, max-age=3600',
});

routes.get('/debug/cache', getDramaboxCacheStats)
routes.get('/recommendations', shortCache, getDramaboxRecomendations)
routes.get('/new-release', shortCache, getDramaboxNewRelease)
routes.get('/rank', shortCache, getDramaboxRank)
routes.get('/search', shortCache, getDramaboxSearch)
routes.get('/search-suggest', shortCache, getDramaboxSearchSuggest)
routes.get('/genre', shortCache, getDramaboxGenre)
routes.get('/genre/:id', longCache, getDramaboxGenreDetails)
routes.get('/detail/:id', longCache, getDramaboxDetails)
routes.get('/stream/:id', longCache, getDramaboxStreamVideo)
routes.get('/stream/:id/:chapterIndex', longCache, getDramaboxStreamVideoChapter)
routes.get('/languages', shortCache, getLanguages)
routes.get("/vip", shortCache, getDramaboxVip)
routes.get('/get-all-chapters/:id', longCache, getAllChapthers)

export default routes
