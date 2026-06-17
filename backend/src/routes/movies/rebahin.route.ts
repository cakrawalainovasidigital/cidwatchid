import { Hono } from "hono";
import { getRebahinCountry, getRebahinCountryDetails, getRebahinDetail, getRebahinGenre, getRebahinGenreDetails, getRebahinNewRelease, getRebahinRecommendations, getRebahinSearch, getRebahinStream } from "../../controllers/movies/rebahin.controller";
import { createCache } from "../../middleware/cacheHelper";

const shortCache = createCache('rebahinShort', 300, {
  cacheControl: 'public, max-age=300',
});

const longCache = createCache('rebahinLong', 3600, {
  cacheControl: 'public, max-age=3600',
});

const routes = new Hono()

// routes.get('/recommendations', shortCache, getRebahinRecommendations)
// routes.get('/new-release', shortCache, getRebahinNewRelease)
// routes.get('/genre', longCache, getRebahinGenre)
// routes.get('/country', longCache, getRebahinCountry)
// routes.get('/genre/:id', longCache, getRebahinGenreDetails)
// routes.get('/country/:id', longCache, getRebahinCountryDetails)
// routes.get('/detail/:id', longCache, getRebahinDetail)
// routes.get('/stream/:id', longCache, getRebahinStream)
// routes.get('/search', shortCache, getRebahinSearch)

routes.get('/recommendations', shortCache, getRebahinRecommendations)
routes.get('/new-release', shortCache, getRebahinNewRelease)
routes.get('/genre', longCache, getRebahinGenre)
routes.get('/country', longCache, getRebahinCountry)
routes.get('/genre/:id', longCache, getRebahinGenreDetails)
routes.get('/country/:id', longCache, getRebahinCountryDetails)
routes.get('/detail/:id', longCache, getRebahinDetail)
routes.get('/stream/:id', longCache, getRebahinStream)
routes.get('/search', shortCache, getRebahinSearch)

export default routes
