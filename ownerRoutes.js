import express from 'express';
import {
  getTodayMetrics,
  payCommission,
  getAnalytics,
} from '../controllers/ownerController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken, requireRole(['owner', 'admin']));

router.get('/today', getTodayMetrics);
router.post('/pay-commission', payCommission);
router.get('/graph', getAnalytics);

export default router;
