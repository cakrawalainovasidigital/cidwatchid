import { Hono } from "hono"
import categoryRoute from './category.route'
import contentItemsRoute from './contentItems.route'
import commentRoute from './comment.route'
import contentUnitRoute from './contentUnit.route'
import favotieRoute from './favorite.route'
import whitelistRoute from './whitelist.route'


const route = new Hono()

route.route('/category', categoryRoute)
route.route('/content-item', contentItemsRoute)
route.route('/comment', commentRoute)
route.route('/content-unit', contentUnitRoute)
route.route('/favorite', favotieRoute)
route.route('/whitelist', whitelistRoute)


export default route
