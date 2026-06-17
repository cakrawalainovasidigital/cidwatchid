import { Hono } from "hono";
import { getFlixhqCountry, getFlixhqCountryDetail, getFlixhqDetail, getFlixhqGenre, getFlixhqGenreDetail, getFlixhqNewRelease, getFlixhqRecommendations, getFlixhqStream } from "../../controllers/movies/flixhq.controller";
import { createCache } from "../../middleware/cacheHelper";

const shortCache = createCache('flixhqShort', 300, {
  cacheControl: 'public, max-age=300',
});

const longCache = createCache('flixhqLong', 3600, {
  cacheControl: 'public, max-age=3600',
});
const routes = new Hono()


routes.get('/recommendations', shortCache, getFlixhqRecommendations)
routes.get('/new-release', shortCache, getFlixhqNewRelease)
routes.get('/genre', getFlixhqGenre)
routes.get('/country', getFlixhqCountry)
routes.get('/genre/:id', longCache, getFlixhqGenreDetail)
routes.get('/country/:id', longCache, getFlixhqCountryDetail)
routes.get('/detail', longCache, getFlixhqDetail)
routes.get('/stream', longCache, getFlixhqStream)


export default routes
