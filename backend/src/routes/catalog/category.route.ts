import { Hono } from "hono";
import { createCategory, deleteCategory, listCategories, updateCategory } from "../../controllers/catalog/categories.controller";




const route = new Hono()

route.get('/all', listCategories)
route.post('/create', createCategory)
route.put('/update/:id', updateCategory)
route.delete('/delete/:id', deleteCategory)

export default route
