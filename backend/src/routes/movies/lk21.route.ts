import { Hono } from "hono";
import { getLk21Recommendations, getRaw } from "../../controllers/movies/lk21.controller";
import { createCache } from "../../middleware/cacheHelper";

const route = new Hono()

const shortCache = createCache('lk21Short', 300, {
  cacheControl: 'public, max-age=300',
});

const longCache = createCache('lk21Long', 3600, {
  cacheControl: 'public, max-age=3600',
});

route.get('/recommendations', shortCache, getLk21Recommendations)
route.get('/raw', longCache, getRaw)


export default route
