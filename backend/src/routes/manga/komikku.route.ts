import { Hono } from "hono";
import { getKomikkuChapters, getKomikkuDetail, getKomikkuGenreDetail, getKomikkuGenres, getKomikkuNewRelease, getKomikkuRank, getKomikkuRecommendations, getKomikkuSearch } from "../../controllers/manga/komikku.controller";
import { createCache } from "../../middleware/cacheHelper";

const route = new Hono()

const shortCache = createCache('komikkuShort', 300, {
  cacheControl: 'public, max-age=300',
});

const longCache = createCache('komikkuLong', 3600, {
  cacheControl: 'public, max-age=3600',
});

route.get('/recommendations', shortCache, getKomikkuRecommendations)
route.get('/rank', shortCache, getKomikkuRank)
route.get('/new-release', shortCache, getKomikkuNewRelease)
route.get('/detail/:id', longCache, getKomikkuDetail)
route.get('/search', shortCache, getKomikkuSearch)
route.get('/chapters', longCache, getKomikkuChapters)
route.get('/genre', longCache, getKomikkuGenres)
route.get('/genre/:id', shortCache, getKomikkuGenreDetail)

export default route
