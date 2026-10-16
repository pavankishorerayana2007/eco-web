import express from 'express';
import {
  getOverview,
  updateCommissionRate,
  listOwners,
  inviteOwner,
  updateOwnerStatus,
  getOwnerDetails,
  adjustOwnerCommission,
  getVerifications,
  verifyCommissionPayment,
  verifyBuyerPayment,
  getUniversalHistory,
  getAdminToday,
} from '../controllers/adminController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken, requireRole(['admin']));

router.get('/overview', getOverview);
router.put('/commission-rate', updateCommissionRate);
router.get('/owners', listOwners);
router.post('/owners/invite', inviteOwner);
router.patch('/owners/:id/status', updateOwnerStatus);
router.get('/owners/:id/details', getOwnerDetails);
router.post('/owners/:id/adjust-commission', adjustOwnerCommission);
router.get('/verifications', getVerifications);
router.patch('/verifications/commission/:id', verifyCommissionPayment);
router.patch('/verifications/buyer-payment/:id', verifyBuyerPayment);
router.get('/history', getUniversalHistory);
router.get('/today', getAdminToday);

export default router;
