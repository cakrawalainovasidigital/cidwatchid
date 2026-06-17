import { Hono } from "hono";
import mangahereRoute from './mangahere.route'
import { getMangaProviders } from "../../controllers/manga/mangaProvider.controller";
import komikkuRoute from './komikku.route'
import { createCache } from "../../middleware/cacheHelper";

const routes = new Hono()

const longCache = createCache('manga-providers', 60 * 24 * 15, {
  cacheControl: `public, max-age=${60 * 24 * 15}`
})


routes.get('/providers', longCache, getMangaProviders)
routes.route('/mangahere', mangahereRoute)
routes.route('/komikku', komikkuRoute)


export default routes