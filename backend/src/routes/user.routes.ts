import { Hono } from "hono";
import { deleteUser, getMe, getUser, updatePassword, updateUser, updateSubscription, checkSubscriptionStatus } from "../controllers/user.controller";
import { authSession } from "../middleware/authSessions";

const route = new Hono()

route.use(authSession)

route.get('/get', getUser)
route.delete('/delete/:id', deleteUser)
route.put('/update/:id', updateUser)
route.put('/update-password', updatePassword)
route.get('/me', getMe)
route.get('/subscription/status', checkSubscriptionStatus)
route.put('/subscription/:id', updateSubscription)

export default route