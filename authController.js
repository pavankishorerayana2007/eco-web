import { supabase, supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';

// In-memory fallback users for local preview before Supabase is connected
let demoUsers = [
  { id: 'u-buyer-1', email: 'buyer@demo.com', password: 'demo1234', full_name: 'Anita Rao', role: 'buyer', mobile: '9876543210', address: '12 MG Road', city: 'Hyderabad', state: 'Telangana', pincode: '500001', status: 'Active' },
  { id: 'u-owner-1', email: 'owner@quantum.shop', password: 'demo1234', full_name: 'Rajesh Kumar', shop_name: 'Rajesh Stores', role: 'owner', mobile: '9811111111', status: 'Active', store_status: 'active' },
  { id: 'u-owner-2', email: 'meera@quantum.shop', password: 'demo1234', full_name: 'Meera Nair', shop_name: 'Meera Wellness', role: 'owner', mobile: '9822222222', status: 'Active', store_status: 'active' },
  { id: 'u-owner-3', email: 'vikram@quantum.shop', password: 'demo1234', full_name: 'Vikram Shah', shop_name: 'Vikram Traders', role: 'owner', mobile: '9833333333', status: 'Suspended', store_status: 'active' },
  { id: 'u-admin-1', email: 'admin@quantum.shop', password: 'demo1234', full_name: 'Super Admin', role: 'admin', status: 'Active' },
];

export const register = async (req, res, next) => {
  try {
    const { email, password, full_name, mobile } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password (at least 8 characters) are required.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!isSupabaseConfigured()) {
      if (demoUsers.some((u) => u.email === cleanEmail)) {
        return res.status(400).json({ success: false, message: 'That email is already registered.' });
      }
      const newUser = {
        id: 'u-buyer-' + (demoUsers.length + 1),
        email: cleanEmail,
        password,
        full_name,
        mobile: mobile || '',
        role: 'buyer',
        status: 'Active',
      };
      demoUsers.push(newUser);
      return res.status(201).json({
        success: true,
        message: 'Buyer account created successfully. Please log in.',
      });
    }

    // Supabase Auth Sign Up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name,
          role: 'buyer',
          mobile: mobile || '',
        },
      },
    });

    if (authError) {
      return res.status(400).json({ success: false, message: authError.message });
    }

    // Ensure public.profiles record exists
    if (authData.user) {
      await supabaseAdmin.from('profiles').upsert({
        id: authData.user.id,
        email: cleanEmail,
        full_name,
        role: 'buyer',
        mobile: mobile || '',
        status: 'Active',
      });
    }

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please log in.',
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!isSupabaseConfigured()) {
      const user = demoUsers.find((u) => u.email === cleanEmail);
      if (!user || user.password !== password) {
        return res.status(401).json({ success: false, message: 'Email or password is incorrect.' });
      }
      if (user.status !== 'Active') {
        return res.status(403).json({ success: false, message: `This account is ${user.status.toLowerCase()}. Contact Admin.` });
      }

      // Generate demo base64 token
      const token = Buffer.from(JSON.stringify(user)).toString('base64');
      return res.json({
        success: true,
        message: 'Login successful.',
        token,
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          shop_name: user.shop_name,
          mobile: user.mobile,
          address: user.address,
          city: user.city,
          state: user.state,
          pincode: user.pincode,
          status: user.status,
          store_status: user.store_status || 'active',
        },
      });
    }

    // Authenticate via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError || !authData.session) {
      return res.status(401).json({
        success: false,
        message: 'Email or password is incorrect.',
      });
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ success: false, message: 'User profile record not found.' });
    }

    if (profile.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: `This account is ${profile.status.toLowerCase()}. Contact the Super Admin.`,
      });
    }

    res.json({
      success: true,
      message: 'Login successful.',
      token: authData.session.access_token,
      user: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    res.json({ success: true, message: 'Signed out successfully.' });
  } catch (error) {
    next(error);
  }
};

export const me = async (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
};

export const updateProfile = async (req, res, next) => {
  try {
    const { full_name, mobile, address, city, state, pincode } = req.body;
    const userId = req.user.id;

    if (!isSupabaseConfigured()) {
      const user = demoUsers.find((u) => u.id === userId || u.email === req.user.email);
      if (user) {
        Object.assign(user, { full_name, mobile, address, city, state, pincode });
        return res.json({ success: true, message: 'Profile updated successfully.', user });
      }
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name,
        mobile,
        address,
        city,
        state,
        pincode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updated,
    });
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;

    if (!new_password || new_password.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long.' });
    }

    if (!isSupabaseConfigured()) {
      const user = demoUsers.find((u) => u.id === req.user.id || u.email === req.user.email);
      if (user) {
        if (user.password !== current_password) {
          return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
        }
        user.password = new_password;
        return res.json({ success: true, message: 'Password updated successfully.' });
      }
    }

    // Verify current password by signing in
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: req.user.email,
      password: current_password,
    });

    if (verifyError) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    // Update password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
      password: new_password,
    });

    if (updateError) {
      return res.status(400).json({ success: false, message: updateError.message });
    }

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (error) {
    next(error);
  }
};
