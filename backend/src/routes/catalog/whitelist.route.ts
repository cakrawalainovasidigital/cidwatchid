import { Hono } from "hono";
import {
  createWhitelist,
  deleteWhitelist,
  listWhitelist,
  updateWhitelist,
} from "../../controllers/catalog/whitelist.controller";


const route = new Hono()

route.get('/all', listWhitelist)
route.post('/create', createWhitelist)
route.put('/update/:id', updateWhitelist)
route.delete('/delete/:id', deleteWhitelist)

export default route
