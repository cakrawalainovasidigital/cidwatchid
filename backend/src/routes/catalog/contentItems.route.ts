import { Hono } from "hono";
import {
  createContentItem,
  deleteContentItem,
  listContentItems,
  getContentItemByProvider,
  updateContentItem,
} from "../../controllers/catalog/contentItems.controller";



const route = new Hono()

route.get('/all', listContentItems)
route.get('/:providerKey/:sourceId', getContentItemByProvider)
route.post('/create', createContentItem)
route.put('/update/:id', updateContentItem)
route.delete('/delete/:id', deleteContentItem)


export default route
