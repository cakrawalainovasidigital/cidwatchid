import { Hono } from "hono";
import { getAnimeinDetail, getAnimeinGenre, getAnimeinGenreDetail, getAnimeinNewRelease, getAnimeinRank, getAnimeinRecommendations, getAnimeinSearch, getAnimeinStream } from "../../controllers/anime/animein.controller";
import { createCache } from "../../middleware/cacheHelper";

const shortCache = createCache('animeinShort', 300, {
  cacheControl: 'public, max-age=300',
});

const longCache = createCache('animeinLong', 3600, {
  cacheControl: 'public, max-age=3600',
});


const route = new Hono()


route.get('/recommendations', shortCache, getAnimeinRecommendations)
route.get('/new-release', shortCache, getAnimeinNewRelease)
route.get('/rank', shortCache, getAnimeinRank)
route.get('/search', shortCache, getAnimeinSearch)
route.get('/detail/:id', longCache, getAnimeinDetail)
route.get('/stream/:episodeId', longCache, getAnimeinStream)
route.get('/genre', shortCache, getAnimeinGenre)
route.get('/genre/:id', shortCache, getAnimeinGenreDetail)


export default route
