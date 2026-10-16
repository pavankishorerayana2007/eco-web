import { supabase, supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';

/**
 * Authentication middleware that extracts and validates the Supabase Auth JWT token
 */
export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is missing. Please sign in.',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!isSupabaseConfigured()) {
      // In demo/preview mode before credentials are set, parse demo payload
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
        req.user = decoded;
        return next();
      } catch {
        return res.status(401).json({
          success: false,
          message: 'Invalid session token.',
        });
      }
    }

    // Verify token with Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session. Please log in again.',
      });
    }

    // Fetch user profile from public.profiles
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(403).json({
        success: false,
        message: 'User profile not found. Please contact support.',
      });
    }

    if (profile.status === 'Suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account is suspended. Protected actions are restricted.',
      });
    }

    if (profile.status === 'Deleted') {
      return res.status(403).json({
        success: false,
        message: 'This account has been deleted.',
      });
    }

    req.user = profile;
    req.authUser = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Authentication service encountered an error.',
      error: error.message,
    });
  }
};

/**
 * Role-based authorization middleware
 * @param {string[]} allowedRoles Array of allowed roles: 'buyer', 'owner', 'admin'
 */
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};
