import { Hono } from "hono";

import dramaboxRoutes from './dramabox.route'
import meloloRoutes from './melolo.route'
import { getDramaProviders } from "../../controllers/drama/dramaProviders.controller";
import { createCache } from "../../middleware/cacheHelper";

const routes = new Hono()
const longCache = createCache('drama-providers', 60 * 24 * 15, {
  cacheControl: `public, max-age=${60 * 24 * 15}`
})


routes.route('/dramabox', dramaboxRoutes)
routes.route('/melolo', meloloRoutes)
routes.get('/providers', longCache, getDramaProviders)

export default routes