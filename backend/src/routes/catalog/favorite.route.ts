import { Hono } from "hono";
import {
  createFavorite,
  deleteFavorite,
  listFavorites,
  updateFavorite,
} from "../../controllers/catalog/favorites.controller";


const route = new Hono()

route.get('/all', listFavorites)
route.post('/create', createFavorite)
route.put('/update/:id', updateFavorite)
route.delete('/delete/:id', deleteFavorite)

export default route
