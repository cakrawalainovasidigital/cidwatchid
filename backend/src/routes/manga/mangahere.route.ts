import { Hono } from "hono";
import { getMangahereChapters, getMangahereDetail, getMangahereNewRelease, getMangahereRank, getMangahereRecommendations, getMangahereSearch } from "../../controllers/manga/mangahere.controller";
import { createCache } from "../../middleware/cacheHelper";

const shortCache = createCache('mangahereShort', 300, {
  cacheControl: 'public, max-age=300',
});

const longCache = createCache('mangahereLong', 3600, {
  cacheControl: 'public, max-age=3600',
});

const routes = new Hono()
routes.get('/recommendations', shortCache, getMangahereRecommendations)
routes.get('/rank', shortCache, getMangahereRank)
routes.get('/new-release', shortCache, getMangahereNewRelease)
routes.get('/detail/:id', longCache, getMangahereDetail)
routes.get('/search', shortCache, getMangahereSearch)
routes.get('/chapters', longCache, getMangahereChapters)

export default routes
