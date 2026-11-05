import { Router } from 'express';
import {
  getBookings,
  getAvailableTimes,
  createBooking,
  updateBookingStatus,
} from '../controllers/booking.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/available-times', getAvailableTimes);
router.get('/', authenticateToken, getBookings);
router.patch('/', authenticateToken, updateBookingStatus);
router.post('/', createBooking);

export default router;
