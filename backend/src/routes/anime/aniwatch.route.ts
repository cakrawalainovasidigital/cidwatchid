import { Hono } from "hono";
import { getAniwatchRecommendations } from "../../controllers/anime/aniwatch.controller";


const route = new Hono()

route.get('/recommendations', getAniwatchRecommendations)

export default route