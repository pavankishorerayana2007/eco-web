import express from 'express';
import {
  register,
  login,
  logout,
  me,
  updateProfile,
  updatePassword,
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticateToken, me);
router.put('/profile', authenticateToken, updateProfile);
router.put('/password', authenticateToken, updatePassword);

export default router;
