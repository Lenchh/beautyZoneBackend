import { Router } from 'express';
import { getUserProfile, updateUserProfile } from '../controllers/user.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/profile', authenticateToken, getUserProfile);
router.patch('/profile', authenticateToken, updateUserProfile);

export default router;
