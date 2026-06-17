import { Hono } from "hono";
import {
  createContentUnit,
  deleteContentUnit,
  listContentUnits,
  updateContentUnit,
} from "../../controllers/catalog/contentUnits.controller";


const route = new Hono()

route.get('/all', listContentUnits)
route.post('/create', createContentUnit)
route.put('/update/:id', updateContentUnit)
route.delete('/delete/:id', deleteContentUnit)


export default route
