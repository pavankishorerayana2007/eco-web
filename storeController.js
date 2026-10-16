import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';

let demoStoreState = {};
let demoStoreHistory = [];

export const getStoreStatus = async (req, res, next) => {
  try {
    const { ownerId } = req.params;

    if (!isSupabaseConfigured()) {
      const state = demoStoreState[ownerId] || { status: 'active', message: '', paused_at: null };
      return res.json({ success: true, store: state });
    }

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, shop_name, full_name, store_status, store_pause_message, store_paused_at')
      .eq('id', ownerId)
      .single();

    if (error || !profile) {
      return res.status(404).json({ success: false, message: 'Store owner not found.' });
    }

    res.json({
      success: true,
      store: {
        status: profile.store_status || 'active',
        message: profile.store_pause_message || '',
        paused_at: profile.store_paused_at || null,
        shop_name: profile.shop_name,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const pauseStore = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const { message } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide an announcement message for buyers.' });
    }

    if (message.length > 500) {
      return res.status(400).json({ success: false, message: 'Announcement message must be 500 characters or fewer.' });
    }

    const pausedAt = new Date().toISOString();

    if (!isSupabaseConfigured()) {
      demoStoreState[ownerId] = {
        status: 'paused',
        message: message.trim(),
        paused_at: pausedAt,
      };
      demoStoreHistory.push({
        id: 'sh-' + Date.now(),
        owner_id: ownerId,
        message: message.trim(),
        paused_at: pausedAt,
        resumed_at: null,
      });
      return res.json({
        success: true,
        message: 'Your store has been paused successfully. New orders are temporarily blocked.',
        store: demoStoreState[ownerId],
      });
    }

    // Update profile store status
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        store_status: 'paused',
        store_pause_message: message.trim(),
        store_paused_at: pausedAt,
        updated_at: pausedAt,
      })
      .eq('id', ownerId);

    if (profileError) {
      return res.status(400).json({ success: false, message: profileError.message });
    }

    // Insert into store_pause_history
    await supabaseAdmin.from('store_pause_history').insert({
      owner_id: ownerId,
      message: message.trim(),
      paused_at: pausedAt,
    });

    // Notify owner & admin
    await supabaseAdmin.from('notifications').insert([
      {
        recipient_role: 'owner',
        recipient_id: ownerId,
        title: 'Store Paused',
        message: 'Your store is paused. New orders are blocked until you resume.',
      },
      {
        recipient_role: 'admin',
        recipient_id: null,
        title: 'Store Paused',
        message: `${req.user.shop_name || req.user.full_name} paused their store.`,
      },
    ]);

    res.json({
      success: true,
      message: 'Your store has been paused successfully. New orders are temporarily blocked.',
      store: {
        status: 'paused',
        message: message.trim(),
        paused_at: pausedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const resumeStore = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    const resumedAt = new Date().toISOString();

    if (!isSupabaseConfigured()) {
      if (demoStoreState[ownerId]) {
        demoStoreState[ownerId].status = 'active';
        demoStoreState[ownerId].message = '';
      }
      const entry = [...demoStoreHistory].reverse().find((e) => e.owner_id === ownerId && !e.resumed_at);
      if (entry) entry.resumed_at = resumedAt;

      return res.json({
        success: true,
        message: 'Your store is active again. Buyers can now place new orders.',
        store: { status: 'active', message: '', paused_at: null },
      });
    }

    // Update profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        store_status: 'active',
        store_pause_message: null,
        store_paused_at: null,
        updated_at: resumedAt,
      })
      .eq('id', ownerId);

    if (profileError) {
      return res.status(400).json({ success: false, message: profileError.message });
    }

    // Update latest pause history record
    const { data: latestPause } = await supabaseAdmin
      .from('store_pause_history')
      .select('id')
      .eq('owner_id', ownerId)
      .is('resumed_at', null)
      .order('paused_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestPause) {
      await supabaseAdmin
        .from('store_pause_history')
        .update({ resumed_at: resumedAt })
        .eq('id', latestPause.id);
    }

    // Notify
    await supabaseAdmin.from('notifications').insert([
      {
        recipient_role: 'owner',
        recipient_id: ownerId,
        title: 'Store Resumed',
        message: 'Your store is active again.',
      },
      {
        recipient_role: 'admin',
        recipient_id: null,
        title: 'Store Resumed',
        message: `${req.user.shop_name || req.user.full_name} resumed their store.`,
      },
    ]);

    res.json({
      success: true,
      message: 'Your store is active again. Buyers can now place new orders.',
      store: { status: 'active', message: '', paused_at: null },
    });
  } catch (error) {
    next(error);
  }
};

export const getStoreHistory = async (req, res, next) => {
  try {
    const { ownerId } = req.params;

    if (!isSupabaseConfigured()) {
      const history = demoStoreHistory.filter((h) => h.owner_id === ownerId);
      return res.json({ success: true, history });
    }

    const { data: history, error } = await supabaseAdmin
      .from('store_pause_history')
      .select('*')
      .eq('owner_id', ownerId)
      .order('paused_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.json({ success: true, history });
  } catch (error) {
    next(error);
  }
};
