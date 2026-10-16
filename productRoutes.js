import express from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  updateStatus,
  getProductHistory,
} from '../controllers/productController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', listProducts);
router.get('/:id', getProduct);
router.get('/:id/history', getProductHistory);

// Protected routes for store owners
router.post('/', authenticateToken, requireRole(['owner', 'admin']), createProduct);
router.put('/:id', authenticateToken, requireRole(['owner', 'admin']), updateProduct);
router.patch('/:id/status', authenticateToken, requireRole(['owner', 'admin']), updateStatus);

export default router;
