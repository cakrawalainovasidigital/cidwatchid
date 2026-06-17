import { Hono } from "hono";
import {
  createComment,
  deleteComment,
  listComments,
  updateComment,
  getReplies,
  createReply,
  purgeComments,
} from "../../controllers/catalog/comments.controller";


const route = new Hono()

route.get('/all', listComments)
route.post('/create', createComment)
route.put('/update/:id', updateComment)
route.delete('/delete/:id', deleteComment)
route.get('/reply/:commentId', getReplies)
route.post('/reply/:commentId', createReply)
route.delete('/purge-comments', purgeComments)


export default route
