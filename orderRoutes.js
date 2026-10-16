import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOwnerOrders,
  cancelOrder,
  confirmReceived,
  confirmPaidCash,
  submitPaymentProof,
} from '../controllers/orderController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Buyer order management
router.post('/', authenticateToken, requireRole(['buyer', 'admin']), createOrder);
router.get('/my-orders', authenticateToken, getMyOrders);
router.patch('/:id/cancel', authenticateToken, cancelOrder);
router.patch('/:id/received', authenticateToken, requireRole(['buyer']), confirmReceived);
router.patch('/:id/paid-cash', authenticateToken, requireRole(['buyer']), confirmPaidCash);
router.post('/:id/pay-proof', authenticateToken, requireRole(['buyer']), submitPaymentProof);

// Store owner orders (read-only for owners)
router.get('/owner-orders', authenticateToken, requireRole(['owner', 'admin']), getOwnerOrders);

export default router;
