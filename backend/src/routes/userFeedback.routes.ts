import { Hono } from "hono";
import { 
  createFeedback, 
  getAllFeedbacks, 
  getFeedbackById, 
  getMyFeedbacks,
  updateFeedback, 
  deleteFeedback,
  adminUpdateFeedback,
  getFeedbackStats
} from "../controllers/userFeedback.controller";
import { authSession } from "../middleware/authSessions";

const route = new Hono()

// All routes require authentication
route.use(authSession)

// User routes
route.post('/', createFeedback)
route.get('/my', getMyFeedbacks)
route.get('/stats', getFeedbackStats)
route.get('/:id', getFeedbackById)
route.put('/:id', updateFeedback)
route.delete('/:id', deleteFeedback)

// Admin routes (can be protected with admin middleware if needed)
route.get('/', getAllFeedbacks)
route.put('/admin/:id', adminUpdateFeedback)

export default route
