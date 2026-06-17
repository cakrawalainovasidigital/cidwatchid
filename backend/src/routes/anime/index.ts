import { Hono } from "hono";
import { getAnimeProviders } from "../../controllers/anime/animeProviders.controller";
import animeinRoute from './animein.route'
import samehadakuRoute from './samehadaku.route'
import aniwatchRoute from './aniwatch.route'
import { createCache } from "../../middleware/cacheHelper";


const routes = new Hono()

const providersCache = createCache('anime-providers', 60 * 24 * 15, {
  cacheControl: `public, max-age=${60 * 24 * 15}`,
})

routes.route('/animein', animeinRoute)
routes.route('/samehadaku', samehadakuRoute)
routes.route('/aniwatch', aniwatchRoute)

routes.get('/providers', providersCache, getAnimeProviders)

export default routes
