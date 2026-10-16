import { supabaseAdmin, isSupabaseConfigured } from '../config/supabase.js';

export const getOverview = async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 30;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startIso = startOfDay.toISOString();
    const periodIso = new Date(Date.now() - days * 864e5).toISOString();

    if (!isSupabaseConfigured()) {
      return res.json({
        success: true,
        metrics: {
          total_owners: 3,
          active_owners: 2,
          suspended_owners: 1,
          active_products: 10,
          active_combos: 2,
          orders_placed_today: 0,
          orders_completed_today: 0,
          gross_sales_today: 0,
          commission_today: 0,
          total_outstanding_commission: 0,
          total_settled_commission: 0,
          pending_verifications: 0,
          period_commission: 0,
          commission_rate: 5.0,
        },
      });
    }

    // 1. Current commission rate
    let commissionRate = 5.0;
    const { data: setting } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'platform_commission')
      .maybeSingle();
    if (setting && setting.value && setting.value.rate) {
      commissionRate = Number(setting.value.rate);
    }

    // 2. Owners breakdown
    const { data: owners } = await supabaseAdmin
      .from('profiles')
      .select('id, status')
      .eq('role', 'owner');

    const totalOwners = (owners || []).filter((o) => o.status !== 'Deleted').length;
    const activeOwners = (owners || []).filter((o) => o.status === 'Active').length;
    const suspendedOwners = (owners || []).filter((o) => o.status === 'Suspended').length;

    // 3. Products count
    const { count: activeProds } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'single')
      .eq('status', 'Active');

    const { count: activeCombos } = await supabaseAdmin
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'combo')
      .eq('status', 'Active');

    // 4. Orders placed today
    const { data: ordersToday } = await supabaseAdmin
      .from('orders')
      .select('*')
      .gte('created_at', startIso);

    // 5. Delivered orders (today and in period)
    const { data: deliveredOrders } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_status', 'Delivered');

    const deliveredToday = (deliveredOrders || []).filter((o) => o.delivered_at >= startIso);
    let grossToday = 0;
    let commToday = 0;
    deliveredToday.forEach((o) => {
      grossToday += Number(o.subtotal);
      commToday += (Number(o.subtotal) * Number(o.commission_rate)) / 100;
    });

    let periodComm = 0;
    (deliveredOrders || []).forEach((o) => {
      if (o.delivered_at >= periodIso) {
        periodComm += (Number(o.subtotal) * Number(o.commission_rate)) / 100;
      }
    });

    // 6. Commission payments
    const { data: allPayments } = await supabaseAdmin.from('commission_payments').select('*');
    let totalSettled = 0;
    let pendingPaymentsCount = 0;
    (allPayments || []).forEach((p) => {
      if (p.status === 'Paid') totalSettled += Number(p.amount);
      if (p.status === 'Pending Verification') pendingPaymentsCount++;
    });

    const { count: pendingBuyerPayments } = await supabaseAdmin
      .from('buyer_payments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Pending Verification');

    // Calculate total platform outstanding commission
    let totalLifetimeComm = 0;
    (deliveredOrders || []).forEach((o) => {
      totalLifetimeComm += (Number(o.subtotal) * Number(o.commission_rate)) / 100;
    });

    const { data: allAudits } = await supabaseAdmin.from('commission_audits').select('reduction');
    let totalReductions = 0;
    (allAudits || []).forEach((a) => {
      totalReductions += Number(a.reduction);
    });

    const totalOutstanding = Math.max(0, Math.round((totalLifetimeComm - totalReductions - totalSettled) * 100) / 100);

    res.json({
      success: true,
      metrics: {
        total_owners: totalOwners,
        active_owners: activeOwners,
        suspended_owners: suspendedOwners,
        active_products: activeProds || 0,
        active_combos: activeCombos || 0,
        orders_placed_today: (ordersToday || []).length,
        orders_completed_today: deliveredToday.length,
        gross_sales_today: Math.round(grossToday * 100) / 100,
        commission_today: Math.round(commToday * 100) / 100,
        total_outstanding_commission: totalOutstanding,
        total_settled_commission: Math.round(totalSettled * 100) / 100,
        pending_verifications: pendingPaymentsCount + (pendingBuyerPayments || 0),
        period_commission: Math.round(periodComm * 100) / 100,
        commission_rate: commissionRate,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateCommissionRate = async (req, res, next) => {
  try {
    const { rate } = req.body;
    if (rate === undefined || Number(rate) < 0 || Number(rate) > 100) {
      return res.status(400).json({ success: false, message: 'Please enter a valid rate percentage between 0 and 100.' });
    }

    const newRate = Number(rate);

    if (!isSupabaseConfigured()) {
      return res.json({ success: true, message: `Commission rate updated to ${newRate}%.`, rate: newRate });
    }

    const { data: currentSetting } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'platform_commission')
      .maybeSingle();

    const currentRate = currentSetting?.value?.rate || 5.0;

    // Rule: Commission rate can only be reduced
    if (newRate > currentRate) {
      return res.status(400).json({
        success: false,
        message: `Platform rule: Commission rate can only be reduced (current rate is ${currentRate}%).`,
      });
    }

    // Save setting
    await supabaseAdmin
      .from('system_settings')
      .upsert({
        key: 'platform_commission',
        value: { rate: newRate },
        updated_at: new Date().toISOString(),
      });

    // Audit log
    await supabaseAdmin.from('commission_audits').insert({
      owner_id: 'ALL',
      original_value: currentRate,
      new_value: newRate,
      reduction: Math.round((currentRate - newRate) * 100) / 100,
      reason: 'Platform commission rate reduction',
      admin_email: req.user.email,
    });

    res.json({
      success: true,
      message: `Commission rate successfully set to ${newRate}%.`,
      rate: newRate,
    });
  } catch (error) {
    next(error);
  }
};

export const listOwners = async (req, res, next) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.json({
        success: true,
        owners: [
          { id: 'u-owner-1', full_name: 'Rajesh Kumar', email: 'owner@quantum.shop', mobile: '9811111111', shop_name: 'Rajesh Stores', status: 'Active', store_status: 'active', created_at: new Date(Date.now() - 60 * 864e5).toISOString(), single_count: 5, combo_count: 1, orders_count: 12, gross_sales: 14500, commission_accrued: 725, commission_paid: 500, outstanding: 225 },
          { id: 'u-owner-2', full_name: 'Meera Nair', email: 'meera@quantum.shop', mobile: '9822222222', shop_name: 'Meera Wellness', status: 'Active', store_status: 'active', created_at: new Date(Date.now() - 45 * 864e5).toISOString(), single_count: 5, combo_count: 1, orders_count: 8, gross_sales: 9800, commission_accrued: 490, commission_paid: 300, outstanding: 190 },
          { id: 'u-owner-3', full_name: 'Vikram Shah', email: 'vikram@quantum.shop', mobile: '9833333333', shop_name: 'Vikram Traders', status: 'Suspended', store_status: 'active', created_at: new Date(Date.now() - 30 * 864e5).toISOString(), single_count: 2, combo_count: 0, orders_count: 0, gross_sales: 0, commission_accrued: 0, commission_paid: 0, outstanding: 0 },
        ],
      });
    }

    const { data: owners, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', 'owner')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    const result = [];
    for (const o of owners) {
      const { data: prods } = await supabaseAdmin
        .from('products')
        .select('id, type, status')
        .eq('owner_id', o.id);

      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('id, subtotal, commission_rate, order_status')
        .eq('owner_id', o.id);

      const { data: commPayments } = await supabaseAdmin
        .from('commission_payments')
        .select('amount, status')
        .eq('owner_id', o.id)
        .eq('status', 'Paid');

      const { data: audits } = await supabaseAdmin
        .from('commission_audits')
        .select('reduction')
        .eq('owner_id', o.id);

      let gross = 0;
      let comm = 0;
      (orders || []).forEach((ord) => {
        if (ord.order_status === 'Delivered') {
          gross += Number(ord.subtotal);
          comm += (Number(ord.subtotal) * Number(ord.commission_rate)) / 100;
        }
      });

      let paid = 0;
      (commPayments || []).forEach((cp) => (paid += Number(cp.amount)));

      let red = 0;
      (audits || []).forEach((a) => (red += Number(a.reduction)));

      const singleCount = (prods || []).filter((p) => p.type === 'single').length;
      const comboCount = (prods || []).filter((p) => p.type === 'combo').length;

      result.push({
        ...o,
        single_count: singleCount,
        combo_count: comboCount,
        orders_count: (orders || []).length,
        gross_sales: Math.round(gross * 100) / 100,
        commission_accrued: Math.round(comm * 100) / 100,
        commission_paid: Math.round(paid * 100) / 100,
        outstanding: Math.max(0, Math.round((comm - red - paid) * 100) / 100),
      });
    }

    res.json({ success: true, count: result.length, owners: result });
  } catch (error) {
    next(error);
  }
};

export const inviteOwner = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid owner email address.' });
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!isSupabaseConfigured()) {
      return res.status(201).json({
        success: true,
        message: `Owner invitation recorded for ${cleanEmail}. In live production, an activation link is dispatched.`,
      });
    }

    // Check existing
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Invite user via Supabase Auth Admin API
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(cleanEmail, {
      data: {
        role: 'owner',
        full_name: cleanEmail.split('@')[0],
      },
    });

    if (inviteError) {
      return res.status(400).json({ success: false, message: inviteError.message });
    }

    if (inviteData && inviteData.user) {
      await supabaseAdmin.from('profiles').upsert({
        id: inviteData.user.id,
        email: cleanEmail,
        full_name: cleanEmail.split('@')[0],
        shop_name: 'New Shop',
        role: 'owner',
        status: 'Invited',
      });
    }

    res.status(201).json({
      success: true,
      message: `Invitation email sent to ${cleanEmail}.`,
    });
  } catch (error) {
    next(error);
  }
};

export const updateOwnerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['Active', 'Suspended', 'Deleted'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    if (!isSupabaseConfigured()) {
      return res.json({ success: true, message: `Owner status updated to ${status}.` });
    }

    const updatePayload = {
      status,
      updated_at: new Date().toISOString(),
    };

    // If soft deleting, anonymize personal contact details
    if (status === 'Deleted') {
      updatePayload.full_name = 'Deleted Owner';
      updatePayload.shop_name = 'Closed Shop';
      updatePayload.mobile = null;
      updatePayload.address = null;

      // Disable products
      await supabaseAdmin
        .from('products')
        .update({ status: 'Disabled' })
        .eq('owner_id', id);
    }

    const { data: updated, error } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ success: false, message: error.message });
    }

    // Notify owner
    await supabaseAdmin.from('notifications').insert({
      recipient_role: 'owner',
      recipient_id: id,
      title: `Account ${status.toLowerCase()}`,
      message: `Your owner account has been marked as ${status.toLowerCase()}.`,
    });

    res.json({ success: true, message: `Owner status updated to ${status}.`, owner: updated });
  } catch (error) {
    next(error);
  }
};

export const getOwnerDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isSupabaseConfigured()) {
      return res.json({
        success: true,
        owner: { id, full_name: 'Sample Owner', email: 'owner@quantum.shop', shop_name: 'Sample Shop', status: 'Active' },
        products: [],
        orders: [],
        pause_history: [],
        payments: [],
        audits: [],
      });
    }

    const { data: owner, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !owner) {
      return res.status(404).json({ success: false, message: 'Owner not found.' });
    }

    const { data: products } = await supabaseAdmin.from('products').select('*').eq('owner_id', id);
    const { data: orders } = await supabaseAdmin.from('orders').select('*, order_items(*)').eq('owner_id', id);
    const { data: pauseHistory } = await supabaseAdmin.from('store_pause_history').select('*').eq('owner_id', id).order('paused_at', { ascending: false });
    const { data: commPayments } = await supabaseAdmin.from('commission_payments').select('*').eq('owner_id', id).order('submitted_at', { ascending: false });
    const { data: buyerPayments } = await supabaseAdmin.from('buyer_payments').select('*').eq('owner_id', id).order('submitted_at', { ascending: false });
    const { data: audits } = await supabaseAdmin.from('commission_audits').select('*').eq('owner_id', id).order('created_at', { ascending: false });

    res.json({
      success: true,
      owner,
      products: products || [],
      orders: orders || [],
      pause_history: pauseHistory || [],
      payments: {
        commission: commPayments || [],
        buyer: buyerPayments || [],
      },
      audits: audits || [],
    });
  } catch (error) {
    next(error);
  }
};

export const adjustOwnerCommission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { new_balance, reason } = req.body;

    if (new_balance === undefined || Number(new_balance) < 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid balance amount (0 or more).' });
    }

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Please provide a valid reason for the balance adjustment.' });
    }

    const newBal = Number(new_balance);

    if (!isSupabaseConfigured()) {
      return res.json({ success: true, message: `Commission balance adjusted to ₹${newBal}.` });
    }

    // Calculate current outstanding
    const { data: deliveredOrders } = await supabaseAdmin
      .from('orders')
      .select('subtotal, commission_rate')
      .eq('owner_id', id)
      .eq('order_status', 'Delivered');

    let totalComm = 0;
    (deliveredOrders || []).forEach((o) => {
      totalComm += (Number(o.subtotal) * Number(o.commission_rate)) / 100;
    });

    const { data: verifiedPayments } = await supabaseAdmin
      .from('commission_payments')
      .select('amount')
      .eq('owner_id', id)
      .eq('status', 'Paid');

    let totalPaid = 0;
    (verifiedPayments || []).forEach((p) => (totalPaid += Number(p.amount)));

    const { data: previousAudits } = await supabaseAdmin
      .from('commission_audits')
      .select('reduction')
      .eq('owner_id', id);

    let prevReductions = 0;
    (previousAudits || []).forEach((a) => (prevReductions += Number(a.reduction)));

    const currentBalance = Math.max(0, Math.round((totalComm - prevReductions - totalPaid) * 100) / 100);

    // Rule: Commission balance can only be reduced
    if (newBal > currentBalance) {
      return res.status(400).json({
        success: false,
        message: `Platform rule: Commission can only be reduced. Current outstanding is ₹${currentBalance}.`,
      });
    }

    const reductionDelta = Math.round((currentBalance - newBal) * 100) / 100;

    await supabaseAdmin.from('commission_audits').insert({
      owner_id: id,
      original_value: currentBalance,
      new_value: newBal,
      reduction: reductionDelta,
      reason,
      admin_email: req.user.email,
    });

    // Notify owner
    await supabaseAdmin.from('notifications').insert({
      recipient_role: 'owner',
      recipient_id: id,
      title: 'Commission balance reduced',
      message: `Your outstanding commission has been reduced to ₹${newBal}. Reason: ${reason}`,
    });

    res.json({
      success: true,
      message: `Commission balance reduced to ₹${newBal}.`,
      original_balance: currentBalance,
      new_balance: newBal,
      reduction: reductionDelta,
    });
  } catch (error) {
    next(error);
  }
};

export const getVerifications = async (req, res, next) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.json({
        success: true,
        commission_payments: [],
        buyer_payments: [],
      });
    }

    const { data: commPayments, error: commErr } = await supabaseAdmin
      .from('commission_payments')
      .select('*, profiles:owner_id(full_name, shop_name, email)')
      .eq('status', 'Pending Verification')
      .order('submitted_at', { ascending: false });

    const { data: buyerPayments, error: buyerErr } = await supabaseAdmin
      .from('buyer_payments')
      .select('*, profiles:owner_id(full_name, shop_name), buyer:buyer_id(full_name, email)')
      .eq('status', 'Pending Verification')
      .order('submitted_at', { ascending: false });

    if (commErr || buyerErr) {
      return res.status(400).json({ success: false, message: commErr?.message || buyerErr?.message });
    }

    res.json({
      success: true,
      commission_payments: commPayments || [],
      buyer_payments: buyerPayments || [],
    });
  } catch (error) {
    next(error);
  }
};

export const verifyCommissionPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    const now = new Date().toISOString();
    const newStatus = approved ? 'Paid' : 'Rejected';

    if (!isSupabaseConfigured()) {
      return res.json({ success: true, message: `Commission payment ${id} marked as ${newStatus}.` });
    }

    const { data: payment, error: fetchErr } = await supabaseAdmin
      .from('commission_payments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !payment) {
      return res.status(404).json({ success: false, message: 'Payment record not found.' });
    }

    if (payment.status !== 'Pending Verification') {
      return res.status(400).json({ success: false, message: 'This payment has already been processed.' });
    }

    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('commission_payments')
      .update({
        status: newStatus,
        verified_at: now,
        verified_by: req.user.full_name || req.user.email,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return res.status(400).json({ success: false, message: updateErr.message });
    }

    // Notify owner
    await supabaseAdmin.from('notifications').insert({
      recipient_role: 'owner',
      recipient_id: payment.owner_id,
      title: approved ? 'Commission payment verified' : 'Commission payment rejected',
      message: approved
        ? `${id}: ₹${payment.amount} verified and deducted from your balance.`
        : `${id}: ₹${payment.amount} was rejected. Please verify transaction details.`,
    });

    res.json({ success: true, message: `Payment marked as ${newStatus}.`, payment: updated });
  } catch (error) {
    next(error);
  }
};

export const verifyBuyerPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    const now = new Date().toISOString();
    const newStatus = approved ? 'Paid' : 'Rejected';

    if (!isSupabaseConfigured()) {
      return res.json({ success: true, message: `Buyer payment ${id} marked as ${newStatus}.` });
    }

    const { data: payment, error: fetchErr } = await supabaseAdmin
      .from('buyer_payments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !payment) {
      return res.status(404).json({ success: false, message: 'Buyer payment record not found.' });
    }

    if (payment.status !== 'Pending Verification') {
      return res.status(400).json({ success: false, message: 'This payment has already been processed.' });
    }

    // Update buyer_payments
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from('buyer_payments')
      .update({
        status: newStatus,
        verified_at: now,
      })
      .eq('id', id)
      .select()
      .single();

    if (updateErr) {
      return res.status(400).json({ success: false, message: updateErr.message });
    }

    // Update corresponding order
    const orderUpdate = {
      payment_status: approved ? 'Paid' : 'Failed',
      paid_at: approved ? now : null,
      updated_at: now,
    };

    if (approved) {
      orderUpdate.order_status = 'Placed';
    }

    await supabaseAdmin
      .from('orders')
      .update(orderUpdate)
      .eq('id', payment.order_id);

    if (approved) {
      await supabaseAdmin.from('order_history').insert({
        order_id: payment.order_id,
        status: 'Placed',
      });
    }

    // Notify buyer & owner
    await supabaseAdmin.from('notifications').insert([
      {
        recipient_role: 'buyer',
        recipient_id: payment.buyer_id,
        title: approved ? 'Payment Verified & Order Placed' : 'Payment could not be verified',
        message: approved
          ? `${payment.order_id}: your payment of ₹${payment.amount} was verified.`
          : `${payment.order_id}: your payment could not be verified. Please submit proof again.`,
      },
      {
        recipient_role: 'owner',
        recipient_id: payment.owner_id,
        title: approved ? 'Order Paid & Confirmed' : 'Payment Failed',
        message: `${payment.order_id} online payment of ₹${payment.amount} was verified.`,
      },
    ]);

    res.json({ success: true, message: `Buyer payment marked as ${newStatus}.`, payment: updated });
  } catch (error) {
    next(error);
  }
};

export const getUniversalHistory = async (req, res, next) => {
  try {
    const { type } = req.query; // 'owners', 'products', 'orders', 'payments', 'commission', 'cancellations', 'store'

    if (!isSupabaseConfigured()) {
      return res.json({ success: true, type, records: [] });
    }

    if (type === 'owners') {
      const { data } = await supabaseAdmin.from('profiles').select('*').eq('role', 'owner');
      return res.json({ success: true, type, records: data || [] });
    }

    if (type === 'products') {
      const { data } = await supabaseAdmin.from('products').select('*, profiles:owner_id(shop_name, full_name)');
      return res.json({ success: true, type, records: data || [] });
    }

    if (type === 'orders') {
      const { data } = await supabaseAdmin.from('orders').select('*, order_items(*), profiles:owner_id(shop_name)');
      return res.json({ success: true, type, records: data || [] });
    }

    if (type === 'payments') {
      const { data: bp } = await supabaseAdmin.from('buyer_payments').select('*, profiles:owner_id(shop_name)');
      return res.json({ success: true, type, records: bp || [] });
    }

    if (type === 'commission') {
      const { data: cp } = await supabaseAdmin.from('commission_payments').select('*, profiles:owner_id(shop_name)');
      return res.json({ success: true, type, records: cp || [] });
    }

    if (type === 'cancellations') {
      const { data } = await supabaseAdmin.from('orders').select('*, profiles:owner_id(shop_name)').eq('order_status', 'Cancelled');
      return res.json({ success: true, type, records: data || [] });
    }

    if (type === 'store') {
      const { data } = await supabaseAdmin.from('store_pause_history').select('*, profiles:owner_id(shop_name, full_name)');
      return res.json({ success: true, type, records: data || [] });
    }

    res.json({ success: true, type, records: [] });
  } catch (error) {
    next(error);
  }
};

export const getAdminToday = async (req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startIso = startOfDay.toISOString();

    if (!isSupabaseConfigured()) {
      return res.json({
        success: true,
        metrics: {
          products_added_today: 0,
          combos_added_today: 0,
          orders_placed_today: 0,
          deliveries_completed_today: 0,
          units_sold_today: 0,
          gross_completed_today: 0,
          commission_earned_today: 0,
        },
        owners_summary: [],
        transactions: [],
      });
    }

    const { data: deliveredToday } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*), profiles:owner_id(shop_name, full_name)')
      .eq('order_status', 'Delivered')
      .gte('delivered_at', startIso);

    const { data: ordersPlacedToday } = await supabaseAdmin
      .from('orders')
      .select('*')
      .gte('created_at', startIso);

    let gross = 0;
    let comm = 0;
    let units = 0;
    const ownerMap = {};

    (deliveredToday || []).forEach((o) => {
      gross += Number(o.subtotal);
      comm += (Number(o.subtotal) * Number(o.commission_rate)) / 100;
      const ownerName = o.profiles?.shop_name || o.profiles?.full_name || 'Owner';
      if (!ownerMap[o.owner_id]) {
        ownerMap[o.owner_id] = { id: o.owner_id, name: ownerName, completed: 0, gross: 0, commission: 0 };
      }
      ownerMap[o.owner_id].completed++;
      ownerMap[o.owner_id].gross += Number(o.subtotal);
      ownerMap[o.owner_id].commission += (Number(o.subtotal) * Number(o.commission_rate)) / 100;

      (o.order_items || []).forEach((it) => (units += Number(it.quantity)));
    });

    res.json({
      success: true,
      metrics: {
        products_added_today: 0,
        combos_added_today: 0,
        orders_placed_today: (ordersPlacedToday || []).length,
        deliveries_completed_today: (deliveredToday || []).length,
        units_sold_today: units,
        gross_completed_today: Math.round(gross * 100) / 100,
        commission_earned_today: Math.round(comm * 100) / 100,
      },
      owners_summary: Object.values(ownerMap),
      transactions: deliveredToday || [],
    });
  } catch (error) {
    next(error);
  }
};
