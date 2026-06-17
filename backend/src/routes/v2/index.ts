import { Hono } from "hono";
import animeV2Routes from './anime'
import dramaV2Routes from './drama'

const routes = new Hono()

routes.route('/anime', animeV2Routes)
routes.route('/drama', dramaV2Routes)

export default routes