import express from 'express';
import { isSupabaseConfigured } from '../config/supabase.js';

const router = express.Router();

/**
 * Health check endpoint required by Section 4
 * GET /api/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'Quantum Market API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    supabase_configured: isSupabaseConfigured(),
  });
});

export default router;
