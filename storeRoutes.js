import express from 'express';
import {
  getStoreStatus,
  pauseStore,
  resumeStore,
  getStoreHistory,
} from '../controllers/storeController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/:ownerId/status', getStoreStatus);
router.get('/:ownerId/history', getStoreHistory);

// Store control actions for owners
router.post('/pause', authenticateToken, requireRole(['owner', 'admin']), pauseStore);
router.post('/resume', authenticateToken, requireRole(['owner', 'admin']), resumeStore);

export default router;
