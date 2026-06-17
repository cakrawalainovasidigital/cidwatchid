import { Hono } from "hono";
import flixHQRoute from './flixhq.route'
import { getMovieProviders } from "../../controllers/movies/movieProviders.controller";
import rebahinRoute from './rebahin.route'
import lk21Route from './lk21.route'
import { createCache } from "../../middleware/cacheHelper";

const routes = new Hono()

const longCache = createCache('movie-providers', 60 * 24 * 15, {
  cacheControl: `public, max-age=${60 * 24 * 15}`
})

routes.get('/providers', longCache, getMovieProviders)
routes.route('/flixhq', flixHQRoute)
routes.route('/rebahin', rebahinRoute)
routes.route('/lk21', lk21Route)

export default routes