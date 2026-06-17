import { Hono } from "hono";
import {
  getMeloloBookmall,
  getMeloloDetailSeries,
  getMeloloNewRelease,
  getMeloloRank,
  getMeloloSearch,
  getMeloloSearchSuggest,
  getMeloloStream,
  getMeloloStreamChapter
} from "../../controllers/drama/melolo.controller";
import { createCache } from "../../middleware/cacheHelper";

const route = new Hono()

const shortCache = createCache('meloloShort', 300, {
  cacheControl: 'public, max-age=300',
});

const longCache = createCache('meloloLong', 3600, {
  cacheControl: 'public, max-age=3600',
});

route.get('/recommendations', shortCache, getMeloloBookmall)
route.get('/new-release', shortCache, getMeloloNewRelease)
route.get('/rank', shortCache, getMeloloRank)
route.get('/search', shortCache, getMeloloSearch)
route.get('/search-suggest', shortCache, getMeloloSearchSuggest)
route.get('/detail/:id', longCache, getMeloloDetailSeries)
route.get('/stream/:id', longCache, getMeloloStream)
route.get('/stream/:id/:chapterIndex', longCache, getMeloloStreamChapter)

// route.get('/recommendations',  getMeloloBookmall)
// route.get('/new-release',  getMeloloNewRelease)
// route.get('/rank',  getMeloloRank)
// route.get('/search',  getMeloloSearch)
// route.get('/search-suggest',  getMeloloSearchSuggest)
// route.get('/detail/:id', getMeloloDetailSeries)
// route.get('/stream/:id', getMeloloStream)
// route.get('/stream/:id/:chapterIndex', getMeloloStreamChapter)


export default route
