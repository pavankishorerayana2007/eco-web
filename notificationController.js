import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';

let demoNotifications = [];

export const listNotifications = async (req, res, next) => {
  try {
    const user = req.user;

    if (!isSupabaseConfigured()) {
      const list = demoNotifications.filter(
        (n) => n.recipient_role === user.role && (!n.recipient_id || n.recipient_id === user.id)
      );
      return res.json({ success: true, count: list.length, notifications: list });
    }

    const { data: notifications, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .or(`recipient_id.eq.${user.id},and(recipient_role.eq.${user.role},recipient_id.is.null)`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.json({ success: true, count: notifications.length, notifications });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isSupabaseConfigured()) {
      const n = demoNotifications.find((x) => x.id === id);
      if (n) n.is_read = true;
      return res.json({ success: true, message: 'Notification marked as read.' });
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    const user = req.user;

    if (!isSupabaseConfigured()) {
      demoNotifications
        .filter((n) => n.recipient_role === user.role && (!n.recipient_id || n.recipient_id === user.id))
        .forEach((n) => (n.is_read = true));
      return res.json({ success: true, message: 'All notifications marked as read.' });
    }

    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ is_read: true })
      .or(`recipient_id.eq.${user.id},and(recipient_role.eq.${user.role},recipient_id.is.null)`);

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    next(error);
  }
};
