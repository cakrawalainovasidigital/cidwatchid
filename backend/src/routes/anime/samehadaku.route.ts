import { Hono } from "hono";
import { 
  getSamehadakuRecommendations,
  getSamehadakuNewRelease,
  getSamehadakuSearch,
  getSamehadakuOngoing,
  getSamehadakuDetail,
  getSamehadakuStream,
  getSamehadakuGenre,
  getSamehadakuGenreDetail
} from "../../controllers/anime/samehadaku.controller";

const route = new Hono()

// Listing endpoints
route.get('/recommendations', getSamehadakuRecommendations)
route.get('/new-release', getSamehadakuNewRelease)
route.get('/ongoing', getSamehadakuOngoing)

// Search endpoint
route.get('/search', getSamehadakuSearch)

// Genre endpoints
route.get('/genre', getSamehadakuGenre)
route.get('/genre/:genreId', getSamehadakuGenreDetail)

// Detail endpoints
route.get('/detail/:id', getSamehadakuDetail)
route.get('/stream/:episodeId', getSamehadakuStream)

export default route
