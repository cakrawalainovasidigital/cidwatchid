import { Hono } from "hono";
import { createCache } from "../../middleware/cacheHelper";
import {
  getDramaV2Recommendations,
  getDramaV2NewRelease,
  getDramaV2Search,
  getDramaV2Stream,
  getDramaV2Detail,
  getDramaV2Vip,
  getDramaV2Genre,
  getDramaV2GenreDetails,
  getDramaV2BatchDownload,
} from "../../controllers/v2/dramaV2.controller";

const shortCache = createCache('dramaV2Short', 300, {
  cacheControl: 'public, max-age=300',
});

const longCache = createCache('dramaV2Long', 3600, {
  cacheControl: 'public, max-age=3600',
});

const routes = new Hono()

routes.get('/recommendations', shortCache, getDramaV2Recommendations)
routes.get('/new-release', shortCache, getDramaV2NewRelease)
routes.get('/search', shortCache, getDramaV2Search)
routes.get('/vip', longCache, getDramaV2Vip)
routes.get('/genre', longCache, getDramaV2Genre)
routes.get('/genre/:id', shortCache, getDramaV2GenreDetails)
routes.get('/get-all-chapters/:id',longCache, getDramaV2BatchDownload)
routes.get('/stream/:id/:chapterId', getDramaV2Stream)
routes.get('/detail/:id', getDramaV2Detail)

export default routes
